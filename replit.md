# AnimeWho — Qui est-ce ? version anime

Jeu en ligne à deux joueurs, en français : chacun choisit en secret un personnage d'anime parmi 24 tirés au hasard, puis on se pose des questions à tour de rôle pour deviner le personnage de l'adversaire. Parties rapides (appariement automatique), parties privées (code à 6 caractères) et parties contre l'ordinateur (3 niveaux).

## Lancer et exploiter

- `pnpm --filter @workspace/api-server run dev` — serveur API + temps réel (port 8080, fixé par Replit)
- `pnpm --filter @workspace/anime-guess-who run dev` — interface web (port 20021, fixé par Replit)
- `pnpm run typecheck` — vérification des types de tout le dépôt
- `pnpm run test` — tous les tests (voir « Tests »)
- `pnpm run build` — types + construction de tous les paquets (hors `mockup-sandbox`)
- `pnpm --filter @workspace/api-spec run codegen` — régénère les clients et schémas Zod depuis `lib/api-spec/openapi.yaml`
- `pnpm --filter @workspace/db run push` — applique un changement de schéma à la base (à la main, voir « Pièges »)

### Variables d'environnement (toutes optionnelles)

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion Postgres. Active les statistiques et le classement (les tables sont créées au démarrage). Sans elle, le jeu fonctionne et ces fonctions sont masquées. |
| `SITE_URL` | Adresse publique du site (ex. `https://anime-guess-master.replit.app`). Sert, à la **construction**, à rendre absolue l'URL de l'image d'aperçu et à ajouter l'adresse canonique. |
| `ALLOWED_ORIGINS` | Origines supplémentaires autorisées (CORS et WebSocket), séparées par des virgules. Par défaut : même site uniquement. |
| `TRUSTED_PROXY_HOPS` | Nombre de proxys devant l'API qui complètent `X-Forwarded-For` (défaut 1 = proxy de Replit). L'adresse du joueur est lue **à droite** de cet en-tête, jamais à gauche (falsifiable). Au démarrage, le serveur logge `Client IP taken from X-Forwarded-For` avec le nombre d'entrées, pour vérifier ce réglage. |
| `GAME_TIME_SCALE` | **Tests uniquement** : accélère tous les chronos (0.05 = 20 fois plus vite). Toujours 1 en production. |

## Pile technique

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API : Express 5 + Socket.IO 4, journaux Pino
- Interface : React 19, Vite 7, Tailwind 4, composants Radix, animations en CSS pur
- Base (optionnelle) : PostgreSQL + Drizzle ORM
- Génération de code : Orval (clients et schémas Zod depuis OpenAPI)
- Tests : Vitest, plus des clients Socket.IO réels contre un vrai serveur

## Où se trouvent les choses

| Quoi | Où |
|---|---|
| Moteur de jeu (salles, tours, chronos, ordinateur) | `artifacts/api-server/src/lib/game-engine.ts` |
| Stratégie de l'ordinateur (fonctions pures) | `artifacts/api-server/src/lib/bot.ts` |
| Statistiques, Elo, classement | `artifacts/api-server/src/lib/stats.ts` |
| Limites de débit, adresse IP du client | `artifacts/api-server/src/lib/rate-limit.ts` |
| Contrôle d'origine des WebSocket | `artifacts/api-server/src/lib/origin.ts` |
| Portraits (AniList) | `artifacts/api-server/src/lib/character-images.ts`, URLs en cache dans `src/data/character-images.json` |
| Personnages (99) | `artifacts/api-server/src/data/characters.json` |
| Création du serveur (réutilisée par les tests) | `artifacts/api-server/src/server.ts` |
| État du jeu côté navigateur | `artifacts/anime-guess-who/src/context/GameContext.tsx` |
| Protocole temps réel (types des événements) | `lib/game-protocol/src/index.ts` (partagé client/serveur) |
| Écrans | `artifacts/anime-guess-who/src/pages/` |
| Traductions des caractéristiques | `artifacts/anime-guess-who/src/lib/fr.ts` |
| Schéma de base | `lib/db/src/schema/` et `lib/db/src/ensure-schema.ts` |
| Contrat HTTP | `lib/api-spec/openapi.yaml` |

## Décisions d'architecture

