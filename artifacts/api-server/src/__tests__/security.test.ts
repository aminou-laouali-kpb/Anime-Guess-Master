import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestServer, TestClient, connectClient, startServer, wait } from "./helpers";

let server: TestServer;
const open: { close: () => void }[] = [];
const track = <T extends { close: () => void }>(c: T): T => (open.push(c), c);

beforeAll(async () => {
  server = await startServer();
});

afterAll(async () => {
  open.forEach((c) => c.close());
  await server.close();
});

describe("client address (X-Forwarded-For)", () => {
  it("caps connections per real address even when the client forges the left of the header", async () => {
    const clients: TestClient[] = [];
    for (let i = 0; i < 21; i++) {
      clients.push(track(new TestClient(server.url, { ip: `${i}.${i}.${i}.${i}, 203.0.113.99` })));
    }
    await wait(1200);
    expect(clients.filter((c) => c.connected)).toHaveLength(20);
    const refused = clients.filter((c) => !c.connected);
    expect(refused).toHaveLength(1);
    expect(refused[0]!.last("connect_error")?.["message"]).toBe("too_many_connections");
  });

  it("applies the HTTP rate limit even when the client forges the left of the header", async () => {
    let tooMany = 0;
    for (let i = 0; i < 130; i++) {
      const res = await fetch(`${server.url}/api/healthz`, { headers: { "X-Forwarded-For": `7.7.7.${i % 250}, 203.0.113.50` } });
      if (res.status === 429) tooMany += 1;
    }
    expect(tooMany).toBeGreaterThanOrEqual(5);
  });
});

describe("websocket origin", () => {
  it("refuses a connection opened from another website", async () => {
    const evil = track(new TestClient(server.url, { origin: "https://evil.example" }));
    await evil.until(() => evil.has("connect_error"), 3000, "connect_error");
    expect(evil.connected).toBe(false);
  });

  it("accepts the game's own origin and clients that send no Origin", async () => {
    const same = track(await new TestClient(server.url, { origin: server.url }).connectedOrFail());
    const none = track(await connectClient(server));
    expect(same.connected && none.connected).toBe(true);
  });
});

describe("flood protection", () => {
  it("warns, then disconnects, a client that floods known events", async () => {
    const flooder = track(await connectClient(server));
    for (let i = 0; i < 300; i++) flooder.emit("leave_room");
    await flooder.until(() => flooder.has("error"), 3000, "warning");
    expect(flooder.last("error")!["message"]).toMatch(/Doucement/);
    await flooder.until(() => !flooder.connected, 3000, "disconnection");
    expect((await connectClient(server)).connected).toBe(true); // the server is fine
  });

  it("counts events the server doesn't even handle", async () => {
    const flooder = track(await connectClient(server));
    for (let i = 0; i < 300; i++) flooder.emit("not_a_real_event", { i });
    await flooder.until(() => !flooder.connected, 3000, "disconnection");
  });
});

describe("HTTP surface", () => {
  it("no longer exposes the REST room endpoints", async () => {
    expect((await fetch(`${server.url}/api/rooms`, { method: "POST" })).status).toBe(404);
    expect((await fetch(`${server.url}/api/rooms/ABCDEF`)).status).toBe(404);
  });

  it("sends no CORS header to a foreign origin, and basic security headers", async () => {
    const res = await fetch(`${server.url}/api/characters`, { headers: { Origin: "https://evil.example", "X-Forwarded-For": "203.0.113.77" } });
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("x-powered-by")).toBeNull();
  });

  it("serves the character list and a health check", async () => {
    const headers = { "X-Forwarded-For": "203.0.113.78" };
    expect(await (await fetch(`${server.url}/api/healthz`, { headers })).json()).toEqual({ status: "ok" });
    const list = (await (await fetch(`${server.url}/api/characters`, { headers })).json()) as { id: string; imageUrl: unknown }[];
    expect(list.length).toBeGreaterThanOrEqual(48);
    expect(list[0]).toHaveProperty("imageUrl");
  });

  it("reports the leaderboard as disabled without a database", async () => {
    if (process.env["DATABASE_URL"]) return; // covered by the stats tests
    const body = await (await fetch(`${server.url}/api/leaderboard`, { headers: { "X-Forwarded-For": "203.0.113.79" } })).json();
    expect(body).toMatchObject({ enabled: false, entries: [] });
  });
});
