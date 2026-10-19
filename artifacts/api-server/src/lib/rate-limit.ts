import type { IncomingMessage } from "http";
import { isIPv4, isIPv6 } from "net";
import type { RequestHandler } from "express";
import { logger } from "./logger";

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

// The unit a per-address limit should count. An IPv4 address is one
// subscriber (or one NAT), but a single IPv6 subscriber usually gets a whole
// /64 and can rotate through billions of addresses inside it: so IPv6
// addresses are grouped by their /64 prefix. IPv4-mapped IPv6 addresses
// (::ffff:1.2.3.4, how a dual-stack socket reports IPv4 clients) count as
// the IPv4 address they carry. Anything that isn't an IP is returned as is.
export function networkKey(ip: string): string {
  let addr = ip.trim().toLowerCase();
  if (addr.startsWith("[") && addr.endsWith("]")) addr = addr.slice(1, -1);
  const zone = addr.indexOf("%"); // fe80::1%eth0
  if (zone !== -1) addr = addr.slice(0, zone);
  if (isIPv4(addr)) return addr;
  if (!isIPv6(addr)) return ip;

  const groups = expandIPv6(addr);
  // ::ffff:a.b.c.d (also written ::ffff:102:304): an IPv4 client.
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    const [hi, lo] = [groups[6]!, groups[7]!];
    return `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }
  return `${groups.slice(0, 4).map((g) => g.toString(16)).join(":")}::/64`;
}

// The eight 16-bit groups of a valid IPv6 address (handles "::" and a
// trailing dotted IPv4 part).
function expandIPv6(addr: string): number[] {
  let text = addr;
  const dotted = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(text);
  if (dotted) {
    const [a, b, c, d] = dotted.slice(1).map(Number) as [number, number, number, number];
    text = `${text.slice(0, dotted.index)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, tail] = text.split("::") as [string, string | undefined];
  const parse = (part: string) => (part ? part.split(":").map((g) => parseInt(g, 16)) : []);
  const left = parse(head);
  if (tail === undefined) return left;
  const right = parse(tail);
  return [...left, ...new Array<number>(8 - left.length - right.length).fill(0), ...right];
}

// Fixed-window limiter for the REST API, keyed by client network (see networkKey).
export function httpRateLimit(maxPerMinute: number): RequestHandler {
  const windows = new Map<string, { count: number; resetAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [ip, w] of windows) if (w.resetAt <= now) windows.delete(ip);
  }, 60_000).unref();

  return (req, res, next) => {
    const ip = networkKey(clientIp(req));
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
