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
| `DATABASE_URL` | Connexion Postgres. Active les statistiques, le classement et la monétisation (portefeuille d'Éclats, droits, récompenses publicitaires) ; les tables sont créées au démarrage. Sans elle, le jeu fonctionne et ces fonctions sont masquées (`503 monetisation_disabled`). |
| `SITE_URL` | Adresse publique du site (ex. `https://anime-guess-master.replit.app`). Sert, à la **construction**, à rendre absolue l'URL de l'image d'aperçu et à ajouter l'adresse canonique. |
| `ALLOWED_ORIGINS` | Origines supplémentaires autorisées (CORS et WebSocket), séparées par des virgules. Par défaut : même site uniquement. |
| `TRUSTED_PROXY_HOPS` | Nombre de proxys devant l'API qui complètent `X-Forwarded-For` (défaut 1 = proxy de Replit). L'adresse du joueur est lue **à droite** de cet en-tête, jamais à gauche (falsifiable). Au démarrage, le serveur logge `Client IP taken from X-Forwarded-For` avec le nombre d'entrées, pour vérifier ce réglage. |
| `GAME_TIME_SCALE` | **Tests uniquement** : accélère tous les chronos (0.05 = 20 fois plus vite). Toujours 1 en production. |
| `MAX_SESSIONS` | Sessions simultanées (défaut 2000). Au-delà, `server_full`. Voir `docs/mobile/SCALING.md` avant de le relever. |
| `MAX_CONNECTIONS_PER_IP` / `MAX_CONNECTIONS_PER_IP_MOBILE` / `MAX_CONNECTIONS_PER_PROFILE` | Connexions temps réel : 20 par IP (navigateurs), 100 par IP pour l'app mobile (IP partagées des opérateurs, CGNAT), 3 par profil pour l'app. |
| `HTTP_RATE_LIMIT_PER_IP` / `HTTP_RATE_LIMIT_PER_IP_AUTHENTICATED` / `HTTP_RATE_LIMIT_PER_PROFILE` | Requêtes HTTP par minute : 120 par IP ; 600 par IP et 60 par profil pour les requêtes avec jeton de profil (app). |
| `SHARED_NETWORK_MIN_RANKED_GAMES` / `SHARED_NETWORK_RANKED_PER_DAY` | Classement entre deux apps mobiles sur la même IP : profils avec au moins 5 parties classées, 3 parties « même réseau » par jour au plus. |
| `MIN_MOBILE_VERSION` | Version minimale de l'app mobile (ex. `1.2.0`) ; plus ancienne → connexion refusée avec `app_outdated`. Sans valeur : toutes acceptées. |
| `REVENUECAT_WEBHOOK_AUTH` | Secret de l'en-tête *Authorization* du webhook RevenueCat (`POST /api/webhooks/revenuecat`). Sans lui, le webhook répond 404. |
| `REVENUECAT_API_KEY` | Clé secrète API RevenueCat, pour `POST /api/me/sync-purchases` (facultatif). |
| `REMOTE_CONFIG_JSON` | Surcharge des plafonds publicitaires et de l'économie servis par `GET /api/config` et appliqués par le serveur (ex. `{"rw_free_shards_daily_cap":2}`). |
| `ADMOB_SSV_KEYS_URL`, `REVENUECAT_API_URL` | **Tests uniquement** (clés publiques AdMob et API RevenueCat simulées). |

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
| Client web ou app mobile (handshake, version minimale) | `artifacts/api-server/src/lib/client-info.ts` |
| Limites configurables (sessions, connexions, HTTP, classement « même réseau ») | `artifacts/api-server/src/lib/limits.ts` |
| Filtre de mots, signalement, blocage | `artifacts/api-server/src/lib/moderation.ts`, `lib/reports.ts`, événements dans `game-engine.ts` |
| Monétisation : config distante, catalogue, portefeuille, webhook RevenueCat, SSV AdMob | `artifacts/api-server/src/lib/monetisation/` et routes `src/routes/me.ts`, `shop.ts`, `webhooks.ts` |
| Contrat pour l'app mobile (handshake, endpoints, variables) | `docs/mobile/SERVER_CHANGES.md` |
| Montée en charge | `docs/mobile/SCALING.md` |
| Préparation App Store / Google Play (fiches, confidentialité, CGU, checklist) | `docs/store/` |
| App mobile Flutter | `mobile/` (CI : `.github/workflows/mobile.yml`) |
| Portraits (AniList) | `artifacts/api-server/src/lib/character-images.ts` |
| Personnages (165) | `artifacts/api-server/src/data/characters.json` |
| Création du serveur (réutilisée par les tests) | `artifacts/api-server/src/server.ts` |
| État du jeu côté navigateur | `artifacts/anime-guess-who/src/context/GameContext.tsx` |
| Protocole temps réel (types des événements) | `artifacts/anime-guess-who/src/lib/socket.ts` |
| Écrans | `artifacts/anime-guess-who/src/pages/` |
| Traductions des caractéristiques | `artifacts/anime-guess-who/src/lib/fr.ts` |
| Schéma de base | `lib/db/src/schema/` et `lib/db/src/ensure-schema.ts` |
| Contrat HTTP | `lib/api-spec/openapi.yaml` |

## Décisions d'architecture

- **Tout l'état des parties est en mémoire**, dans un seul processus. D'où le déploiement en **Reserved VM** (`.replit`) : l'autoscale pourrait séparer les deux joueurs ou arrêter le serveur en pleine partie. Un redéploiement met fin aux parties en cours.
- **Le serveur est l'arbitre.** Le personnage secret n'est jamais envoyé avant la fin de la partie ; chaque joueur reçoit son propre message de fin avec le personnage de *l'autre*.
- **Identité des joueurs** : un jeton de session secret (handshake Socket.IO), distinct de l'identifiant public affiché aux autres. Un rechargement ou une coupure rend sa place au joueur (45 s de grâce avant l'abandon) ; le chrono se met en pause pendant l'absence et reprend avec le temps restant.
- **Questions vérifiées** : le joueur choisit un trait et une valeur, le serveur répond à partir de `characters.json` (liste blanche de 8 traits). Impossible de mentir. Les questions libres existent aussi (marquées « non vérifiée », récapitulatif en fin de partie).
- **Chronos** : 90 s pour choisir, 60 s par tour, 45 s pour répondre ; le dépassement coûte une vie.
- **L'ordinateur est un joueur ordinaire** côté serveur : mêmes règles, mêmes chronos. Il ne connaît que la grille et les réponses à ses propres questions. Ses parties ne comptent ni dans les statistiques ni dans le classement.
- **Classement** : Elo (départ 1000, K = 32), uniquement pour les parties rapides entre deux adresses et deux profils différents, première manche seulement (jamais les revanches), 2 parties classées par paire et par jour au maximum. Exception pour les IP partagées des opérateurs mobiles : deux **apps** sur la même IP sont classées si les deux profils ont déjà 5 parties classées, 3 fois par jour au plus ; jamais la même installation des deux côtés. Pas de comptes : le client garde un jeton de profil dont seule l'empreinte SHA-256 est stockée.
- **Web et app mobile** : l'app est reconnue par `auth.client = "mobile"` **et** l'absence d'en-tête `Origin` (un navigateur en envoie toujours un). Le contrôle d'origine reste inchangé : un autre site ne peut toujours pas ouvrir de connexion de jeu.
- **Monétisation (squelette)** : le serveur est la seule source de vérité (droits, Éclats, inventaire). Achats validés par RevenueCat (webhook idempotent), vidéos récompensées vérifiées par la signature AdMob (SSV). Rien n'est actif sans `DATABASE_URL` et les secrets.
- **Statistiques facultatives** : sans `DATABASE_URL`, tout le reste fonctionne.

