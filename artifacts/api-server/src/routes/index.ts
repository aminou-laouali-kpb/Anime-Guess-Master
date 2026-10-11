import { Router, type IRouter } from "express";
import healthRouter from "./health";
import charactersRouter from "./characters";
import leaderboardRouter from "./leaderboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(charactersRouter);
router.use(leaderboardRouter);

export default router;
