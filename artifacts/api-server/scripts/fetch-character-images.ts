// Regenerates src/data/character-images.json, the committed cache of portrait
// URLs the server uses at startup (see src/lib/character-images.ts).
//
//   pnpm --filter @workspace/scripts run fetch-character-images
//
// Every character without a pinned "image" is looked up on AniList again.
// A character AniList can't answer for keeps its previous cached URL, so a
// failed or partial run never removes pictures. Review the diff before
// committing: a wrong match shows up as a changed URL.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  lookUpAniListImages,
  readImageCache,
  type CharacterRef,
} from "../src/lib/character-images";

const dataDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/data");
const charactersFile = path.join(dataDir, "characters.json");
const cacheFile = path.join(dataDir, "character-images.json");

const characters = JSON.parse(await readFile(charactersFile, "utf8")) as CharacterRef[];
const previous = readImageCache(JSON.parse(await readFile(cacheFile, "utf8")));

const toLookUp = characters.filter((c) => !c.image);
console.log(`Looking up ${toLookUp.length} characters on AniList…`);
const found = await lookUpAniListImages(toLookUp, (batch) => {
  process.stdout.write(`  +${batch.size}\n`);
});

// Same order as characters.json so diffs stay readable.
const next: Record<string, string> = {};
let kept = 0;
let changed = 0;
for (const c of toLookUp) {
  const url = found.get(c.id) ?? previous.get(c.id);
  if (!url) continue;
  if (!found.has(c.id)) kept++;
  else if (previous.has(c.id) && previous.get(c.id) !== url) changed++;
  next[c.id] = url;
}

await writeFile(cacheFile, JSON.stringify(next, null, 2) + "\n");
const missing = toLookUp.filter((c) => !next[c.id]).map((c) => c.name);
console.log(
  `Wrote ${Object.keys(next).length}/${toLookUp.length} URLs to ${path.relative(process.cwd(), cacheFile)}` +
    ` (${found.size} found, ${kept} kept from the previous file, ${changed} changed).`,
);
if (missing.length > 0) console.log(`No picture for: ${missing.join(", ")}`);
if (found.size === 0) {
  console.error("AniList returned nothing (network blocked or rate limited?).");
  process.exitCode = 1;
}
