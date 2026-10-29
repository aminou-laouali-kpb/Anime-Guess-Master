import 'package:animewho/domain/monetization/ad_config.dart';
import 'package:animewho/domain/monetization/ad_policy.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const policy = AdPolicy(AdConfig());
  final install = DateTime(2027, 2, 1, 10);

  /// Historique « mûr » : installé depuis 2 jours, 6 parties, aucune pub.
  AdHistory mature({DateTime? at}) {
    var h = AdHistory.fresh(install);
    for (var i = 0; i < 6; i++) {
      h = h.recordGameCompleted(won: i.isEven);
    }
    return h;
  }

  final later = install.add(const Duration(days: 2));

  InterstitialRequest req(
    DateTime now, {
    bool noAds = false,
    Duration? duration = const Duration(minutes: 4),
    bool humanWaiting = false,
    AdScreen screen = AdScreen.ended,
  }) =>
      InterstitialRequest(
        now: now,
        hasNoAds: noAds,
        lastGameDuration: duration,
        humanWaiting: humanWaiting,
        screen: screen,
      );

  group('interstitiel int_post_game', () {
    test('cas nominal : toutes les conditions remplies', () {
      expect(policy.interstitial(mature(), req(later)).shouldShow, isTrue);
    });

    test('jamais avant la 4e partie terminée', () {
      var h = AdHistory.fresh(install);
      for (var i = 0; i < 3; i++) {
        h = h.recordGameCompleted(won: true);
      }
      expect(policy.interstitial(h, req(later)).skipReason, InterstitialSkipReason.tooFewGames);
      h = h.recordGameCompleted(won: true);
      expect(policy.interstitial(h, req(later)).shouldShow, isTrue);
    });

    test('jamais pendant les 24 premières heures', () {
      final h = mature();
      expect(policy.interstitial(h, req(install.add(const Duration(hours: 23)))).skipReason,
          InterstitialSkipReason.installTooRecent);
      expect(policy.interstitial(h, req(install.add(const Duration(hours: 24)))).shouldShow, isTrue);
    });

    test('pas après 2 défaites consécutives', () {
      final h = mature().recordGameCompleted(won: false).recordGameCompleted(won: false);
      expect(policy.interstitial(h, req(later)).skipReason, InterstitialSkipReason.lossStreak);
      expect(policy.interstitial(h, req(later)).analyticsReason, 'loss_streak');
      // Une victoire remet la série à zéro.
      expect(policy.interstitial(h.recordGameCompleted(won: true), req(later)).shouldShow, isTrue);
      // Le réglage Remote Config peut couper la règle.
      const lax = AdPolicy(AdConfig(intSkipAfterLossStreak: false));
      expect(lax.interstitial(h, req(later)).shouldShow, isTrue);
    });

    test('jamais en revanche / quand un humain attend', () {
      expect(policy.interstitial(mature(), req(later, humanWaiting: true)).skipReason,
          InterstitialSkipReason.humanWaiting);
    });

    test('jamais sur les écrans Sélection / Partie', () {
      expect(policy.interstitial(mature(), req(later, screen: AdScreen.selection)).skipReason,
          InterstitialSkipReason.wrongScreen);
      expect(policy.interstitial(mature(), req(later, screen: AdScreen.playing)).skipReason,
          InterstitialSkipReason.wrongScreen);
    });

    test('jamais avec Sans pub', () {
      expect(policy.interstitial(mature(), req(later, noAds: true)).skipReason, InterstitialSkipReason.noAds);
    });

    test('2 parties et 180 s entre deux interstitiels', () {
      var h = mature().recordInterstitialShown(later);
      final t1 = later.add(const Duration(minutes: 10));
      expect(policy.interstitial(h, req(t1)).skipReason, InterstitialSkipReason.gamesBetween);
      h = h.recordGameCompleted(won: true);
      expect(policy.interstitial(h, req(t1)).skipReason, InterstitialSkipReason.gamesBetween);
      h = h.recordGameCompleted(won: true);
      expect(policy.interstitial(h, req(t1)).shouldShow, isTrue);
      expect(policy.interstitial(h, req(later.add(const Duration(seconds: 100)))).skipReason,
          InterstitialSkipReason.interval);
    });

    test('plafond de 6 par jour, remis à zéro le lendemain', () {
      var h = mature();
      var t = later;
      for (var i = 0; i < 6; i++) {
        expect(policy.interstitial(h, req(t)).shouldShow, isTrue, reason: 'pub n°${i + 1}');
        h = h.recordInterstitialShown(t).recordGameCompleted(won: true).recordGameCompleted(won: true);
        t = t.add(const Duration(minutes: 5));
      }
      expect(policy.interstitial(h, req(t)).skipReason, InterstitialSkipReason.dailyCap);
      expect(policy.interstitial(h, req(t.add(const Duration(days: 1)))).shouldShow, isTrue);
    });

    test('partie trop courte (< 60 s)', () {
      expect(policy.interstitial(mature(), req(later, duration: const Duration(seconds: 30))).skipReason,
          InterstitialSkipReason.gameTooShort);
      // Durée inconnue (reprise) : la règle ne bloque pas.
      expect(policy.interstitial(mature(), req(later, duration: null)).shouldShow, isTrue);
    });

    test('silence après un achat (10 min) et après une vidéo (120 s)', () {
      final bought = mature().recordPurchase(later.subtract(const Duration(minutes: 5)));
      expect(policy.interstitial(bought, req(later)).skipReason, InterstitialSkipReason.recentPurchase);
      final watched = mature().recordRewardedShown(AdPlacement.rwFreeShards, later.subtract(const Duration(seconds: 60)));
      expect(policy.interstitial(watched, req(later)).skipReason, InterstitialSkipReason.recentRewarded);
      expect(policy.interstitial(watched, req(later.add(const Duration(seconds: 61)))).shouldShow, isTrue);
    });
  });

  group('vidéos récompensées', () {
    test('max 10 par jour toutes sources confondues', () {
      // Plafonds par emplacement relevés pour isoler la règle globale.
      const generous = AdPolicy(AdConfig(rwDoubleDailyCap: 50, rwFreeShardsDailyCap: 50));
      var h = AdHistory.fresh(install);
      for (var i = 0; i < 10; i++) {
        final p = i.isEven ? AdPlacement.rwDoubleShards : AdPlacement.rwFreeShards;
        expect(generous.rewarded(h, p, now: later, screen: AdScreen.home).allowed, isTrue, reason: 'vidéo n°${i + 1}');
        h = h.recordRewardedShown(p, later);
      }
      expect(generous.rewarded(h, AdPlacement.rwFreeShards, now: later, screen: AdScreen.home).skipReason,
          RewardedSkipReason.totalDailyCap);
      // Le lendemain, les compteurs repartent de zéro.
      expect(generous.rewarded(h, AdPlacement.rwFreeShards, now: later.add(const Duration(days: 1)), screen: AdScreen.home)
          .allowed, isTrue);
    });

    test('plafonds par emplacement : doubler 5, éclats gratuits 3, coffre bonus 1', () {
      var h = AdHistory.fresh(install);
      for (var i = 0; i < 5; i++) {
        expect(policy.rewarded(h, AdPlacement.rwDoubleShards, now: later, screen: AdScreen.ended).allowed, isTrue);
        h = h.recordRewardedShown(AdPlacement.rwDoubleShards, later);
      }
      expect(policy.rewarded(h, AdPlacement.rwDoubleShards, now: later, screen: AdScreen.ended).skipReason,
          RewardedSkipReason.placementDailyCap);
      for (var i = 0; i < 3; i++) {
        h = h.recordRewardedShown(AdPlacement.rwFreeShards, later);
      }
      expect(policy.rewarded(h, AdPlacement.rwFreeShards, now: later, screen: AdScreen.home).skipReason,
          RewardedSkipReason.placementDailyCap);
      h = h.recordRewardedShown(AdPlacement.rwDailyChest, later);
      expect(policy.rewarded(h, AdPlacement.rwDailyChest, now: later, screen: AdScreen.home).skipReason,
          RewardedSkipReason.placementDailyCap);
    });

    test('aucune vidéo pendant une partie contre un humain', () {
      final h = AdHistory.fresh(install);
      expect(policy.rewarded(h, AdPlacement.rwFreeShards, now: later, screen: AdScreen.playing).allowed, isFalse);
      expect(policy.rewarded(h, AdPlacement.rwBotHint, now: later, screen: AdScreen.playing).skipReason,
          RewardedSkipReason.wrongScreen);
      // Contre l'ordinateur : prévu mais en attente des événements serveur.
      expect(policy.rewarded(h, AdPlacement.rwBotHint, now: later, screen: AdScreen.playing, vsBot: true).skipReason,
          RewardedSkipReason.notAvailableYet);
    });
  });

  group('bannières', () {
    test('seulement Accueil, File d’attente, Classement ; jamais en partie ; jamais avec Sans pub', () {
      expect(policy.bannerAllowed(AdPlacement.banHome, screen: AdScreen.home, hasNoAds: false), isTrue);
      expect(policy.bannerAllowed(AdPlacement.banQueue, screen: AdScreen.queue, hasNoAds: false), isTrue);
      expect(policy.bannerAllowed(AdPlacement.banLeaderboard, screen: AdScreen.leaderboard, hasNoAds: false), isTrue);
      expect(policy.bannerAllowed(AdPlacement.banHome, screen: AdScreen.playing, hasNoAds: false), isFalse);
      expect(policy.bannerAllowed(AdPlacement.banHome, screen: AdScreen.selection, hasNoAds: false), isFalse);
      expect(policy.bannerAllowed(AdPlacement.banHome, screen: AdScreen.home, hasNoAds: true), isFalse);
      const off = AdPolicy(AdConfig(bannersEnabled: false));
      expect(off.bannerAllowed(AdPlacement.banHome, screen: AdScreen.home, hasNoAds: false), isFalse);
    });
  });

  group('proposition Sans pub et ATT', () {
    test('après le 10e interstitiel, puis au plus une fois par mois', () {
      var h = mature();
      var t = later;
      for (var i = 0; i < 10; i++) {
        h = h.recordInterstitialShown(t);
        t = t.add(const Duration(hours: 5));
      }
      expect(policy.shouldShowNoAdsUpsell(h, now: t, hasNoAds: false), isTrue);
      expect(policy.shouldShowNoAdsUpsell(h, now: t, hasNoAds: true), isFalse);
      h = h.recordNoAdsUpsell(t);
      expect(policy.shouldShowNoAdsUpsell(h, now: t.add(const Duration(days: 10)), hasNoAds: false), isFalse);
      expect(policy.shouldShowNoAdsUpsell(h, now: t.add(const Duration(days: 31)), hasNoAds: false), isTrue);
    });

    test('ATT demandé après la 2e partie, une seule fois', () {
      var h = AdHistory.fresh(install).recordGameCompleted(won: true);
      expect(policy.shouldAskTracking(h), isFalse);
      h = h.recordGameCompleted(won: false);
      expect(policy.shouldAskTracking(h), isTrue);
      expect(policy.shouldAskTracking(h.markTrackingPromptDone()), isFalse);
    });
  });

  test('AdHistory : aller-retour JSON', () {
    final h = mature().recordInterstitialShown(later).recordRewardedShown(AdPlacement.rwFreeShards, later);
    final back = AdHistory.fromJson(h.toJson(), fallbackNow: DateTime(2000));
    expect(back.toJson(), h.toJson());
  });
}
