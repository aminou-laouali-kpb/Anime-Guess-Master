import { logger } from "./logger";

// Character portraits come from AniList's public API, looked up once at
// startup and cached in memory. A character can pin its own picture with an
// "image" field in characters.json, which skips the lookup.

interface CharacterRef {
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

async function fetchBatch(batch: CharacterRef[]): Promise<void> {
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
    if (url) imageUrls.set(c.id, url);
    else logger.warn({ character: c.name }, "No AniList image found");
  });
}

export async function loadCharacterImages(characters: CharacterRef[]): Promise<void> {
  for (const c of characters) if (c.image) imageUrls.set(c.id, c.image);

  const missing = characters.filter((c) => !c.image);
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    try {
      await fetchBatch(batch);
    } catch (err) {
      // Cards fall back to an initials avatar; the game works without images.
      logger.warn({ err, characters: batch.map((c) => c.name) }, "AniList lookup failed");
    }
    if (i + BATCH_SIZE < missing.length) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  logger.info(
    { found: imageUrls.size, total: characters.length },
    "Character images loaded",
  );
}
