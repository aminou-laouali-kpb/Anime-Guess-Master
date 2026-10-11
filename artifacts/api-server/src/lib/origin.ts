import type { IncomingMessage } from "http";
import { logger } from "./logger";

// CORS headers don't apply to WebSocket upgrades, so Socket.IO would accept a
// connection opened by any website. This check only lets browsers in from
// the game's own address (or ALLOWED_ORIGINS). Requests without an Origin
// header (non-browser clients) are let through: they could forge it anyway.

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
