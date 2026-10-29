// Cosmetic catalogue, served to the app by GET /api/shop/catalog. All names
// and designs are original (no third-party IP, BUSINESS_PLAN §6). Kept in
// code rather than in a table: it works without a database, is reviewed in
// pull requests, and the inventory only stores item ids.
// Prices: MONETISATION_SPEC §3.3. priceShards null = not sold for Éclats
// (exclusive to a pack, an event or the subscription).

export const COSMETIC_SLOTS = ["card_back", "frame", "reaction_pack", "victory_fx", "board"] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

export interface CatalogItem {
  id: string;
  slot: CosmeticSlot;
  name: { fr: string; en: string };
  priceShards: number | null;
  // Shown to the opponent (card backs, frames, reactions, victory effects) or only to oneself (boards).
  visibleToOpponent: boolean;
  featured: boolean;
}

const item = (
  id: string,
  slot: CosmeticSlot,
  fr: string,
  en: string,
  priceShards: number | null,
  featured = false,
): CatalogItem => ({ id, slot, name: { fr, en }, priceShards, visibleToOpponent: slot !== "board", featured });

export const CATALOG: readonly CatalogItem[] = [
  // Dos de cartes
  item("card_back_sakura", "card_back", "Sakura", "Sakura", 300, true),
  item("card_back_neon", "card_back", "Néon", "Neon", 400),
  item("card_back_ink", "card_back", "Encre", "Ink", 300),
  item("card_back_gold", "card_back", "Or", "Gold", 600),
  item("card_back_wave", "card_back", "Grande vague", "Great Wave", 400),
  item("card_back_stars", "card_back", "Nuit étoilée", "Starry Night", 500),
  item("card_back_origami", "card_back", "Origami", "Origami", 300),
  item("card_back_dawn", "card_back", "Aube", "Dawn", null), // pack de démarrage
  // Cadres de profil
  item("frame_flames", "frame", "Flammes", "Flames", 400, true),
  item("frame_pixel", "frame", "Pixel", "Pixel", 300),
  item("frame_moon", "frame", "Lune", "Moon", 500),
  item("frame_thunder", "frame", "Tonnerre", "Thunder", 400),
  item("frame_lantern", "frame", "Lanterne", "Lantern", 300),
  item("frame_crystal", "frame", "Cristal", "Crystal", 500),
  item("frame_rookie", "frame", "Recrue", "Rookie", null), // pack de démarrage
  // Packs de réactions (4 émojis animés originaux chacun)
  item("reactions_shock", "reaction_pack", "Choc", "Shock", 400, true),
  item("reactions_victory", "reaction_pack", "Victoire", "Victory", 400),
  item("reactions_cute", "reaction_pack", "Mignon", "Cute", 400),
  item("reactions_detective", "reaction_pack", "Détective", "Detective", 400),
  item("reactions_drama", "reaction_pack", "Drame", "Drama", 400),
  // Animations de victoire
  item("victory_petals", "victory_fx", "Pluie de pétales", "Petal Rain", 500, true),
  item("victory_lightning", "victory_fx", "Éclair", "Lightning", 600),
  item("victory_fireworks", "victory_fx", "Feu d’artifice", "Fireworks", 800),
  item("victory_confetti", "victory_fx", "Confettis", "Confetti", 500),
  item("victory_spirit", "victory_fx", "Esprit renard", "Fox Spirit", 700),
  // Plateaux (vus seulement par soi)
  item("board_dojo", "board", "Dojo", "Dojo", 300),
  item("board_rooftops", "board", "Toits de la ville", "City Rooftops", 300),
  item("board_classroom", "board", "Salle de classe", "Classroom", 300),
  item("board_sky_harbor", "board", "Port céleste", "Sky Harbor", 300),
  item("board_shrine", "board", "Sanctuaire", "Shrine", 300),
];

export const CATALOG_BY_ID = new Map(CATALOG.map((i) => [i.id, i]));

// In-app products (MONETISATION_SPEC §3.1) and what the server grants for them.
export interface ProductGrant {
  productId: string;
  kind: "non_consumable" | "consumable" | "subscription";
  entitlement: string | null;
  shards: number;
  items: string[];
}

export const PRODUCTS: readonly ProductGrant[] = [
  { productId: "animewho.noads", kind: "non_consumable", entitlement: "no_ads", shards: 0, items: [] },
  { productId: "animewho.starter_pack", kind: "non_consumable", entitlement: null, shards: 500, items: ["card_back_dawn", "frame_rookie"] },
  { productId: "animewho.shards_100", kind: "consumable", entitlement: null, shards: 100, items: [] },
  { productId: "animewho.shards_550", kind: "consumable", entitlement: null, shards: 550, items: [] },
  { productId: "animewho.shards_1200", kind: "consumable", entitlement: null, shards: 1200, items: [] },
  { productId: "animewho.plus.monthly", kind: "subscription", entitlement: "plus", shards: 0, items: [] },
  { productId: "animewho.plus.yearly", kind: "subscription", entitlement: "plus", shards: 0, items: [] },
];

const PRODUCT_BY_ID = new Map(PRODUCTS.map((p) => [p.productId, p]));

/** What a store product grants. Themes and season passes follow a pattern. */
export function grantFor(productId: string): ProductGrant | null {
  const known = PRODUCT_BY_ID.get(productId);
  if (known) return known;
  const theme = /^animewho\.theme\.([a-z0-9_]{1,32})$/.exec(productId);
  if (theme) return { productId, kind: "non_consumable", entitlement: `theme_${theme[1]}`, shards: 0, items: [] };
  const pass = /^animewho\.pass\.(s\d{2})$/.exec(productId);
  if (pass) return { productId, kind: "non_consumable", entitlement: `pass_${pass[1]}`, shards: 0, items: [] };
  return null;
}

/** Entitlements that remove interstitials and banners. */
export const NO_ADS_ENTITLEMENTS = ["no_ads", "plus"];
