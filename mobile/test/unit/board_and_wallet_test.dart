import 'package:animewho/config/app_config.dart';
import 'package:animewho/data/monetization/wallet_repository.dart';
import 'package:animewho/data/storage/key_value_store.dart';
import 'package:animewho/domain/game/board.dart';
import 'package:animewho/domain/models/character.dart';
import 'package:animewho/domain/models/protocol_models.dart';
import 'package:animewho/domain/monetization/ad_policy.dart';
import 'package:animewho/domain/monetization/products.dart';
import 'package:animewho/domain/monetization/wallet.dart';
import 'package:animewho/l10n/app_localizations_fr.dart';
import 'package:animewho/l10n/trait_labels.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

void main() {
  group('Board (grille)', () {
    final board = fakeBoard();

    test('toggle écarte puis remet un personnage', () {
      var e = Board.toggle({}, 'c1');
      expect(e, {'c1'});
      e = Board.toggle(e, 'c2');
      expect(e, {'c1', 'c2'});
      expect(Board.toggle(e, 'c1'), {'c2'});
    });

    test('ruledOut : réponse OUI garde ceux qui ont le trait', () {
      final out = Board.ruledOut(
        characters: board,
        eliminated: const {},
        attribute: VerifiableAttribute.hairColor,
        value: 'pink',
        answer: Answer.yes,
      );
      expect(out, hasLength(18));
      expect(out.every((id) => !board.firstWhere((c) => c.id == id).hasTrait(VerifiableAttribute.hairColor, 'pink')),
          isTrue);
    });

    test('ruledOut : réponse NON écarte ceux qui ont le trait, ignore les déjà écartés', () {
      final out = Board.ruledOut(
        characters: board,
        eliminated: const {'c1'},
        attribute: VerifiableAttribute.hairColor,
        value: 'PINK', // insensible à la casse, comme le serveur
        answer: Answer.no,
      );
      expect(out, ['c5', 'c9', 'c13', 'c17', 'c21']);
    });

    test('guessable et recherche', () {
      final left = Board.guessable(board, {'c0', 'c1'});
      expect(left, hasLength(22));
      expect(Board.search(left, 'héros c').map((c) => c.id), ['c2']);
      expect(Board.search(left, '  '), hasLength(22));
    });

    test('valuesOnBoard : valeurs présentes, sans doublon, triées par libellé', () {
      final labels = TraitLabels.fr;
      final values = Board.valuesOnBoard(board, VerifiableAttribute.hairColor,
          labelOf: (v) => labels.value(VerifiableAttribute.hairColor, v));
      expect(values.toSet(), {'black', 'pink', 'blonde', 'none'});
      expect(values.map((v) => labels.value(VerifiableAttribute.hairColor, v)), ['blonds', 'chauve', 'noirs', 'roses']);
    });
  });

  group('Libellés et questions (français)', () {
    final l = AppLocalizationsFr();
    const t = TraitLabels.fr;

    test('textes des questions vérifiées identiques au web', () {
      expect(t.question(l, VerifiableAttribute.hairColor, 'none'), 'Ton personnage est-il chauve ?');
      expect(t.question(l, VerifiableAttribute.hairColor, 'pink'), 'Ton personnage a-t-il les cheveux roses ?');
      expect(t.question(l, VerifiableAttribute.eyeColor, 'heterochromia'), 'Ton personnage a-t-il les yeux vairons ?');
      expect(t.question(l, VerifiableAttribute.gender, 'female'), 'Ton personnage est-il une femme ?');
      expect(t.question(l, VerifiableAttribute.ageRange, 'teen'), 'Ton personnage est-il un ado ?');
      expect(t.question(l, VerifiableAttribute.alignment, 'antihero'), 'Ton personnage est-il un anti-héros ?');
      expect(t.question(l, VerifiableAttribute.role, 'main'), 'Ton personnage est-il un personnage principal ?');
      expect(t.question(l, VerifiableAttribute.universe, 'Lycée Sakura'), 'Ton personnage vient-il de « Lycée Sakura » ?');
    });

    test('valeur inconnue : affichée telle quelle', () {
      expect(t.value(VerifiableAttribute.species, 'cosmic jellyfish'), 'cosmic jellyfish');
    });

    test('aucune mention de la marque d’un jeu concurrent dans les textes', () {
      final all = [l.appTitle, l.homeTagline, l.guessTitle, l.howTo1, l.howTo2, l.howTo3, l.howTo4];
      for (final text in all) {
        expect(text.toLowerCase(), isNot(contains('qui est-ce')));
      }
    });
  });

  group('Portefeuille local et coffre quotidien', () {
    test('barème des parties', () {
      const r = ShardRewards();
      expect(r.forGame(mode: RoomMode.quick, won: true, botGamesRewardedToday: 0), 20);
      expect(r.forGame(mode: RoomMode.private, won: false, botGamesRewardedToday: 0), 10);
      expect(r.forGame(mode: RoomMode.bot, won: true, botGamesRewardedToday: 9), 5);
      expect(r.forGame(mode: RoomMode.bot, won: true, botGamesRewardedToday: 10), 0);
    });

    test('série du coffre : jours consécutifs, remise à 1 si un jour manque', () {
      final d1 = DateTime(2027, 3, 1, 9);
      var w = const WalletState();
      expect(DailyChest.nextStreakDay(w, d1), 1);
      w = w.copyWith(chestStreak: 1, lastChestDay: dayKey(d1));
      expect(DailyChest.canClaim(w, d1), isFalse);
      final d2 = d1.add(const Duration(days: 1));
      expect(DailyChest.nextStreakDay(w, d2), 2);
      expect(DailyChest.nextStreakDay(w, d1.add(const Duration(days: 3))), 1);
      w = w.copyWith(chestStreak: 7, lastChestDay: dayKey(d2));
      expect(DailyChest.nextStreakDay(w, d2.add(const Duration(days: 1))), 1);
      expect(DailyChest.rewardFor(7), 100);
      expect(DailyChest.rewardFor(1), 20);
    });

    test('LocalWalletRepository : crédit idempotent par partie, coffre 1 fois/jour, achats', () async {
      final repo = LocalWalletRepository(InMemoryStore());
      final now = DateTime(2027, 3, 1, 12);
      var w = await repo.creditGame(ref: 'ROOM:1:p1', mode: RoomMode.quick, won: true, now: now);
      expect(w.balance, 20);
      w = await repo.creditGame(ref: 'ROOM:1:p1', mode: RoomMode.quick, won: true, now: now);
      expect(w.balance, 20, reason: 'même partie : pas de double crédit');
      final chest = await repo.claimDailyChest(now);
      expect(chest!.reward, 20);
      expect(await repo.claimDailyChest(now), isNull);
      expect(DailyChest.canClaimBonus(chest.wallet, now), isTrue);
      w = (await repo.claimAdReward(AdPlacement.rwDailyChest, amount: 30, now: now)).wallet;
      expect(DailyChest.canClaimBonus(w, now), isFalse);
      w = await repo.applyPurchase(Products.noAds, entitlements: {});
      expect(Entitlements.removesAds(w.entitlements), isTrue);
      w = await repo.applyPurchase(Products.starterPack, entitlements: {});
      final balance = w.balance;
      w = await repo.applyPurchase(Products.starterPack, entitlements: {});
      expect(w.balance, balance, reason: 'non consommable : crédité une seule fois');
      expect((await repo.fetch()).balance, balance, reason: 'persisté');
    });

    test('pack de démarrage : de la 3e partie à J+7, une seule fois', () {
      final install = DateTime(2027, 3, 1);
      var h = AdHistory.fresh(install);
      const w = WalletState();
      expect(StarterPackRule.visible(h, w, install), isFalse);
      for (var i = 0; i < 3; i++) {
        h = h.recordGameCompleted(won: true);
      }
      expect(StarterPackRule.visible(h, w, install.add(const Duration(days: 2))), isTrue);
      expect(StarterPackRule.visible(h, w, install.add(const Duration(days: 8))), isFalse);
      expect(StarterPackRule.visible(h, w.copyWith(ownedProducts: {Products.starterPack.id}), install), isFalse);
    });
  });

  group('AppConfig', () {
    test('URL du serveur', () {
      String resolve(String define, {bool debug = true, bool web = false, TargetPlatform p = TargetPlatform.android}) =>
          AppConfig.resolveApiBaseUrl(define: define, isDebug: debug, isWeb: web, platform: p);
      expect(resolve(''), 'http://10.0.2.2:8080');
      expect(resolve('', p: TargetPlatform.iOS), AppConfig.productionPlaceholderUrl);
      expect(resolve('', debug: false), AppConfig.productionPlaceholderUrl);
      expect(resolve('', web: true), AppConfig.productionPlaceholderUrl);
      expect(resolve('http://192.168.1.2:8080/'), 'http://192.168.1.2:8080');
    });
  });
}
