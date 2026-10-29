# Fiches App Store et Google Play

> Brouillon prêt à coller, version 1.0 (lancement prévu en février 2027). Les textes sont en français (marché principal) **et** en anglais (localisation « English (U.S.) » / « en-US », utile dès le lancement pour la francophonie hors France et indispensable pour la version anglaise prévue à M10-M12).
>
> Règles suivies : aucun nom d'œuvre, de personnage, de studio, d'éditeur ou de jeu tiers, dans les textes, les mots-clés, les captures ou l'icône (Apple 2.3.7 et 5.2, Google « Métadonnées » et « Propriété intellectuelle »). « Anime » et « manga » sont des **noms de genre**, utilisables. Pas de superlatifs invérifiables (« n°1 », « le meilleur »). Les limites de caractères ont été vérifiées.
>
> **Prérequis bloquant** : la fiche décrit le **casting 100 % original** (BUSINESS_PLAN §6). L'app ne doit être soumise qu'avec ce casting (voir `CHECKLIST_SOUMISSION.md`, section A).

---

## 1. Identité

| Champ | Valeur | Remarque |
|---|---|---|
| Nom de l'app (Apple, ≤ 30) / Titre (Google, ≤ 30) | **AnimeWho : duel de déduction** (28) | EN : **AnimeWho: Anime Deduction Duel** (30) |
| Sous-titre (Apple, ≤ 30) | **Devine le perso de ton rival** (28) | EN : **Guess your rival’s character** (28) |
| Identifiant de bundle / package | `com.animewho.app` **[Hypothèse]** | Définitif après la 1re soumission : à valider avant (dépend du nom de domaine et de la société). |
| SKU (Apple) | `ANIMEWHO-IOS-001` | Interne. |
| Éditeur / nom du développeur affiché | Nom de la société (SASU) | À compléter. Doit être le titulaire des droits sur le casting original (Apple 5.2). |
| Langue principale | Français (France) | + English (U.S.) |
| Prix | Gratuit, avec achats intégrés et publicités | Cocher « Contient des publicités » (Google). |

## 2. Catégorie

| Store | Principale | Secondaire / tags | Justification |
|---|---|---|---|
| App Store | **Jeux › Jeux de société** (*Board*) | **Jeux › Réflexion** (*Puzzle*) | Le cœur du jeu est une mécanique de jeu de société (grille de 24 personnages, questions oui/non, élimination). « Quiz » (*Trivia*) induirait en erreur : il n'y a pas de questions de culture. |
| Google Play | **Jeux › Jeux de société** (*Board*) | Tags : *Déduction*, *Multijoueur*, *Anime*, *Tour par tour*, *Hors ligne : non* | Mêmes raisons. Choisir les tags proposés par la console les plus proches. |

## 3. Classification d'âge

### 3.1 Contenu réel de l'app

| Élément | Constat |
|---|---|
| Violence, sang, peur | Aucune. Des personnages d'univers « action » existent (épée, magie) mais sont **des portraits statiques** ; aucune scène de combat. |
| Sexualité, nudité, langage grossier | Aucun dans le contenu fourni. Les portraits originaux sont commandés avec une consigne « tout public » (pas de tenue suggestive). |
| Jeux d'argent | Aucun. Pas de loot box (tout achat a un contenu connu), pas de mise. |
| **Interaction entre utilisateurs** | **Oui** : les **questions libres** sont du texte tapé par un inconnu et affiché à l'adversaire. Pseudonymes visibles. Pas de chat libre, pas d'échange d'images, pas de partage de localisation. Filtre de mots, signalement, blocage, mode « questions vérifiées uniquement ». |
| Achats intégrés | Oui (Éclats, sans pub, abonnement, packs). |
| Publicité | Oui (AdMob, contenus classés *Teen* maximum, jamais pendant une partie contre un humain). |

### 3.2 Questionnaire IARC (Google Play, et PEGI en Europe)

Réponses prévues : violence **non**, peur **non**, sexualité/nudité **non**, langage grossier **non** (le texte des joueurs relève de la question « interaction »), substances **non**, jeux d'argent simulés **non**, achats numériques **oui**, **les utilisateurs peuvent interagir / communiquer** **oui**, partage de localisation **non**, partage d'informations personnelles **non**.

Résultat attendu : **PEGI 3** (ou PEGI 7 selon le classement des portraits « action ») avec les mentions **« Achats intégrés »** et **« Interactions entre utilisateurs »** (ESRB équivalent : *Everyone* + *In-Game Purchases, Users Interact*).

