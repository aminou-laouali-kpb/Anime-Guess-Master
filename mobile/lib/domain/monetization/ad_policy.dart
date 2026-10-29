import 'ad_config.dart';

/// Emplacements publicitaires (MONETISATION_SPEC §4.1). [id] = nom du bloc AdMob.
enum AdPlacement {
  rwDoubleShards('rw_double_shards', AdFormat.rewarded),
  rwDailyChest('rw_daily_chest', AdFormat.rewarded),
  rwFreeShards('rw_free_shards', AdFormat.rewarded),
  // Prévus par la spec mais en attente des événements serveur `use_bot_hint` /
  // `use_bot_extra_life` : pas encore proposés dans l'app.
  rwBotHint('rw_bot_hint', AdFormat.rewarded),
  rwBotExtraLife('rw_bot_extra_life', AdFormat.rewarded),
  intPostGame('int_post_game', AdFormat.interstitial),
  banHome('ban_home', AdFormat.banner),
  banQueue('ban_queue', AdFormat.banner),
  banLeaderboard('ban_leaderboard', AdFormat.banner);

  const AdPlacement(this.id, this.format);
  final String id;
  final AdFormat format;
}

enum AdFormat { banner, interstitial, rewarded }

/// Écrans de l'app, pour la règle « où la pub est permise ».
enum AdScreen { home, queue, lobby, leaderboard, selection, playing, ended, shop, reconnecting, onboarding, consent }

enum InterstitialSkipReason {
  noAds,
  humanWaiting,
  wrongScreen,
  tooFewGames,
  installTooRecent,
  gamesBetween,
  interval,
  dailyCap,
  gameTooShort,
  lossStreak,
  recentPurchase,
  recentRewarded,
}

enum RewardedSkipReason { wrongScreen, totalDailyCap, placementDailyCap, notAvailableYet }

class InterstitialDecision {
  const InterstitialDecision.show() : skipReason = null;
  const InterstitialDecision.skip(InterstitialSkipReason this.skipReason);
  final InterstitialSkipReason? skipReason;
  bool get shouldShow => skipReason == null;

  /// Valeur du paramètre analytics `skip_reason`.
  String? get analyticsReason => switch (skipReason) {
        null => null,
        InterstitialSkipReason.dailyCap => 'cap',
        InterstitialSkipReason.lossStreak => 'loss_streak',
        InterstitialSkipReason.interval => 'interval',
        final r => _snake(r.name),
      };
}

class RewardedDecision {
  const RewardedDecision.allowed() : skipReason = null;
  const RewardedDecision.denied(RewardedSkipReason this.skipReason);
  final RewardedSkipReason? skipReason;
  bool get allowed => skipReason == null;
}

String _snake(String camel) => camel.replaceAllMapped(RegExp('[A-Z]'), (m) => '_${m[0]!.toLowerCase()}');

/// Clé de jour local (AAAA-MM-JJ) pour les plafonds quotidiens.
String dayKey(DateTime t) =>
    '${t.year.toString().padLeft(4, '0')}-${t.month.toString().padLeft(2, '0')}-${t.day.toString().padLeft(2, '0')}';

/// Historique publicitaire de l'appareil. Immuable et sérialisable (persisté
/// localement). Toutes les règles de fréquence en dépendent.
class AdHistory {
  const AdHistory({
    required this.installedAt,
    this.gamesCompleted = 0,
    this.gamesSinceLastInterstitial = 0,
    this.consecutiveLosses = 0,
    this.lastInterstitialAt,
    this.lastPurchaseAt,
    this.lastRewardedAt,
    this.day = '',
    this.interstitialsToday = 0,
    this.rewardedToday = 0,
    this.rewardedTodayByPlacement = const {},
    this.interstitialsSeenTotal = 0,
    this.lastNoAdsUpsellAt,
    this.trackingPromptDone = false,
  });

  factory AdHistory.fresh(DateTime now) => AdHistory(installedAt: now, day: dayKey(now));

  final DateTime installedAt;
  final int gamesCompleted;
  final int gamesSinceLastInterstitial;
  final int consecutiveLosses;
  final DateTime? lastInterstitialAt;
  final DateTime? lastPurchaseAt;
  final DateTime? lastRewardedAt;

