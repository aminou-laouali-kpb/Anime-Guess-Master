// Test d'intégration RÉEL : joue une partie complète contre l'ordinateur avec la
// vraie couche Socket.IO de l'app, contre le serveur existant.
//
// Sauté par défaut. Pour le lancer :
//   PORT=8080 GAME_TIME_SCALE=0.25 pnpm --filter @workspace/api-server run dev   (à la racine)
//   ANIMEWHO_LIVE_URL=http://127.0.0.1:8080 flutter test test/integration
//
// GAME_TIME_SCALE accélère les délais de l'ordinateur (facultatif).
library;

import 'dart:io';

import 'package:animewho/application/game_controller.dart';
import 'package:animewho/application/monetization_controller.dart';
import 'package:animewho/application/providers.dart';
import 'package:animewho/data/api/account_api.dart';
import 'package:animewho/config/app_config.dart';
import 'package:animewho/data/api/api_client.dart';
import 'package:animewho/data/monetization/ads_service.dart';
import 'package:animewho/data/monetization/analytics_service.dart';
import 'package:animewho/data/monetization/purchases_service.dart';
import 'package:animewho/data/storage/key_value_store.dart';
import 'package:animewho/domain/game/board.dart';
import 'package:animewho/domain/game/client_events.dart';
import 'package:animewho/domain/game/game_state.dart';
import 'package:animewho/domain/game/server_events.dart';
import 'package:animewho/domain/models/character.dart';
import 'package:animewho/domain/models/protocol_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final String? liveUrl = Platform.environment['ANIMEWHO_LIVE_URL'];

ProviderContainer liveContainer(InMemoryStore store) => ProviderContainer(overrides: [
      appConfigProvider.overrideWithValue(AppConfig(
        apiBaseUrl: liveUrl!,
        enableAdMob: false,
        revenueCatAppleKey: '',
        revenueCatGoogleKey: '',
        verboseAnalytics: false,
      )),
      keyValueStoreProvider.overrideWithValue(store),
      adsServiceProvider.overrideWithValue(FakeAdsService()),
      purchasesServiceProvider.overrideWithValue(FakePurchasesService()),
      analyticsProvider.overrideWithValue(RecordingAnalyticsService()),
    ]);

Future<void> waitFor(
  ProviderContainer c,
  bool Function(GameState s) condition, {
  Duration timeout = const Duration(seconds: 30),
  String? what,
}) async {
  final end = DateTime.now().add(timeout);
  while (!condition(c.read(gameControllerProvider))) {
    if (DateTime.now().isAfter(end)) {
      final s = c.read(gameControllerProvider);
      fail('Délai dépassé : ${what ?? 'condition'} (phase=${s.phase}, connecté=${s.isConnected})');
    }
    await Future<void>.delayed(const Duration(milliseconds: 50));
  }
}

/// La question vérifiée qui coupe le mieux les candidats restants en deux.
(VerifiableAttribute, String) bestQuestion(List<Character> candidates) {
  (VerifiableAttribute, String)? best;
  var bestScore = -1;
  for (final a in VerifiableAttribute.values) {
    for (final v in Board.valuesOnBoard(candidates, a)) {
      final yes = candidates.where((c) => c.hasTrait(a, v)).length;
      final score = yes < candidates.length - yes ? yes : candidates.length - yes;
      if (score > bestScore) {
        bestScore = score;
        best = (a, v);
      }
    }
  }
  return best!;
}