- **Tout l'état des parties est en mémoire**, dans un seul processus. D'où le déploiement en **Reserved VM** (`.replit`) : l'autoscale pourrait séparer les deux joueurs ou arrêter le serveur en pleine partie. Un redéploiement met fin aux parties en cours.
- **Le serveur est l'arbitre.** Le personnage secret n'est jamais envoyé avant la fin de la partie ; chaque joueur reçoit son propre message de fin avec le personnage de *l'autre*.
- **Identité des joueurs** : un jeton de session secret (handshake Socket.IO), distinct de l'identifiant public affiché aux autres. Un rechargement ou une coupure rend sa place au joueur (45 s de grâce avant l'abandon) ; le chrono se met en pause pendant l'absence et reprend avec le temps restant.
- **Questions vérifiées** : le joueur choisit un trait et une valeur, le serveur répond à partir de `characters.json` (liste blanche de 8 traits). Impossible de mentir. Les questions libres existent aussi (marquées « non vérifiée », récapitulatif en fin de partie).
- **Dernière chance** : celui qui joue en premier trouve le personnage un tour plus tôt, ce qui lui donnait ~70 % des victoires (simulation bot contre bot). Quand le premier joueur devine juste, l’autre a donc **une dernière devinette** (plus de question) : s’il trouve aussi, c’est **égalité** (`winnerId: null`, raison `draw`, Elo à demi-point, ni victoire ni défaite) ; sinon la victoire du premier joueur est confirmée (chrono dépassé = pareil). Si le second joueur devine juste en premier, la partie s’arrête tout de suite. Voir `startLastChance` dans `game-engine.ts`.
- **Chronos** : 90 s pour choisir, 60 s par tour, 45 s pour répondre ; le dépassement coûte une vie.
- **L'ordinateur est un joueur ordinaire** côté serveur : mêmes règles, mêmes chronos. Il ne connaît que la grille et les réponses à ses propres questions. Ses parties ne comptent ni dans les statistiques ni dans le classement.
- **Classement** : Elo (départ 1000, K = 32), uniquement pour les parties rapides entre deux adresses et deux profils différents, première manche seulement (jamais les revanches), 2 parties classées par paire et par jour au maximum. Pas de comptes : le navigateur garde un jeton de profil dont seule l'empreinte SHA-256 est stockée.
- **Statistiques facultatives** : sans `DATABASE_URL`, tout le reste fonctionne.

## Tests

`pnpm run test` lance Vitest dans chaque paquet.

- `api-server` : tests unitaires (adresse IP, Elo, force de l'ordinateur, données des personnages) et tests d'intégration avec de vrais sockets (partie complète, secrets, reconnexion, chronos, réactions, ordinateur, sécurité).
- Les tests du classement (`stats.test.ts`) ont besoin d'une base : ils sont **sautés** sans `DATABASE_URL`. La CI en fournit une.
- `anime-guess-who` : chaque valeur des fiches a une traduction française, chaque question est bien formée.
- La CI GitHub (`.github/workflows/ci.yml`) lance types, tests et construction à chaque PR, plus un audit des dépendances (informatif).

## Pièges

- **Ajouter un personnage** : renseigner tous les champs dans `characters.json` avec des valeurs en minuscules déjà connues, et vérifier la traduction dans `fr.ts` (le test web le rappelle). Deux personnages qui ne diffèrent sur aucun des 8 traits rendent la partie indevinable : le test de données refuse tout nouveau cas (seuls Edward et Alphonse Elric sont connus).
- **Les images** : les adresses déjà trouvées sont dans `artifacts/api-server/src/data/character-images.json` (id → URL), utilisées dès le démarrage ; AniList n'est interrogé (~25 s pour tout) que pour les personnages absents de ce fichier. Après un ajout de personnages, régénérer le fichier avec `pnpm --filter @workspace/scripts run fetch-character-images` (réseau requis vers `graphql.anilist.co`), relire le diff et le committer. Si une image est fausse ou manque, ajouter `"image": "https://…"` sur le personnage dans `characters.json` : elle passe avant le cache.
- **Schéma de base** : les tables sont créées automatiquement, mais un *changement* de schéma se fait à la main avec `db push`. `ensure-schema.ts` doit rester identique à ce que produit Drizzle (mêmes noms de contraintes).
- **Protocole temps réel** : les événements, leurs payloads, `REACTIONS`, `VERIFIABLE_ATTRIBUTES` et `BotLevel` vivent dans `lib/game-protocol`, importé par le client et le serveur (le serveur est typé `Server<ClientToServerEvents, ServerToClientEvents>`). Un changement de contrat se fait à un seul endroit ; le compilateur signale l’autre côté.
- `artifacts/mockup-sandbox` sert à la maquette Replit : il n'est pas déployé et est exclu des commandes `typecheck`, `build` et `test` de la racine.

## Pour aller plus loin

- Voir le skill `pnpm-workspace` pour la structure du dépôt et la configuration TypeScript.
