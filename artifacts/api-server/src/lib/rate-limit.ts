import type { IncomingMessage } from "http";
import type { RequestHandler } from "express";
import { logger } from "./logger";
import { httpLimits } from "./limits";
import { hashToken } from "./database";

// Token bucket: allows short bursts, then a steady rate.
export class TokenBucket {
  private tokens: number;
  private updatedAt = Date.now();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
  ) {
    this.tokens = capacity;
  }

  take(): boolean {
    const now = Date.now();
    this.tokens = Math.min(
      this.capacity,
      this.tokens + ((now - this.updatedAt) / 1000) * this.refillPerSecond,
    );
    this.updatedAt = now;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

// Proxies append the address they received the request from to the right of
// X-Forwarded-For; everything to the left is whatever the client wrote and
// can be forged. So the real client is the entry our own proxy added: count
// TRUSTED_PROXY_HOPS proxies from the right (default 1, Replit's proxy), and
// skip private addresses added by internal hops.
const TRUSTED_PROXY_HOPS = Math.max(1, Number(process.env["TRUSTED_PROXY_HOPS"]) || 1);

const PRIVATE_IP =
  /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|f[cd][0-9a-f]{2}:|fe80:|::ffff:(10\.|127\.|192\.168\.))/i;

let loggedSamples = 0;

export function clientIp(req: IncomingMessage): string {
  const header = req.headers["x-forwarded-for"];
  const entries = (Array.isArray(header) ? header.join(",") : header ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  // Lets the operator check TRUSTED_PROXY_HOPS in production logs (no IPs logged).
  if (loggedSamples < 3 && entries.length > 0) {
    loggedSamples += 1;
    logger.info(
      { forwardedForEntries: entries.length, trustedProxyHops: TRUSTED_PROXY_HOPS },
      "Client IP taken from X-Forwarded-For",
    );
  }

  for (let i = entries.length - TRUSTED_PROXY_HOPS; i >= 0; i--) {
    const ip = entries[i]!;
    if (!PRIVATE_IP.test(ip)) return ip;
  }
  return entries[entries.length - 1] || req.socket.remoteAddress || "unknown";
}

// Fixed-window limiter for the REST API.
//
// Browsers: per client IP (HTTP_RATE_LIMIT_PER_IP, default 120/min).
// Mobile app calls carry a profile token (Authorization: Bearer …). Many app
// users can share one carrier IP (CGNAT), so these get a higher per-IP cap
// (HTTP_RATE_LIMIT_PER_IP_AUTHENTICATED, 600/min) AND a cap per profile
// (HTTP_RATE_LIMIT_PER_PROFILE, 60/min). Tokens are self-minted, so the
// per-IP cap stays the real bound against a script rotating tokens.
// Webhooks (RevenueCat, AdMob SSV) come from a few provider IPs and are
// authenticated / signed: they use the higher per-IP cap, in their own bucket.
export function bearerProfileToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (typeof header !== "string") return null;
  const m = /^Bearer ([A-Za-z0-9_-]{32})$/.exec(header.trim());
  return m ? m[1]! : null;
}

export function httpRateLimit(): RequestHandler {
  const windows = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [key, w] of windows) if (w.resetAt <= now) windows.delete(key);
  }, 60_000).unref();

  // Counts one hit; returns the seconds to wait when over the limit.
  const hit = (key: string, max: number, now: number): number | null => {
    let w = windows.get(key);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + 60_000 };
      windows.set(key, w);
    }
    w.count += 1;
    return w.count > max ? Math.ceil((w.resetAt - now) / 1000) : null;
  };

  return (req, res, next) => {
    const limits = httpLimits();
    const ip = clientIp(req);
    const now = Date.now();
    const profile = bearerProfileToken(req);
    const path = req.path ?? req.url ?? "";
    const isWebhook = path.startsWith("/api/webhooks/") || path.startsWith("/api/admob/ssv");

    let retryAfter: number | null;
    if (isWebhook) {
      retryAfter = hit(`hook:${ip}`, limits.perIpAuthenticated, now);
    } else if (profile) {
      retryAfter =
        hit(`auth:${ip}`, limits.perIpAuthenticated, now) ??
        hit(`profile:${hashToken(profile)}`, limits.perProfile, now);
    } else {
      retryAfter = hit(ip, limits.perIp, now);
    }

    if (retryAfter !== null) {
      res.setHeader("Retry-After", retryAfter);
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    next();
  };
}
