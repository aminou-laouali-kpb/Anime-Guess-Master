import { Router, type IRouter } from "express";
import { getCharacters } from "../lib/game-engine";

const router: IRouter = Router();

router.get("/characters", (_req, res): void => {
  res.json(getCharacters());
});

export default router;
