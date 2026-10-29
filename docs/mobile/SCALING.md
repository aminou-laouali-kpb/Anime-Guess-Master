# Montée en charge du serveur de jeu

> État au 29 octobre 2026. Ce document décrit le chemin, **il ne le réalise pas**. Repères de charge : BUSINESS_PLAN §8.2 (pic de connexions simultanées fin An 3 : ≈ 440 dans le scénario médian, ≈ 2 600 dans l'optimiste).

## 1. Aujourd'hui : un seul processus, tout en mémoire

- Salles, sessions, file d'appariement et chronos vivent dans des `Map` du module `game-engine.ts`, dans **un seul processus Node.js**. D'où le déploiement en VM réservée (un seul exemplaire) : deux exemplaires sépareraient les deux joueurs d'une même partie.
- Un redéploiement ou un plantage termine toutes les parties en cours (les joueurs gardent leurs statistiques ; la partie en cours est perdue).
- Plafonds, désormais **configurables sans nouvelle version** :

| Variable | Défaut | Ce qu'elle borne |
|---|---:|---|
| `MAX_SESSIONS` | 2 000 | Sessions simultanées. Une session tient au plus une salle : borne aussi les salles et la file. Au-delà : `connect_error` `server_full` (les joueurs déjà en partie peuvent toujours se reconnecter). |
| `MAX_CONNECTIONS_PER_IP` / `_MOBILE` | 20 / 100 | Voir `SERVER_CHANGES.md` §3. |
| `MAX_CONNECTIONS_PER_PROFILE` | 3 | Idem. |

Ordre de grandeur : un jeu au tour par tour envoie quelques messages par minute et par joueur ; un processus Node.js tient plusieurs milliers de WebSocket inactifs avec quelques centaines de Mo de mémoire. Le facteur limitant attendu est la **mémoire par salle** (plateau de 24 personnages, journal ≤ 60 questions) et le **CPU de la sérialisation** des instantanés, pas le réseau.

## 2. Relever `MAX_SESSIONS` : la marche à suivre

1. **Mesurer** avant de relever : test de charge avec de vrais sockets (k6 avec l'extension WebSocket, ou Artillery + `artillery-engine-socketio-v3`) qui rejoue le scénario des tests d'intégration (`src/__tests__/helpers.ts` : file → sélection → questions → devinette), à 1×, 2× et 4× le plafond visé. Les tests utilisent `GAME_TIME_SCALE` pour accélérer les chronos : **ne jamais** le régler en production.
2. Indicateurs : latence de l'événement `question_answered` (p95 < 150 ms), boucle d'événements (`perf_hooks.monitorEventLoopDelay`, p99 < 50 ms), mémoire RSS, CPU.
3. Régler `MAX_SESSIONS` à ≈ 70 % du point où un indicateur décroche, et le noter dans `replit.md`.
4. Surveiller en production : nombre de sessions et de salles (à exposer sur une route interne ou dans les journaux toutes les minutes), taux de `server_full`.

Tant que le pic reste sous ≈ 1 500 connexions et le CPU sous 50 %, **monter en gamme la machine** (vCPU plus rapide, plus de mémoire) est plus simple et moins risqué que de distribuer l'état.

## 3. Au-delà d'un processus : chemin cible (non réalisé)

### Étape A — Arrêt gracieux (à faire en premier, utile même à un seul processus)

- Sur `SIGTERM` : refuser les nouvelles parties (`join_lobby`, `create_room`, `play_vs_bot` → message « Mise à jour en cours »), laisser finir les parties en cours (max ≈ 10 min), puis fermer.
- Déployer aux heures creuses ; afficher l'annonce dans l'app via `GET /api/config` (champ à ajouter).

### Étape B — Plusieurs processus, parties « collées » à un processus

Principe : **une partie entière vit dans un seul processus** (pas de partage d'état de partie entre processus : le moteur reste tel quel). Ce qui doit être partagé :

| État | Où il va | Pourquoi |
|---|---|---|
| File d'appariement | Redis (liste + verrou, ou script Lua atomique « prendre un joueur compatible ») | Deux joueurs connectés à deux processus différents doivent pouvoir se trouver. |
| Index `code de salle → processus` et `jeton de session → processus` | Redis (clés avec TTL) | Pour router une reconnexion ou un `join_room` vers le bon processus. |
| Messages entre processus (prévenir le processus hôte qu'un joueur arrive) | **Adaptateur Redis de Socket.IO** (`@socket.io/redis-adapter`, ou `@socket.io/redis-streams-adapter` qui tolère mieux les coupures) | `io.to(room).emit` fonctionne alors quel que soit le processus du destinataire. |
| Limites par IP / par profil | Redis (compteurs avec TTL) | Sinon chaque processus applique sa propre limite (multipliée par le nombre de processus). |
| Statistiques, droits, portefeuille | PostgreSQL (déjà partagé) | — |

Routage :
- Le répartiteur de charge doit être **collant** (sticky) pour le transport Socket.IO : avec le seul transport `websocket` (ce que fait l'app), une connexion reste sur un processus ; en *long-polling* il faut l'affinité par cookie ou par `sid`.
- Pour qu'une partie rapide réunisse deux joueurs connectés à deux processus, deux options : (1) le processus qui forme la paire crée la salle et demande à l'autre joueur de **se reconnecter** vers le bon processus (URL ou en-tête de routage renvoyé dans `room_joined`) ; (2) plus simple : **un seul processus d'appariement** et des processus « de parties » derrière un routeur par code de salle. L'option (2) est recommandée pour un jeu à deux joueurs.
- Les chronos (`setTimeout`) restent locaux au processus de la partie : c'est pour cela qu'on ne déplace pas une partie en cours.

Coût estimé (BUSINESS_PLAN §8.2) : 3-4 semaines de développement, + un Redis géré (≈ 15-30 €/mois).

### Étape C — Reprise après panne

Sérialiser l'instantané de chaque salle (`snapshotFor` contient déjà tout le nécessaire, plus les personnages secrets) dans Redis à chaque coup, avec TTL ; au redémarrage, recharger les salles et leurs chronos (temps restant). Permet des redéploiements sans couper les parties. Plus coûteux : à ne faire que si l'étape A ne suffit pas.

### Étape D — Plusieurs régions

Europe + Amérique du Nord si la version anglaise décolle : appariement par région, classement global en base.

## 4. Seuils de décision

| Signal | Action |
|---|---|
| Pic > 50 % de `MAX_SESSIONS` deux soirs de suite | Test de charge, puis relever `MAX_SESSIONS` ou monter en gamme |
| CPU > 50 % au pic, ou p95 `question_answered` > 150 ms | Monter en gamme ; si déjà au maximum raisonnable → étape B |
| Redéploiements fréquents qui coupent des parties | Étape A |
| Pic > ≈ 1 500 connexions | Préparer l'étape B |
