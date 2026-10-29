import { createPublicKey, verify, type KeyObject } from "crypto";
import { logger } from "../logger";

// AdMob rewarded-ad server-side verification (SSV).
// https://developers.google.com/admob/android/ssv
//
// AdMob calls our callback URL with a query string such as
//   ?ad_network=…&ad_unit=…&custom_data=…&reward_amount=…&reward_item=…
//    &timestamp=…&transaction_id=…&user_id=…&signature=…&key_id=…
// `signature` and `key_id` are always the last two parameters. The signed
// message is the raw query string up to (not including) "&signature=". The
// signature is ECDSA P-256 / SHA-256, DER-encoded, in URL-safe base64, made
// with the private key whose public half Google publishes (by key_id) at
// ADMOB_SSV_KEYS_URL.

export const DEFAULT_KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json";
const KEYS_TTL_MS = 24 * 60 * 60_000;
// An unknown key_id triggers a refetch (Google rotates keys), at most this often.
const REFETCH_MIN_INTERVAL_MS = 60_000;

export interface SsvParams {
  adNetwork: string | null;
  adUnit: string | null;
  customData: string | null;
  rewardAmount: number | null;
  rewardItem: string | null;
  timestamp: number | null;
  transactionId: string | null;
  userId: string | null;
  keyId: string;
}

export type SsvResult =
  | { ok: true; params: SsvParams }
  | { ok: false; reason: "malformed" | "unknown_key" | "bad_signature" | "keys_unavailable" };

type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export class AdmobKeyCache {
  private keys = new Map<string, KeyObject>();
  private fetchedAt = 0;
  private lastAttempt = 0;
  private inflight: Promise<void> | null = null;
  fetchCount = 0;

  constructor(
    private readonly url: () => string = () => process.env["ADMOB_SSV_KEYS_URL"] || DEFAULT_KEYS_URL,
    private readonly fetcher: Fetcher = (u) => fetch(u, { signal: AbortSignal.timeout(5_000) }),
    private readonly now: () => number = Date.now,
  ) {}

  private async refresh(): Promise<void> {
    this.inflight ??= (async () => {
      this.lastAttempt = this.now();
      this.fetchCount += 1;
      const res = await this.fetcher(this.url());
      if (!res.ok) throw new Error(`AdMob keys: HTTP ${res.status}`);
      const body = (await res.json()) as { keys?: { keyId?: unknown; pem?: unknown; base64?: unknown }[] };
      const next = new Map<string, KeyObject>();
      for (const k of body.keys ?? []) {
        if (k.keyId === undefined) continue;
        try {
          const key =
            typeof k.pem === "string"
              ? createPublicKey(k.pem)
              : createPublicKey({ key: Buffer.from(String(k.base64), "base64"), format: "der", type: "spki" });
          next.set(String(k.keyId), key);
        } catch (err) {
          logger.warn({ err, keyId: k.keyId }, "Ignoring unreadable AdMob verifier key");
        }
      }
      if (next.size === 0) throw new Error("AdMob keys: empty key list");
      this.keys = next;
      this.fetchedAt = this.now();
    })().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  /** The public key for key_id; null if Google doesn't list it. Throws if keys can't be loaded at all. */
  async get(keyId: string): Promise<KeyObject | null> {
    const stale = this.now() - this.fetchedAt > KEYS_TTL_MS;
    const missing = !this.keys.has(keyId);
    const mayRefetch = this.now() - this.lastAttempt > REFETCH_MIN_INTERVAL_MS;
    if ((stale || missing) && (mayRefetch || this.keys.size === 0)) {
      try {
        await this.refresh();
      } catch (err) {
        // Keep serving the previous keys if we have any.
        if (this.keys.size === 0) throw err;
        logger.warn({ err }, "Could not refresh AdMob verifier keys; using cached keys");
      }
    }
    return this.keys.get(keyId) ?? null;
  }
}

function intOrNull(v: string | null): number | null {
  if (v === null || !/^\d{1,16}$/.test(v)) return null;
  return Number(v);
}

/** Splits the raw query string into the signed part and the signature. */
export function splitSignedQuery(rawQuery: string): { content: string; signature: string; keyId: string } | null {
  const query = rawQuery.startsWith("?") ? rawQuery.slice(1) : rawQuery;
  const at = query.indexOf("&signature=");
  if (at <= 0) return null;
  const content = query.slice(0, at);
  const tail = new URLSearchParams(query.slice(at + 1));
  const signature = tail.get("signature");
  const keyId = tail.get("key_id");
  if (!signature || !keyId || !/^[A-Za-z0-9_\-+/=]{16,200}$/.test(signature) || !/^\d{1,20}$/.test(keyId)) {
    return null;
  }
  return { content, signature, keyId };
}

export async function verifySsv(rawQuery: string, cache: AdmobKeyCache): Promise<SsvResult> {
  const parts = splitSignedQuery(rawQuery);
  if (!parts) return { ok: false, reason: "malformed" };

  let key: KeyObject | null;
  try {
    key = await cache.get(parts.keyId);
  } catch (err) {
    logger.error({ err }, "AdMob verifier keys unavailable");
    return { ok: false, reason: "keys_unavailable" };
  }
  if (!key) return { ok: false, reason: "unknown_key" };

  // URL-safe base64 (Google) — accept standard base64 too.
  const signature = Buffer.from(parts.signature.replace(/\+/g, "-").replace(/\//g, "_"), "base64url");
  let valid = false;
  try {
    valid = verify("sha256", Buffer.from(parts.content, "utf8"), { key, dsaEncoding: "der" }, signature);
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, reason: "bad_signature" };

  const q = new URLSearchParams(parts.content);
  return {
    ok: true,
    params: {
      adNetwork: q.get("ad_network"),
      adUnit: q.get("ad_unit"),
      customData: q.get("custom_data"),
      rewardAmount: intOrNull(q.get("reward_amount")),
      rewardItem: q.get("reward_item"),
      timestamp: intOrNull(q.get("timestamp")),
      transactionId: q.get("transaction_id"),
      userId: q.get("user_id"),
      keyId: parts.keyId,
    },
  };
}

export const admobKeys = new AdmobKeyCache();
