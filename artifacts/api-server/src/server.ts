import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import app, { allowedOrigins } from "./app";
import { makeOriginCheck } from "./lib/origin";
import { setupGameEngine } from "./lib/game-engine";

// Builds the HTTP + Socket.IO server without listening, so tests can start it
// on any port.
export function createGameServer(): { httpServer: Server; io: SocketIOServer } {
  const httpServer = createServer(app);

  const io = new SocketIOServer(httpServer, {
    // Same-origin only unless ALLOWED_ORIGINS lists more (see app.ts).
    ...(allowedOrigins.length > 0
      ? { cors: { origin: allowedOrigins, methods: ["GET", "POST"] } }
      : {}),
    // Mount under /api so the shared proxy (which already routes /api → this server)
    // forwards socket.io handshakes and WebSocket upgrades without extra path config.
    path: "/api/socket.io",
    // Game messages are tiny; refuse anything big instead of buffering 1 MB.
    maxHttpBufferSize: 16 * 1024,
    // Browsers on other websites can't open game connections.
    allowRequest: makeOriginCheck(allowedOrigins),
  });

  setupGameEngine(io);
  return { httpServer, io };
}
