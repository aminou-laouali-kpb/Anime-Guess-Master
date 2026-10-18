import { Character } from "@workspace/api-client-react";
import { fr } from "./fr";

// Questions the server answers itself from the character data (no lying).
// Must match VERIFIABLE_ATTRIBUTES in the API server's game engine.
export type VerifiableAttribute =
  | "hairColor"
  | "eyeColor"
  | "gender"
  | "ageRange"
  | "species"
  | "alignment"
  | "role"
  | "anime";

export const ATTRIBUTES: { key: VerifiableAttribute; label: string }[] = [
  { key: "hairColor", label: "Cheveux" },
  { key: "eyeColor", label: "Yeux" },
  { key: "gender", label: "Genre" },
  { key: "ageRange", label: "Âge" },
  { key: "species", label: "Espèce" },
  { key: "alignment", label: "Camp" },
  { key: "role", label: "Rôle" },
  { key: "anime", label: "Anime" },
];

export const AGE_PHRASES: Record<string, string> = { child: "un enfant", teen: "un ado", adult: "un adulte" };
export const ALIGNMENT_PHRASES: Record<string, string> = {
  hero: "un héros", villain: "un méchant", antihero: "un anti-héros", neutral: "neutre",
};

// Short label for the value buttons.
export function valueLabel(attribute: VerifiableAttribute, value: string): string {
  switch (attribute) {
    case "hairColor": return value === "none" ? "chauve" : fr.hair(value);
    case "eyeColor": return fr.eyes(value);
    case "gender": return fr.gender(value);
    case "ageRange": return AGE_PHRASES[value]?.replace(/^un /, "") ?? value;
    case "species": return fr.species(value);
    case "alignment": return fr.alignment(value);
    case "role": return fr.role(value);
    case "anime": return value;
  }
}

export function questionText(attribute: VerifiableAttribute, value: string): string {
  switch (attribute) {
    case "hairColor":
      return value === "none"
        ? "Ton personnage est-il chauve ?"
        : `Ton personnage a-t-il les cheveux ${fr.hair(value)} ?`;
    case "eyeColor": return `Ton personnage a-t-il les yeux ${fr.eyes(value)} ?`;
    case "gender": return value === "female" ? "Ton personnage est-il une femme ?" : "Ton personnage est-il un homme ?";
    case "ageRange": return `Ton personnage est-il ${AGE_PHRASES[value] ?? value} ?`;
    case "species": return `Ton personnage est-il de l’espèce « ${fr.species(value)} » ?`;
    case "alignment": return `Ton personnage est-il ${ALIGNMENT_PHRASES[value] ?? value} ?`;
    case "role": return `Ton personnage est-il un personnage ${fr.role(value)} ?`;
    case "anime": return `Ton personnage vient-il de « ${value} » ?`;
  }
}

export function hasTrait(character: Character, attribute: VerifiableAttribute, value: string): boolean {
  return character[attribute].toLowerCase() === value.toLowerCase();
}

// Values present on this board, so players only ask useful questions.
export function valuesOnBoard(characters: Character[], attribute: VerifiableAttribute): string[] {
  return [...new Set(characters.map((c) => c[attribute]))].sort((a, b) =>
    valueLabel(attribute, a).localeCompare(valueLabel(attribute, b), "fr"),
  );
}
