# AnimeWho Originals : casting original, lot n° 1

Ce dossier contient 24 personnages 100 % inventés, avec des portraits SVG **générés par code**. On n'a fait appel à aucun illustrateur ni à aucune IA d'image, et aucune ressource externe n'est utilisée. L'objectif est de remplacer à terme les 165 personnages sous droits de `artifacts/api-server/src/data/characters.json` (voir `docs/business-plan/BUSINESS_PLAN.md`, §6).

**Rien n'est encore branché dans le jeu.** Ce dossier sert uniquement d'atelier et de vitrine.

| Fichier | Rôle |
|---|---|
| `characters.originals.json` | Les 24 personnages, au même schéma que `characters.json`, avec deux champs en plus : `bio` et `appearance` |
| `portrait.mjs` | Générateur de portraits SVG (Node pur, déterministe, aucune dépendance) |
| `build.mjs` | Écrit `out/<id>.svg` et la page autonome `out/preview.html` |
| `check.mjs` | Contrôle l'équilibre de jeu et le schéma, et affiche les répartitions |
| `out/preview.html` | Grille des 24 cartes : thème sombre, lisible sur mobile, aucun lien externe (versionnée) |
| `preview.png` | Capture d'écran de la page d'aperçu |

## Régénérer

```bash
node tools/originals/check.mjs   # code de sortie 1 en cas de problème
node tools/originals/build.mjs   # out/*.svg + out/preview.html
```

Il faut Node 18 ou plus, et rien d'autre. Le résultat est identique d'une exécution à l'autre : l'aléatoire, utilisé pour les étoiles, les pétales et de petites variations de mèches, est initialisé à partir de l'`id`.

