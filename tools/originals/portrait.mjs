// Générateur de portraits SVG « style anime simplifié » pour le casting original.
// Node pur, aucune dépendance, déterministe : même personnage => même SVG, octet pour octet.
//
//   import { portrait } from "./portrait.mjs";
//   const svg = portrait(character);           // chaîne <svg …>…</svg>, viewBox 0 0 200 200
//
// Le dessin est piloté par les traits du jeu (hairColor, eyeColor, ageRange, species,
// alignment, gender, anime) et par le champ optionnel `appearance` (voir README.md).

// ---------------------------------------------------------------- palettes

export const HAIR_HEX = {
  black: "#2c2838", blonde: "#f4cf5e", red: "#d63f3a", brown: "#8b5a3a", pink: "#f497bd",
  white: "#f3f3f7", silver: "#b8c2d3", blue: "#3f7fe0", green: "#4caf6c", purple: "#8a5ac8",
  orange: "#f28a2e", "dark blue": "#284a9a", yellow: "#f7e04a", "dark green": "#2f6b45",
  "light green": "#8fd47c",
};
export const EYE_HEX = {
  blue: "#2f8ef0", red: "#e3343b", green: "#2fae5a", brown: "#8a5228", gold: "#e8b11c",
  golden: "#e8b11c", violet: "#9a55e8", gray: "#8592a8", pink: "#f0609f", teal: "#16b3a8",
  black: "#3a3340", dark: "#3a3340", yellow: "#e6d21c", amber: "#e39a1c",
};
export const SKIN_HEX = {
  fair: "#fde4d2", light: "#f8d6be", pale: "#fcebe2", tan: "#e5b38d", brown: "#b97f59",
  dark: "#80533a", lilac: "#dcc6ea", lavender: "#c3cdf3", green: "#a9d49b", metal: "#cdd6e0",
  porcelain: "#f4f2f6", rose: "#f4bcae", ash: "#b9acb8",
};

// Fond et motif de chaque univers (couleur de repli calculée sinon).
export const UNIVERSES = {
  "Académie Vélisande": { bg: ["#25235f", "#6b3d9c"], motif: "stars", accent: "#f6d86b" },
  "Clan des Joncs-Noirs": { bg: ["#0f2e2a", "#2f6d50"], motif: "reeds", accent: "#cfe8b0" },
  "Équipage du Cirrus Écarlate": { bg: ["#4ea8e0", "#f6c08f"], motif: "clouds", accent: "#ffffff" },
  "Cité-Néon Okarvo": { bg: ["#100b28", "#3d1352"], motif: "neon", accent: "#ff4fa3" },
  "Sanctuaire de Mikazune": { bg: ["#6e1226", "#e0715a"], motif: "petals", accent: "#ffd27a" },
};

// ---------------------------------------------------------------- utilitaires

