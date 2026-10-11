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
  // Game messages are tiny; refuse anything big instead of buffering 1 MB.
  maxHttpBufferSize: 16 * 1024,
});

// Games live in memory, so a crash ends every match in progress. Socket
// handlers already catch their own errors; this is the last line of defense.
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
});
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

setupGameEngine(io);

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});
