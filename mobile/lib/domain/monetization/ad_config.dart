/// Réglages publicitaires de MONETISATION_SPEC.md §4.2 et §8.
///
/// Chaque champ correspond à une clé Firebase Remote Config (nom indiqué). Les
/// valeurs par défaut sont celles de la spec.
/// TODO(remote-config) : charger ces valeurs depuis Firebase Remote Config
/// (`AdConfig.fromRemoteConfig`) une fois Firebase ajouté au projet.
class AdConfig {
  const AdConfig({
    this.intMinGamesLifetime = 4,
    this.intMinInstallAgeHours = 24,
    this.intGamesBetween = 2,
    this.intMinIntervalSeconds = 180,
    this.intDailyCap = 6,
    this.intMinGameDurationSeconds = 60,
    this.intSkipAfterLossStreak = true,
    this.intLossStreakLength = 2,
    this.intQuietAfterPurchaseSeconds = 600,
    this.intQuietAfterRewardedSeconds = 120,
    this.rwTotalDailyCap = 10,
    this.rwDoubleDailyCap = 5,
    this.rwFreeShardsAmount = 30,
    this.rwFreeShardsDailyCap = 3,
    this.rwDailyChestDailyCap = 1,
    this.noAdsUpsellAfterInterstitials = 10,
    this.noAdsUpsellRepeatDays = 30,
    this.bannersEnabled = true,
    this.attPromptAfterGames = 2,
  });

  /// `int_min_games_lifetime`
  final int intMinGamesLifetime;

  /// `int_min_install_age_h`
  final int intMinInstallAgeHours;

  /// `int_games_between`
  final int intGamesBetween;

  /// `int_min_interval_s`
  final int intMinIntervalSeconds;

  /// `int_daily_cap`
  final int intDailyCap;

  /// `int_min_game_duration_s`
  final int intMinGameDurationSeconds;

  /// `int_skip_after_loss_streak`
  final bool intSkipAfterLossStreak;

  /// « Pas d'interstitiel après 2 défaites consécutives ».
  final int intLossStreakLength;

  /// `int_quiet_after_purchase_s`
  final int intQuietAfterPurchaseSeconds;

  /// `int_quiet_after_rewarded_s`
  final int intQuietAfterRewardedSeconds;

  /// `rw_total_daily_cap`
  final int rwTotalDailyCap;

  /// `rw_double_daily_cap`
  final int rwDoubleDailyCap;

  /// `rw_free_shards_amount`
  final int rwFreeShardsAmount;

  /// `rw_free_shards_daily_cap`
  final int rwFreeShardsDailyCap;

  /// Coffre bonus : 1 par jour (§4.1).
  final int rwDailyChestDailyCap;

  /// `noads_upsell_after_interstitials`
  final int noAdsUpsellAfterInterstitials;

  /// « puis au plus une fois par mois ».
  final int noAdsUpsellRepeatDays;

  /// `banners_enabled`
  final bool bannersEnabled;

  /// ATT demandé après la 2e partie (§4).
  final int attPromptAfterGames;
}