**Argument** : la classification PEGI/IARC porte sur le **contenu** ; elle est basse ici parce que le jeu est sain. Elle **ne remplace pas** notre âge minimum de **13 ans** (consentement RGPD, publicité, contenu entre inconnus), appliqué dans l'app par l'écran d'âge. Dans la Play Console, section **« Public cible et contenu »**, déclarer le public cible **13-15, 16-17 et 18+** — **ne pas** cocher de tranche de moins de 13 ans (sinon la politique *Familles* s'applique : SDK publicitaires certifiés Familles, interdiction de certains identifiants…). Répondre « non » à « l'app pourrait-elle attirer involontairement des enfants ? » est défendable (style, textes et marketing visent les ados et jeunes adultes), mais à **justifier par les visuels** de la fiche (pas de style « enfant »).

### 3.3 Apple (questionnaire d'âge 2025 : 4+, 9+, 13+, 16+, 18+)

Réponses prévues : aucune violence, aucun contenu sexuel, aucun jeu d'argent ; **contenu généré par les utilisateurs : oui** ; **messagerie / communication entre utilisateurs : oui (texte limité)** ; **publicité : oui** ; achats intégrés : oui ; contrôles parentaux / vérification d'âge : écran d'âge.

Classification visée : **13+**. Argument : la communication en texte libre avec des inconnus conduit Apple à un classement adolescent, et 13+ est **cohérent avec notre âge minimum** (une classification plus basse que l'âge réellement requis par l'app serait incohérente et pourrait être relevée par la revue). Ne pas choisir la catégorie *Kids* (Enfants).

---

## 4. Textes de fiche — français

### Description courte (Google, ≤ 80)

> Duel de déduction anime : devine le personnage secret de ton adversaire en 3 min

### Texte promotionnel (Apple, ≤ 170, modifiable sans nouvelle version)

> Nouveau : un univers de personnages originaux à découvrir ! Défie un ami avec un code de partie et trouve son personnage en un minimum de questions.

### Description longue (Apple et Google, ≤ 4 000)

```
Qui a le personnage aux cheveux argentés et au sabre ? Pose tes questions, élimine les cartes, devine avant ton rival !

AnimeWho, c'est le duel de déduction en ligne, en version anime. Chaque joueur choisit en secret un personnage parmi 24, puis vous vous posez des questions à tour de rôle : « Ton personnage a-t-il les yeux rouges ? », « Est-ce un démon ? »… À chaque réponse, tu élimines des cartes. Le premier qui trouve le personnage de l'autre gagne.

DES PERSONNAGES ORIGINAUX
• Plus de 100 personnages créés pour AnimeWho par des illustrateurs, dans 8 univers : académie de magie, ville futuriste, clan de sabreurs, lycée, pirates du ciel, robots géants, esprits et yokai, sport.
• Des traits pensés pour la déduction : cheveux, yeux, âge, espèce, rôle, camp…

3 FAÇONS DE JOUER
• Partie rapide : un adversaire trouvé en quelques secondes, avec classement Elo.
• Partie privée : crée une partie, envoie le code à un ami (WhatsApp, SMS…) et jouez où que vous soyez.
• Contre l'ordinateur : 3 niveaux, pour t'entraîner ou jouer sans attendre.

UN JEU JUSTE
• Questions vérifiées : choisis un trait et une valeur, c'est le serveur qui répond. Impossible de mentir.
• Questions libres pour les plus créatifs, avec filtre, signalement et blocage.
• Aucun avantage payant contre un autre joueur : ni indice, ni vie, ni temps en plus. Le classement se gagne en jouant.

PARTIES COURTES, PENSÉES POUR LE MOBILE
• Une partie dure environ 3 minutes.
• Tu reçois un appel ? Tu as 45 secondes pour revenir sans perdre ta place.
• Réactions animées, revanche en un geste, statistiques et série de victoires.

PERSONNALISE TON STYLE
• Gagne des Éclats en jouant et débloque dos de cartes, cadres, réactions et animations de victoire.
• Tout achat a un contenu connu à l'avance : pas de coffre au hasard.

AnimeWho est gratuit et contient des publicités (jamais pendant une partie contre un autre joueur) ainsi que des achats intégrés facultatifs, dont une option « Sans pub » à vie. Âge minimum : 13 ans.

Une question, une idée ? Écris-nous : support@animewho.app
Conditions d'utilisation : https://animewho.app/cgu
Politique de confidentialité : https://animewho.app/confidentialite
```

### Nouveautés de la version 1.0

> Première version ! Parties rapides avec classement, parties privées avec code, trois niveaux contre l'ordinateur et plus de 100 personnages originaux.

### Mots-clés (Apple, ≤ 100, séparés par des virgules, sans espace inutile)

```
deviner,personnage,manga,quiz,jeu à deux,amis,multijoueur,questions,plateau,énigme,otaku,enquête
```
(96 caractères. Les mots du nom et du sous-titre — AnimeWho, duel, déduction, devine, perso, rival — sont déjà indexés : ne pas les répéter.)

**ASO Google** (pas de champ mots-clés) : placer naturellement dans la description longue *jeu de déduction*, *deviner le personnage*, *jeu à deux*, *jeu entre amis*, *anime*, *manga*, *multijoueur en ligne*, *partie privée* — sans bourrage (au plus 2-3 occurrences par expression).

