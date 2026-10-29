// Operational limits, all overridable by environment variables so production
// can be tuned without a release (see replit.md and docs/mobile/SCALING.md).
// Read at call time, not import time, so tests can set them per file.

function intEnv(name: string, fallback: number, min = 0): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isInteger(value) && value >= min ? value : fallback;
}

export function socketLimits() {
  return {
    // Every session holds at most one room, so this also caps rooms and the queue.
    maxSessions: intEnv("MAX_SESSIONS", 2_000, 1),
    // Browsers and scripts: same as before.
    maxConnectionsPerIp: intEnv("MAX_CONNECTIONS_PER_IP", 20, 1),
    // Mobile apps (no Origin header, declared client "mobile"): carriers put
    // thousands of subscribers behind one public IP (CGNAT).
    maxConnectionsPerIpMobile: intEnv("MAX_CONNECTIONS_PER_IP_MOBILE", 100, 1),
    // …combined with a cap per profile, which an honest app never reaches.
    maxConnectionsPerProfile: intEnv("MAX_CONNECTIONS_PER_PROFILE", 3, 1),
  };
}

export function httpLimits() {
  return {
    perIp: intEnv("HTTP_RATE_LIMIT_PER_IP", 120, 1),
    // Requests carrying a profile token (mobile app REST calls).
    perIpAuthenticated: intEnv("HTTP_RATE_LIMIT_PER_IP_AUTHENTICATED", 600, 1),
    perProfile: intEnv("HTTP_RATE_LIMIT_PER_PROFILE", 60, 1),
  };
}

export function rankingLimits() {
  return {
    // A quick game between two mobile players on the same public IP is ranked
    // only if both profiles already have this many ranked games…
    sharedNetworkMinRankedGames: intEnv("SHARED_NETWORK_MIN_RANKED_GAMES", 5, 0),
    // …and each has had fewer than this many shared-network ranked games in 24 h.
    sharedNetworkRankedPerDay: intEnv("SHARED_NETWORK_RANKED_PER_DAY", 3, 0),
  };
}