  /// Jour des compteurs quotidiens ci-dessous.
  final String day;
  final int interstitialsToday;
  final int rewardedToday;
  final Map<String, int> rewardedTodayByPlacement;
  final int interstitialsSeenTotal;
  final DateTime? lastNoAdsUpsellAt;
  final bool trackingPromptDone;

  /// Compteurs du jour remis à zéro si [now] est un autre jour.
  AdHistory rolledTo(DateTime now) {
    final today = dayKey(now);
    if (today == day) return this;
    return _copy(day: today, interstitialsToday: 0, rewardedToday: 0, rewardedTodayByPlacement: const {});
  }

  AdHistory recordGameCompleted({required bool won}) => _copy(
        gamesCompleted: gamesCompleted + 1,
        gamesSinceLastInterstitial: gamesSinceLastInterstitial + 1,
        consecutiveLosses: won ? 0 : consecutiveLosses + 1,
      );

  AdHistory recordInterstitialShown(DateTime now) {
    final h = rolledTo(now);
    return h._copy(
      lastInterstitialAt: now,
      gamesSinceLastInterstitial: 0,
      interstitialsToday: h.interstitialsToday + 1,
      interstitialsSeenTotal: h.interstitialsSeenTotal + 1,
    );
  }

  AdHistory recordRewardedShown(AdPlacement placement, DateTime now) {
    final h = rolledTo(now);
    return h._copy(
      lastRewardedAt: now,
      rewardedToday: h.rewardedToday + 1,
      rewardedTodayByPlacement: {
        ...h.rewardedTodayByPlacement,
        placement.id: (h.rewardedTodayByPlacement[placement.id] ?? 0) + 1,
      },
    );
  }

  AdHistory recordPurchase(DateTime now) => _copy(lastPurchaseAt: now);
  AdHistory recordNoAdsUpsell(DateTime now) => _copy(lastNoAdsUpsellAt: now);
  AdHistory markTrackingPromptDone() => _copy(trackingPromptDone: true);

  AdHistory _copy({
    int? gamesCompleted,
    int? gamesSinceLastInterstitial,
    int? consecutiveLosses,
    DateTime? lastInterstitialAt,
    DateTime? lastPurchaseAt,
    DateTime? lastRewardedAt,
    String? day,
    int? interstitialsToday,
    int? rewardedToday,
    Map<String, int>? rewardedTodayByPlacement,
    int? interstitialsSeenTotal,
    DateTime? lastNoAdsUpsellAt,
    bool? trackingPromptDone,
  }) =>
      AdHistory(
        installedAt: installedAt,
        gamesCompleted: gamesCompleted ?? this.gamesCompleted,
        gamesSinceLastInterstitial: gamesSinceLastInterstitial ?? this.gamesSinceLastInterstitial,
        consecutiveLosses: consecutiveLosses ?? this.consecutiveLosses,
        lastInterstitialAt: lastInterstitialAt ?? this.lastInterstitialAt,
        lastPurchaseAt: lastPurchaseAt ?? this.lastPurchaseAt,
        lastRewardedAt: lastRewardedAt ?? this.lastRewardedAt,
        day: day ?? this.day,
        interstitialsToday: interstitialsToday ?? this.interstitialsToday,
        rewardedToday: rewardedToday ?? this.rewardedToday,
        rewardedTodayByPlacement: rewardedTodayByPlacement ?? this.rewardedTodayByPlacement,
        interstitialsSeenTotal: interstitialsSeenTotal ?? this.interstitialsSeenTotal,
        lastNoAdsUpsellAt: lastNoAdsUpsellAt ?? this.lastNoAdsUpsellAt,
        trackingPromptDone: trackingPromptDone ?? this.trackingPromptDone,
      );

  Map<String, dynamic> toJson() => {
        'installedAt': installedAt.toIso8601String(),
        'gamesCompleted': gamesCompleted,
        'gamesSinceLastInterstitial': gamesSinceLastInterstitial,
        'consecutiveLosses': consecutiveLosses,
        'lastInterstitialAt': lastInterstitialAt?.toIso8601String(),
        'lastPurchaseAt': lastPurchaseAt?.toIso8601String(),
        'lastRewardedAt': lastRewardedAt?.toIso8601String(),
        'day': day,
        'interstitialsToday': interstitialsToday,
        'rewardedToday': rewardedToday,
        'rewardedTodayByPlacement': rewardedTodayByPlacement,
        'interstitialsSeenTotal': interstitialsSeenTotal,
        'lastNoAdsUpsellAt': lastNoAdsUpsellAt?.toIso8601String(),
        'trackingPromptDone': trackingPromptDone,
      };

