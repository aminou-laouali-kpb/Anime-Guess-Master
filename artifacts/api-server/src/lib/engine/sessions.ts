import { randomBytes } from "crypto";
import { newProfileToken } from "../stats";
import { TOKEN_RE, payloadOf } from "./input";
import { removeFromQueue } from "./matchmaking";
import { leaveRoom } from "./rules";
import { type Engine, type GameSocket, type Session, socketOf } from "./state";

// Sessions: a player's identity across sockets (reloads, network blips, tabs).

export function randomId(bytes: number): string {
  return randomBytes(bytes).toString("base64url");
}

export function endSession(ctx: Engine, session: Session): void {
  if (session.disconnectTimer) clearTimeout(session.disconnectTimer);
  removeFromQueue(ctx, session.token);
  leaveRoom(ctx, session);
  ctx.sessions.delete(session.token);
}

export function attachSession(ctx: Engine, socket: GameSocket): Session {
  const auth = payloadOf(socket.handshake.auth);
  const token =
    typeof auth["token"] === "string" && TOKEN_RE.test(auth["token"])
      ? auth["token"]
      : null;
  let session = token ? ctx.sessions.get(token) : undefined;

  if (session) {
    if (session.disconnectTimer) {
      clearTimeout(session.disconnectTimer);
      session.disconnectTimer = null;
    }
    // Same player opened the game in another tab: the newest tab wins.
    const previous = socketOf(ctx, session);
    session.socketId = socket.id;
    if (previous && previous.id !== socket.id) {
      previous.emit("error", { message: "La partie a été ouverte dans un autre onglet." });
      previous.disconnect(true);
    }
  } else {
    session = {
      token: randomId(24),
      playerId: randomId(12),
      profileToken: "",
      ip: "",
      name: "Joueur",
      socketId: socket.id,
      roomCode: null,
      disconnectTimer: null,
      lastReactionAt: 0,
    };
    ctx.sessions.set(session.token, session);
  }

  // Long-lived profile for stats, kept by the browser across sessions.
  const profile = auth["profile"];
  session.profileToken =
    typeof profile === "string" && TOKEN_RE.test(profile) ? profile : newProfileToken();
  session.ip = (socket.data.ip as string | undefined) ?? "unknown";

  return session;
}
