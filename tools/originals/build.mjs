#!/usr/bin/env node
// Génère tools/originals/out/<id>.svg pour chaque personnage et la page autonome
// tools/originals/out/preview.html (SVG en ligne, aucune ressource externe).
// Usage : node tools/originals/build.mjs

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { portrait, UNIVERSES } from "./portrait.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out");
mkdirSync(outDir, { recursive: true });
const data = JSON.parse(readFileSync(join(here, "characters.originals.json"), "utf8"));

// Libellés français : mêmes valeurs que artifacts/anime-guess-who/src/lib/fr.ts et
// questions.ts, plus les nouvelles valeurs du casting original (elder, beastkin, merfolk).
const FR = {
  hairColor: { black: "noirs", blonde: "blonds", none: "chauve", brown: "bruns", red: "roux", green: "verts", orange: "orange", pink: "roses", silver: "argentés", white: "blancs", blue: "bleus", purple: "violets" },
  eyeColor: { blue: "bleus", red: "rouges", gray: "gris", black: "noirs", brown: "marron", green: "verts", yellow: "jaunes", violet: "violets", gold: "dorés", teal: "bleu-vert", pink: "roses" },
  gender: { male: "homme", female: "femme" },
  ageRange: { child: "enfant", teen: "ado", adult: "adulte", elder: "âgé" },
  species: { human: "humain", demon: "démon", android: "androïde", alien: "extraterrestre", elf: "elfe", beastkin: "hybride animal", merfolk: "peuple marin" },
  alignment: { hero: "héros", villain: "méchant", antihero: "anti-héros", neutral: "neutre" },
  role: { main: "principal", secondary: "secondaire" },
};
const LABELS = [["hairColor", "Cheveux"], ["eyeColor", "Yeux"], ["gender", "Genre"], ["ageRange", "Âge"], ["species", "Espèce"], ["alignment", "Camp"], ["role", "Rôle"]];
const fr = (k, v) => FR[k]?.[v] ?? v;
// Courte présentation de chaque univers (sommaire de la page).
const BLURB = {
  "Académie Vélisande": "Académie de magie : élèves maladroits, professeurs inquiétants.",
  "Clan des Joncs-Noirs": "Ninjas des marais, entre roseaux, brume et clans rivaux.",
  "Équipage du Cirrus Écarlate": "Pirates du ciel, navires volants et flotte impériale.",
  "Cité-Néon Okarvo": "Mégapole cyberpunk : hackers, androïdes et magnats.",
  "Sanctuaire de Mikazune": "Sanctuaire des esprits : gardiens, oni et exorcistes.",
  "Ligue Astrobol": "Tournoi de sport futuriste, rivalités et coups bas.",
  "Friches de Morne-Acier": "Terres dévastées : ferrailleurs, caravanes et seigneurs de guerre.",
  "Cour d'Isembrune": "Cour royale de fantasy : princesse, régente et intrigues.",
  "Abysses de Thalorie": "Royaume sous-marin de sirènes, tritons et contrebandiers.",
  "Agence Cadranoir": "Détectives d'une ville rétro, pluie, néons et crime organisé.",
};
const slug = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

let maxSize = 0;
const cards = new Map();
for (const c of data) {
  const svg = portrait(c);
  const size = Buffer.byteLength(svg);
  maxSize = Math.max(maxSize, size);
  if (size > 15 * 1024) console.warn(`ATTENTION ${c.id} : ${size} octets (> 15 Ko)`);
  writeFileSync(join(outDir, `${c.id}.svg`), svg);
  const uni = UNIVERSES[c.anime];
  const chip = uni ? `style="--u1:${uni.bg[0]};--u2:${uni.bg[1]}"` : "";
  if (!cards.has(c.anime)) cards.set(c.anime, []);
  cards.get(c.anime).push(`<article class="card">
<div class="pic">${svg}</div>
<div class="body"><h3>${esc(c.name)}${c.lot ? ` <small>lot ${c.lot}</small>` : ""}</h3><p class="uni" ${chip}>${esc(c.anime)}</p>
<dl>${LABELS.map(([k, l]) => `<div><dt>${l}</dt><dd>${esc(fr(k, c[k]))}</dd></div>`).join("")}</dl>
<p class="bio">${esc(c.bio ?? "")}</p></div></article>`);
}

