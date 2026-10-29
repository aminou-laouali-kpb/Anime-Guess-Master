import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestServer, TestClient, connectClient, mobileAuth, startServer } from "./helpers";

// MAX_SESSIONS is configurable (docs/mobile/SCALING.md).
const saved = process.env["MAX_SESSIONS"];
let server: TestServer;
const open: TestClient[] = [];

beforeAll(async () => {
  process.env["MAX_SESSIONS"] = "3";
  server = await startServer();
});

afterAll(async () => {
  open.forEach((c) => c.close());
  await server.close();
  if (saved === undefined) delete process.env["MAX_SESSIONS"];
  else process.env["MAX_SESSIONS"] = saved;
});

describe("MAX_SESSIONS", () => {
  it("refuses new players once the configured number of sessions is reached, browsers and apps alike", async () => {
    for (let i = 0; i < 3; i++) open.push(await connectClient(server, { ip: `192.0.2.${100 + i}` }));
    const web = new TestClient(server.url, { ip: "192.0.2.110" });
    const app = new TestClient(server.url, { ip: "192.0.2.111", auth: mobileAuth() });
    open.push(web, app);
    for (const c of [web, app]) {
      await c.until(() => c.has("connect_error"), 3000, "connect_error");
      expect(c.last("connect_error")!["message"]).toBe("server_full");
    }
  });

  it("still lets a player with a session come back", async () => {
    const first = open[0]!;
    // A player in a room keeps their seat through a reconnect.
    first.emit("create_room", { name: "A" });
    await first.next("room_created");
    first.close();
    await new Promise((r) => setTimeout(r, 100));
    const back = await connectClient(server, { ip: "192.0.2.100", token: first.token, profile: first.profile });
    open.push(back);
    expect(back.playerId).toBe(first.playerId);
  });
});
