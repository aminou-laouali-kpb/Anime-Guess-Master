import { generateKeyPairSync } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AdmobKeyCache, splitSignedQuery, verifySsv } from "../lib/monetisation/admob-ssv";
import { type FakeAdmob, startFakeAdmob } from "./ssv-keys";

let admob: FakeAdmob;
const params = {
  ad_network: "5450213213286189855",
  ad_unit: "1234567890",
  custom_data: "nonce_abcdefgh",
  reward_amount: "30",
  reward_item: "shards",
  timestamp: "1761742800000",
  transaction_id: "123456789",
  user_id: "player_id_12",
};

beforeAll(async () => {
  admob = await startFakeAdmob();
});
afterAll(async () => {
  await admob.close();
});

function cache(now = () => Date.now()) {
  return new AdmobKeyCache(() => admob.url, undefined, now);
}

describe("AdMob SSV signature", () => {
  it("accepts a callback signed with Google's published key and returns its parameters", async () => {
    const result = await verifySsv(admob.signedQuery(params), cache());
    expect(result).toMatchObject({
      ok: true,
      params: { userId: "player_id_12", customData: "nonce_abcdefgh", transactionId: "123456789", rewardAmount: 30, keyId: admob.keyId },
    });
  });

  it("rejects any change to the signed parameters", async () => {
    const tampered = admob.signedQuery(params).replace("user_id=player_id_12", "user_id=someone_else1");
    expect(await verifySsv(tampered, cache())).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a signature made with another key", async () => {
    const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
    expect(await verifySsv(admob.signedQuery(params, { privateKey }), cache())).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects malformed callbacks and unknown key ids", async () => {
    const c = cache();
    expect(await verifySsv("user_id=x&transaction_id=1", c)).toEqual({ ok: false, reason: "malformed" });
    expect(await verifySsv("", c)).toEqual({ ok: false, reason: "malformed" });
    expect(await verifySsv(admob.signedQuery(params, { keyId: "999" }), c)).toEqual({ ok: false, reason: "unknown_key" });
  });

  it("caches keys for 24 h, and refetches at most once a minute for an unknown key", async () => {
    let now = 1_000_000_000_000;
    const c = cache(() => now);
    const before = admob.requests;
    await verifySsv(admob.signedQuery(params), c);
    await verifySsv(admob.signedQuery(params), c);
    expect(admob.requests - before).toBe(1);

    await verifySsv(admob.signedQuery(params, { keyId: "999" }), c); // too soon to refetch
    expect(admob.requests - before).toBe(1);
    now += 61_000;
    await verifySsv(admob.signedQuery(params, { keyId: "999" }), c); // key rotation? refetch
    expect(admob.requests - before).toBe(2);

    now += 24 * 60 * 60_000 + 1;
    expect((await verifySsv(admob.signedQuery(params), c)).ok).toBe(true);
    expect(admob.requests - before).toBe(3);
  });

  it("reports keys as unavailable when Google can't be reached and nothing is cached", async () => {
    const c = new AdmobKeyCache(() => "http://127.0.0.1:9/nothing.json");
    expect(await verifySsv(admob.signedQuery(params), c)).toEqual({ ok: false, reason: "keys_unavailable" });
  });

  it("splits the signed content exactly as AdMob signs it", () => {
    expect(splitSignedQuery("a=1&b=2&signature=MEUCIQDabcdefghijklmnop&key_id=42")).toEqual({
      content: "a=1&b=2",
      signature: "MEUCIQDabcdefghijklmnop",
      keyId: "42",
    });
  });
});