Pour refaire la capture (Chromium est déjà installé dans l'environnement) :

```js
// node capture.cjs
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('file://' + process.cwd() + '/tools/originals/out/preview.html');
  await p.screenshot({ path: 'tools/originals/preview.png', fullPage: true });
  await b.close();
})();
```

## Les 5 univers inventés

Les noms ont été recherchés sur le web en novembre 2026 et ne correspondent à aucune œuvre connue. Cette recherche ne remplace pas l'avis d'un avocat.

| Univers (valeur du trait `anime`) | Thème | Fond |
|---|---|---|
| Académie Vélisande | Académie de magie | Nuit violette, étoiles, cercle magique |
| Clan des Joncs-Noirs | Ninjas des marais | Vert sombre, roseaux, lune |
| Équipage du Cirrus Écarlate | Pirates du ciel | Ciel bleu et pêche, nuages |
| Cité-Néon Okarvo | Ville cyberpunk | Nuit violette, immeubles, néons |
| Sanctuaire de Mikazune | Esprits et yokai | Rouge, soleil, portique, pétales |

## Ajouter un personnage

1. Ajouter un objet dans `characters.originals.json` :
   - `id` en kebab-case, unique ;
   - `name`, inventé, à vérifier sur le web (nom complet + « anime ») ;
   - `anime` : un univers existant ou un nouvel univers. Un nouvel univers doit aussi être ajouté dans `UNIVERSES` de `portrait.mjs` pour avoir un fond dédié ; sinon, une couleur est calculée.
   - Traits vérifiables, en minuscules : `gender`, `hairColor`, `eyeColor`, `ageRange`, `species`, `alignment`, `role`. Prendre autant que possible les valeurs déjà traduites (`artifacts/anime-guess-who/src/lib/fr.ts`, `questions.ts`). `check.mjs` liste les valeurs nouvelles.
   - `powers` (tableau, en anglais comme l'existant) et `bio` (une phrase en français).
2. Remplir `appearance`, qui pilote le dessin. Chaque champ est optionnel :

   | Champ | Valeurs |
   |---|---|
   | `skin` | `fair`, `light`, `pale`, `tan`, `brown`, `dark`, `lilac`, `lavender`, `green`, `metal`, `porcelain`, `rose`, `ash` |
   | `face` | `round`, `oval`, `sharp`, `square` |
   | `hairStyle` | `spiky`, `messy`, `short`, `bob`, `long`, `hime`, `wavy`, `ponytail`, `twintails`, `bun`, `braid`, `slicked` (`bald` est automatique si `hairColor` = `none`) |
   | `ears` | `human`, `elf`, `pointed`, `fin`, `robot`, `fox`, `wolf`, `rabbit`, `tanuki`, `cat` |
   | `horns` | `oni`, `curved`, `ram` |
   | `outfit` | `{ "type": robe \| ninja \| kimono \| coat \| uniform \| suit \| jacket \| android, "color": "#hex", "trim": "#hex" }` |
   | `accessories` | `star-pin`, `ribbon`, `tassel`, `flower`, `hairsticks`, `goggles`, `headphones`, `tricorne`, `captain-cap`, `eyepatch`, `round-glasses`, `monocle`, `earring`, `choker`, `scarf`, `facepaint`, `bandage`, `scar`, `beard`, `long-beard`, `mustache`, `fang`, `antennae`, `antenna`, `forehead-gem`, `implant`, `panel-lines`, `visor-band` |

   L'expression dépend de `alignment` : un héros a de grands yeux et un sourire ouvert, un méchant des yeux plissés, des sourcils en V et un rictus, un anti-héros les paupières mi-closes et la bouche plate, un personnage neutre un air calme. Les proportions dépendent de `ageRange` : un enfant a une grosse tête et de grands yeux ; un personnage âgé a de petits yeux, des rides et des sourcils épais.
3. Lancer `check.mjs` (aucun doublon, aucune valeur portée par un seul personnage ou par tous sauf un), puis `build.mjs`, et relire `out/preview.html`.
4. Faire un **contrôle anti-ressemblance** : la combinaison coiffure + couleur + accessoire signature + tenue ne doit rappeler aucun personnage connu.

## Brancher plus tard ce casting dans le jeu (à ne pas faire maintenant)

1. **Données.** Remplacer le contenu de `artifacts/api-server/src/data/characters.json` par le casting original, ou y ajouter le casting original. Le moteur (`artifacts/api-server/src/lib/game-engine.ts`) ne change pas : il lit les mêmes champs, et `VERIFIABLE_ATTRIBUTES` reste identique. Les champs `bio` et `appearance` sont ignorés, à moins de les exposer volontairement.
2. **Tests.** `artifacts/api-server/src/__tests__/characters.test.ts` exige au moins 48 personnages et au moins 10 « anime » : il faut soit produire 2 lots supplémentaires (120 personnages et 8 univers sont prévus au §6.3), soit adapter ces seuils. Vider la liste `KNOWN_INDISTINGUISHABLE`, puisque le casting original n'a pas de paire indiscernable. Vérifier aussi `artifacts/anime-guess-who/src/lib/french.test.ts`, qui exige une traduction pour chaque valeur, ainsi que `game.test.ts` et `bot.test.ts` s'ils citent des identifiants de personnages réels.
3. **Nouvelles valeurs à traduire** (voir la sortie de `check.mjs`) :
   - `ageRange: elder` (« âgé ») dans `AGE_PHRASES` de `artifacts/anime-guess-who/src/lib/questions.ts` et dans `mobile/lib/l10n/trait_labels.dart` (table `ageRange` et phrases d'âge) ;
   - `species: beastkin` (« hybride animal ») dans `SPECIES` de `artifacts/anime-guess-who/src/lib/fr.ts` et dans `mobile/lib/l10n/trait_labels.dart`.
4. **Portraits.**
   - Copier `out/*.svg` dans un dossier servi par le serveur ou embarqué dans les apps. Par exemple, un dossier statique de l'API (`/portraits/<id>.svg`) ou `artifacts/anime-guess-who/public/portraits/`.
   - Renseigner le champ `image` de chaque personnage. `artifacts/api-server/src/lib/character-images.ts` le prend déjà comme adresse imposée et saute alors la recherche AniList.
   - Supprimer ensuite l'appel à AniList (`character-images.ts`), comme le prévoit le §6.3.
   - Web : `CharacterCard.tsx` affiche `imageUrl` dans un `<img>`, ce qui fonctionne tel quel avec du SVG.
   - Mobile : `mobile/lib/ui/widgets/character_card.dart` charge l'image comme une image réseau, qui ne lit pas le SVG. Il faut soit ajouter `flutter_svg`, soit convertir les SVG en PNG ou WebP au moment de la construction (Chromium sans interface, comme pour `preview.png`).
5. **Textes.** Le libellé « Anime » de l'attribut (`questions.ts`, et l'équivalent mobile) pourra devenir « Univers ».
6. Lancer `pnpm run typecheck`, `pnpm run test` et les tests Flutter, puis jouer une partie de bout en bout.

## Limites connues du style

- Il s'agit d'un style « vectoriel simplifié » : aplats, contours et un seul niveau d'ombrage. Le rendu est propre et cohérent, mais il n'atteint pas la qualité d'un illustrateur, qui reste prévue au §6.3.
- Tous les personnages partagent la même pose, de face et en buste, et la même construction de visage. Ils se distinguent par la couleur, la coiffure, les oreilles ou cornes, les accessoires et l'expression.
- Les coiffures sont des gabarits paramétrés. Les coiffures plaquées (`slicked`) et courtes (`short`) peuvent faire un peu « casque ».
- Le dessin ne sait pas représenter les mains, les corps entiers, les poses dynamiques ou les vêtements complexes.