## Tests

`pnpm run test` lance Vitest dans chaque paquet.

- `api-server` : tests unitaires (adresse IP, Elo, force de l'ordinateur, données des personnages, versions d'app, filtre de mots, signature SSV AdMob avec des clés générées pour le test) et tests d'intégration avec de vrais sockets (partie complète, secrets, reconnexion, chronos, réactions, ordinateur, sécurité, clients mobiles, limites, modération, `MAX_SESSIONS`).
- Les tests du classement et de la monétisation (`stats.test.ts`, `monetisation.test.ts`) ont besoin d'une base : ils sont **sautés** sans `DATABASE_URL`. La CI en fournit une. En local : `DATABASE_URL=postgresql://… pnpm run test`.
- `mobile/` (Flutter) : `flutter analyze` et `flutter test` dans `.github/workflows/mobile.yml`, seulement quand `mobile/**` change.
- `anime-guess-who` : chaque valeur des fiches a une traduction française, chaque question est bien formée.
- La CI GitHub (`.github/workflows/ci.yml`) lance types, tests et construction à chaque PR, plus un audit des dépendances (informatif).

## Pièges

- **Ajouter un personnage** : renseigner tous les champs dans `characters.json` avec des valeurs en minuscules déjà connues, et vérifier la traduction dans `fr.ts` (le test web le rappelle). Deux personnages qui ne diffèrent sur aucun des 8 traits rendent la partie indevinable : le test de données refuse tout nouveau cas (seuls Edward et Alphonse Elric sont connus).
- **Les images** viennent d'AniList à chaque démarrage. Si l'une est fausse ou manque, ajouter `"image": "https://…"` sur le personnage.
- **Schéma de base** : les tables sont créées automatiquement, mais un *changement* de schéma se fait à la main avec `db push`. `ensure-schema.ts` doit rester identique à ce que produit Drizzle (mêmes noms de contraintes) ; une colonne ajoutée à une table existante s'y écrit en `ALTER TABLE … ADD COLUMN IF NOT EXISTS`. Vérification : `drizzle-kit push` sur une base créée par `ensureSchema` doit répondre « No changes detected ».
- **Protocole mobile** : l'app ne doit **pas** envoyer d'en-tête `Origin`. Les événements de modération (`report_player`, `block_player`, `set_verified_only`) n'existent que côté serveur et app mobile pour l'instant.
- **Protocole temps réel** : les types des événements sont écrits à la main dans `socket.ts` (client) et dans `game-engine.ts` (serveur). Les modifier ensemble.
- `artifacts/mockup-sandbox` sert à la maquette Replit : il n'est pas déployé et est exclu des commandes `typecheck`, `build` et `test` de la racine.

## Pour aller plus loin

- Voir le skill `pnpm-workspace` pour la structure du dépôt et la configuration TypeScript.
