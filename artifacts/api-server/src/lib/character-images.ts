import { logger } from "./logger";
import cachedImageFile from "../data/character-images.json" assert { type: "json" };

// Character portraits come from AniList's public API. To avoid a ~25 s lookup
// at every startup (boards dealt meanwhile had no pictures), resolved URLs are
// committed in data/character-images.json (id -> URL) and used right away;
// AniList is only asked about characters missing from that file. Regenerate
// it with `pnpm --filter @workspace/scripts run fetch-character-images`.
// A character can also pin its own picture with an "image" field in
// characters.json, which wins over both.
//
// AniList's "large" size is used (about 230 px wide): "medium" is roughly
// 100 px, blurry on the cards of a phone or retina screen.

export interface CharacterRef {
  id: string;
  name: string;
  anime: string;
  image?: string;
}

interface AniListCharacter {
  image: { large: string | null } | null;
  media: { nodes: { title: { romaji: string | null; english: string | null } }[] } | null;
}

const ANILIST_URL = "https://graphql.anilist.co";
const BATCH_SIZE = 6;
const DELAY_BETWEEN_BATCHES_MS = 1_500;

const imageUrls = new Map<string, string>();

export function imageUrlFor(id: string): string | null {
  return imageUrls.get(id) ?? null;
}

// Only well-formed https URLs from the committed file are trusted.
export function readImageCache(raw: unknown): Map<string, string> {
  const cache = new Map<string, string>();
  if (!raw || typeof raw !== "object") return cache;
  for (const [id, url] of Object.entries(raw)) {
    if (typeof url === "string" && url.startsWith("https://")) cache.set(id, url);
  }
  return cache;
}

const cachedImages = readImageCache(cachedImageFile);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// "Demon Slayer" must match "Demon Slayer: Kimetsu no Yaiba", "Re:Zero" must
// match "Re:Zero kara Hajimeru Isekai Seikatsu", etc.
function appearsIn(anime: string, candidate: AniListCharacter): boolean {
  const wanted = normalize(anime);
  return (candidate.media?.nodes ?? []).some(({ title }) =>
    [title.romaji, title.english].some((t) => {
      if (!t) return false;
      const got = normalize(t);
      return got.includes(wanted) || wanted.includes(got);
    }),
  );
}

function buildQuery(batch: CharacterRef[]): { query: string; variables: Record<string, string> } {
  const variables: Record<string, string> = {};
  const fields = batch.map((c, i) => {
    variables[`s${i}`] = c.name;
    return `c${i}: Page(perPage: 5) { characters(search: $s${i}) { image { large } media(perPage: 5) { nodes { title { romaji english } } } } }`;
  });
  const params = batch.map((_, i) => `$s${i}: String`).join(", ");
  return { query: `query (${params}) { ${fields.join(" ")} }`, variables };
}

async function fetchBatch(batch: CharacterRef[], found: Map<string, string>): Promise<void> {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(buildQuery(batch)),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`AniList responded ${res.status}`);

  const body = (await res.json()) as {
    data?: Record<string, { characters: AniListCharacter[] } | null>;
  };

  batch.forEach((c, i) => {
    const candidates = body.data?.[`c${i}`]?.characters ?? [];
    // Prefer a result from the right anime; names like "Rem" or "Scar" are common.
    const match = candidates.find((cand) => appearsIn(c.anime, cand));
    const url = match?.image?.large;
    if (url) found.set(c.id, url);
    else logger.warn({ character: c.name }, "No AniList image found");
  });
}

// Looks the characters up on AniList, a few at a time to respect its rate
// limit. `onFound` receives each batch's results as soon as they arrive.
// Failures are logged and skipped: the caller gets whatever was found.
export async function lookUpAniListImages(
  characters: CharacterRef[],
  onFound: (found: Map<string, string>) => void = () => {},
): Promise<Map<string, string>> {
  const all = new Map<string, string>();
  for (let i = 0; i < characters.length; i += BATCH_SIZE) {
    const batch = characters.slice(i, i + BATCH_SIZE);
    const found = new Map<string, string>();
    try {
      await fetchBatch(batch, found);
    } catch (err) {
      // Cards fall back to an initials avatar; the game works without images.
      logger.warn({ err, characters: batch.map((c) => c.name) }, "AniList lookup failed");
    }
    for (const [id, url] of found) all.set(id, url);
    onFound(found);
    if (i + BATCH_SIZE < characters.length) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
    }
  }
  return all;
}

export async function loadCharacterImages(characters: CharacterRef[]): Promise<void> {
  // Synchronous part: pinned and cached pictures are available immediately.
  for (const c of characters) {
    const known = c.image ?? cachedImages.get(c.id);
    if (known) imageUrls.set(c.id, known);
  }

  const missing = characters.filter((c) => !imageUrls.has(c.id));
  logger.info(
    { fromCache: imageUrls.size, toLookUp: missing.length, total: characters.length },
    "Character images ready from cache",
  );
  if (missing.length === 0) return;

  await lookUpAniListImages(missing, (found) => {
    for (const [id, url] of found) imageUrls.set(id, url);
  });

  logger.info(
    { found: imageUrls.size, total: characters.length },
    "Character images loaded",
  );
}