const universes = [...cards.keys()];
const chipStyle = (u) => { const x = UNIVERSES[u]; return x ? `style="--u1:${x.bg[0]};--u2:${x.bg[1]}"` : ""; };
const lots = [...new Set(data.map((c) => c.lot ?? 1))].sort();
const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AnimeWho Originals</title>
<style>
:root{--bg:#06060f;--card:#0f1020;--border:#22244a;--fg:#f4f4fb;--muted:#a9abc8;--primary:#4f7bff;--pink:#ff3fa4}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 20% -10%,#1b1550 0,transparent 60%),var(--bg);color:var(--fg);font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
header{padding:28px 16px 8px;max-width:1280px;margin:0 auto}
h1{margin:0;font-size:clamp(24px,5vw,36px);letter-spacing:.5px}
h1 span{background:linear-gradient(90deg,var(--primary),var(--pink));-webkit-background-clip:text;background-clip:text;color:transparent}
header p{color:var(--muted);margin:6px 0 0;max-width:70ch}
.unis{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 0;padding:0;list-style:none}
.unis li,.uni{font-size:12px;padding:3px 10px;border-radius:999px;background:linear-gradient(#0006,#0006),linear-gradient(90deg,var(--u1,#333),var(--u2,#555));color:#fff;text-shadow:0 1px 2px #000a;font-weight:600}
html{scroll-behavior:smooth}
nav{max-width:1280px;margin:0 auto;padding:12px 16px 0}
nav ol{list-style:none;margin:0;padding:0;display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr))}
nav a{display:block;text-decoration:none;color:var(--fg);background:var(--card);border:1px solid var(--border);border-radius:12px;padding:8px 12px}
nav a:hover,nav a:focus-visible{border-color:var(--primary);outline:none}
nav b{display:block;font-size:14px}nav span{display:block;color:var(--muted);font-size:12px}
section{max-width:1280px;margin:0 auto;padding:22px 16px 0;scroll-margin-top:8px}
section>h2{margin:0 0 4px;font-size:22px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
section>h2 .uni{margin:0;font-size:13px}
section>p{margin:0 0 12px;color:var(--muted)}
.top{font-size:12px;color:var(--muted);text-decoration:none;margin-left:auto}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
.card{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 8px 24px #0006}
.pic svg{display:block;width:100%;height:auto}
.body{padding:12px 14px 14px}
h3{margin:0;font-size:18px}h3 small{white-space:nowrap;font-size:11px;font-weight:500;color:var(--muted);border:1px solid var(--border);border-radius:6px;padding:0 5px;vertical-align:middle}
.uni{display:inline-block;max-width:100%;margin:6px 0 10px}
dl{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;margin:0;font-size:13px}
dl div{display:flex;justify-content:space-between;gap:6px;border-bottom:1px dashed #262850;padding:2px 0}
dt{color:var(--muted)}dd{margin:0;font-weight:600;text-align:right}
.bio{color:#d6d7ee;font-size:13px;margin:10px 0 0;font-style:italic}
footer{color:var(--muted);text-align:center;font-size:12px;padding:8px 16px 28px}
@media (max-width:520px){.grid{grid-template-columns:1fr 1fr;gap:10px}section{padding:18px 10px 0}.body{padding:8px 9px 10px}h3{font-size:15px}dl{grid-template-columns:1fr;font-size:12px}.bio{font-size:12px}nav ol{grid-template-columns:1fr 1fr;gap:6px}nav a{padding:7px 9px}nav span{display:none}nav b{font-size:13px}section>h2{font-size:18px}}
</style></head><body>
<header id="haut"><h1>Anime<span>Who</span> Originals — ${lots.length > 1 ? `lots&nbsp;${lots[0]}&nbsp;à&nbsp;${lots[lots.length - 1]}` : `lot&nbsp;n°&nbsp;${lots[0]}`}</h1>
<p>${data.length} personnages 100 % originaux, portraits générés par code (SVG), ${universes.length} univers inventés.</p></header>
<nav aria-label="Sommaire"><ol>${universes.map((u) => `<li><a href="#${slug(u)}"><b>${esc(u)} (${cards.get(u).length})</b><span>${esc(BLURB[u] ?? "")}</span></a></li>`).join("")}</ol></nav>
<main>
${universes.map((u) => `<section id="${slug(u)}"><h2><span class="uni" ${chipStyle(u)}>${esc(u)}</span> ${cards.get(u).length} personnages <a class="top" href="#haut">↑ sommaire</a></h2><p>${esc(BLURB[u] ?? "")}</p>
<div class="grid">
${cards.get(u).join("\n")}
</div></section>`).join("\n")}
</main>
<footer style="padding-top:24px">Généré par tools/originals/build.mjs — aucun lien externe.</footer>
</body></html>
`;
writeFileSync(join(outDir, "preview.html"), html);
console.log(`${data.length} portraits écrits dans ${outDir} (SVG le plus lourd : ${(maxSize / 1024).toFixed(1)} Ko), preview.html : ${(Buffer.byteLength(html) / 1024).toFixed(0)} Ko`);
