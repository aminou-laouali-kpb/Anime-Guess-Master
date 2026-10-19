# AnimeWho — Qui est-ce ? version anime

Jeu en ligne à deux joueurs, en français : chacun choisit en secret un personnage d'anime parmi 24 tirés au hasard, puis on se pose des questions à tour de rôle pour deviner le personnage de l'adversaire. Parties rapides (appariement automatique), parties privées (code à 6 caractères) et parties contre l'ordinateur (3 niveaux).

## Lancer et exploiter

- `pnpm --filter @workspace/api-server run dev` — serveur API + temps réel (port 8080, fixé par Replit)
- `pnpm --filter @workspace/anime-guess-who run dev` — interface web (port 20021, fixé par Replit)
- `pnpm run typecheck` — vérification des types de tout le dépôt
- `pnpm run test` — tous les tests (voir « Tests »)
- `pnpm run lint` — ESLint sur tout le dépôt (`eslint.config.js` ; 0 erreur exigée par la CI ; le dépôt est actuellement à 0 avertissement, à garder ainsi)
- `pnpm run format:check` — Prettier (`.prettierrc`), informatif : le code n'est pas encore formaté
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
| Moteur de jeu : branchement Socket.IO et exports | `artifacts/api-server/src/lib/engine/index.ts` |
| Moteur : types, état partagé, contexte `Engine` | `artifacts/api-server/src/lib/engine/state.ts` |
| Moteur : constantes (vies, chronos, limites) | `artifacts/api-server/src/lib/engine/config.ts` |
| Moteur : création des salles, grille, instantanés | `artifacts/api-server/src/lib/engine/rooms.ts` |
| Moteur : chronos, budget d'absence | `artifacts/api-server/src/lib/engine/timers.ts` |
| Moteur : règles (questions, devinettes, dernière chance, fin de partie, résultats) | `artifacts/api-server/src/lib/engine/rules.ts` |
| Moteur : tours de l'ordinateur | `artifacts/api-server/src/lib/engine/bot-driver.ts` |
| Moteur : file d'attente des parties rapides | `artifacts/api-server/src/lib/engine/matchmaking.ts` |
| Moteur : sessions (jeton, onglets, reconnexion) | `artifacts/api-server/src/lib/engine/sessions.ts` |
| Moteur : événements Socket.IO, limites de connexion | `artifacts/api-server/src/lib/engine/handlers.ts` (validation des entrées dans `input.ts`) |
| Stratégie de l'ordinateur (fonctions pures) | `artifacts/api-server/src/lib/bot.ts` |
| Statistiques, Elo, classement | `artifacts/api-server/src/lib/stats.ts` |
| Limites de débit, adresse IP du client | `artifacts/api-server/src/lib/rate-limit.ts` |
| Contrôle d'origine des WebSocket | `artifacts/api-server/src/lib/origin.ts` |
| Portraits (AniList) | `artifacts/api-server/src/lib/character-images.ts`, URLs en cache dans `src/data/character-images.json` |
| Personnages (165) | `artifacts/api-server/src/data/characters.json` |
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
- **Identité des joueurs** : un jeton de session secret (handshake Socket.IO), distinct de l'identifiant public affiché aux autres. Un rechargement ou une coupure rend sa place au joueur (45 s de grâce avant l'abandon) ; le chrono se met en pause pendant l'absence et reprend avec le temps restant. Pour qu'on ne puisse pas bloquer une partie en se déconnectant/reconnectant sans fin, chaque joueur a un **budget de 90 s d'absence cumulée par partie** (`DISCONNECT_BUDGET_MS`) : la grâce ne dépasse jamais ce qu'il en reste, et une fois épuisé, la déconnexion vaut abandon.
- **Limites par réseau** : le plafond de 20 connexions et la limite HTTP comptent par « réseau » (`networkKey` dans `rate-limit.ts`) : une adresse IPv4 exacte, ou le **préfixe /64** d'une adresse IPv6 (un abonné IPv6 dispose de tout un /64) ; `::ffff:1.2.3.4` compte comme `1.2.3.4`. Une connexion qui ne fait rien hors partie (ni salle, ni file d'attente, ou seule dans une salle privée que personne n'a rejointe) est coupée après **10 min d'inactivité**.
- **Arrêt propre** : sur `SIGTERM`/`SIGINT` (redéploiement), le serveur refuse les nouvelles parties, envoie « Le serveur redémarre, la partie va être interrompue. » à tous les joueurs, ferme Socket.IO et HTTP puis quitte (sortie forcée après 8 s).
- **Questions vérifiées** : le joueur choisit un trait et une valeur, le serveur répond à partir de `characters.json` (liste blanche de 8 traits). Impossible de mentir. Les questions libres existent aussi (marquées « non vérifiée », récapitulatif en fin de partie).
- **Dernière chance** : celui qui joue en premier trouve le personnage un tour plus tôt, ce qui lui donnait ~70 % des victoires (simulation bot contre bot). Quand le premier joueur devine juste, l’autre a donc **une dernière devinette** (plus de question) : s’il trouve aussi, c’est **égalité** (`winnerId: null`, raison `draw`, Elo à demi-point, ni victoire ni défaite) ; sinon la victoire du premier joueur est confirmée (chrono dépassé = pareil). Si le second joueur devine juste en premier, la partie s’arrête tout de suite. Voir `startLastChance` dans `engine/rules.ts`.
- **Chronos** : 90 s pour choisir, 60 s par tour, 45 s pour répondre ; le dépassement coûte une vie.
- **L'ordinateur est un joueur ordinaire** côté serveur : mêmes règles, mêmes chronos. Il ne connaît que la grille et les réponses à ses propres questions. Ses parties ne comptent ni dans les statistiques ni dans le classement.
- **Classement** : Elo (départ 1000, plancher 100), avec un **K provisoire** : K = 40 pendant les 10 premières parties classées d'un joueur, puis K = 20 ; chacun utilise son propre K, donc les deux variations d'une partie peuvent différer. Quand le perdant touche le plancher, le gagnant ne gagne que ce que le perdant a réellement perdu (pas de création de points). Uniquement pour les parties rapides entre deux réseaux (IPv4 ou /64 IPv6) et deux profils différents, première manche seulement (jamais les revanches), 2 parties classées par paire et par jour au maximum. Un **abandon** (quitter, ou ne pas revenir à temps) compte comme une défaite, mais n'est classé que si chaque joueur a fait au moins **2 coups** (question posée ou mauvaise devinette ; `MIN_MOVES_FOR_RANKED_FORFEIT`), pour qu'un second compte ne puisse pas « offrir » des victoires en quittant aussitôt. Pas de comptes : le navigateur garde un jeton de profil dont seule l'empreinte SHA-256 est stockée. La colonne `games.rating_change` garde la variation du gagnant.
- **Ordinateur difficile** : devine dès qu'il lui reste au moins autant de vies que de candidats (il ne peut plus perdre en devinant), et départage les questions également équilibrées par l'information attendue sur deux questions (entropie).
- **Statistiques facultatives** : sans `DATABASE_URL`, tout le reste fonctionne.

