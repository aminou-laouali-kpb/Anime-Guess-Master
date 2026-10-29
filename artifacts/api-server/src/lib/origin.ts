import type { IncomingMessage } from "http";
import { logger } from "./logger";

// CORS headers don't apply to WebSocket upgrades, so Socket.IO would accept a
// connection opened by any website. This check only lets browsers in from
// the game's own address (or ALLOWED_ORIGINS). Requests without an Origin
// header (non-browser clients, including the native mobile app) are let
// through: they could forge it anyway.
//
// What this protects: a page on another site cannot use its visitors'
// browsers to open game connections (cross-site WebSocket hijacking). There
// is no cookie to steal here, but those visitors would bring real, varied
// residential IPs: a way around the per-IP limits and the "two different
// addresses" ranking rule. Browsers always send Origin and scripts can't
// remove it, so that attack is always caught here.
//
// The mobile handshake (client-info.ts) does NOT relax this check: it runs
// on the HTTP upgrade request, before the Socket.IO auth payload is even
// read, so `client: "mobile"` cannot let a foreign Origin in.

function hostOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).host.toLowerCase();
  } catch {
    return null;
  }
}

export function makeOriginCheck(allowedOrigins: string[]) {
  const fixedHosts = new Set(
    [
      ...allowedOrigins,
      process.env["SITE_URL"],
      process.env["REPLIT_DEV_DOMAIN"],
      ...(process.env["REPLIT_DOMAINS"]?.split(",") ?? []),
    ]
      .map((v) => hostOf(v?.trim()))
      .filter((h): h is string => h !== null),
  );

  return (req: IncomingMessage, callback: (err: string | null, success: boolean) => void) => {
    const origin = req.headers.origin;
    if (!origin) return callback(null, true);

    const originHost = hostOf(origin);
    const forwardedHost = req.headers["x-forwarded-host"];
    const sameSite =
      originHost !== null &&
      (originHost === hostOf(req.headers.host) ||
        originHost === hostOf(Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ||
        fixedHosts.has(originHost));

    if (!sameSite) logger.warn({ origin }, "Rejected socket connection from another site");
    callback(sameSite ? null : "origin not allowed", sameSite);
  };
}
