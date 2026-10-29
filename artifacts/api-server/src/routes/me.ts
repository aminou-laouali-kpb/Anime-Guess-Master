import { Router, type IRouter, type Request, type Response } from "express";
import { databaseEnabled } from "../lib/database";
import { logger } from "../lib/logger";
import { bearerProfileToken } from "../lib/rate-limit";
import { cleanName } from "../lib/game-engine";
import { invalidateLeaderboard } from "../lib/stats";
import { COSMETIC_SLOTS } from "../lib/monetisation/catalog";
import {
  type PlayerRef,
  buyItem,
  claimAdReward,
  createAdOffer,
  deleteAccount,
  equipItem,
  findPlayer,
  getAccount,
  registerPlayer,
} from "../lib/monetisation/wallet";
import { syncFromRevenueCat } from "../lib/monetisation/revenuecat";

// Per-profile endpoints for the mobile app. Authentication: the secret
// profile token in `Authorization: Bearer <token>` (the same token the game
// socket uses as `auth.profile`). No cookies, so no CSRF: another website
// can't read the token and can't make the browser send it.

const router: IRouter = Router();

function disabled(res: Response): boolean {
  if (databaseEnabled) return false;
  res.status(503).json({ error: "monetisation_disabled" });
  return true;
}

function fail(res: Response, err: unknown, what: string): void {
  logger.error({ err }, what);
  res.status(503).json({ error: "unavailable" });
}

/** Resolves the player from the bearer token, or answers 401/404. */
async function authenticate(req: Request, res: Response): Promise<{ player: PlayerRef; token: string } | null> {
  if (disabled(res)) return null;
  const token = bearerProfileToken(req);
  if (!token) {
    res.status(401).json({ error: "missing_profile_token" });
    return null;
  }
  const player = await findPlayer(token);
  if (!player) {
    res.status(404).json({ error: "unknown_profile" });
    return null;
  }
  return { player, token };
}

const body = (req: Request): Record<string, unknown> =>
  req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : {};

// Registers the profile (creating a token when none is sent). Call at app start.
router.post("/me", async (req, res): Promise<void> => {
  if (disabled(res)) return;
  try {
    const name = typeof body(req)["name"] === "string" ? cleanName(body(req)["name"]) : null;
    const result = await registerPlayer(bearerProfileToken(req), name);
    res.status(result.created ? 201 : 200).json({
      playerId: result.id,
      name: result.name,
      shardsBalance: result.shardsBalance,
      // Only returned when the server created it: store it in the secure keychain.
      profileToken: bearerProfileToken(req) ? null : result.profileToken,
    });
  } catch (err) {
    fail(res, err, "Failed to register profile");
  }
});

router.get("/me/entitlements", async (req, res): Promise<void> => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;
    res.json(await getAccount(auth.player));
  } catch (err) {
    fail(res, err, "Failed to load entitlements");
  }
});

router.post("/me/sync-purchases", async (req, res): Promise<void> => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;
    if (!process.env["REVENUECAT_API_KEY"]) {
      res.status(503).json({ error: "sync_not_configured" });
      return;
    }
    const synced = await syncFromRevenueCat(auth.player);
    res.json({ ...synced, account: await getAccount(auth.player) });
  } catch (err) {
    fail(res, err, "Failed to sync purchases");
  }
});

router.post("/me/ad-offers", async (req, res): Promise<void> => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;
    const adUnit = typeof body(req)["adUnit"] === "string" ? (body(req)["adUnit"] as string) : "";
    const result = await createAdOffer(auth.player, adUnit, body(req)["rewardKey"]);
    if (!result.ok) {
      res.status(result.error === "unknown_reward" ? 400 : 429).json({ error: result.error });
      return;
    }
    res.status(201).json({
      nonce: result.nonce,
      rewardKey: result.rewardKey,
      amount: result.amount,
      expiresAt: result.expiresAt,
      // To pass to AdMob's ServerSideVerificationOptions.
      ssv: { userId: auth.player.id, customData: result.nonce },
    });
  } catch (err) {
    fail(res, err, "Failed to create ad offer");
  }
});

router.post("/me/ad-rewards/claim", async (req, res): Promise<void> => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;
    const nonce = body(req)["nonce"];
    if (typeof nonce !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(nonce)) {
      res.status(400).json({ error: "invalid_nonce" });
      return;
    }
    const result = await claimAdReward(auth.player, nonce);
    const status = result.status === "pending" ? 202 : result.status === "unknown_offer" ? 404 : 200;
    res.status(status).json(result);
  } catch (err) {
    fail(res, err, "Failed to claim ad reward");
  }
});

router.post("/shop/buy", async (req, res): Promise<void> => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;
    const itemId = body(req)["itemId"];
    if (typeof itemId !== "string") {
      res.status(400).json({ error: "unknown_item" });
      return;
    }
    const result = await buyItem(auth.player, itemId);
    if (!result.ok) {
      const status = result.error === "insufficient_shards" || result.error === "already_owned" ? 409 : 400;
      res.status(status).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    fail(res, err, "Failed to buy item");
  }
});

router.post("/me/equip", async (req, res): Promise<void> => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;
    const slot = COSMETIC_SLOTS.find((s) => s === body(req)["slot"]);
    const itemId = body(req)["itemId"];
    if (!slot || (itemId !== null && typeof itemId !== "string")) {
      res.status(400).json({ error: "invalid_request" });
      return;
    }
    const result = await equipItem(auth.player, slot, itemId as string | null);
    if (!result.ok) {
      res.status(result.error === "not_owned" ? 409 : 400).json({ error: result.error });
      return;
    }
    res.json(await getAccount(auth.player));
  } catch (err) {
    fail(res, err, "Failed to equip item");
  }
});

// Account deletion from inside the app (Apple 5.1.1(v)).
router.delete("/me", async (req, res): Promise<void> => {
  try {
    const auth = await authenticate(req, res);
    if (!auth) return;
    await deleteAccount(auth.player.id);
    invalidateLeaderboard();
    res.json({ deleted: true });
  } catch (err) {
    fail(res, err, "Failed to delete account");
  }
});

export default router;
