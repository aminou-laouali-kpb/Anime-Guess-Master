import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type * as Helpers from "./helpers";

// Idle sockets are dropped after 10 minutes × GAME_TIME_SCALE. This file runs
// in its own module context, so it can speed the clocks up further than the
// other tests: 0.002 → 1.2 s idle timeout. Set before the server is loaded.
process.env["GAME_TIME_SCALE"] = "0.002";

let helpers: typeof Helpers;
let server: Helpers.TestServer;
const open: { close: () => void }[] = [];
const track = <T extends { close: () => void }>(c: T): T => (open.push(c), c);

beforeAll(async () => {
  helpers = await import("./helpers");
  server = await helpers.startServer();
});

afterAll(async () => {
  open.forEach((c) => c.close());
  await server.close();
});

describe("idle connections", () => {
  it("drops a socket that does nothing outside a game, with a message", async () => {
    const c = track(await helpers.connectClient(server));
    await helpers.wait(600);
    expect(c.connected).toBe(true);
    await c.until(() => !c.connected, 3000, "disconnection");
    expect(c.last("error")?.["message"]).toMatch(/inactivité/);
  });

  it("drops a player alone in a private room nobody joined", async () => {
    const c = track(await helpers.connectClient(server));
    c.emit("create_room", { name: "Seul" });
    await c.next("room_created");
    await c.until(() => !c.connected, 3000, "disconnection");
  });

  it("keeps a player waiting in the matchmaking queue", async () => {
    const c = track(await helpers.connectClient(server));
    c.emit("join_lobby", { name: "Patient" });
    await c.next("in_queue");
    await helpers.wait(2500);
    expect(c.connected).toBe(true);
    c.emit("leave_room");
  });

  it("keeps a socket that is still doing things, then drops it once it stops", async () => {
    const c = track(await helpers.connectClient(server));
    for (let i = 0; i < 6; i++) {
      await helpers.wait(400);
      c.emit("react", { emoji: "👍" }); // any event counts (this one does nothing outside a room)
    }
    expect(c.connected).toBe(true); // 2.4 s connected, never 1.2 s quiet
    await c.until(() => !c.connected, 3000, "disconnection");
  });

  it("lets a dropped player connect again", async () => {
    const c = track(await helpers.connectClient(server));
    await c.until(() => !c.connected, 3000, "disconnection");
    const again = track(await helpers.connectClient(server, { token: c.token, profile: c.profile }));
    expect(again.connected).toBe(true);
    expect(again.last("state_sync")).toMatchObject({ room: null });
  });
});
