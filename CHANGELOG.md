# Journal des modifications

Toutes les évolutions notables d’AnimeWho. Le projet n’a pas encore de numéros de version : les entrées sont regroupées par date. Chaque date a une partie **Joueurs** (ce qui change en jeu) et une partie **Développement** (code, outils, infrastructure).

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## Non publié

### Joueurs

- _Rien pour l’instant._

### Développement

- ESLint (configuration plate, `typescript-eslint` + règles des hooks React) : `pnpm lint`, exécuté par la CI.
- Configuration Prettier (`.prettierrc`) et script `pnpm format:check` ; le code n’est pas encore reformaté, la vérification n’est donc pas dans la CI.
- CI : tâche `lint`, construction en parallèle des tests, audit des dépendances bloquant uniquement sur les failles critiques, version de Node lue dans `.nvmrc`, actions épinglées par empreinte de commit.
- `engines.node >= 22` à la racine, `.editorconfig`.
- Nettoyage : suppression du script `hello` et d’entrées obsolètes de `pnpm-workspace.yaml` (`lib/integrations/*`, `stripe-replit-sync`, réglages liés à Expo).
- `README.md` et ce journal.

## 2026-10-18

### Joueurs

- **Dernière chance** : celui qui joue en premier gagnait environ 70 % des parties entre bons joueurs. Désormais, quand le premier joueur trouve le personnage, l’adversaire a droit à une dernière devinette : s’il trouve aussi, c’est une **égalité** (demi-point d’Elo, ni victoire ni défaite) ; sinon la victoire est confirmée.
- **25 nouveaux personnages** (Jujutsu Kaisen, Spy x Family, Chainsaw Man, Evangelion…).
- Alphonse Elric est désormais une « âme dans une armure » : une question vérifiée permet enfin de distinguer les deux frères.
- Les cartes écartées rapidement ne déclenchent plus la limite anti-flood du serveur (synchronisation regroupée).
- Typographie française : espaces insécables avant « ! » et « ? », singulier/pluriel de « partie(s) » dans le classement.
- Interface plus légère (premier affichage mobile 3,6 s → 1,8 s) et plus accessible (contrastes, zoom autorisé, animations réduites respectées).
- Bandeau en cas de perte de connexion, écran clair quand la partie est ouverte dans un autre onglet, bouton « Réessayer » qui récupère la partie.
- Seul dans la file d’attente pendant 15 s : proposition de jouer contre l’ordinateur.

### Développement

- Paquet partagé `lib/game-protocol` : événements Socket.IO, payloads et constantes communs au client et au serveur (`Server<ClientToServerEvents, ServerToClientEvents>`).
- Protocole : raison de fin `draw`, `winnerId` nullable, événement `last_chance`.
- Suite de tests Vitest (intégration avec de vrais sockets, chronos accélérés via `GAME_TIME_SCALE`, sécurité, statistiques sur Postgres).
- Serveur durci : code de sortie non nul au démarrage raté, noms de joueurs nettoyés, pool Postgres avec délai et gestion d’erreur.
- CI GitHub Actions (types, tests avec Postgres, construction, audit), `replit.md` documenté.
- Skills Claude Code Game Studios ajoutés dans `.claude/skills`.

## 2026-10-11

### Joueurs

- **Questions vérifiées** : le serveur répond à partir des vraies caractéristiques du personnage, impossible de mentir. Les questions libres restent possibles (marquées « non vérifiée ») et un récapitulatif complet s’affiche en fin de partie.
- **Adversaire ordinateur** à trois niveaux (Facile, Normal, Difficile), qui joue sans tricher.
- **Statistiques et classement Elo** (sans compte), pour les parties rapides.
- **Réactions emoji** pendant la partie (8 emojis fixes, désactivables).
- Roster rééquilibré : 21 personnages féminins ajoutés, grilles mixtes.
- Portraits des personnages et grille de 24 cartes ; jeu entièrement **en français**.
- Mobile : votre personnage secret toujours visible, barre du bas adaptée aux petits écrans, devinette en deux temps, bouton « Abandonner ».
- Image d’aperçu pour le partage de liens.
- Corrections de caractéristiques (Scar, Inosuke, Senku, Rem, Ram).

### Développement

- Sécurité : adresse IP lue à droite de `X-Forwarded-For` (`TRUSTED_PROXY_HOPS`), contrôle d’origine des WebSocket, limites anti-abus, chronos qui ne repartent plus de zéro après une reconnexion.
- Anti-farming Elo : revanches jamais classées, 2 parties classées par paire et par jour.
- Base Postgres optionnelle (Drizzle), tables créées au démarrage.
- Mises à jour de dépendances (Express 5.3, Socket.IO 4.8.4, engine.io ≥ 6.6.10).
- Corrections serveur critiques : plantage, révélation de fin de partie, reconnexion, déploiement.

## 2026-07-28 → 2026-08-09

- Première version et première publication sur Replit.