---

## 5. Store listing texts — English

### Short description (Google, ≤ 80)

> Anime deduction duel: guess your opponent’s secret character in 3 minutes

### Promotional text (Apple, ≤ 170)

> New: a whole cast of original characters to discover! Challenge a friend with a game code and find their character in as few questions as possible.

### Full description (≤ 4,000)

```
Who has the silver-haired swordswoman? Ask questions, flip down cards, and guess before your rival does!

AnimeWho is an online deduction duel with an anime twist. Each player secretly picks one of 24 characters, then you take turns asking questions: "Does your character have red eyes?", "Is it a demon?"… Every answer rules out cards. First to find the other player's character wins.

ORIGINAL CHARACTERS
• 100+ characters created for AnimeWho by illustrators, across 8 worlds: magic academy, future city, sword clan, high school, sky pirates, giant robots, spirits and yokai, sports.
• Traits built for deduction: hair, eyes, age, species, role, side…

3 WAYS TO PLAY
• Quick match: an opponent in seconds, with Elo ranking.
• Private game: create a game, send the code to a friend and play from anywhere.
• Versus the computer: 3 levels, to practise or to play right away.

FAIR PLAY
• Verified questions: pick a trait and a value, the server answers. No lying possible.
• Free-text questions for the creative ones, with filtering, reporting and blocking.
• No pay-to-win against other players: no hints, no extra lives, no extra time. Rank is earned by playing.

SHORT GAMES, BUILT FOR MOBILE
• A game takes about 3 minutes.
• Got a call? You have 45 seconds to come back without losing your seat.
• Animated reactions, one-tap rematch, stats and win streaks.

MAKE IT YOURS
• Earn Shards by playing and unlock card backs, frames, reactions and victory effects.
• Every purchase shows exactly what you get: no random boxes.

AnimeWho is free to play. It contains ads (never during a game against another player) and optional in-app purchases, including a lifetime "No ads" option. Minimum age: 13.

Questions or ideas? support@animewho.app
Terms of Use: https://animewho.app/terms
Privacy Policy: https://animewho.app/privacy
```

### What's new in 1.0

> First release! Ranked quick matches, private games with a code, three computer levels and 100+ original characters.

### Keywords (Apple, ≤ 100)

```
guess,character,manga,quiz,two player,friends,multiplayer,questions,board game,mystery,detective
```
(96 characters.)

---

## 6. Visuels

| Élément | App Store | Google Play |
|---|---|---|
| Icône | 1024 × 1024 PNG, sans transparence ni coins arrondis (Apple les applique) | 512 × 512 PNG 32 bits, ≤ 1 Mo |
| Captures | iPhone 6,9" (1320 × 2868 ou 1290 × 2796), 3 à 10 ; iPad 13" (2064 × 2752) **seulement si l'app tourne sur iPad** | Téléphone : 2 à 8, côté court ≥ 1080 px conseillé (ex. 1080 × 1920) ; tablettes 7" et 10" recommandées |
| Image de présentation | — | 1024 × 500 (obligatoire) |
| Vidéo | Aperçu de 15-30 s (facultatif), capturé dans l'app | Lien YouTube (facultatif) |

Captures prévues (dans cet ordre, légende en haut, 5-6 mots) :
1. La grille pendant une partie — « Devine le perso de ton rival »
2. Une question vérifiée et sa réponse — « Des questions, pas de triche »
3. L'écran de victoire avec Elo — « Grimpe au classement »
4. Le partage du code de partie privée — « Défie tes amis »
5. La galerie des personnages originaux — « 100+ personnages originaux »
6. La boutique de cosmétiques — « Personnalise ton style »

Règles : captures **réelles** de l'app (Apple 2.3.3) ; uniquement des personnages **originaux** ; pas de pseudonymes réels de joueurs (utiliser des comptes de test) ; pas de mention de prix promotionnels dans l'image ; pas de bannière publicitaire visible (Apple refuse les captures qui montrent des publicités tierces).

## 7. Coordonnées affichées

| Champ | Valeur (à créer) |
|---|---|
| Site marketing | `https://animewho.app` |
| URL d'assistance (Apple, obligatoire) | `https://animewho.app/aide` (FAQ + formulaire) |
| E-mail de contact (Google, obligatoire) | `support@animewho.app` |
| Politique de confidentialité (obligatoire) | `https://animewho.app/confidentialite` (texte : `POLITIQUE_CONFIDENTIALITE.md`) |
| Suppression de compte (Google, URL obligatoire) | `https://animewho.app/suppression-compte` (voir `CHECKLIST_SOUMISSION.md` D.3) |
| `app-ads.txt` (AdMob) | `https://animewho.app/app-ads.txt` — le domaine doit être celui du « site du développeur » déclaré dans les deux stores |
