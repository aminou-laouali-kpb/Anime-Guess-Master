import type { IncomingMessage } from "http";
import { createHash } from "crypto";

// Who is on the other end of a socket: the web app (a browser) or the
// mobile app (native Flutter client).
//
// The distinction is made from two facts:
//  1. Browsers ALWAYS send an Origin header on a WebSocket upgrade or a
//     cross-origin request, and page scripts cannot remove or change it.
//     The native app sends none.
//  2. The handshake (Socket.IO `auth`) declares `client: "mobile"` and the
//     app version.
// A connection is treated as "mobile" only when BOTH hold. A page on another
// website is already refused by the Origin check (origin.ts) before the
// handshake is even read; a page on our own site that claims "mobile" is
// still a browser and keeps the web limits. A script outside any browser can
// claim "mobile" freely: that is why mobile limits stay bounded (see
// docs/mobile/SERVER_CHANGES.md, "Ce que le contrôle d'origine protège").

export type ClientKind = "web" | "mobile";

export interface ClientInfo {
  kind: ClientKind;
  platform: "ios" | "android" | null;
  appVersion: string | null;
  // SHA-256 (truncated) of the install id the app sends, kept in memory only.
  deviceKey: string | null;
}

export class OutdatedClientError extends Error {
  readonly data: { code: "app_outdated"; minVersion: string; message: string };
  constructor(minVersion: string) {
    super("app_outdated");
    this.data = {
      code: "app_outdated",
      minVersion,
      message: "Cette version d’AnimeWho n’est plus prise en charge. Mets l’app à jour pour continuer à jouer.",
    };
  }
}

const VERSION_RE = /^(\d{1,4})\.(\d{1,4})\.(\d{1,4})(?:[-+][0-9A-Za-z.+-]{0,40})?$/;
const DEVICE_RE = /^[A-Za-z0-9_-]{8,128}$/;

/** "1.2.3" → [1, 2, 3]; anything else → null. Pre-release / build suffixes are ignored. */
export function parseVersion(raw: unknown): [number, number, number] | null {
  if (typeof raw !== "string") return null;
  const m = VERSION_RE.exec(raw.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function compareVersions(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i]! - b[i]!;
  return 0;
}

/** MIN_MOBILE_VERSION, or null when unset / malformed (every version accepted). */
export function minMobileVersion(): string | null {
  const raw = process.env["MIN_MOBILE_VERSION"]?.trim();
  return raw && parseVersion(raw) ? raw : null;
}

export function hasBrowserOrigin(req: IncomingMessage): boolean {
  return typeof req.headers.origin === "string" && req.headers.origin.length > 0;
}

/**
 * Reads the client description from the handshake. Throws OutdatedClientError
 * for a mobile app older than MIN_MOBILE_VERSION (or with no readable
 * version while a minimum is set).
 */
export function readClientInfo(req: IncomingMessage, auth: Record<string, unknown>): ClientInfo {
  const web: ClientInfo = { kind: "web", platform: null, appVersion: null, deviceKey: null };
  if (auth["client"] !== "mobile" || hasBrowserOrigin(req)) return web;

  const version = parseVersion(auth["appVersion"]);
  const min = minMobileVersion();
  if (min && (!version || compareVersions(version, parseVersion(min)!) < 0)) {
    throw new OutdatedClientError(min);
  }

  const platform = auth["platform"] === "ios" || auth["platform"] === "android" ? auth["platform"] : null;
  const device = typeof auth["device"] === "string" && DEVICE_RE.test(auth["device"]) ? auth["device"] : null;
  return {
    kind: "mobile",
    platform,
    appVersion: version ? version.join(".") : null,
    deviceKey: device ? createHash("sha256").update(`device:${device}`).digest("hex").slice(0, 32) : null,
  };
}