const r1 = (v) => Math.round(v * 10) / 10;
const P = (...xy) => xy.map(r1).join(",");
const lerp = (a, b, t) => a + (b - a) * t;

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** amt < 0 : vers le noir ; amt > 0 : vers le blanc. */
export function shade(hex, amt) {
  const t = amt < 0 ? 0 : 255;
  const k = Math.abs(amt);
  const [r, g, b] = hexToRgb(hex).map((c) => Math.round(c + (t - c) * k));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
function rng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INK = "#2a1c26";

// ---------------------------------------------------------------- proportions par âge

const AGE = {
  child: { cy: 100, W: 36, chin: 138, shY: 160, shW: 50, eyeDy: 18, eyeDx: 16.5, ew: 17.5, eh: 19 },
  teen: { cy: 90, W: 33, chin: 134, shY: 156, shW: 60, eyeDy: 17, eyeDx: 15.5, ew: 16.5, eh: 16 },
  adult: { cy: 86, W: 32, chin: 135, shY: 157, shW: 68, eyeDy: 18, eyeDx: 15, ew: 16, eh: 12.5 },
  elder: { cy: 88, W: 32, chin: 135, shY: 158, shW: 64, eyeDy: 18, eyeDx: 15, ew: 15, eh: 10 },
};

// Coiffures : couche arrière, sommet du crâne, frange, longueur des mèches latérales, extra.
const STYLES = {
  spiky: { back: "nape", top: "spiky", fringe: "spiky", side: 0.5 },
  messy: { back: "nape", top: "messy", fringe: "locks", side: 0.55, extra: "ahoge" },
  short: { back: "nape", top: "arc", fringe: "swept", side: 0.55, extra: "ahoge" },
  bob: { back: "bob", top: "arc", fringe: "soft", side: 1.15 },
  long: { back: "long", top: "arc", fringe: "center", side: 1.9 },
  hime: { back: "hime", top: "arc", fringe: "blunt", side: 1.2 },
  wavy: { back: "wavy", top: "arc", fringe: "swept", side: 1.9, wavy: true },
  ponytail: { back: "nape", top: "arc", fringe: "locks", side: 0.95, extra: "ponytail" },
  twintails: { back: "nape", top: "arc", fringe: "soft", side: 0.8, extra: "twintails" },
  bun: { back: "nape", top: "arc", fringe: "center", side: 0.7, extra: "bun" },
  braid: { back: "nape", top: "arc", fringe: "blunt", side: 0.7, extra: "braid" },
  slicked: { back: "nape", top: "arc", fringe: "slick", side: 0.45 },
  bald: { back: "none", top: "none", fringe: "none", side: 0 },
};
export const HAIR_STYLES = Object.keys(STYLES);

// ---------------------------------------------------------------- portrait

export function portrait(c) {
  const ap = c.appearance ?? {};
  const pid = c.id.replace(/[^a-z0-9]/g, "");
  const A = AGE[c.ageRange] ?? AGE.teen;
  const cx = 100;
  const { cy, W, chin, shY, shW } = A;
  const R = W + 4.5; // rayon du volume de cheveux
  const eyeY = cy + A.eyeDy;
  const browY = eyeY - A.eh * 0.62 - 4.5;
  const mouthY = chin - (chin - eyeY) * 0.37;
  const cheekY = cy + W * 0.5;
  const female = c.gender === "female";
  const align = c.alignment ?? "hero";
  const species = c.species ?? "human";
  const acc = new Set(ap.accessories ?? []);
  const rand = rng(hash(c.id));

  const styleName = c.hairColor === "none" ? "bald" : ap.hairStyle ?? (female ? "long" : "short");
  const st = STYLES[styleName] ?? STYLES.short;
  const hair = HAIR_HEX[c.hairColor] ?? "#555066";
  const hairDark = shade(hair, c.hairColor === "black" ? -0.45 : -0.28);
  const hairLine = shade(hair, -0.62);
  const hairHi = shade(hair, c.hairColor === "black" ? 0.32 : 0.5);
  const skinDefault = species === "android" ? "porcelain" : species === "alien" ? "lavender" : "light";
  const skin = SKIN_HEX[ap.skin] ?? SKIN_HEX[skinDefault];
  const skinShade = shade(skin, -0.14);
  const skinLine = shade(skin, -0.55);
  const eye = EYE_HEX[c.eyeColor] ?? "#555";
  const outfit = ap.outfit ?? {};
  const cloth = outfit.color ?? "#3a3a55";
  const trim = outfit.trim ?? "#e0c060";
  const uni = UNIVERSES[c.anime] ?? (() => {
    const h = hash(c.anime ?? "") % 360;
    return { bg: [`hsl(${h} 45% 22%)`, `hsl(${(h + 40) % 360} 50% 45%)`], motif: "stars", accent: "#fff" };
  })();

  const out = [];
  const add = (s) => out.push(s);
  const path = (d, fill, stroke = INK, sw = 1.6, extra = "") =>
    `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""}${extra}/>`;

  // ---------------- defs
  const faceD = facePath(cx, cy, W, cheekY, chin, ap.face ?? (c.ageRange === "child" ? "round" : "oval"));
  add(`<defs><linearGradient id="${pid}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${uni.bg[0]}"/><stop offset="1" stop-color="${uni.bg[1]}"/></linearGradient>` +
    `<linearGradient id="${pid}-ir" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(eye, -0.55)}"/><stop offset=".55" stop-color="${eye}"/><stop offset="1" stop-color="${shade(eye, 0.45)}"/></linearGradient>` +
    `<clipPath id="${pid}-fc"><path d="${faceD}"/></clipPath></defs>`);

  // ---------------- fond
  add(`<rect width="200" height="200" fill="url(#${pid}-bg)"/>`);
  add(background(uni, rand, cx, cy));

  // ---------------- personnage (agrandi autour du centre pour remplir la carte)
  add(`<g transform="translate(-12 -8) scale(1.12)">`);
  // ---------------- cheveux arrière
  if (st.back !== "none") add(path(backHair(st, cx, cy, W, R, chin, shY, rand), hairDark, hairLine, 1.6, ' stroke-linejoin="round"'));
  if (st.extra === "ponytail") add(ponytail(cx, cy, R, hair, hairDark, hairLine, female, trim, acc.has("ribbon")));
  if (st.extra === "twintails") add(twintails(cx, cy, R, hair, hairDark, hairLine, acc.has("ribbon") ? "#e8455f" : trim));
  if (st.extra === "bun") add(`<circle cx="${cx + 2}" cy="${r1(cy - R - 3)}" r="${r1(W * 0.42)}" fill="${hair}" stroke="${hairLine}" stroke-width="1.6"/><path d="M${P(cx - 8, cy - R - 6)}q10 -6 18 2" fill="none" stroke="${hairHi}" stroke-width="2" stroke-linecap="round"/>`);

  // ---------------- oreilles animales (derrière la frange)
  if (["fox", "wolf", "rabbit", "tanuki", "cat"].includes(ap.ears)) add(animalEars(ap.ears, cx, cy, R, hair, hairLine, c.hairColor));

  // ---------------- corps
  add(path(`M${P(cx - W * 0.36, chin - 18)}L${P(cx - W * 0.38, shY + 6)}L${P(cx + W * 0.38, shY + 6)}L${P(cx + W * 0.36, chin - 18)}Z`, skin, skinLine, 1.4));
  add(path(`M${P(cx - W * 0.37, chin - 12)}L${P(cx + W * 0.37, chin - 12)}L${P(cx + W * 0.37, chin + 3)}Q${P(cx, chin + 11)} ${P(cx - W * 0.37, chin + 3)}Z`, skinShade, null));
  add(body(outfit.type ?? "robe", cx, shY, shW, W, cloth, trim, skin, skinLine, species));
  if (acc.has("choker")) add(`<rect x="${r1(cx - W * 0.34)}" y="${r1(shY - 12)}" width="${r1(W * 0.68)}" height="4.5" rx="2" fill="#1c1420"/><circle cx="${cx}" cy="${r1(shY - 8)}" r="2.6" fill="${trim}" stroke="${INK}" stroke-width=".8"/>`);
  if (acc.has("scarf")) add(scarf(cx, shY, W, shW, trim));

  // ---------------- oreilles latérales
  add(sideEars(ap.ears ?? "human", cx, eyeY, W, skin, skinLine, skinShade, trim));

  // ---------------- tête
  add(path(faceD, skin, skinLine, 1.7, ' stroke-linejoin="round"'));
  if (st.fringe !== "none") {
    const fd = frontHair(st, cx, cy, W, R, browY, rand, female);
    add(`<g clip-path="url(#${pid}-fc)"><path d="${fd}" fill="${skinShade}" transform="translate(1.5 4)"/></g>`);
  }

  // marques sur le visage (sous la frange)
  if (acc.has("panel-lines")) add(`<path d="M${P(cx - W * 0.62, eyeY + A.eh * 0.7)}v${r1(chin - eyeY - 22)}M${P(cx + W * 0.62, eyeY + A.eh * 0.7)}v${r1(chin - eyeY - 22)}M${P(cx - W * 0.62, chin - 14)}h${r1(W * 0.25)}M${P(cx + W * 0.62, chin - 14)}h${r1(-W * 0.25)}" fill="none" stroke="${shade(skin, -0.3)}" stroke-width="1.1"/>`);
  if (acc.has("facepaint")) {
    for (const s of [-1, 1]) {
      const x = cx + s * (A.eyeDx + 1);
      add(`<path d="M${P(x - 4, eyeY + A.eh * 0.65 + 3)}l${P(s * 3, 6)}M${P(x + 1, eyeY + A.eh * 0.65 + 2)}l${P(s * 3, 6)}" stroke="${trim}" stroke-width="2.2" stroke-linecap="round"/>`);
    }
  }

  // joues
  const blush = align === "hero" || c.ageRange === "child" || (female && align !== "villain");
  if (blush) for (const s of [-1, 1]) add(`<ellipse cx="${r1(cx + s * (A.eyeDx + 3))}" cy="${r1(eyeY + A.eh * 0.62 + 4)}" rx="5.5" ry="2.6" fill="#f2788f" opacity=".38"/>`);

  // yeux
  const expr = align;
  const patch = acc.has("eyepatch");
  for (const s of [-1, 1]) {
    if (patch && s === -1) continue;
    add(eyeSvg(pid, cx + s * A.eyeDx, eyeY, s, A, expr, female, species, c.ageRange, eye, s === -1 ? "l" : "r"));
  }

  // nez + bouche
  const noseY = (eyeY + mouthY) / 2 + 3;
  add(`<path d="M${P(cx + 1, noseY - 2.5)}q1.8 2.6 -1 3.4" fill="none" stroke="${shade(skin, -0.32)}" stroke-width="1.3" stroke-linecap="round"/>`);
  add(mouth(cx, mouthY, expr, acc.has("fang"), c.ageRange === "child"));
  if (c.ageRange === "elder") add(`<path d="M${P(cx - 13, mouthY - 6)}q-2 4 0 8M${P(cx + 13, mouthY - 6)}q2 4 0 8" fill="none" stroke="${shade(skin, -0.25)}" stroke-width="1.1" stroke-linecap="round"/>`);

  // poils du visage
  if (acc.has("beard") || acc.has("long-beard")) {
    const long = acc.has("long-beard");
    const bc = c.hairColor === "none" ? (c.ageRange === "elder" ? "#cfcad4" : "#2c2838") : hair;
    add(beard(cx, cheekY, chin, mouthY, W, long, bc, shade(bc, -0.5)));
  }
  if (acc.has("mustache")) {
    const mc = hair;
    add(path(`M${P(cx, mouthY - 3)}q-5 -4 -12 1q4 0 6 3q3 -1 6 -2.5q3 1.5 6 2.5q2 -3 6 -3q-7 -5 -12 -1Z`, mc, shade(mc, -0.5), 1.1));
  }
  if (acc.has("scar")) add(`<path d="M${P(cx + W * 0.28, eyeY + A.eh * 0.55 + 2)}l${P(W * 0.42, 13)}" stroke="#b5525c" stroke-width="1.8" stroke-linecap="round"/><path d="M${P(cx + W * 0.36, eyeY + A.eh * 0.55 + 7.5)}l5 -2.2M${P(cx + W * 0.5, eyeY + A.eh * 0.55 + 12)}l5 -2.2" stroke="#b5525c" stroke-width="1.2" stroke-linecap="round"/>`);
  if (acc.has("bandage")) add(`<g transform="translate(${r1(cx - A.eyeDx - 3)} ${r1(eyeY + A.eh * 0.62 + 6)}) rotate(-18)"><rect x="-7" y="-3" width="14" height="6" rx="2.5" fill="#f6e3c4" stroke="${shade(skin, -0.4)}" stroke-width=".9"/><rect x="-2.6" y="-2.2" width="5.2" height="4.4" fill="#ecd0a6"/></g>`);

  // ---------------- cheveux avant
  if (st.fringe !== "none") {
    const fd = frontHair(st, cx, cy, W, R, browY, rand, female);
    add(path(fd, hair, hairLine, 1.7, ' stroke-linejoin="round"'));
    // reflet « anneau »
    add(`<path d="${arc(cx, cy - 2, R - 7, 208, 246)}${arc(cx, cy - 2, R - 7, 262, 300)}" fill="none" stroke="${hairHi}" stroke-width="3.4" stroke-linecap="round" opacity=".85"/>`);
    if (st.side > 0) add(sideLocks(st, cx, cy, W, chin, hair, hairLine, hairDark));
    if (st.extra === "ahoge") add(`<path d="M${P(cx + 2, cy - R - 1)}c-2 -10 6 -16 12 -14c-6 2 -8 7 -9 14Z" fill="${hair}" stroke="${hairLine}" stroke-width="1.4" stroke-linejoin="round"/>`);
  } else {
    // crâne chauve : reflet
    add(`<path d="${arc(cx, cy, W - 6, 215, 250)}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".45"/>`);
  }
  if (st.extra === "braid") add(braid(cx, cy, W, cheekY, shY, hair, hairLine, hairHi, trim));

  // sourcils (par-dessus la frange, convention anime)
  const browC = c.hairColor === "none" ? (c.ageRange === "elder" ? "#bdb6c0" : shade(skin, -0.6)) : ["white", "silver"].includes(c.hairColor) ? shade(hair, -0.3) : shade(hair, -0.4);
  for (const s of [-1, 1]) add(brow(cx + s * A.eyeDx, browY, s, A.ew, expr, browC, female ? 2 : c.ageRange === "elder" ? 3.2 : 2.6));

  // ---------------- cornes, oreilles mécaniques
  if (ap.horns) add(horns(ap.horns, cx, cy, W, R, eyeY));
  if (ap.ears === "robot") for (const s of [-1, 1]) add(`<circle cx="${r1(cx + s * (W + 0.5))}" cy="${r1(eyeY + 1)}" r="7.5" fill="#9aa7b6" stroke="${INK}" stroke-width="1.4"/><circle cx="${r1(cx + s * (W + 0.5))}" cy="${r1(eyeY + 1)}" r="3.6" fill="${trim}" stroke="${shade(trim, -0.5)}" stroke-width=".8"/>`);

  // ---------------- accessoires
  add(accessories(acc, { cx, cy, W, R, A, eyeY, browY, mouthY, chin, shY, hair, hairLine, trim, female, st, pid }));
  add(`</g>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="${esc(c.name)}" stroke-linecap="round">${out.join("")}</svg>`;
}

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

// arc de cercle (degrés, 0 = droite, sens horaire écran)
function arc(cx, cy, r, a0, a1) {
  const p = (a) => [cx + r * Math.cos((a * Math.PI) / 180), cy + r * Math.sin((a * Math.PI) / 180)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${P(x0, y0)}A${r1(r)} ${r1(r)} 0 0 1 ${P(x1, y1)}`;
}

// ---------------------------------------------------------------- visage

function facePath(cx, cy, W, cheekY, chin, shape) {
  const h = chin - cheekY;
  const f = {
    round: { k1: 0.8, c2: 0.62, k2: 0 },
    oval: { k1: 0.62, c2: 0.42, k2: 1 },
    sharp: { k1: 0.42, c2: 0.24, k2: 3 },
    square: { k1: 0.72, c2: 0.55, k2: 1 },
  }[shape] ?? { k1: 0.62, c2: 0.42, k2: 1 };
  const j = shape === "square" ? 2 : 0;
  return `M${P(cx - W, cy)}A${W} ${W} 0 0 1 ${P(cx + W, cy)}L${P(cx + W - j * 0.3, cheekY)}` +
    `C${P(cx + W - j, cheekY + h * f.k1)} ${P(cx + W * f.c2, chin - f.k2)} ${P(cx, chin)}` +
    `C${P(cx - W * f.c2, chin - f.k2)} ${P(cx - W + j, cheekY + h * f.k1)} ${P(cx - W + j * 0.3, cheekY)}Z`;
}

function eyeSvg(pid, ex, ey, s, A, expr, female, species, age, eye, tag) {
  const ew = A.ew;
  const eh = A.eh;
  const ox = ex + (s * ew) / 2;
  const ix = ex - (s * ew) / 2;
  let topY = ey - eh * 0.52;
  let oy = ey - eh * 0.06;
  let iy = ey + eh * 0.1;
  const ly = ey + eh * 0.52;
  if (expr === "villain") { topY = ey - eh * 0.2; oy = ey - eh * 0.3; iy = ey + eh * 0.14; }
  else if (expr === "antihero") { topY = ey - eh * 0.24; oy = ey - eh * 0.12; }
  else if (expr === "neutral") { topY = ey - eh * 0.4; }
  const upper = `M${P(ox, oy)}C${P(lerp(ox, ix, 0.18), topY - 1.5)} ${P(lerp(ox, ix, 0.72), topY - 0.5)} ${P(ix, iy)}`;
  const white = `${upper}C${P(lerp(ix, ox, 0.3), ly)} ${P(lerp(ix, ox, 0.78), ly - 0.5)} ${P(ox, oy)}Z`;
  const irx = ew * 0.35;
  const iry = eh * 0.52;
  const icx = ex + s * 0.3;
  const icy = ey + eh * 0.06;
  const id = `${pid}-e${tag}`;
  const pupil = species === "demon"
    ? `<ellipse cx="${r1(icx)}" cy="${r1(icy)}" rx="${r1(irx * 0.2)}" ry="${r1(iry * 0.62)}" fill="#160c12"/>`
    : species === "android"
      ? `<circle cx="${r1(icx)}" cy="${r1(icy)}" r="${r1(irx * 0.6)}" fill="none" stroke="${shade(eye, 0.6)}" stroke-width="1"/><circle cx="${r1(icx)}" cy="${r1(icy)}" r="${r1(irx * 0.28)}" fill="#fff"/>`
      : `<ellipse cx="${r1(icx)}" cy="${r1(icy)}" rx="${r1(irx * 0.46)}" ry="${r1(iry * 0.52)}" fill="${shade(eye, -0.75)}"/>`;
  let s2 = `<clipPath id="${id}"><path d="${white}"/></clipPath><path d="${white}" fill="#fff"/>` +
    `<g clip-path="url(#${id})"><ellipse cx="${r1(icx)}" cy="${r1(icy)}" rx="${r1(irx)}" ry="${r1(iry)}" fill="url(#${pid}-ir)" stroke="${shade(eye, -0.6)}" stroke-width=".9"/>${pupil}` +
    `<ellipse cx="${r1(icx - irx * 0.38)}" cy="${r1(icy - iry * 0.38)}" rx="${r1(irx * 0.36)}" ry="${r1(iry * 0.27)}" fill="#fff"/><circle cx="${r1(icx + irx * 0.42)}" cy="${r1(icy + iry * 0.4)}" r="${r1(Math.max(1, irx * 0.18))}" fill="#fff" opacity=".9"/>` +
    `<path d="${upper}" fill="none" stroke="${shade(eye, -0.5)}" stroke-width="3.5" opacity=".35" transform="translate(0 1.6)"/></g>`;
  // cils
  const lw = female ? 2.9 : 2.3;
  s2 += `<path d="${upper}" fill="none" stroke="${INK}" stroke-width="${lw}" stroke-linecap="round"/>`;
  if (female) s2 += `<path d="M${P(ox, oy)}l${P(s * 4, -2.6)}l${P(-s * 1.2, 3.4)}Z" fill="${INK}" stroke="${INK}" stroke-width="1"/>`;
  s2 += `<path d="M${P(lerp(ox, ix, 0.08), lerp(oy, ly, 0.6))}Q${P(lerp(ox, ix, 0.4), ly + 0.6)} ${P(lerp(ox, ix, 0.62), ly - 0.2)}" fill="none" stroke="${INK}" stroke-width="1" opacity=".55"/>`;
  if (age === "elder") s2 += `<path d="M${P(lerp(ox, ix, 0.15), ly + 3)}q${r1(-s * ew * 0.3)} 2.5 ${r1(-s * ew * 0.6)} 0M${P(ox + s * 2, oy)}l${P(s * 3.5, -1.5)}M${P(ox + s * 2, oy + 3)}l${P(s * 3.5, 1)}" fill="none" stroke="#a7837a" stroke-width=".9"/>`;
  return s2;
}

function brow(ex, by, s, ew, expr, color, sw) {
  const bo = ex + s * ew * 0.55;
  const bi = ex - s * ew * 0.45;
  const d = {
    hero: `M${P(bo, by + 1)}Q${P(ex, by - 4)} ${P(bi, by + 0.2)}`,
    villain: `M${P(bo, by - 3)}Q${P(ex, by - 1.6)} ${P(bi, by + 3.8)}`,
    antihero: `M${P(bo, by - 0.5)}Q${P(ex, by - 2)} ${P(bi, by + 2.2)}`,
    neutral: `M${P(bo, by + 0.8)}Q${P(ex, by - 2.6)} ${P(bi, by + 0.8)}`,
  }[expr] ?? `M${P(bo, by)}Q${P(ex, by - 3)} ${P(bi, by)}`;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>`;
}

function mouth(cx, my, expr, fang, child) {
  const k = child ? 0.85 : 1;
  if (expr === "hero") {
    return `<path d="M${P(cx - 5.5 * k, my - 1)}Q${P(cx, my + 1)} ${P(cx + 5.5 * k, my - 1)}Q${P(cx + 4 * k, my + 6.5 * k)} ${P(cx, my + 6.8 * k)}Q${P(cx - 4 * k, my + 6.5 * k)} ${P(cx - 5.5 * k, my - 1)}Z" fill="#a8364a" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M${P(cx - 3 * k, my + 5 * k)}Q${P(cx, my + 2.5 * k)} ${P(cx + 3 * k, my + 5 * k)}" fill="#f28a96"/>`;
  }
  let s = "";
  if (expr === "villain") s = `<path d="M${P(cx - 6.5, my + 0.5)}Q${P(cx - 1, my + 3)} ${P(cx + 6.5, my - 3)}" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
  else if (expr === "antihero") s = `<path d="M${P(cx - 4.5, my + 1)}Q${P(cx, my - 0.4)} ${P(cx + 4.5, my + 0.8)}" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
  else s = `<path d="M${P(cx - 4, my)}Q${P(cx, my + 2.6)} ${P(cx + 4, my)}" fill="none" stroke="${INK}" stroke-width="1.4"/>`;
  if (fang) s += `<path d="M${P(cx + 1.5, my + 0.6)}l1.4 3.4l1.4 -3.6Z" fill="#fff" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>`;
  return s;
}

function beard(cx, cheekY, chin, my, W, long, color, line) {
  const drop = long ? 34 : 12;
  return `<path d="M${P(cx - W + 3, cheekY - 1)}Q${P(cx - W + 2, chin + drop * 0.3)} ${P(cx - 4, chin + drop)}L${P(cx, chin + drop - 4)}L${P(cx + 4, chin + drop)}Q${P(cx + W - 2, chin + drop * 0.3)} ${P(cx + W - 3, cheekY - 1)}Q${P(cx + W * 0.55, my + 8)} ${P(cx + 7, my + 4)}Q${P(cx, my + 8.5)} ${P(cx - 7, my + 4)}Q${P(cx - W * 0.55, my + 8)} ${P(cx - W + 3, cheekY - 1)}Z" fill="${color}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<path d="M${P(cx - 10, chin + 2)}q2 ${r1(drop * 0.4)} 4 ${r1(drop * 0.55)}M${P(cx + 10, chin + 2)}q-2 ${r1(drop * 0.4)} -4 ${r1(drop * 0.55)}" fill="none" stroke="${line}" stroke-width=".9" opacity=".6"/>`;
}

// ---------------------------------------------------------------- cheveux

function frontHair(st, cx, cy, W, R, browY, rand, female) {
  const capDrop = 3;
  let d = `M${P(cx - R, cy + capDrop)}`;
  // sommet
  if (st.top === "spiky" || st.top === "messy") {
    const K = st.top === "spiky" ? 9 : 13;
    const amp = st.top === "spiky" ? 14 : 5.5;
    for (let k = 1; k <= K; k++) {
      const t = k / (K + 1);
      const a = Math.PI * (1 + t);
      const tip = k % 2 === 1;
      const rr = tip ? R + amp * (0.75 + 0.5 * Math.sin(t * Math.PI)) : R - 0.5;
      const aa = a + (tip ? 0.12 : 0);
      d += `L${P(cx + rr * Math.cos(aa), cy - 2 + rr * Math.sin(aa))}`;
    }
    d += `L${P(cx + R, cy + capDrop)}`;
  } else {
    d += `A${r1(R)} ${r1(R + 2)} 0 0 1 ${P(cx + R, cy + capDrop)}`;
  }
  // côté droit (pattes)
  const sideY = cy + W * 0.42;
  d += `Q${P(cx + R + 0.5, sideY - 4)} ${P(cx + W + 0.5, sideY)}L${P(cx + W - 5, cy + 6)}`;
  // frange, de droite à gauche
  const x0 = cx + W - 5;
  const x1 = cx - W + 5;
  const fy = browY + 2;
  if (st.fringe === "slick") {
    d += `Q${P(cx + W * 0.35, cy - W * 0.62)} ${P(cx, cy - W * 0.48)}Q${P(cx - W * 0.35, cy - W * 0.62)} ${P(x1, cy + 6)}`;
  } else if (st.fringe === "center") {
    d += `Q${P(cx + W * 0.55, fy + 2)} ${P(cx + W * 0.25, fy - 2)}Q${P(cx + W * 0.12, cy - 4)} ${P(cx + 1, cy - W * 0.55)}L${P(cx - 1, cy - W * 0.55)}Q${P(cx - W * 0.12, cy - 4)} ${P(cx - W * 0.25, fy - 2)}Q${P(cx - W * 0.55, fy + 2)} ${P(x1, cy + 6)}`;
  } else {
    const cfg = {
      blunt: { n: 7, depth: 3, lean: 0, jitter: 0.3, curve: 0 },
      soft: { n: 6, depth: 8, lean: -1, jitter: 1.5, curve: 2 },
      locks: { n: 5, depth: 11, lean: -2.5, jitter: 2.5, curve: 3 },
      swept: { n: 5, depth: 12, lean: -6, jitter: 1.5, curve: 5 },
      spiky: { n: 5, depth: 15, lean: -3, jitter: 3, curve: 2.5 },
    }[st.fringe] ?? { n: 5, depth: 10, lean: 0, jitter: 2, curve: 2 };
    const n = cfg.n;
    let px = x0;
    let py = cy + 6;
    for (let i = 0; i < n; i++) {
      const tx = lerp(x0, x1, (i + 0.5) / n) + cfg.lean;
      // les mèches centrales descendent un peu plus bas
      const centre = 1 - Math.abs((i + 0.5) / n - 0.5) * 2;
      const ty = fy + centre * (st.fringe === "blunt" ? 0.5 : 3) + (rand() - 0.5) * cfg.jitter - (st.fringe === "swept" ? (i / n) * 6 : 0);
      const nx = lerp(x0, x1, (i + 1) / n);
      const ny = i === n - 1 ? cy + 6 : fy - cfg.depth + (rand() - 0.5) * cfg.jitter;
      d += `Q${P((px + tx) / 2 + cfg.curve, (py + ty) / 2)} ${P(tx, ty)}`;
      d += st.fringe === "blunt" ? `L${P(nx, i === n - 1 ? cy + 6 : ty - 0.5)}` : `Q${P((tx + nx) / 2 + cfg.curve, (ty + ny) / 2)} ${P(nx, ny)}`;
      px = nx; py = ny;
    }
  }
  // côté gauche
  d += `L${P(cx - W - 0.5, sideY)}Q${P(cx - R - 0.5, sideY - 4)} ${P(cx - R, cy + capDrop)}Z`;
  return d;
}

function sideLocks(st, cx, cy, W, chin, hair, line, dark) {
  const len = (chin - cy) * st.side;
  let s = "";
  for (const sd of [-1, 1]) {
    const xo = cx + sd * (W + 3);
    const xi = cx + sd * (W - 6);
    const y0 = cy + 2;
    const ty = cy + len;
    const tx = cx + sd * (W + (st.wavy ? 6 : 1));
    const w = st.wavy ? 5 : 2;
    const d = `M${P(xo, y0)}C${P(xo + sd * w, y0 + len * 0.35)} ${P(xo - sd * w, y0 + len * 0.7)} ${P(tx, ty)}C${P(xi + sd * 1, y0 + len * 0.7)} ${P(xi - sd * w * 0.5, y0 + len * 0.35)} ${P(xi, y0)}Z`;
    s += `<path d="${d}" fill="${hair}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>`;
    s += `<path d="M${P(lerp(xo, xi, 0.5), y0 + 6)}Q${P(lerp(xo, xi, 0.45) + sd * 1, y0 + len * 0.5)} ${P(lerp(tx, xi, 0.3), y0 + len * 0.8)}" fill="none" stroke="${dark}" stroke-width="1" opacity=".7"/>`;
  }
  return s;
}

function backHair(st, cx, cy, W, R, chin, shY, rand) {
  const top = `A${r1(R + 1)} ${r1(R + 3)} 0 0 0`;
  if (st.back === "nape") {
    return `M${P(cx - R, cy)}L${P(cx - R + 1, cy + W * 0.65)}L${P(cx - W * 0.55, chin - 6)}L${P(cx - W * 0.35, chin - 14)}L${P(cx, chin - 4)}L${P(cx + W * 0.35, chin - 14)}L${P(cx + W * 0.55, chin - 6)}L${P(cx + R - 1, cy + W * 0.65)}L${P(cx + R, cy)}${top} ${P(cx - R, cy)}Z`;
  }
  if (st.back === "bob") {
    return `M${P(cx - R - 1, cy)}C${P(cx - R - 6, cy + 28)} ${P(cx - R - 5, chin - 4)} ${P(cx - R + 6, chin + 4)}L${P(cx + R - 6, chin + 4)}C${P(cx + R + 5, chin - 4)} ${P(cx + R + 6, cy + 28)} ${P(cx + R + 1, cy)}${top} ${P(cx - R - 1, cy)}Z`;
  }
  const bottom = st.back === "hime" ? 186 : 196;
  const spread = st.back === "hime" ? 4 : 12;
  let d = `M${P(cx - R - 1, cy)}`;
  if (st.back === "wavy") d += `C${P(cx - R - 14, cy + 30)} ${P(cx - R - 2, cy + 60)} ${P(cx - R - 12, cy + 80)}S${P(cx - R - 6, bottom - 10)} ${P(cx - R - spread, bottom)}`;
  else d += `C${P(cx - R - 4, cy + 40)} ${P(cx - R - spread, shY - 10)} ${P(cx - R - spread, bottom)}`;
  // bas : mèches
  const n = st.back === "hime" ? 8 : 6;
  const x0 = cx - R - spread;
  const x1 = cx + R + spread;
  for (let i = 1; i <= n; i++) {
    const x = lerp(x0, x1, i / n);
    const xm = lerp(x0, x1, (i - 0.5) / n);
    d += st.back === "hime" ? `L${P(x, bottom)}` : `L${P(xm, bottom - 8 - rand() * 4)}L${P(x, bottom + (i === n ? 0 : 2))}`;
  }
  if (st.back === "wavy") d += `C${P(cx + R + 6, bottom - 10)} ${P(cx + R + 2, cy + 90)} ${P(cx + R + 12, cy + 80)}S${P(cx + R + 14, cy + 30)} ${P(cx + R + 1, cy)}`;
  else d += `C${P(cx + R + spread, shY - 10)} ${P(cx + R + 4, cy + 40)} ${P(cx + R + 1, cy)}`;
  return `${d}${top} ${P(cx - R - 1, cy)}Z`;
}

function ponytail(cx, cy, R, hair, dark, line, female, trim, ribbon) {
  const bx = cx + R - 6;
  const by = cy - R + 10;
  const d = `M${P(bx - 4, by - 4)}C${P(bx + 26, by - 16)} ${P(bx + 30, by + 30)} ${P(bx + 22, by + 70)}C${P(bx + 20, by + 82)} ${P(bx + 12, by + 92)} ${P(bx + 14, by + 100)}C${P(bx + 2, by + 88)} ${P(bx + 10, by + 60)} ${P(bx + 6, by + 30)}C${P(bx + 4, by + 16)} ${P(bx - 2, by + 8)} ${P(bx - 8, by + 6)}Z`;
  let s = `<path d="${d}" fill="${hair}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/><path d="M${P(bx + 8, by + 6)}C${P(bx + 18, by + 30)} ${P(bx + 16, by + 60)} ${P(bx + 14, by + 86)}" fill="none" stroke="${dark}" stroke-width="1.2"/>`;
  s += ribbon ? bow(bx + 1, by - 1, "#e8455f", 1) : `<ellipse cx="${r1(bx + 1)}" cy="${r1(by)}" rx="4" ry="5.5" fill="${female ? trim : "#3b3346"}" stroke="${INK}" stroke-width="1.1" transform="rotate(-30 ${r1(bx + 1)} ${r1(by)})"/>`;
  return s;
}

function twintails(cx, cy, R, hair, dark, line, tie) {
  let s = "";
  for (const sd of [-1, 1]) {
    const bx = cx + sd * (R - 3);
    const by = cy - R * 0.45;
    const d = `M${P(bx, by - 6)}C${P(bx + sd * 26, by - 10)} ${P(bx + sd * 30, by + 40)} ${P(bx + sd * 20, by + 86)}C${P(bx + sd * 16, by + 96)} ${P(bx + sd * 8, by + 100)} ${P(bx + sd * 10, by + 108)}C${P(bx + sd * 2, by + 92)} ${P(bx + sd * 10, by + 70)} ${P(bx + sd * 8, by + 40)}C${P(bx + sd * 6, by + 18)} ${P(bx + sd * 2, by + 8)} ${P(bx - sd * 2, by + 6)}Z`;
    s += `<path d="${d}" fill="${hair}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/><path d="M${P(bx + sd * 10, by + 6)}C${P(bx + sd * 20, by + 34)} ${P(bx + sd * 18, by + 62)} ${P(bx + sd * 14, by + 90)}" fill="none" stroke="${dark}" stroke-width="1.2"/>`;
    s += bow(bx + sd * 1, by - 1, tie, sd);
  }
  return s;
}

function bow(x, y, color, sd) {
  return `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${sd * 20})"><path d="M0 0L-9 -6L-9 6ZM0 0L9 -6L9 6Z" fill="${color}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/><circle r="2.6" fill="${shade(color, -0.2)}" stroke="${INK}" stroke-width="1"/></g>`;
}

function braid(cx, cy, W, cheekY, shY, hair, line, hi, tie) {
  const x0 = cx - W + 4;
  const y0 = cheekY - 2;
  const x1 = cx - W - 4;
  const y1 = shY + 26;
  const n = 6;
  let s = "";
  // maillons qui se chevauchent, du bas vers le haut
  for (let i = n - 1; i >= 0; i--) {
    const t = i / (n - 1);
    const x = lerp(x0, x1, t);
    const y = lerp(y0, y1, t);
    const w = 7.5 - t * 2;
    const h = (y1 - y0) / (n - 1) * 0.75;
    const sd = i % 2 ? 1 : -1;
    s += `<path d="M${P(x - w, y - h)}Q${P(x - w - 1, y + h * 0.6)} ${P(x + sd * 1.5, y + h + 1)}Q${P(x + w + 1, y + h * 0.6)} ${P(x + w, y - h)}Q${P(x, y - h * 0.3)} ${P(x - w, y - h)}Z" fill="${hair}" stroke="${line}" stroke-width="1.3" stroke-linejoin="round"/>`;
    s += `<path d="M${P(x - w * 0.5, y - h * 0.3)}Q${P(x, y + h * 0.4)} ${P(x + w * 0.5, y - h * 0.3)}" fill="none" stroke="${hi}" stroke-width="1.4" opacity=".7"/>`;
  }
  s += `<rect x="${r1(x1 - 5)}" y="${r1(y1 + 6)}" width="10" height="5" rx="2" fill="${tie}" stroke="${INK}" stroke-width="1"/><path d="M${P(x1 - 4, y1 + 11)}l-1 8l3 -2l2 3l2 -3l2 2l-1 -8Z" fill="${hair}" stroke="${line}" stroke-width="1.1" stroke-linejoin="round"/>`;
  return s;
}

function animalEars(kind, cx, cy, R, hair, line, hairName) {
  const inner = kind === "rabbit" ? "#f6b9c8" : kind === "tanuki" ? "#4a3a30" : hairName === "white" ? "#f6c6cf" : "#f7e7d8";
  let s = "";
  for (const sd of [-1, 1]) {
    const a = (-90 + sd * 42) * (Math.PI / 180);
    const bx = cx + (R - 4) * Math.cos(a);
    const by = cy - 2 + (R - 4) * Math.sin(a);
    const rot = sd * (kind === "rabbit" ? 14 : 28);
    let outer;
    let inn;
    if (kind === "rabbit") {
      outer = `M-6 4C-9 -18 -6 -38 0 -40C6 -38 9 -18 6 4Z`;
      inn = `M-3 0C-4 -16 -3 -32 0 -34C3 -32 4 -16 3 0Z`;
    } else if (kind === "tanuki") {
      outer = `M-11 4C-12 -8 -6 -14 0 -14C6 -14 12 -8 11 4Z`;
      inn = `M-6 2C-7 -5 -3 -9 0 -9C3 -9 7 -5 6 2Z`;
    } else if (kind === "wolf") {
      outer = `M-11 4L-4 -22Q0 -26 3 -21L11 4Z`;
      inn = `M-6 2L-2 -15L5 2Z`;
    } else {
      outer = `M-12 4Q-8 -14 2 -30Q8 -12 12 4Z`;
      inn = `M-6 2Q-4 -10 2 -20Q5 -8 6 2Z`;
    }
    s += `<g transform="translate(${r1(bx)} ${r1(by)}) rotate(${rot})"><path d="${outer}" fill="${hair}" stroke="${line}" stroke-width="1.6" stroke-linejoin="round"/><path d="${inn}" fill="${inner}"/>${kind === "fox" ? `<path d="M-2 -24Q2 -30 2 -30Q5 -24 5 -20Z" fill="${hairName === "white" ? "#f2d6a0" : shade(hair, -0.4)}"/>` : ""}</g>`;
  }
  return s;
}

function sideEars(kind, cx, eyeY, W, skin, line, shadeC, trim) {
  let s = "";
  for (const sd of [-1, 1]) {
    const x = cx + sd * (W - 1);
    if (kind === "elf") {
      s += `<path d="M${P(x - sd * 2, eyeY - 6)}Q${P(x + sd * 10, eyeY - 12)} ${P(x + sd * 22, eyeY - 20)}Q${P(x + sd * 14, eyeY + 2)} ${P(x + sd * 1, eyeY + 11)}Z" fill="${skin}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/><path d="M${P(x + sd * 2, eyeY - 3)}Q${P(x + sd * 10, eyeY - 8)} ${P(x + sd * 16, eyeY - 14)}" fill="none" stroke="${shadeC}" stroke-width="2"/>`;
    } else if (kind === "pointed") {
      s += `<path d="M${P(x - sd * 2, eyeY - 4)}L${P(x + sd * 13, eyeY - 10)}Q${P(x + sd * 8, eyeY + 4)} ${P(x + sd * 1, eyeY + 10)}Z" fill="${skin}" stroke="${line}" stroke-width="1.5" stroke-linejoin="round"/>`;
    } else if (kind === "fin") {
      s += `<path d="M${P(x - sd * 1, eyeY - 8)}L${P(x + sd * 14, eyeY - 14)}L${P(x + sd * 10, eyeY - 4)}L${P(x + sd * 15, eyeY + 1)}L${P(x + sd * 9, eyeY + 6)}L${P(x + sd * 1, eyeY + 10)}Z" fill="${shadeC}" stroke="${line}" stroke-width="1.4" stroke-linejoin="round"/><path d="M${P(x + sd * 2, eyeY - 6)}l${P(sd * 9, -4)}M${P(x + sd * 2, eyeY + 2)}l${P(sd * 8, 0)}" stroke="${line}" stroke-width=".8" opacity=".6"/>`;
    } else if (kind === "human") {
      s += `<ellipse cx="${r1(x + sd * 1.5)}" cy="${r1(eyeY + 3)}" rx="5" ry="8" fill="${skin}" stroke="${line}" stroke-width="1.4"/><path d="M${P(x + sd * 3, eyeY - 1)}q${r1(sd * 2)} 4 ${r1(-sd * 1)} 8" fill="none" stroke="${shadeC}" stroke-width="1.4"/>`;
    }
  }
  return s;
}

function horns(kind, cx, cy, W, R, eyeY) {
  let s = "";
  for (const sd of [-1, 1]) {
    if (kind === "oni") {
      const bx = cx + sd * 12;
      const by = cy - R + 7;
      s += `<path d="M${P(bx - 5, by + 2)}Q${P(bx + sd * 1, by - 10)} ${P(bx + sd * 6, by - 20)}Q${P(bx + sd * 5, by - 6)} ${P(bx + 5, by + 2)}Z" fill="#f4ead0" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><path d="M${P(bx - 3, by - 4)}l${P(6, -1)}M${P(bx - 1 + sd * 1, by - 10)}l${P(5, -1)}" stroke="#c7b48c" stroke-width="1.1"/>`;
    } else if (kind === "curved") {
      const bx = cx + sd * (R - 9);
      const by = cy - R * 0.62;
      s += `<path d="M${P(bx - sd * 4, by + 4)}C${P(bx + sd * 6, by - 8)} ${P(bx + sd * 22, by - 6)} ${P(bx + sd * 22, by - 26)}C${P(bx + sd * 12, by - 14)} ${P(bx + sd * 6, by - 12)} ${P(bx - sd * 3, by - 5)}Z" fill="#30223a" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/><path d="M${P(bx + sd * 4, by - 4)}C${P(bx + sd * 12, by - 9)} ${P(bx + sd * 17, by - 12)} ${P(bx + sd * 20, by - 22)}" fill="none" stroke="#7d5a92" stroke-width="1.4"/>`;
    } else if (kind === "ram") {
      const bx = cx + sd * (W - 4);
      const by = cy - 8;
      s += `<path d="M${P(bx - sd * 6, by - 4)}C${P(bx + sd * 10, by - 20)} ${P(bx + sd * 30, by - 4)} ${P(bx + sd * 22, by + 16)}C${P(bx + sd * 16, by + 28)} ${P(bx + sd * 4, by + 18)} ${P(bx + sd * 10, by + 10)}C${P(bx + sd * 14, by + 4)} ${P(bx + sd * 12, by - 6)} ${P(bx + sd * 2, by + 4)}Z" fill="#7a6552" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><path d="M${P(bx + sd * 6, by - 9)}l${P(sd * 2, 6)}M${P(bx + sd * 14, by - 9)}l${P(-sd * 1, 6)}M${P(bx + sd * 21, by - 2)}l${P(-sd * 5, 3)}" stroke="#4a3a2e" stroke-width="1.1"/>`;
    }
  }
  return s;
}

// ---------------------------------------------------------------- corps

function body(type, cx, shY, shW, W, cloth, trim, skin, skinLine, species) {
  const nw = W * 0.44;
  const shape = `M${P(cx - shW, 202)}L${P(cx - shW, shY + 24)}C${P(cx - shW, shY + 6)} ${P(cx - shW + 10, shY - 1)} ${P(cx - shW + 26, shY - 3)}L${P(cx - nw, shY - 6)}L${P(cx + nw, shY - 6)}L${P(cx + shW - 26, shY - 3)}C${P(cx + shW - 10, shY - 1)} ${P(cx + shW, shY + 6)} ${P(cx + shW, shY + 24)}L${P(cx + shW, 202)}Z`;
  const dark = shade(cloth, -0.3);
  let s = `<path d="${shape}" fill="${cloth}" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/>`;
  // ombre douce côté droit
  s += `<path d="M${P(cx + shW * 0.45, shY - 2)}C${P(cx + shW - 6, shY + 2)} ${P(cx + shW - 1, shY + 10)} ${P(cx + shW - 1, shY + 26)}L${P(cx + shW - 1, 201)}L${P(cx + shW * 0.6, 201)}Z" fill="${dark}" opacity=".45"/>`;
  const V = (dx, dy) => `M${P(cx - dx, shY - 6)}L${P(cx, shY + dy)}L${P(cx + dx, shY - 6)}Z`;
  if (type === "robe") {
    s += `<path d="${V(nw + 1, 16)}" fill="${skin}" stroke="${skinLine}" stroke-width="1.2"/>`;
    s += `<path d="M${P(cx - nw - 4, shY - 7)}L${P(cx, shY + 20)}L${P(cx + nw + 4, shY - 7)}" fill="none" stroke="${trim}" stroke-width="4" stroke-linejoin="round"/>`;
    s += `<path d="M${P(cx, shY + 20)}V202" stroke="${dark}" stroke-width="1.5"/><circle cx="${r1(cx - shW * 0.45)}" cy="${r1(shY + 20)}" r="6" fill="${trim}" stroke="${INK}" stroke-width="1.1"/><path d="M${P(cx - shW * 0.45, shY + 16)}l1.2 2.8 3 .2-2.3 2 .8 3-2.7-1.6-2.7 1.6.8-3-2.3-2 3-.2Z" fill="${cloth}"/>`;
  } else if (type === "ninja" || type === "kimono") {
    const inner = type === "kimono" ? "#fbf7ef" : "#1b1d22";
    s += `<path d="${V(nw + 2, 24)}" fill="${inner}" stroke="${INK}" stroke-width="1.2"/>`;
    s += `<path d="M${P(cx - nw - 3, shY - 7)}L${P(cx + 6, shY + 28)}L${P(cx + 10, 202)}" fill="none" stroke="${trim}" stroke-width="5"/>`;
    s += `<path d="M${P(cx + nw + 3, shY - 7)}L${P(cx + 4, shY + 25)}" fill="none" stroke="${trim}" stroke-width="5"/>`;
    s += `<path d="M${P(cx - nw - 5.5, shY - 7)}L${P(cx + 3.5, shY + 28)}L${P(cx + 7.5, 202)}M${P(cx + nw + 5.5, shY - 7)}L${P(cx + 6, shY + 22)}" fill="none" stroke="${INK}" stroke-width="1"/>`;
    if (type === "kimono") s += `<rect x="${r1(cx - shW)}" y="${r1(Math.max(shY + 32, 194))}" width="${r1(shW * 2)}" height="10" fill="${trim}" stroke="${INK}" stroke-width="1.2"/>`;
  } else if (type === "coat" || type === "uniform" || type === "suit") {
    s += `<path d="${V(nw + 1, 26)}" fill="#f6f3ee" stroke="${INK}" stroke-width="1.2"/>`;
    if (type === "suit") s += `<path d="M${P(cx - 3, shY - 4)}L${P(cx + 3, shY - 4)}L${P(cx + 4, shY + 22)}L${P(cx, shY + 27)}L${P(cx - 4, shY + 22)}Z" fill="${trim}" stroke="${INK}" stroke-width="1"/>`;
    else if (type === "coat") s += `<path d="M${P(cx - 6, shY - 4)}Q${P(cx, shY + 4)} ${P(cx + 6, shY - 4)}L${P(cx + 4, shY + 12)}Q${P(cx, shY + 8)} ${P(cx - 4, shY + 12)}Z" fill="#fff" stroke="${INK}" stroke-width="1"/>`;
    for (const sd of [-1, 1]) {
      s += `<path d="M${P(cx + sd * (nw + 2), shY - 7)}L${P(cx + sd * (nw + 14), shY + 10)}L${P(cx + sd * (nw + 6), shY + 14)}L${P(cx + sd * 2, shY + 30)}" fill="${dark}" stroke="${type === "suit" ? INK : trim}" stroke-width="1.6" stroke-linejoin="round"/>`;
    }
    if (type !== "suit") for (const y of [shY + 36, shY + 48]) s += `<circle cx="${r1(cx - 9)}" cy="${r1(y)}" r="2.3" fill="${trim}" stroke="${INK}" stroke-width=".8"/><circle cx="${r1(cx + 9)}" cy="${r1(y)}" r="2.3" fill="${trim}" stroke="${INK}" stroke-width=".8"/>`;
    if (type === "uniform") {
      for (const sd of [-1, 1]) s += `<rect x="${r1(cx + sd * (shW - 13) - 11)}" y="${r1(shY - 4)}" width="22" height="7" rx="3" fill="${trim}" stroke="${INK}" stroke-width="1.1"/><path d="M${P(cx + sd * (shW - 13) - 9, shY + 3)}v6M${P(cx + sd * (shW - 13) - 4, shY + 3)}v6M${P(cx + sd * (shW - 13) + 1, shY + 3)}v6M${P(cx + sd * (shW - 13) + 6, shY + 3)}v6" stroke="${trim}" stroke-width="1.4"/>`;
      s += `<rect x="${r1(cx + 20)}" y="${r1(shY + 18)}" width="5" height="7" fill="#c8323c" stroke="${INK}" stroke-width=".8"/><circle cx="${r1(cx + 22.5)}" cy="${r1(shY + 28)}" r="3" fill="${trim}" stroke="${INK}" stroke-width=".8"/><rect x="${r1(cx + 27)}" y="${r1(shY + 18)}" width="5" height="7" fill="#3f7fe0" stroke="${INK}" stroke-width=".8"/><circle cx="${r1(cx + 29.5)}" cy="${r1(shY + 28)}" r="3" fill="${trim}" stroke="${INK}" stroke-width=".8"/>`;
    }
  } else if (type === "jacket") {
    s += `<path d="M${P(cx - nw, shY - 6)}L${P(cx + nw, shY - 6)}L${P(cx + 3, shY + 30)}L${P(cx - 3, shY + 30)}Z" fill="#f4f1ea" stroke="${INK}" stroke-width="1.2"/>`;
    for (const sd of [-1, 1]) s += `<path d="M${P(cx + sd * (nw - 1), shY - 14)}L${P(cx + sd * (nw + 10), shY - 9)}L${P(cx + sd * (nw + 8), shY + 6)}L${P(cx + sd * 4, shY + 30)}L${P(cx + sd * (nw - 2), shY - 4)}Z" fill="${trim}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`;
    s += `<path d="M${P(cx - shW + 8, shY + 14)}L${P(cx - shW + 8, 202)}M${P(cx + shW - 8, shY + 14)}L${P(cx + shW - 8, 202)}" stroke="${trim}" stroke-width="2.4" opacity=".8"/>`;
  } else if (type === "android") {
    s += `<path d="M${P(cx - nw - 4, shY - 9)}h${r1((nw + 4) * 2)}v7h${r1(-(nw + 4) * 2)}Z" fill="#9aa7b6" stroke="${INK}" stroke-width="1.3"/>`;
    s += `<path d="M${P(cx - 18, shY + 12)}L${P(cx, shY + 24)}L${P(cx + 18, shY + 12)}M${P(cx, shY + 24)}V202M${P(cx - shW + 10, shY + 6)}q8 6 10 20M${P(cx + shW - 10, shY + 6)}q-8 6 -10 20" fill="none" stroke="${trim}" stroke-width="2" opacity=".9"/>`;
    s += `<circle cx="${cx}" cy="${r1(shY + 24)}" r="4.5" fill="${trim}" stroke="${INK}" stroke-width="1.2"/><circle cx="${cx}" cy="${r1(shY + 24)}" r="1.8" fill="#fff"/>`;
  }
  return s;
}

function scarf(cx, shY, W, shW, color) {
  const w = W * 0.62;
  return `<path d="M${P(cx - w, shY - 16)}Q${P(cx, shY - 10)} ${P(cx + w, shY - 16)}L${P(cx + w + 6, shY + 2)}Q${P(cx, shY + 10)} ${P(cx - w - 6, shY + 2)}Z" fill="${color}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M${P(cx + w - 2, shY)}L${P(cx + w + 14, shY + 34)}L${P(cx + w + 4, shY + 38)}L${P(cx + w - 10, shY + 4)}Z" fill="${shade(color, -0.15)}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<path d="M${P(cx - w + 4, shY - 9)}Q${P(cx, shY - 3)} ${P(cx + w - 4, shY - 9)}" fill="none" stroke="${shade(color, -0.35)}" stroke-width="1.2"/>`;
}

// ---------------------------------------------------------------- accessoires

function accessories(acc, g) {
  const { cx, cy, W, R, A, eyeY, browY, trim, female } = g;
  let s = "";
  const exL = cx - A.eyeDx;
  const exR = cx + A.eyeDx;
  if (acc.has("star-pin")) {
    const x = cx + R * 0.6;
    const y = cy - R * 0.6;
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? 3 : 7;
      pts.push(P(x + rr * Math.cos(a), y + rr * Math.sin(a)));
    }
    s += `<path d="M${pts.join("L")}Z" fill="#ffd84a" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>`;
  }
  if (acc.has("ribbon") && !["twintails", "ponytail"].includes(g.st.extra ?? "")) s += bow(cx - R * 0.55, cy - R * 0.72, "#d8323f", -1) + (acc.has("tassel") ? `<path d="M${P(cx - R * 0.55 - 6, cy - R * 0.72 + 4)}q-3 8 -1 14" fill="none" stroke="#d8323f" stroke-width="1.6"/><circle cx="${r1(cx - R * 0.55 - 7)}" cy="${r1(cy - R * 0.72 + 21)}" r="3.2" fill="#f2c14e" stroke="${INK}" stroke-width="1"/>` : "");
  if (acc.has("flower")) {
    const x = cx + R * 0.68;
    const y = cy - R * 0.42;
    let f = "";
    for (let i = 0; i < 5; i++) {
      const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      f += `<circle cx="${r1(x + 4.2 * Math.cos(a))}" cy="${r1(y + 4.2 * Math.sin(a))}" r="3.6" fill="#ffd1e0" stroke="${INK}" stroke-width="1"/>`;
    }
    s += f + `<circle cx="${r1(x)}" cy="${r1(y)}" r="2.4" fill="#f7c948"/>`;
  }
  if (acc.has("hairsticks")) {
    const x = cx + R * 0.35;
    const y = cy - R - (g.st.extra === "bun" ? 4 : -2);
    s += `<path d="M${P(x - 4, y + 6)}L${P(x + 22, y - 12)}M${P(x - 2, y + 10)}L${P(x + 25, y - 4)}" stroke="#5a2e1e" stroke-width="2.4"/><circle cx="${r1(x + 23)}" cy="${r1(y - 13)}" r="2.8" fill="${trim}" stroke="${INK}" stroke-width=".9"/><circle cx="${r1(x + 26)}" cy="${r1(y - 5)}" r="2.8" fill="${trim}" stroke="${INK}" stroke-width=".9"/>`;
  }
  if (acc.has("goggles")) {
    const y = cy - R * 0.5;
    s += `<path d="${arc(cx, cy, R + 0.5, 196, 344)}" fill="none" stroke="#5a3b26" stroke-width="5"/>`;
    for (const sd of [-1, 1]) s += `<circle cx="${r1(cx + sd * 11)}" cy="${r1(y)}" r="8.5" fill="#c99a45" stroke="${INK}" stroke-width="1.4"/><circle cx="${r1(cx + sd * 11)}" cy="${r1(y)}" r="5.6" fill="#9fd8f2" stroke="${INK}" stroke-width="1"/><path d="M${P(cx + sd * 11 - 3, y - 2)}l3 -2" stroke="#fff" stroke-width="1.5"/>`;
  }
  if (acc.has("headphones")) {
    s += `<path d="${arc(cx, cy, R + 3, 188, 352)}" fill="none" stroke="#2a2440" stroke-width="5"/><path d="${arc(cx, cy, R + 3, 220, 320)}" fill="none" stroke="${trim}" stroke-width="1.6"/>`;
    for (const sd of [-1, 1]) s += `<rect x="${r1(cx + sd * (R + 1) - 6)}" y="${r1(eyeY - 12)}" width="12" height="20" rx="5" fill="#2a2440" stroke="${INK}" stroke-width="1.3"/><rect x="${r1(cx + sd * (R + 1) - 2)}" y="${r1(eyeY - 8)}" width="4" height="12" rx="2" fill="${trim}"/>`;
  }
  if (acc.has("tricorne")) {
    const y = cy - R * 0.42;
    s += `<path d="M${P(cx - R - 12, y + 2)}Q${P(cx - R - 4, y - 22)} ${P(cx - 14, y - 26)}Q${P(cx, y - 44)} ${P(cx + 14, y - 26)}Q${P(cx + R + 4, y - 22)} ${P(cx + R + 12, y + 2)}Q${P(cx, y - 8)} ${P(cx - R - 12, y + 2)}Z" fill="#33201c" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<path d="M${P(cx - R - 10, y)}Q${P(cx, y - 10)} ${P(cx + R + 10, y)}" fill="none" stroke="${trim}" stroke-width="2.4"/><path d="M${P(cx + 12, y - 26)}c10 -14 22 -12 28 -8c-10 0 -18 4 -24 12Z" fill="#f4f1ea" stroke="${INK}" stroke-width="1.1"/><circle cx="${cx}" cy="${r1(y - 17)}" r="4" fill="#f4f1ea" stroke="${INK}" stroke-width="1"/><path d="M${P(cx - 2, y - 19)}l4 4M${P(cx + 2, y - 19)}l-4 4" stroke="${INK}" stroke-width="1"/>`;
  }
  if (acc.has("captain-cap")) {
    const y = cy - R * 0.38;
    s += `<path d="M${P(cx - R - 2, y)}Q${P(cx - R - 8, y - 26)} ${P(cx, y - 30)}Q${P(cx + R + 8, y - 26)} ${P(cx + R + 2, y)}Z" fill="#f4f4f6" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<rect x="${r1(cx - R - 1)}" y="${r1(y - 7)}" width="${r1(2 * R + 2)}" height="9" fill="#1f2a44" stroke="${INK}" stroke-width="1.4"/><path d="M${P(cx - R + 4, y + 2)}Q${P(cx, y + 14)} ${P(cx + R - 4, y + 2)}Z" fill="#14141c" stroke="${INK}" stroke-width="1.4"/>` +
      `<path d="M${P(cx - 6, y - 4)}h12l-6 -9Z" fill="${trim}" stroke="${INK}" stroke-width=".9"/><path d="M${P(cx - R, y + 1)}h${r1(2 * R)}" stroke="${trim}" stroke-width="1.4"/>`;
  }
  if (acc.has("eyepatch")) {
    s += `<path d="M${P(cx - R, cy - 10)}L${P(cx + R, cy + 6)}" stroke="#1a1418" stroke-width="2.2"/><ellipse cx="${r1(exL)}" cy="${r1(eyeY)}" rx="${r1(A.ew * 0.62)}" ry="${r1(A.eh * 0.8 + 2)}" fill="#1a1418" stroke="${INK}" stroke-width="1.2"/><path d="M${P(exL - 3, eyeY - 4)}q3 -2 6 0" stroke="#4a3a44" stroke-width="1.2" fill="none"/>`;
  }
  if (acc.has("round-glasses")) {
    const r = A.ew * 0.66;
    s += `<circle cx="${r1(exL)}" cy="${r1(eyeY)}" r="${r1(r)}" fill="#dff2ff" fill-opacity=".18" stroke="#6b4a2a" stroke-width="1.8"/><circle cx="${r1(exR)}" cy="${r1(eyeY)}" r="${r1(r)}" fill="#dff2ff" fill-opacity=".18" stroke="#6b4a2a" stroke-width="1.8"/><path d="M${P(exL + r, eyeY - 1)}Q${P(cx, eyeY - 5)} ${P(exR - r, eyeY - 1)}M${P(exL - r, eyeY - 1)}L${P(cx - W, eyeY - 3)}M${P(exR + r, eyeY - 1)}L${P(cx + W, eyeY - 3)}" fill="none" stroke="#6b4a2a" stroke-width="1.6"/>`;
  }
  if (acc.has("monocle")) {
    const r = A.ew * 0.68;
    s += `<circle cx="${r1(exR)}" cy="${r1(eyeY)}" r="${r1(r)}" fill="#fff8d8" fill-opacity=".2" stroke="#d4af37" stroke-width="2"/><path d="M${P(exR + r * 0.6, eyeY + r * 0.8)}Q${P(exR + 10, eyeY + 30)} ${P(cx + 18, g.shY + 6)}" fill="none" stroke="#d4af37" stroke-width="1.1"/>`;
  }
  if (acc.has("earring")) {
    for (const sd of [-1, 1]) s += `<circle cx="${r1(cx + sd * (W + 1))}" cy="${r1(eyeY + 13)}" r="2.3" fill="none" stroke="${female ? "#f2c94c" : "#d0d6e0"}" stroke-width="1.6"/><path d="M${P(cx + sd * (W + 1), eyeY + 15)}l0 4" stroke="${trim}" stroke-width="2.4"/>`;
  }
  if (acc.has("antennae")) {
    for (const sd of [-1, 1]) s += `<path d="M${P(cx + sd * 8, cy - R + 2)}Q${P(cx + sd * 12, cy - R - 18)} ${P(cx + sd * 22, cy - R - 22)}" fill="none" stroke="${INK}" stroke-width="1.8"/><circle cx="${r1(cx + sd * 22)}" cy="${r1(cy - R - 22)}" r="3.6" fill="#8ff0e4" stroke="${INK}" stroke-width="1.2"/>`;
  }
  if (acc.has("antenna")) {
    s += `<path d="M${P(cx, cy - W)}v-16" stroke="${INK}" stroke-width="2.2"/><circle cx="${cx}" cy="${r1(cy - W - 18)}" r="4.2" fill="${trim}" stroke="${INK}" stroke-width="1.3"/><path d="M${P(cx - 9, cy - W + 3)}h18" stroke="#8592a8" stroke-width="3"/>`;
  }
  if (acc.has("forehead-gem")) {
    const y = g.st.fringe === "slick" ? browY - 9 : browY - 3;
    s += `<path d="M${P(cx, y - 5)}L${P(cx + 3.5, y)}L${P(cx, y + 5)}L${P(cx - 3.5, y)}Z" fill="${trim}" stroke="${INK}" stroke-width="1.1"/><path d="M${P(cx - 1, y - 2)}l1 -1.5" stroke="#fff" stroke-width="1"/>`;
  }
  if (acc.has("implant")) {
    s += `<rect x="${r1(cx + W - 9)}" y="${r1(eyeY - 12)}" width="9" height="15" rx="2" fill="#8d96a6" stroke="${INK}" stroke-width="1.2"/><circle cx="${r1(cx + W - 4.5)}" cy="${r1(eyeY - 8)}" r="1.6" fill="${trim}"/><circle cx="${r1(cx + W - 4.5)}" cy="${r1(eyeY - 3)}" r="1.6" fill="${trim}"/>`;
  }
  if (acc.has("visor-band")) {
    s += `<path d="${arc(cx, cy, R - 1, 196, 344)}" fill="none" stroke="#1a1a22" stroke-width="4.5"/><path d="${arc(cx, cy, R - 1, 200, 340)}" fill="none" stroke="${trim}" stroke-width="1.6"/>`;
  }
  return s;
}

// ---------------------------------------------------------------- fonds

function background(uni, rand, cx, cy) {
  let s = "";
  const acc = uni.accent;
  switch (uni.motif) {
    case "stars": {
      s += `<circle cx="${cx}" cy="${cy - 2}" r="78" fill="none" stroke="${acc}" stroke-opacity=".18" stroke-width="1.5"/><circle cx="${cx}" cy="${cy - 2}" r="70" fill="none" stroke="${acc}" stroke-opacity=".14" stroke-width="1" stroke-dasharray="3 5"/>`;
      for (let i = 0; i < 14; i++) {
        const x = rand() * 200;
        const y = rand() * 150;
        const k = 1 + rand() * 2.2;
        s += `<path d="M${P(x, y - k * 2)}Q${P(x, y)} ${P(x + k * 2, y)}Q${P(x, y)} ${P(x, y + k * 2)}Q${P(x, y)} ${P(x - k * 2, y)}Q${P(x, y)} ${P(x, y - k * 2)}Z" fill="${acc}" opacity="${r1(0.35 + rand() * 0.5)}"/>`;
      }
      break;
    }
    case "reeds": {
      s += `<circle cx="160" cy="36" r="20" fill="#e9f2d0" opacity=".55"/>`;
      for (let i = 0; i < 9; i++) {
        const x = i < 5 ? 6 + i * 9 + rand() * 4 : 152 + (i - 5) * 11 + rand() * 4;
        const h = 70 + rand() * 50;
        const bend = (rand() - 0.5) * 16;
        s += `<path d="M${P(x, 200)}Q${P(x + bend * 0.3, 200 - h / 2)} ${P(x + bend, 200 - h)}" fill="none" stroke="#0b1f1b" stroke-opacity=".55" stroke-width="2.2"/><ellipse cx="${r1(x + bend)}" cy="${r1(200 - h + 8)}" rx="2.6" ry="8" fill="#0b1f1b" opacity=".55"/>`;
      }
      s += `<path d="M0 182Q50 176 100 182T200 180V200H0Z" fill="#0b1f1b" opacity=".35"/>`;
      break;
    }
    case "clouds": {
      const cloud = (x, y, k, o) => `<path d="M${P(x - 22 * k, y)}a${r1(10 * k)} ${r1(10 * k)} 0 0 1 ${r1(12 * k)} ${r1(-10 * k)}a${r1(13 * k)} ${r1(13 * k)} 0 0 1 ${r1(24 * k)} ${r1(-3 * k)}a${r1(10 * k)} ${r1(10 * k)} 0 0 1 ${r1(14 * k)} ${r1(13 * k)}Z" fill="#fff" opacity="${o}"/>`;
      s += cloud(30, 50, 1.2, 0.7) + cloud(170, 34, 1, 0.6) + cloud(172, 120, 1.4, 0.55) + cloud(24, 140, 1.1, 0.5);
      s += `<path d="M0 190Q40 170 80 186T160 182T200 178V200H0Z" fill="#fff" opacity=".6"/>`;
      break;
    }
    case "neon": {
      for (let i = 0; i < 12; i++) {
        const x = i * 17 + rand() * 4;
        const h = 40 + rand() * 70;
        s += `<rect x="${r1(x)}" y="${r1(200 - h)}" width="15" height="${r1(h)}" fill="#07051a" opacity=".75"/>`;
        for (let j = 0; j < 3; j++) if (rand() > 0.45) s += `<rect x="${r1(x + 3 + rand() * 7)}" y="${r1(200 - h + 6 + j * 12)}" width="2.5" height="3" fill="${rand() > 0.5 ? "#ff4fa3" : "#4fe3ff"}" opacity=".85"/>`;
      }
      s += `<path d="M0 60H200M0 30H200" stroke="#4fe3ff" stroke-opacity=".12"/><path d="M14 18h40M150 70h36" stroke="${acc}" stroke-width="2.5" stroke-opacity=".6"/>`;
      break;
    }
    case "petals": {
      s += `<circle cx="${cx}" cy="${cy - 6}" r="70" fill="${acc}" opacity=".28"/><path d="M28 34h144M36 44h128M52 34v110M148 34v110" stroke="#3a0812" stroke-opacity=".28" stroke-width="7"/>`;
      for (let i = 0; i < 12; i++) {
        const x = rand() * 200;
        const y = rand() * 200;
        s += `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="3.4" ry="2" fill="#ffd3dc" opacity="${r1(0.45 + rand() * 0.4)}" transform="rotate(${Math.round(rand() * 180)} ${r1(x)} ${r1(y)})"/>`;
      }
      break;
    }
  }
  return s;
}
