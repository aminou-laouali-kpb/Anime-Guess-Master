#!/usr/bin/env node
// Vérifie le casting original (characters.originals.json) :
//  - même schéma que artifacts/api-server/src/data/characters.json ;
//  - aucun couple de personnages identique sur les traits vérifiables ;
//  - aucune valeur qui ne concerne qu'un seul personnage (ou tous sauf un) ;
//  - valeurs connues du jeu (traduites dans fr.ts / questions.ts), sinon listées à part.
// Usage : node tools/originals/check.mjs   (code de sortie 1 en cas d'erreur)

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const data = JSON.parse(readFileSync(join(here, "characters.originals.json"), "utf8"));

// Même liste que VERIFIABLE_ATTRIBUTES dans artifacts/api-server/src/lib/game-engine.ts
const VERIFIABLE = ["hairColor", "eyeColor", "gender", "ageRange", "species", "alignment", "role", "anime"];
const LABEL = { hairColor: "Cheveux", eyeColor: "Yeux", gender: "Genre", ageRange: "Âge", species: "Espèce", alignment: "Camp", role: "Rôle", anime: "Univers" };

const errors = [];
const warnings = [];

// ---- Vocabulaire connu, lu dans le front s'il est présent ----
function tableKeys(src, name) {
  const m = src.match(new RegExp(`const ${name}[^=]*=\\s*\\{([\\s\\S]*?)\\};`));
  if (!m) return null;
  return [...m[1].matchAll(/(?:"([^"]+)"|([a-z][a-z-]*))\s*:/g)].map((x) => x[1] ?? x[2]);
}
const known = {};
const frPath = join(root, "artifacts/anime-guess-who/src/lib/fr.ts");
const qPath = join(root, "artifacts/anime-guess-who/src/lib/questions.ts");
if (existsSync(frPath)) {
  const fr = readFileSync(frPath, "utf8");
  known.hairColor = tableKeys(fr, "HAIR");
  known.eyeColor = tableKeys(fr, "EYES");
  known.species = tableKeys(fr, "SPECIES");
  known.gender = tableKeys(fr, "GENDER");
  known.alignment = tableKeys(fr, "ALIGNMENT");
  known.role = tableKeys(fr, "ROLE");
}
if (existsSync(qPath)) {
  const q = readFileSync(qPath, "utf8");
  known.ageRange = tableKeys(q, "AGE_PHRASES");
}

// ---- Schéma ----
const STRING_KEYS = ["id", "name", "anime", "gender", "hairColor", "eyeColor", "ageRange", "species", "alignment", "role"];
const ids = new Set();
for (const c of data) {
  for (const k of STRING_KEYS) {
    if (typeof c[k] !== "string" || !c[k].trim()) errors.push(`${c.id ?? "?"}.${k} manquant ou vide`);
  }
  if (!Array.isArray(c.powers)) errors.push(`${c.id}.powers doit être un tableau`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id)) errors.push(`id non kebab-case : ${c.id}`);
  if (ids.has(c.id)) errors.push(`id en double : ${c.id}`);
  ids.add(c.id);
  for (const k of VERIFIABLE.filter((k) => k !== "anime")) {
    if (c[k] !== c[k].toLowerCase()) errors.push(`${c.id}.${k} doit être en minuscules`);
  }
  if (typeof c.bio !== "string" || !c.bio.trim()) warnings.push(`${c.id} : pas de bio`);
  if (!c.appearance) warnings.push(`${c.id} : pas de champ appearance (portrait par défaut)`);
}
const nameSet = new Set(data.map((c) => c.name.toLowerCase()));
if (nameSet.size !== data.length) errors.push("deux personnages portent le même nom");

// ---- Indiscernables ----
const groups = new Map();
for (const c of data) {
  const key = VERIFIABLE.map((k) => String(c[k]).toLowerCase()).join("|");
  groups.set(key, [...(groups.get(key) ?? []), c.id]);
}
for (const g of groups.values()) if (g.length > 1) errors.push(`indiscernables par les questions vérifiées : ${g.join(", ")}`);

// Distance minimale (nombre de traits vérifiables différents) entre deux personnages
let minDist = Infinity;
const closest = [];
for (let i = 0; i < data.length; i++) {
  for (let j = i + 1; j < data.length; j++) {
    const d = VERIFIABLE.filter((k) => data[i][k] !== data[j][k]).length;
    if (d < minDist) { minDist = d; closest.length = 0; }
    if (d === minDist) closest.push(`${data[i].id} / ${data[j].id}`);
  }
}

// ---- Répartitions ----
const n = data.length;
const newValues = [];
console.log(`\n${n} personnages, ${new Set(data.map((c) => c.anime)).size} univers\n`);
for (const k of VERIFIABLE) {
  const counts = new Map();
  for (const c of data) counts.set(c[k], (counts.get(c[k]) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`${LABEL[k].padEnd(8)} ${sorted.map(([v, x]) => `${v} ${x}`).join(" · ")}`);
  for (const [v, x] of sorted) {
    if (x === 1) errors.push(`${LABEL[k]} = « ${v} » ne concerne qu'un personnage (question trop chanceuse)`);
    if (x === n - 1) errors.push(`${LABEL[k]} = « ${v} » concerne tous les personnages sauf un`);
    if (k !== "anime" && known[k] && !known[k].includes(v)) newValues.push(`${k}: ${v}`);
  }
  if (counts.size === 1) errors.push(`${LABEL[k]} : une seule valeur, la question est inutile`);
}
const female = data.filter((c) => c.gender === "female").length;
if (female < n * 0.3 || n - female < n * 0.3) errors.push("déséquilibre de genre (moins de 30 % d'un genre)");

console.log(`\nDistance minimale entre deux personnages : ${minDist} trait(s) vérifiable(s) différent(s)`);
console.log(`  paires les plus proches : ${closest.slice(0, 6).join(" ; ")}${closest.length > 6 ? ` (+${closest.length - 6})` : ""}`);
console.log(`\nValeurs nouvelles (absentes de fr.ts / questions.ts, à traduire avant intégration) :`);
console.log(newValues.length ? [...new Set(newValues)].map((v) => `  - ${v}`).join("\n") : "  aucune");

if (warnings.length) console.log(`\nAvertissements :\n${warnings.map((w) => `  - ${w}`).join("\n")}`);
if (errors.length) {
  console.log(`\nERREURS (${errors.length}) :\n${errors.map((e) => `  - ${e}`).join("\n")}\n`);
  process.exit(1);
}
console.log("\nOK : aucun doublon, aucune valeur à 1 ou n-1 personnage.\n");
