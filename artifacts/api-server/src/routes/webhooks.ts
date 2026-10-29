import express, { Router, type IRouter } from "express";
import { databaseEnabled } from "../lib/database";
import { logger } from "../lib/logger";
import { parseEvent, processRevenueCatEvent, webhookAuthorized } from "../lib/monetisation/revenuecat";
import { admobKeys, verifySsv } from "../lib/monetisation/admob-ssv";
import { recordVerifiedAdReward } from "../lib/monetisation/wallet";

// Calls from RevenueCat and AdMob, not from the app. Mounted before the
// global 10 kB JSON parser: RevenueCat events can be larger.
const router: IRouter = Router();

// POST /api/webhooks/revenuecat — secret in the Authorization header
// (REVENUECAT_WEBHOOK_AUTH, set to the same value in the RevenueCat dashboard).
router.post("/webhooks/revenuecat", express.json({ limit: "256kb" }), async (req, res): Promise<void> => {
  if (!process.env["REVENUECAT_WEBHOOK_AUTH"]) {
    res.status(404).json({ error: "not_configured" });
    return;
  }
  if (!webhookAuthorized(req.headers.authorization)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  if (!databaseEnabled) {
    // 5xx: RevenueCat retries later, nothing is lost.
    res.status(503).json({ error: "monetisation_disabled" });
    return;
  }
  const event = parseEvent(req.body);
  if (!event) {
    res.status(400).json({ error: "invalid_event" });
    return;
  }
  try {
    const outcome = await processRevenueCatEvent(event);
    res.json({ outcome });
  } catch (err) {
    logger.error({ err, eventId: event.id }, "RevenueCat webhook failed");
    res.status(500).json({ error: "processing_failed" });
  }
});

// GET /api/admob/ssv — AdMob rewarded-ad server-side verification callback.
router.get("/admob/ssv", async (req, res): Promise<void> => {
  if (!databaseEnabled) {
    res.status(503).json({ error: "monetisation_disabled" });
    return;
  }
  const rawQuery = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?") + 1) : "";
  const verified = await verifySsv(rawQuery, admobKeys);
  if (!verified.ok) {
    if (verified.reason === "keys_unavailable") {
      res.status(503).json({ error: verified.reason }); // AdMob retries
      return;
    }
    logger.warn({ reason: verified.reason }, "Rejected AdMob SSV callback");
    res.status(verified.reason === "malformed" ? 400 : 403).json({ error: verified.reason });
    return;
  }
  try {
    const status = await recordVerifiedAdReward(verified.params);
    if (status !== "recorded" && status !== "duplicate") {
      logger.warn({ status, transactionId: verified.params.transactionId }, "AdMob SSV not credited");
    }
    // Always 200 once the signature is valid: a retry would not change the answer.
    res.json({ status });
  } catch (err) {
    logger.error({ err }, "AdMob SSV failed");
    res.status(500).json({ error: "processing_failed" });
  }
});

export default router;
