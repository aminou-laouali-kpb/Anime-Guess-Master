// French labels for the character traits stored in English in characters.json.
// Unknown values fall back to the original text.

const HAIR: Record<string, string> = {
  black: "noirs", blonde: "blonds", none: "aucun", brown: "bruns", red: "roux",
  green: "verts", orange: "orange", pink: "roses", silver: "argentés",
  "dark blue": "bleu foncé", yellow: "jaunes", "white and red": "blancs et rouges",
  "pale white": "blanc pâle", white: "blancs", "dark green": "vert foncé",
  blue: "bleus", "light green": "vert clair",
};

const EYES: Record<string, string> = {
  blue: "bleus", red: "rouges", dark: "sombres", gray: "gris", black: "noirs",
  brown: "marron", green: "verts", yellow: "jaunes", violet: "violets",
  gold: "dorés", golden: "dorés", amber: "ambrés", "pale green": "vert pâle",
  white: "blancs", teal: "bleu-vert", "dark red": "rouge foncé", pink: "roses",
  heterochromia: "vairons",
};

const SPECIES: Record<string, string> = {
  human: "humain", shinigami: "shinigami", saiyan: "saiyan", demon: "démon",
  "titan shifter": "titan métamorphe", namekian: "namek", alien: "extraterrestre",
  "chimera ant": "fourmi-chimère",
};

const GENDER: Record<string, string> = { male: "homme", female: "femme" };

const ALIGNMENT: Record<string, string> = {
  hero: "héros", villain: "méchant", antihero: "anti-héros", neutral: "neutre",
};

const ROLE: Record<string, string> = { main: "principal", secondary: "secondaire" };

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