void main() {
  test('API HTTP : santé et casting fourni par le serveur', () async {
    final api = ApiClient(baseUrl: liveUrl!);
    addTearDown(api.close);
    expect(await api.health(), isTrue);
    final cast = await api.characters();
    expect(cast.length, greaterThanOrEqualTo(24));
    expect(cast.every((c) => c.id.isNotEmpty && c.name.isNotEmpty), isTrue);
  }, skip: liveUrl == null ? 'ANIMEWHO_LIVE_URL non défini' : false);

  test('routes compte : config publique ; sans base, le portefeuille reste local', () async {
    final store = InMemoryStore();
    final api = AccountApi(baseUrl: liveUrl!, profileToken: () => store.getString(StoreKeys.profileToken));
    addTearDown(api.close);
    final config = await api.config();
    expect(config.values, isNotEmpty, reason: 'clés Remote Config de la spec');
    // ignore: avoid_print
    print('GET /api/config : features=${config.features}, minMobileVersion=${config.minMobileVersion}');
    final c = liveContainer(store);
    addTearDown(c.dispose);
    c.read(gameControllerProvider);
    await waitFor(c, (s) => s.isConnected && s.myPlayerId != null);
    final m = c.read(monetizationControllerProvider.notifier);
    await m.startup();
    final state = c.read(monetizationControllerProvider);
    expect(state.capabilities.serverBacked, config.feature('wallet'));
    if (config.feature('wallet')) expect(state.playerId, isNotNull);
  }, skip: liveUrl == null ? 'ANIMEWHO_LIVE_URL non défini' : false);

  test('partie complète contre l’ordinateur, avec coupure/reconnexion et revanche', () async {
    final store = InMemoryStore();
    final c = liveContainer(store);
    addTearDown(c.dispose);
    final controller = c.read(gameControllerProvider.notifier);

    await waitFor(c, (s) => s.isConnected && s.myPlayerId != null, what: 'connexion + session');
    final sessionToken = store.getString(StoreKeys.sessionToken);
    expect(sessionToken, isNotNull, reason: 'jeton de session persisté');
    final myId = c.read(gameControllerProvider).myPlayerId;

    controller.setMyName('Testeur Flutter');
    controller.playVsBot(BotLevel.easy);
    await waitFor(c, (s) => s.phase == GamePhase.selection && s.characters.length == 24, what: 'sélection');
    final board = c.read(gameControllerProvider).characters;
    expect(c.read(gameControllerProvider).roomMode, RoomMode.bot);
    controller.selectCharacter(board.first.id);
    await waitFor(c, (s) => s.phase == GamePhase.playing, what: 'début de partie');
    final roomCode = c.read(gameControllerProvider).roomCode;

    var eliminated = <String>{};
    var handledLog = 0;
    var reconnected = false;
    var questions = 0;
    var guesses = 0;

    final end = DateTime.now().add(const Duration(minutes: 3));
    while (c.read(gameControllerProvider).phase == GamePhase.playing) {
      if (DateTime.now().isAfter(end)) fail('partie trop longue');
      final s = c.read(gameControllerProvider);

      // Tirer les conséquences de mes questions vérifiées (comme le bouton « Les écarter »).
      for (final entry in s.gameLog.skip(handledLog)) {
        if (entry is QnaEntry && entry.askerId == myId && entry.verified) {
          eliminated = {
            ...eliminated,
            ...Board.ruledOut(
              characters: s.characters,
              eliminated: eliminated,
              attribute: entry.attribute!,
              value: entry.value!,
              answer: entry.answer,
            ),
          };
        } else if (entry is GuessEntry && entry.guesserId == myId) {
          eliminated = {...eliminated, entry.guessedCharacterId};
        }
      }
      handledLog = s.gameLog.length;

      // Coupure réseau simulée après la 1re réponse : la partie doit être rendue.
      if (!reconnected && questions >= 1 && s.gameLog.isNotEmpty) {
        reconnected = true;
        controller.syncEliminations(eliminated);
        await Future<void>.delayed(const Duration(milliseconds: 200));
        c.read(gameSocketProvider).reconnect();
        // L'instantané renvoyé à la reconnexion remplace le journal (entrées « restored-* »).
        await waitFor(
          c,
          (st) => st.isConnected && st.gameLog.isNotEmpty && st.gameLog.every((e) => e.isRestored),
          what: 'reconnexion et état restauré',
        );
        final after = c.read(gameControllerProvider);
        expect(after.roomCode, roomCode, reason: 'même salle après reconnexion');
        expect(after.myPlayerId, myId, reason: 'même joueur grâce au jeton de session');
        expect(after.myCharacterId, board.first.id);
        expect(after.myEliminatedIds.toSet(), eliminated, reason: 'éliminations restaurées par le serveur');
        expect(after.gameLog.every((e) => e.isRestored), isTrue);
        continue;
      }

      if (s.canAct) {
        controller.syncEliminations(eliminated);
        final candidates = Board.guessable(s.characters, eliminated);
        if (candidates.length == 1) {
          controller.makeGuess(candidates.single.id);
          guesses++;
        } else {
          final (attribute, value) = bestQuestion(candidates);
          controller.askVerifiedQuestion(attribute, value);
          questions++;
        }
        final logLength = s.gameLog.length;
        await waitFor(
          c,
          (st) => st.phase != GamePhase.playing || st.gameLog.length > logLength,
          what: 'réponse du serveur',
        );
      } else {
        await Future<void>.delayed(const Duration(milliseconds: 50));
      }
    }

    final ended = c.read(gameControllerProvider);
    expect(ended.phase, GamePhase.ended);
    expect(ended.winnerId, isNotNull);
    expect(ended.gameOverReason, isNotNull);
    expect(ended.revealedOpponentCharacter, isNotNull, reason: 'secret de l’ordinateur révélé à la fin');
    expect(reconnected, isTrue);
    // ignore: avoid_print
    print('Partie terminée : ${ended.isWinner ? 'VICTOIRE' : 'défaite'} '
        '(${ended.gameOverReason!.wire}), $questions question(s), $guesses tentative(s), '
        'secret de l’ordinateur : ${ended.revealedOpponentCharacter!.name}');

    // Revanche : l'ordinateur accepte toujours.
    controller.requestRematch();
    await waitFor(c, (st) => st.phase == GamePhase.selection, what: 'revanche');
    expect(c.read(gameControllerProvider).gameLog, isEmpty);

    controller.leaveGame();
    expect(c.read(gameControllerProvider).phase, GamePhase.home);
  }, timeout: const Timeout(Duration(minutes: 4)), skip: liveUrl == null ? 'ANIMEWHO_LIVE_URL non défini' : false);

  test('partie privée : deux clients de l’app se rejoignent par code', () async {
    final a = liveContainer(InMemoryStore());
    final b = liveContainer(InMemoryStore());
    addTearDown(a.dispose);
    addTearDown(b.dispose);
    // Le serveur doit reconnaître l'app (handshake `client: "mobile"`, sans Origin).
    final sessionsA = <SessionEvent>[];
    final sub = a.read(gameSocketProvider).events.listen((e) {
      if (e is SessionEvent) sessionsA.add(e);
    });
    addTearDown(sub.cancel);
    final ca = a.read(gameControllerProvider.notifier);
    final cb = b.read(gameControllerProvider.notifier);
    await waitFor(a, (s) => s.isConnected && s.myPlayerId != null);
    await waitFor(b, (s) => s.isConnected && s.myPlayerId != null);
    ca.setMyName('Hôte');
    cb.setMyName('Invité');
    ca.createPrivateRoom();
    await waitFor(a, (s) => s.phase == GamePhase.lobby && s.roomCode != null, what: 'salle créée');
    cb.joinRoom(a.read(gameControllerProvider).roomCode!.toLowerCase());
    await waitFor(a, (s) => s.phase == GamePhase.selection);
    await waitFor(b, (s) => s.phase == GamePhase.selection);
    expect(b.read(gameControllerProvider).opponent?.name, 'Hôte');

    final boardA = a.read(gameControllerProvider).characters;
    ca.selectCharacter(boardA[0].id);
    cb.selectCharacter(boardA[1].id);
    await waitFor(a, (s) => s.phase == GamePhase.playing);
    await waitFor(b, (s) => s.phase == GamePhase.playing);

    // Celui dont c'est le tour pose une question libre, l'autre répond.
    final (asker, answerer) = a.read(gameControllerProvider).isMyTurn ? (a, b) : (b, a);
    asker.read(gameControllerProvider.notifier).askQuestion('Porte-t-il un chapeau ?');
    await waitFor(answerer, (s) => s.pendingQuestion == 'Porte-t-il un chapeau ?', what: 'question reçue');
    expect(asker.read(gameControllerProvider).awaitingAnswerFor, 'Porte-t-il un chapeau ?');
    answerer.read(gameControllerProvider.notifier).answerQuestion(Answer.no);
    await waitFor(asker, (s) => s.gameLog.isNotEmpty && s.awaitingAnswerFor == null);
    expect((asker.read(gameControllerProvider).gameLog.single as QnaEntry).verified, isFalse);

    // Réaction relayée à l'adversaire.
    asker.read(gameControllerProvider.notifier).sendReaction('👏');
    await waitFor(answerer, (s) => s.reactions.any((r) => r.emoji == '👏'), what: 'réaction');

    // L'hôte abandonne : l'invité gagne par abandon.
    ca.leaveGame();
    await waitFor(b, (s) => s.phase == GamePhase.ended && s.gameOverReason == GameOverReason.opponentLeft);
    expect(b.read(gameControllerProvider).isWinner, isTrue);

    // Modération : l'invité peut encore signaler et bloquer celui qui vient de partir.
    cb.reportOpponent(ReportReason.spam);
    cb.blockOpponent();
    await waitFor(b, (s) => s.blockedPlayers.any((p) => p.name == 'Hôte'), what: 'player_blocked');
    if (sessionsA.isNotEmpty && sessionsA.first.client != null) {
      expect(sessionsA.first.client, 'mobile', reason: 'reconnu comme app mobile');
    }
  }, timeout: const Timeout(Duration(minutes: 2)), skip: liveUrl == null ? 'ANIMEWHO_LIVE_URL non défini' : false);

  test('version trop ancienne : app_outdated, écran de mise à jour', () async {
    final store = InMemoryStore();
    final c = ProviderContainer(overrides: [
      appConfigProvider.overrideWithValue(AppConfig(
        apiBaseUrl: outdatedUrl!,
        enableAdMob: false,
        revenueCatAppleKey: '',
        revenueCatGoogleKey: '',
        verboseAnalytics: false,
      )),
      keyValueStoreProvider.overrideWithValue(store),
      adsServiceProvider.overrideWithValue(FakeAdsService()),
      purchasesServiceProvider.overrideWithValue(FakePurchasesService()),
      analyticsProvider.overrideWithValue(RecordingAnalyticsService()),
    ]);
    addTearDown(c.dispose);
    c.read(gameControllerProvider);
    await waitFor(c, (s) => s.appOutdatedMessage != null, what: 'app_outdated');
    expect(c.read(gameControllerProvider).appOutdatedMessage, isNotEmpty);
    expect(c.read(gameControllerProvider).isConnected, isFalse);
    // ignore: avoid_print
    print('app_outdated : « ${c.read(gameControllerProvider).appOutdatedMessage} »');
  }, skip: outdatedUrl == null ? 'ANIMEWHO_OUTDATED_URL non défini' : false);
}

/// Serveur lancé avec MIN_MOBILE_VERSION > version de l'app (facultatif).
final String? outdatedUrl = Platform.environment['ANIMEWHO_OUTDATED_URL'];