  factory AdHistory.fromJson(Map<String, dynamic> json, {required DateTime fallbackNow}) {
    DateTime? date(String k) => json[k] is String ? DateTime.tryParse(json[k] as String) : null;
    int n(String k) => (json[k] as num?)?.toInt() ?? 0;
    final byPlacement = json['rewardedTodayByPlacement'];
    return AdHistory(
      installedAt: date('installedAt') ?? fallbackNow,
      gamesCompleted: n('gamesCompleted'),
      gamesSinceLastInterstitial: n('gamesSinceLastInterstitial'),
      consecutiveLosses: n('consecutiveLosses'),
      lastInterstitialAt: date('lastInterstitialAt'),
      lastPurchaseAt: date('lastPurchaseAt'),
      lastRewardedAt: date('lastRewardedAt'),
      day: json['day'] as String? ?? '',
      interstitialsToday: n('interstitialsToday'),
      rewardedToday: n('rewardedToday'),
      rewardedTodayByPlacement: byPlacement is Map
          ? {for (final e in byPlacement.entries) '${e.key}': (e.value as num?)?.toInt() ?? 0}
          : const {},
      interstitialsSeenTotal: n('interstitialsSeenTotal'),
      lastNoAdsUpsellAt: date('lastNoAdsUpsellAt'),
      trackingPromptDone: json['trackingPromptDone'] == true,
    );
  }
}

/// Contexte d'une demande d'interstitiel (`int_post_game`).
class InterstitialRequest {
  const InterstitialRequest({
    required this.now,
    required this.hasNoAds,
    required this.lastGameDuration,
    required this.humanWaiting,
    this.screen = AdScreen.ended,
  });

  final DateTime now;

  /// Droit `no_ads` ou `plus`.
  final bool hasNoAds;

  /// Durée de la partie qui vient de finir (null = inconnue, ex. reprise).
  final Duration? lastGameDuration;

  /// Un adversaire humain attend (revanche demandée/acceptée, salle privée…).
  final bool humanWaiting;

  /// Écran que l'on quitte.
  final AdScreen screen;
}

/// Règles de fréquence publicitaire. Classe PURE (aucune E/S, l'heure est
/// fournie) : entièrement couverte par test/unit/ad_policy_test.dart.
class AdPolicy {
  const AdPolicy(this.config);
  final AdConfig config;

  /// Aucune publicité pendant une partie contre un humain ni pendant les
  /// écrans sensibles (reconnexion, achat, onboarding, consentement).
  static const Set<AdScreen> adFreeScreens = {
    AdScreen.selection,
    AdScreen.playing,
    AdScreen.shop,
    AdScreen.reconnecting,
    AdScreen.onboarding,
    AdScreen.consent,
  };

  /// Écrans où chaque bannière peut s'afficher (§4.1).
  static const Map<AdPlacement, Set<AdScreen>> bannerScreens = {
    AdPlacement.banHome: {AdScreen.home},
    AdPlacement.banQueue: {AdScreen.queue, AdScreen.lobby},
    AdPlacement.banLeaderboard: {AdScreen.leaderboard},
  };

  bool bannerAllowed(AdPlacement placement, {required AdScreen screen, required bool hasNoAds}) =>
      placement.format == AdFormat.banner &&
      config.bannersEnabled &&
      !hasNoAds &&
      (bannerScreens[placement]?.contains(screen) ?? false) &&
      !adFreeScreens.contains(screen);

