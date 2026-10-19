import type { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createGameServer } from "../server";
import { SHUTDOWN_MESSAGE, beginShutdown } from "../lib/engine";
import { type TestServer, connectClient, startPrivateGame, wait } from "./helpers";

// beginShutdown flips module state for good: this file has its own module
// context, so the other test files are unaffected. index.ts calls it on
// SIGTERM/SIGINT, then closes the server.

const { httpServer, io } = createGameServer();
let server: TestServer;
const open: { close: () => void }[] = [];
const track = <T extends { close: () => void }>(c: T): T => (open.push(c), c);

beforeAll(async () => {
  await new Promise<void>((resolve) => httpServer.listen(0, "127.0.0.1", resolve));
  const { port } = httpServer.address() as AddressInfo;
  server = { url: `http://127.0.0.1:${port}`, close: () => new Promise<void>((r) => void io.close(() => r())) };
});

afterAll(async () => {
  open.forEach((c) => c.close());
  await server.close();
});

describe("graceful shutdown", () => {
  it("warns every connected player, then refuses new games", async () => {
    const game = await startPrivateGame(server);
    track(game.a);
    track(game.b);
    const idle = track(await connectClient(server));

    beginShutdown(io);
    for (const c of [game.a, game.b, idle]) {
      await c.until(() => c.last("error")?.["message"] === SHUTDOWN_MESSAGE, 3000, "the shutdown warning");
    }

    idle.emit("create_room", { name: "Trop tard" });
    expect((await idle.next("error"))["message"]).toMatch(/redémarre/);
    idle.emit("join_lobby", { name: "Trop tard" });
    idle.emit("play_vs_bot", { name: "Trop tard", level: "easy" });
    await wait(300);
    expect(idle.has("room_created") || idle.has("in_queue") || idle.has("room_joined")).toBe(false);
  });
});
