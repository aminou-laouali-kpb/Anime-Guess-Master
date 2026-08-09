import { Router, type IRouter } from "express";
import { createRoomRest, getRoomByCode, getRoomPublicState } from "../lib/game-engine";

const router: IRouter = Router();

router.post("/rooms", (req, res): void => {
  const hostName = typeof req.body?.hostName === "string" ? req.body.hostName : undefined;
  const room = createRoomRest(hostName);
  res.status(201).json(getRoomPublicState(room));
});

router.get("/rooms/:code", (req, res): void => {
  const raw = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
  const room = getRoomByCode(raw ?? "");

  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }

  res.json(getRoomPublicState(room));
});

export default router;
