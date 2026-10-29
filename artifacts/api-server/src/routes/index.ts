import { Router, type IRouter } from "express";
import healthRouter from "./health";
import charactersRouter from "./characters";
import leaderboardRouter from "./leaderboard";
import meRouter from "./me";
import shopRouter from "./shop";

const router: IRouter = Router();

router.use(healthRouter);
router.use(charactersRouter);
router.use(leaderboardRouter);
router.use(shopRouter);
router.use(meRouter);

export default router;
