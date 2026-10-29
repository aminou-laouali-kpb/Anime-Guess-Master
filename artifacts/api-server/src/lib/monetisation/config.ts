import { logger } from "../logger";
import { minMobileVersion } from "../client-info";

// Remote configuration served to the app (GET /api/config). The app shows
// these values (Firebase Remote Config may override the display), but the
// caps that protect the economy are ENFORCED here, from the same values.
// Override any key with REMOTE_CONFIG_JSON='{"rw_free_shards_daily_cap":2}'.
// Keys and defaults: docs/business-plan/MONETISATION_SPEC.md §8.

export const REMOTE_CONFIG_DEFAULTS = {
  int_min_games_lifetime: 4,
  int_min_install_age_h: 24,
  int_games_between: 2,
  int_min_interval_s: 180,
  int_daily_cap: 6,
  int_min_game_duration_s: 60,
  int_skip_after_loss_streak: true,
  int_quiet_after_purchase_s: 600,
  int_quiet_after_rewarded_s: 120,
  rw_total_daily_cap: 10,
  rw_double_daily_cap: 5,
  rw_free_shards_amount: 30,
  rw_free_shards_daily_cap: 3,
  rw_daily_chest_amount: 30,
  rw_daily_chest_daily_cap: 1,
  rw_bot_hint_per_game: 1,
  noads_upsell_after_interstitials: 10,
  banners_enabled: true,
  starter_pack_window_days: 7,
  queue_bot_fallback_s: 20,
  shards_pvp_win: 20,
  shards_pvp_loss: 10,
  shards_bot_game: 5,
  shards_bot_daily_cap: 10,
} as const;

export type RemoteConfigKey = keyof typeof REMOTE_CONFIG_DEFAULTS;
export type RemoteConfig = { [K in RemoteConfigKey]: (typeof REMOTE_CONFIG_DEFAULTS)[K] extends boolean ? boolean : number };

let cached: { raw: string | undefined; value: RemoteConfig } | null = null;

/** Defaults merged with REMOTE_CONFIG_JSON (unknown keys and wrong types are ignored). */
export function remoteConfig(): RemoteConfig {
  const raw = process.env["REMOTE_CONFIG_JSON"];
  if (cached && cached.raw === raw) return cached.value;
  const value: Record<string, number | boolean> = { ...REMOTE_CONFIG_DEFAULTS };
  if (raw) {
    try {
      const overrides = JSON.parse(raw) as Record<string, unknown>;
      for (const [key, v] of Object.entries(overrides)) {
        const def = (REMOTE_CONFIG_DEFAULTS as Record<string, unknown>)[key];
        if (def === undefined) continue;
        if (typeof def === "boolean" && typeof v === "boolean") value[key] = v;
        if (typeof def === "number" && typeof v === "number" && Number.isFinite(v) && v >= 0) value[key] = v;
      }
    } catch (err) {
      logger.warn({ err }, "REMOTE_CONFIG_JSON is not valid JSON: using defaults");
    }
  }
  cached = { raw, value: value as RemoteConfig };
  return cached.value;
}

// Rewarded videos the server knows how to credit. Others (double the game's
// Éclats, hints and extra life against the computer) need game-engine hooks
// and are listed in docs/mobile/SERVER_CHANGES.md as next steps.
export const AD_REWARDS = {
  free_shards: { amountKey: "rw_free_shards_amount", capKey: "rw_free_shards_daily_cap" },
  daily_chest: { amountKey: "rw_daily_chest_amount", capKey: "rw_daily_chest_daily_cap" },
} as const satisfies Record<string, { amountKey: RemoteConfigKey; capKey: RemoteConfigKey }>;

export type AdRewardKey = keyof typeof AD_REWARDS;

export function isAdRewardKey(v: unknown): v is AdRewardKey {
  return typeof v === "string" && Object.hasOwn(AD_REWARDS, v);
}

export function rewardAmount(key: AdRewardKey): number {
  return remoteConfig()[AD_REWARDS[key].amountKey] as number;
}

export function rewardDailyCap(key: AdRewardKey): number {
  return remoteConfig()[AD_REWARDS[key].capKey] as number;
}

// How long a rewarded-video offer (nonce) stays valid.
export const AD_OFFER_TTL_MS = 10 * 60_000;

export function monetisationStatus(databaseEnabled: boolean) {
  return {
    wallet: databaseEnabled,
    purchases: databaseEnabled && Boolean(process.env["REVENUECAT_WEBHOOK_AUTH"]),
    purchaseSync: databaseEnabled && Boolean(process.env["REVENUECAT_API_KEY"]),
    adRewards: databaseEnabled,
  };
}

export function publicConfig(databaseEnabled: boolean) {
  return {
    minMobileVersion: minMobileVersion(),
    features: {
      stats: databaseEnabled,
      ...monetisationStatus(databaseEnabled),
    },
    remoteConfig: remoteConfig(),
  };
}
