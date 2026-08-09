import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app";
import { logger } from "./lib/logger";
import { setupGameEngine } from "./lib/game-engine";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  // Mount under /api so the shared proxy (which already routes /api → this server)
  // forwards socket.io handshakes and WebSocket upgrades without extra path config.
  path: "/api/socket.io",
});

setupGameEngine(io);

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});