## Tests

`pnpm run test` lance Vitest dans chaque paquet.

- `api-server` : tests unitaires (adresse IP, Elo, force de l'ordinateur, données des personnages) et tests d'intégration avec de vrais sockets (partie complète, secrets, reconnexion, chronos, réactions, ordinateur, sécurité).
- Les tests du classement (`stats.test.ts`) ont besoin d'une base : ils sont **sautés** sans `DATABASE_URL`. La CI en fournit une.
- `anime-guess-who` : chaque valeur des fiches a une traduction française, chaque question est bien formée.
- La CI GitHub (`.github/workflows/ci.yml`) lance à chaque PR, en parallèle : lint, types + tests (avec Postgres), construction, et un audit des dépendances qui n'échoue que sur une faille critique. La version de Node vient de `.nvmrc`.

## Pièges

- **Ajouter un personnage** : renseigner tous les champs dans `characters.json` avec des valeurs en minuscules déjà connues, et vérifier la traduction dans `fr.ts` (le test web le rappelle). Deux personnages qui ne diffèrent sur aucun des 8 traits rendent la partie indevinable : le test de données refuse tout nouveau cas (seuls Edward et Alphonse Elric sont connus).
- **Les images** : les adresses déjà trouvées sont dans `artifacts/api-server/src/data/character-images.json` (id → URL), utilisées dès le démarrage ; AniList n'est interrogé (~25 s pour tout) que pour les personnages absents de ce fichier. Après un ajout de personnages, régénérer le fichier avec `pnpm --filter @workspace/scripts run fetch-character-images` (réseau requis vers `graphql.anilist.co`), relire le diff et le committer. Si une image est fausse ou manque, ajouter `"image": "https://…"` sur le personnage dans `characters.json` : elle passe avant le cache.
- **Schéma de base** : les tables sont créées automatiquement, mais un *changement* de schéma se fait à la main avec `db push`. `ensure-schema.ts` doit rester identique à ce que produit Drizzle (mêmes noms de contraintes).
- **Protocole temps réel** : les événements, leurs payloads, `REACTIONS`, `VERIFIABLE_ATTRIBUTES` et `BotLevel` vivent dans `lib/game-protocol`, importé par le client et le serveur (le serveur est typé `Server<ClientToServerEvents, ServerToClientEvents>`). Un changement de contrat se fait à un seul endroit ; le compilateur signale l’autre côté.
- **Service worker** (`artifacts/anime-guess-who/public/sw.js`, enregistré en production seulement) : il ne met en cache que les fichiers hachés de `assets/` (jamais `index.html`, `/api` ni les portraits). Ne pas le supprimer simplement du dépôt (l'hébergement répond `index.html` à sa place et l'ancien resterait actif) : pour le retirer, le remplacer par un fichier qui appelle `self.registration.unregister()`.
- `artifacts/mockup-sandbox` sert à la maquette Replit : il n'est pas déployé et est exclu des commandes `typecheck`, `build` et `test` de la racine.

## Pour aller plus loin

- [`README.md`](README.md) : présentation et démarrage rapide ; [`CHANGELOG.md`](CHANGELOG.md) : historique des changements (tenir à jour la section « Non publié »).
- Voir le skill `pnpm-workspace` pour la structure du dépôt et la configuration TypeScript.
