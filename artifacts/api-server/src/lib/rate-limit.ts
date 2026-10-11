import type { IncomingMessage } from "http";
import type { RequestHandler } from "express";

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

// The app runs behind Replit's proxy, so the socket address is the proxy's.
export function clientIp(req: IncomingMessage): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
    ?.split(",")[0]
    ?.trim();
  return first || req.socket.remoteAddress || "unknown";
}

// Fixed-window limiter for the REST API, keyed by client IP.
export function httpRateLimit(maxPerMinute: number): RequestHandler {
  const windows = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, w] of windows) if (w.resetAt <= now) windows.delete(ip);
  }, 60_000).unref();

  return (req, res, next) => {
    const ip = clientIp(req);
    const now = Date.now();
    let w = windows.get(ip);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + 60_000 };
      windows.set(ip, w);
    }
    w.count += 1;
    if (w.count > maxPerMinute) {
      res.setHeader("Retry-After", Math.ceil((w.resetAt - now) / 1000));
      res.status(429).json({ error: "Too many requests" });
      return;
    }
    next();
  };
}
