# AnimeWho — Qui est-ce ? version anime

[![CI](https://github.com/aminou-laouali-kpb/anime-guess-master/actions/workflows/ci.yml/badge.svg)](https://github.com/aminou-laouali-kpb/anime-guess-master/actions/workflows/ci.yml)

Jeu en ligne à deux joueurs, en français, inspiré de *Qui est-ce ?*. Chacun choisit en secret un personnage d’anime parmi 24 tirés au hasard, puis on se pose des questions à tour de rôle pour deviner celui de l’adversaire. Le premier qui trouve gagne.

## Fonctionnalités

- **Parties rapides** (appariement automatique), **parties privées** (code à 6 caractères) et **parties contre l’ordinateur** (Facile, Normal, Difficile).
- **Questions vérifiées** : on choisit un trait (cheveux, yeux, genre, âge, espèce, camp, rôle, anime) et le serveur répond à partir des vraies données, impossible de mentir. Questions libres possibles, avec récapitulatif en fin de partie.
- **Dernière chance** : quand le premier joueur trouve, l’autre a une dernière devinette ; s’il trouve aussi, c’est une égalité.
- **Statistiques et classement Elo**, sans compte (base Postgres optionnelle).
- **Réactions emoji**, reconnexion transparente (45 s de grâce), chronos par tour.
- Une centaine de personnages (Naruto, One Piece, Jujutsu Kaisen, Spy x Family, Evangelion…), grilles équilibrées en genre.

## Pile technique

pnpm workspaces · Node.js 24 · TypeScript 5.9 · Express 5 + Socket.IO 4 · React 19 + Vite 7 + Tailwind 4 · PostgreSQL + Drizzle (optionnel) · Vitest · ESLint.

## Démarrage rapide

Prérequis : Node.js 24 (voir `.nvmrc`, ≥ 22 accepté) et pnpm 10.

```sh
pnpm install
PORT=8080 pnpm --filter @workspace/api-server run dev
PORT=20021 BASE_PATH=/ pnpm --filter @workspace/anime-guess-who run dev
```

- `PORT` est obligatoire pour les deux serveurs, `BASE_PATH` pour l’interface.
- `DATABASE_URL` (optionnelle, sur le serveur API) active les statistiques et le classement ; les tables sont créées au démarrage. Sans elle, le jeu fonctionne normalement.
- L’interface appelle l’API sur la même origine (`/api`, `/api/socket.io`). Sur Replit, le routeur s’en charge ; ailleurs, il faut un proxy qui envoie `/api` vers le port 8080.

Les autres variables (`SITE_URL`, `ALLOWED_ORIGINS`, `TRUSTED_PROXY_HOPS`, `GAME_TIME_SCALE`) sont décrites dans [`replit.md`](replit.md).

## Vérifications

```sh
pnpm typecheck      # types de tout le dépôt
pnpm lint           # ESLint (0 erreur exigée, avertissements tolérés)
pnpm test           # tous les tests Vitest
pnpm format:check   # Prettier (informatif : le code n’est pas encore formaté)
```

Les tests des statistiques et du classement (`artifacts/api-server/src/__tests__/stats.test.ts`) ont besoin de Postgres et sont **sautés** sans `DATABASE_URL`. Pour les lancer en local :

```sh
docker run -d --name animewho-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=animewho_test -p 5432:5432 postgres:16
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/animewho_test pnpm --filter @workspace/api-server test
```

La CI GitHub (`.github/workflows/ci.yml`) lance lint, types + tests (avec Postgres), construction et audit des dépendances à chaque PR.

## Organisation du dépôt

| Dossier | Rôle |
|---|---|
| `artifacts/api-server` | Serveur Express + Socket.IO : moteur de jeu, ordinateur, statistiques, données des personnages |
| `artifacts/anime-guess-who` | Interface React (écrans, état du jeu, traductions) |
| `artifacts/mockup-sandbox` | Maquettes Replit, non déployé |
| `lib/game-protocol` | Contrat temps réel partagé client/serveur (événements, payloads, constantes) |
| `lib/db` | Schéma Drizzle et création des tables |
| `lib/api-spec` | Contrat HTTP OpenAPI et configuration Orval |
| `lib/api-zod`, `lib/api-client-react` | Schémas Zod et client React Query générés depuis OpenAPI |
| `scripts` | Scripts de maintenance (`post-merge.sh` pour Replit) |

Le détail (architecture, décisions, pièges) est dans [`replit.md`](replit.md) ; l’historique dans [`CHANGELOG.md`](CHANGELOG.md).