  InterstitialDecision interstitial(AdHistory history, InterstitialRequest req) {
    final h = history.rolledTo(req.now);
    if (req.hasNoAds) return const InterstitialDecision.skip(InterstitialSkipReason.noAds);
    if (req.humanWaiting) return const InterstitialDecision.skip(InterstitialSkipReason.humanWaiting);
    if (adFreeScreens.contains(req.screen)) return const InterstitialDecision.skip(InterstitialSkipReason.wrongScreen);
    if (h.gamesCompleted < config.intMinGamesLifetime) {
      return const InterstitialDecision.skip(InterstitialSkipReason.tooFewGames);
    }
    if (req.now.difference(h.installedAt) < Duration(hours: config.intMinInstallAgeHours)) {
      return const InterstitialDecision.skip(InterstitialSkipReason.installTooRecent);
    }
    // Le tout premier interstitiel n'attend pas « N parties depuis le dernier ».
    if (h.lastInterstitialAt != null && h.gamesSinceLastInterstitial < config.intGamesBetween) {
      return const InterstitialDecision.skip(InterstitialSkipReason.gamesBetween);
    }
    if (h.lastInterstitialAt != null &&
        req.now.difference(h.lastInterstitialAt!) < Duration(seconds: config.intMinIntervalSeconds)) {
      return const InterstitialDecision.skip(InterstitialSkipReason.interval);
    }
    if (h.interstitialsToday >= config.intDailyCap) {
      return const InterstitialDecision.skip(InterstitialSkipReason.dailyCap);
    }
    final duration = req.lastGameDuration;
    if (duration != null && duration < Duration(seconds: config.intMinGameDurationSeconds)) {
      return const InterstitialDecision.skip(InterstitialSkipReason.gameTooShort);
    }
    if (config.intSkipAfterLossStreak && h.consecutiveLosses >= config.intLossStreakLength) {
      return const InterstitialDecision.skip(InterstitialSkipReason.lossStreak);
    }
    if (h.lastPurchaseAt != null &&
        req.now.difference(h.lastPurchaseAt!) < Duration(seconds: config.intQuietAfterPurchaseSeconds)) {
      return const InterstitialDecision.skip(InterstitialSkipReason.recentPurchase);
    }
    if (h.lastRewardedAt != null &&
        req.now.difference(h.lastRewardedAt!) < Duration(seconds: config.intQuietAfterRewardedSeconds)) {
      return const InterstitialDecision.skip(InterstitialSkipReason.recentRewarded);
    }
    return const InterstitialDecision.show();
  }

  int? placementDailyCap(AdPlacement placement) => switch (placement) {
        AdPlacement.rwDoubleShards => config.rwDoubleDailyCap,
        AdPlacement.rwFreeShards => config.rwFreeShardsDailyCap,
        AdPlacement.rwDailyChest => config.rwDailyChestDailyCap,
        _ => null,
      };

  /// Vidéo récompensée : toujours volontaire, plafonnée (10/jour au total, et
  /// par emplacement), jamais pendant une partie contre un humain. Les vidéos
  /// restent permises aux détenteurs de `no_ads` (elles sont choisies).
  RewardedDecision rewarded(
    AdHistory history,
    AdPlacement placement, {
    required DateTime now,
    required AdScreen screen,
    bool vsBot = false,
  }) {
    final h = history.rolledTo(now);
    if (placement.format != AdFormat.rewarded) return const RewardedDecision.denied(RewardedSkipReason.wrongScreen);
    if (placement == AdPlacement.rwBotHint || placement == AdPlacement.rwBotExtraLife) {
      // TODO(serveur) : nécessite `use_bot_hint` / `use_bot_extra_life`.
      if (!vsBot) return const RewardedDecision.denied(RewardedSkipReason.wrongScreen);
      return const RewardedDecision.denied(RewardedSkipReason.notAvailableYet);
    }
    if (adFreeScreens.contains(screen)) return const RewardedDecision.denied(RewardedSkipReason.wrongScreen);
    if (h.rewardedToday >= config.rwTotalDailyCap) {
      return const RewardedDecision.denied(RewardedSkipReason.totalDailyCap);
    }
    final cap = placementDailyCap(placement);
    if (cap != null && (h.rewardedTodayByPlacement[placement.id] ?? 0) >= cap) {
      return const RewardedDecision.denied(RewardedSkipReason.placementDailyCap);
    }
    return const RewardedDecision.allowed();
  }

  /// Écran doux « Marre des pubs ? » après le 10e interstitiel, puis ≤ 1 fois/mois.
  bool shouldShowNoAdsUpsell(AdHistory h, {required DateTime now, required bool hasNoAds}) {
    if (hasNoAds || h.interstitialsSeenTotal < config.noAdsUpsellAfterInterstitials) return false;
    final last = h.lastNoAdsUpsellAt;
    return last == null || now.difference(last) >= Duration(days: config.noAdsUpsellRepeatDays);
  }

  /// ATT (iOS) : demandé après la 2e partie, jamais au premier lancement.
  bool shouldAskTracking(AdHistory h) => !h.trackingPromptDone && h.gamesCompleted >= config.attPromptAfterGames;
}
