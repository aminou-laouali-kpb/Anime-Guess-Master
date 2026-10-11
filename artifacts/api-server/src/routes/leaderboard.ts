import { Router, type IRouter } from "express";
import { getLeaderboard, MIN_RANKED_GAMES, statsEnabled } from "../lib/stats";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/leaderboard", async (_req, res): Promise<void> => {
  try {
    res.json({
      enabled: statsEnabled,
      minRankedGames: MIN_RANKED_GAMES,
      entries: await getLeaderboard(),
    });
  } catch (err) {
    logger.error({ err }, "Failed to load leaderboard");
    res.status(503).json({ error: "Leaderboard unavailable" });
  }
});

export default router;
