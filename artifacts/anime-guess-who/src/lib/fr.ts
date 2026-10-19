// French labels for the character traits stored in English in characters.json.
// Unknown values fall back to the original text.

// Shades are merged on purpose (dark blue → blue, gold → yellow…): a question
// about a colour only one character has barely helps split the board.
const HAIR: Record<string, string> = {
  black: "noirs", blonde: "blonds", none: "aucun", brown: "bruns", red: "roux",
  green: "verts", orange: "orange", pink: "roses", silver: "argentés",
  white: "blancs", blue: "bleus", purple: "violets",
};

const EYES: Record<string, string> = {
  blue: "bleus", red: "rouges", gray: "gris", black: "noirs", brown: "marron",
  green: "verts", yellow: "jaunes", purple: "violets", white: "blancs",
  teal: "bleu-vert", pink: "roses", heterochromia: "vairons",
};

const SPECIES: Record<string, string> = {
  human: "humain", shinigami: "shinigami", saiyan: "saiyan", demon: "démon",
  "titan shifter": "titan métamorphe", namekian: "namek", alien: "extraterrestre",
  "chimera ant": "fourmi-chimère", android: "androïde",
  immortal: "immortel", "half-elf": "demi-elfe", devil: "diable", "soul in armor": "âme dans une armure",
};

const GENDER: Record<string, string> = { male: "homme", female: "femme" };

const ALIGNMENT: Record<string, string> = {
  hero: "héros", villain: "méchant", antihero: "anti-héros", neutral: "neutre",
};

const ROLE: Record<string, string> = { main: "principal", secondary: "secondaire" };

// Exposed so the tests can check every value in characters.json has a label.
export const FR_LABELS = {
  hair: HAIR,
  eyes: EYES,
  species: SPECIES,
  gender: GENDER,
  alignment: ALIGNMENT,
  role: ROLE,
};

const lookup = (table: Record<string, string>) => (value: string) =>
  table[value?.toLowerCase()] ?? value;

export const fr = {
  hair: lookup(HAIR),
  eyes: lookup(EYES),
  species: lookup(SPECIES),
  gender: lookup(GENDER),
  alignment: lookup(ALIGNMENT),
  role: lookup(ROLE),
};
