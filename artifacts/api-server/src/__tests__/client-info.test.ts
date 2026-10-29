import type { IncomingMessage } from "http";
import { afterEach, describe, expect, it } from "vitest";
import { OutdatedClientError, compareVersions, parseVersion, readClientInfo } from "../lib/client-info";
import { blockKeyOf, isObjectionable } from "../lib/moderation";
import { cleanName } from "../lib/game-engine";
import { remoteConfig } from "../lib/monetisation/config";
import { grantFor } from "../lib/monetisation/catalog";

const req = (headers: Record<string, string> = {}) => ({ headers }) as unknown as IncomingMessage;

afterEach(() => {
  delete process.env["MIN_MOBILE_VERSION"];
  delete process.env["REMOTE_CONFIG_JSON"];
});

describe("app versions", () => {
  it("parses x.y.z with optional pre-release/build suffix, and nothing else", () => {
    expect(parseVersion("1.2.3")).toEqual([1, 2, 3]);
    expect(parseVersion("10.0.12+45")).toEqual([10, 0, 12]);
    expect(parseVersion("2.0.0-beta.1")).toEqual([2, 0, 0]);
    for (const bad of ["1.2", "v1.2.3", "1.2.3.4", "", 3, null, "1.2.x"]) expect(parseVersion(bad)).toBeNull();
  });

  it("compares numerically, not as text", () => {
    expect(compareVersions([1, 10, 0], [1, 9, 9])).toBeGreaterThan(0);
    expect(compareVersions([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(compareVersions([0, 9, 0], [1, 0, 0])).toBeLessThan(0);
  });
});

describe("client detection", () => {
  it("is mobile only for a declared mobile client WITHOUT a browser Origin", () => {
    expect(readClientInfo(req(), { client: "mobile", appVersion: "1.0.0", platform: "ios" })).toMatchObject({
      kind: "mobile",
      platform: "ios",
      appVersion: "1.0.0",
    });
    // A web page (ours or not) claiming to be the app is still a browser.
    expect(readClientInfo(req({ origin: "https://anywhere.example" }), { client: "mobile", appVersion: "1.0.0" }).kind).toBe("web");
    expect(readClientInfo(req(), {}).kind).toBe("web");
  });

  it("refuses mobile versions below MIN_MOBILE_VERSION, with a clear message", () => {
    process.env["MIN_MOBILE_VERSION"] = "1.4.0";
    expect(() => readClientInfo(req(), { client: "mobile", appVersion: "1.3.9" })).toThrow(OutdatedClientError);
    expect(() => readClientInfo(req(), { client: "mobile" })).toThrow(OutdatedClientError);
    try {
      readClientInfo(req(), { client: "mobile", appVersion: "1.0.0" });
    } catch (err) {
      expect((err as OutdatedClientError).message).toBe("app_outdated");
      expect((err as OutdatedClientError).data).toMatchObject({ code: "app_outdated", minVersion: "1.4.0" });
      expect((err as OutdatedClientError).data.message).toMatch(/mets l’app à jour/i);
    }
    expect(readClientInfo(req(), { client: "mobile", appVersion: "1.4.0" }).kind).toBe("mobile");
    // Never applied to browsers.
    expect(readClientInfo(req({ origin: "https://x.example" }), { client: "mobile", appVersion: "0.0.1" }).kind).toBe("web");
  });

  it("ignores a malformed MIN_MOBILE_VERSION instead of locking every player out", () => {
    process.env["MIN_MOBILE_VERSION"] = "latest";
    expect(readClientInfo(req(), { client: "mobile", appVersion: "0.1.0" }).kind).toBe("mobile");
  });

  it("hashes the install id and never keeps it as sent", () => {
    const a = readClientInfo(req(), { client: "mobile", appVersion: "1.0.0", device: "install-123456789" });
    expect(a.deviceKey).toMatch(/^[0-9a-f]{32}$/);
    expect(a.deviceKey).not.toContain("install");
    expect(readClientInfo(req(), { client: "mobile", appVersion: "1.0.0", device: "x" }).deviceKey).toBeNull();
  });
});

describe("moderation helpers", () => {
  it("catches obvious insults, including accents, leetspeak and spacing", () => {
    for (const q of ["T'es un connard", "ENCULÉ", "f u c k you", "s4lope", "kys"]) expect(isObjectionable(q)).toBe(true);
  });

  it("lets normal questions through, including words close to blocked ones", () => {
    for (const q of [
      "Est-ce que ton personnage a les cheveux violets ?",
      "Is your character late (en retard) ?",
      "A-t-il un baiser magique ?",
      "Does it bite?",
      "Porte-t-il une capuche ?",
    ]) {
      expect(isObjectionable(q)).toBe(false);
    }
  });

  it("replaces an objectionable player name by the default one", () => {
    expect(cleanName("Sal0pe du 93")).toBe("Joueur");
    expect(cleanName("Kenji")).toBe("Kenji");
  });

  it("derives a stable block key that reveals nothing of the profile token", () => {
    const token = "A".repeat(32);
    expect(blockKeyOf(token)).toBe(blockKeyOf(token));
    expect(blockKeyOf(token)).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(blockKeyOf(token)).not.toBe(blockKeyOf("B".repeat(32)));
  });
});

describe("remote config and products", () => {
  it("serves the spec defaults and accepts only known, well-typed overrides", () => {
    expect(remoteConfig()).toMatchObject({ rw_total_daily_cap: 10, int_daily_cap: 6, banners_enabled: true });
    process.env["REMOTE_CONFIG_JSON"] = JSON.stringify({ int_daily_cap: 3, banners_enabled: false, evil: 1, rw_total_daily_cap: "9" });
    const cfg = remoteConfig() as Record<string, unknown>;
    expect(cfg).toMatchObject({ int_daily_cap: 3, banners_enabled: false, rw_total_daily_cap: 10 });
    expect(cfg["evil"]).toBeUndefined();
    process.env["REMOTE_CONFIG_JSON"] = "{not json";
    expect(remoteConfig().int_daily_cap).toBe(6);
  });

  it("maps store products to what the server grants", () => {
    expect(grantFor("animewho.noads")).toMatchObject({ entitlement: "no_ads" });
    expect(grantFor("animewho.shards_550")).toMatchObject({ shards: 550, entitlement: null });
    expect(grantFor("animewho.theme.neo_city")).toMatchObject({ entitlement: "theme_neo_city" });
    expect(grantFor("animewho.pass.s01")).toMatchObject({ entitlement: "pass_s01" });
    expect(grantFor("com.other.app")).toBeNull();
  });
});
