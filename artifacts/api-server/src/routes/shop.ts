import { Router, type IRouter } from "express";
import { CATALOG, PRODUCTS } from "../lib/monetisation/catalog";
import { databaseEnabled } from "../lib/database";
import { publicConfig } from "../lib/monetisation/config";

// Public, static data: works without a database.
const router: IRouter = Router();

router.get("/shop/catalog", (_req, res): void => {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.json({
    currency: "shards",
    items: CATALOG,
    products: PRODUCTS.map((p) => ({
      productId: p.productId,
      kind: p.kind,
      entitlement: p.entitlement,
      shards: p.shards,
      items: p.items,
    })),
  });
});

// Remote configuration: minimum app version, enabled features, ad caps.
router.get("/config", (_req, res): void => {
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json(publicConfig(databaseEnabled));
});

export default router;
