import { addToRoom, createRoom, dealBoard, emitRoomJoined, generateCode } from "./rooms";
import type { Engine, Session } from "./state";
import { updateTimer } from "./timers";

// Quick-play queue: the first player waits, the next one starts a game with them.

export function removeFromQueue(ctx: Engine, token: string): void {
  const idx = ctx.queue.indexOf(token);
  if (idx !== -1) ctx.queue.splice(idx, 1);
}

// Pairs the player with whoever waits, or queues them. Returns their queue
// position when they wait, null when a game started.
export function joinQueue(ctx: Engine, session: Session): number | null {
  if (ctx.queue.includes(session.token)) {
    return ctx.queue.indexOf(session.token) + 1;
  }

  // Skip anyone who disconnected while waiting.
  let waiting: Session | undefined;
  while (!waiting && ctx.queue.length > 0) {
    const candidate = ctx.sessions.get(ctx.queue.shift()!);
    if (candidate?.socketId) waiting = candidate;
  }

  if (!waiting) {
    ctx.queue.push(session.token);
    return ctx.queue.length;
  }

  const room = createRoom(generateCode(ctx), "quick");
  ctx.rooms.set(room.code, room);
  addToRoom(ctx, room, waiting);
  addToRoom(ctx, room, session);
  room.phase = "selection";
  room.characterIds = dealBoard();
  emitRoomJoined(ctx, room);
  updateTimer(ctx, room);
  return null;
}
