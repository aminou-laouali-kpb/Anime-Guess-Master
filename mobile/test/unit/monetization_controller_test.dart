import 'dart:convert';

import 'package:animewho/application/monetization_controller.dart';
import 'package:animewho/data/monetization/ads_service.dart';
import 'package:animewho/data/monetization/purchases_service.dart';
import 'package:animewho/data/storage/key_value_store.dart';
import 'package:animewho/domain/models/protocol_models.dart';
import 'package:animewho/domain/monetization/ad_policy.dart';
import 'package:animewho/domain/monetization/products.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

void main() {
  final install = DateTime(2027, 2, 1, 10);

  test('startup : consentement AVANT l’initialisation du SDK pub', () async {
    final h = TestHarness(clock: () => install);
    final c = h.container();
    addTearDown(c.dispose);
    await c.read(monetizationControllerProvider.notifier).startup();
    expect(h.ads.initialized, isTrue);
    expect(h.analytics.names.first, 'consent_result');
  });

  test('interstitiel : refusé les premières parties, puis montré, jamais si un humain attend', () async {
    var now = install;
    final h = TestHarness(clock: () => now);
    final c = h.container();
    addTearDown(c.dispose);
    final m = c.read(monetizationControllerProvider.notifier);
    await Future<void>.delayed(Duration.zero);

    for (var i = 0; i < 4; i++) {
      await m.onGameFinished(gameRef: 'g$i', mode: RoomMode.quick, won: true);
    }
    var d = await m.maybeShowPostGameInterstitial(lastGameDuration: const Duration(minutes: 3), humanWaiting: false);
    expect(d.skipReason, InterstitialSkipReason.installTooRecent);

    now = install.add(const Duration(days: 2));
    d = await m.maybeShowPostGameInterstitial(lastGameDuration: const Duration(minutes: 3), humanWaiting: true);
    expect(d.skipReason, InterstitialSkipReason.humanWaiting);
    expect(h.ads.interstitialsShown, isEmpty);

    d = await m.maybeShowPostGameInterstitial(lastGameDuration: const Duration(minutes: 3), humanWaiting: false);
    expect(d.shouldShow, isTrue);
    expect(h.ads.interstitialsShown, [AdPlacement.intPostGame]);
    expect(c.read(monetizationControllerProvider).history.interstitialsToday, 1);
    // Historique persisté.
    final saved = jsonDecode(h.store.getString(StoreKeys.adHistory)!) as Map;
    expect(saved['interstitialsSeenTotal'], 1);
  });

  test('Sans pub : achat → plus d’interstitiel ni de bannière, vidéos toujours possibles', () async {
    final now = install.add(const Duration(days: 3));
    final h = TestHarness(clock: () => now);
    final c = h.container();
    addTearDown(c.dispose);
    final m = c.read(monetizationControllerProvider.notifier);
    await Future<void>.delayed(Duration.zero);
    for (var i = 0; i < 6; i++) {
      await m.onGameFinished(gameRef: 'g$i', mode: RoomMode.quick, won: true);
    }
    final outcome = await m.buy(Products.noAds);
    expect(outcome.status, PurchaseStatus.success);
    expect(c.read(monetizationControllerProvider).hasNoAds, isTrue);
    expect(m.bannerAllowed(AdPlacement.banHome, AdScreen.home), isFalse);
    final d = await m.maybeShowPostGameInterstitial(lastGameDuration: const Duration(minutes: 3), humanWaiting: false);
    expect(d.skipReason, InterstitialSkipReason.noAds);
    expect(m.rewardedDecision(AdPlacement.rwFreeShards, AdScreen.home).allowed, isTrue);
    expect(h.analytics.names, containsAll(['iap_start', 'iap_success']));
  });

  test('vidéo récompensée : crédit seulement si regardée jusqu’au bout', () async {
    final h = TestHarness(clock: () => install);
    final c = h.container();
    addTearDown(c.dispose);
    final m = c.read(monetizationControllerProvider.notifier);
    await Future<void>.delayed(Duration.zero);
    h.ads.rewardedOutcome = RewardedOutcome.dismissed;
    expect(await m.watchFreeShards(), isNull);
    expect(c.read(monetizationControllerProvider).wallet.balance, 0);
    h.ads.rewardedOutcome = RewardedOutcome.earned;
    expect(await m.watchFreeShards(), 30);
    expect(c.read(monetizationControllerProvider).wallet.balance, 30);
    expect(h.analytics.names, containsAll(['ad_rewarded_fail', 'ad_rewarded_complete', 'ad_reward_granted']));
  });

  test('doubler les Éclats de la partie, une seule fois', () async {
    final h = TestHarness(clock: () => install);
    final c = h.container();
    addTearDown(c.dispose);
    final m = c.read(monetizationControllerProvider.notifier);
    await Future<void>.delayed(Duration.zero);
    await m.onGameFinished(gameRef: 'g1', mode: RoomMode.private, won: false);
    expect(c.read(monetizationControllerProvider).wallet.balance, 10);
    expect(await m.doubleLastGameReward(), 10);
    expect(c.read(monetizationControllerProvider).wallet.balance, 20);
    expect(await m.doubleLastGameReward(), isNull);
  });

  test('coffre quotidien + coffre bonus vidéo', () async {
    final h = TestHarness(clock: () => install);
    final c = h.container();
    addTearDown(c.dispose);
    final m = c.read(monetizationControllerProvider.notifier);
    await Future<void>.delayed(Duration.zero);
    expect(m.canClaimBonusChest, isFalse, reason: 'le coffre gratuit d’abord');
    final r = await m.claimDailyChest();
    expect(r!.reward, 20);
    expect(m.canClaimDailyChest, isFalse);
    expect(m.canClaimBonusChest, isTrue);
    expect(await m.openBonusChest(), 30);
    expect(m.canClaimBonusChest, isFalse);
    expect(c.read(monetizationControllerProvider).wallet.balance, 50);
  });

  test('restaurer les achats', () async {
    final h = TestHarness(clock: () => install);
    final c = h.container();
    addTearDown(c.dispose);
    final m = c.read(monetizationControllerProvider.notifier);
    await h.purchases.purchase(Products.noAds); // achat fait « sur un autre appareil »
    final out = await m.restore();
    expect(out.success, isTrue);
    expect(c.read(monetizationControllerProvider).hasNoAds, isTrue);
    expect(h.analytics.names, contains('restore_purchases'));
  });

  test('ATT : proposé après la 2e partie', () async {
    final h = TestHarness(clock: () => install);
    final c = h.container();
    addTearDown(c.dispose);
    final m = c.read(monetizationControllerProvider.notifier);
    await m.onGameFinished(gameRef: 'a', mode: RoomMode.bot, won: true);
    expect(c.read(monetizationControllerProvider).trackingPromptPending, isFalse);
    await m.onGameFinished(gameRef: 'b', mode: RoomMode.bot, won: true);
    expect(c.read(monetizationControllerProvider).trackingPromptPending, isTrue);
    await m.requestTracking();
    expect(h.ads.trackingRequests, 1);
    expect(c.read(monetizationControllerProvider).history.trackingPromptDone, isTrue);
  });
}
