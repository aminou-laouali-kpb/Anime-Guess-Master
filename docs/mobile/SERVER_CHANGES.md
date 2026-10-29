# Serveur AnimeWho — contrat pour l'app mobile

> Contrat entre le serveur (`artifacts/api-server`) et l'app Flutter (`mobile/`). Toutes les adresses sont relatives à l'URL de base du serveur (ex. `https://api.animewho.app`), sous le préfixe `/api`. Le contrat HTTP complet et typé est dans [`lib/api-spec/openapi.yaml`](../../lib/api-spec/openapi.yaml) ; le protocole temps réel est décrit ici (il n'est pas dans OpenAPI).
>
> **Rétrocompatibilité** : le site web continue de fonctionner sans aucun changement. Sans `DATABASE_URL` ni secrets, tout ce qui touche à la monétisation répond `503 monetisation_disabled` et le jeu fonctionne comme avant.

---

## 1. Connexion temps réel (Socket.IO)

| Élément | Valeur |
|---|---|
| Chemin | `/api/socket.io` (Socket.IO v4, transport `websocket` recommandé) |
| En-tête `Origin` | **Ne pas en envoyer.** C'est ce qui distingue l'app d'un navigateur. Un `Origin` étranger est refusé ; un `Origin` du site est traité comme le web (limites web, pas de contrôle de version). |
| Taille max d'un message | 16 Ko |
| Débit | rafale de 20 événements, puis 5/s ; au-delà, avertissement puis déconnexion |

### 1.1 Champs du handshake (`auth`)

```dart
IO.io(baseUrl, IO.OptionBuilder()
  .setPath('/api/socket.io')
  .setTransports(['websocket'])
  .setAuth({
    'client': 'mobile',          // obligatoire pour être reconnu comme app
    'appVersion': '1.0.0',       // obligatoire : x.y.z (suffixe -beta / +build toléré)
    'platform': 'ios',           // 'ios' | 'android' (facultatif)
    'device': installId,         // facultatif : identifiant aléatoire d'installation, 8-128 car. [A-Za-z0-9_-]
    'profile': profileToken,     // jeton de profil secret (32 car.), voir §1.3
    'token': sessionToken,       // jeton de session pour reprendre une partie (reconnexion)
    'blocked': blockKeys,        // liste des joueurs bloqués (≤ 200 clés), voir §1.4
    'verifiedOnly': true,        // refuse les questions libres des adversaires (défaut conseillé < 16 ans)
  })
  .build());
```

| Champ | Type | Règle serveur |
|---|---|---|
| `client` | `"mobile"` | Avec **absence** d'`Origin`, active le profil « mobile » (limites CGNAT, contrôle de version). Sinon : client web. |
| `appVersion` | string `x.y.z` | Si `MIN_MOBILE_VERSION` est défini et que la version est plus ancienne **ou illisible** → connexion refusée (`app_outdated`). |
| `platform` | `"ios"` \| `"android"` | Informatif. |
| `device` | string | Haché (SHA-256 tronqué) et gardé **en mémoire seulement** ; jamais en base. Sert à ne jamais classer une partie où la même installation est des deux côtés. Ne pas utiliser l'IDFA / l'identifiant publicitaire : un UUID aléatoire généré à l'installation suffit. |
| `profile` | string 32 car. `[A-Za-z0-9_-]` | Jeton secret. Absent ou invalide → le serveur en crée un et l'envoie dans l'événement `profile`. |
| `token` | string 32 car. | Jeton de session reçu dans `session`. Permet de retrouver sa place pendant les 45 s de grâce après une coupure (passage en arrière-plan, réseau). |
| `blocked` | string[] | Clés reçues dans `player_blocked`. |
| `verifiedOnly` | boolean | Modifiable ensuite avec l'événement `set_verified_only`. |

### 1.2 Erreurs de connexion (`connect_error`)

| `err.message` | `err.data` | Que faire |
|---|---|---|
| `app_outdated` | `{ code: "app_outdated", minVersion: "1.2.0", message: "Cette version d’AnimeWho n’est plus prise en charge. Mets l’app à jour pour continuer à jouer." }` | Afficher `message` et un bouton vers la fiche du store. Ne pas réessayer. |
| `too_many_connections` | — | Trop de connexions depuis cette adresse ou ce profil. Réessayer avec un délai (backoff). |
| `server_full` | — | Serveur au maximum (`MAX_SESSIONS`). Réessayer plus tard. |

L'app peut vérifier la version **avant** de se connecter avec `GET /api/config` (`minMobileVersion`).

### 1.3 Événements émis par le serveur à la connexion

| Événement | Charge utile |
|---|---|
| `session` | `{ token, playerId, client: "mobile" \| "web" }` — `client` confirme que l'app a bien été reconnue. Garder `token` pour la reconnexion. |
| `profile` | `{ token }` — jeton de profil à stocker dans le trousseau sécurisé (`flutter_secure_storage`). |
| `state_sync` | `{ room: <instantané> \| null }` — état complet de la partie en cours après une reconnexion. |

Le reste du protocole de jeu (`join_lobby`, `create_room`, `join_room`, `play_vs_bot`, `select_character`, `ask_question`, `answer_question`, `make_guess`, `react`, `request_rematch`, `accept_rematch`, `leave_room`, `get_my_stats`, `sync_eliminations` et les événements `room_joined`, `game_start`, `question_asked`, `question_answered`, `game_over`, `rating_update`, `timer`, `opponent_*`, `error`…) est **inchangé** : il est typé dans `artifacts/anime-guess-who/src/lib/socket.ts` (client web) et `artifacts/api-server/src/lib/game-engine.ts` (serveur). Le client Dart doit reprendre ces types.

### 1.4 Nouveaux événements de modération (exigés par Apple 1.2)

| Sens | Événement | Charge utile | Effet |
|---|---|---|---|
| app → serveur | `report_player` | `{ reason: "insult" \| "sexual" \| "hate" \| "spam" \| "cheating" \| "other" }` | Signale l'adversaire de la partie en cours **ou celui qui vient de partir** (tant que le joueur est encore dans la salle, écran de fin compris). Le serveur journalise les questions libres de cet adversaire et les enregistre dans `reports` (si base). 5 signalements max par session. |
| serveur → app | `player_reported` | `{ ok: boolean }` | `ok: false` si la limite est atteinte. |
| app → serveur | `block_player` | — | Bloque l'adversaire courant (ou celui qui vient de partir) : plus jamais apparié en partie rapide, ne peut pas rejoindre ses parties privées (réponse neutre « Partie introuvable »), pas de revanche. |
| serveur → app | `player_blocked` | `{ blockKey, name }` | **L'app doit stocker `blockKey`** (avec `name` pour l'écran « Joueurs bloqués ») et la renvoyer dans `auth.blocked` à chaque connexion : le serveur ne garde la liste que le temps de la session. |
| app → serveur | `set_verified_only` | `{ enabled: boolean }` | Active/désactive le refus des questions libres. L'adversaire qui en envoie reçoit `error` « Ton adversaire n’accepte que les questions vérifiées. » |

Filtre de mots : toute question libre contenant un terme de la liste (`artifacts/api-server/src/lib/moderation.ts`, FR + EN, accents/leet/espacement normalisés) est refusée avec `error` « Cette question ne peut pas être envoyée. Reformule-la. » — elle n'est jamais transmise. Le même filtre remplace un pseudonyme répréhensible par « Joueur ». S'applique aussi au web.

`blockKey` est dérivée du jeton de profil par hachage à sens unique : elle ne révèle rien du jeton. Un joueur qui change de profil (réinstallation) n'est plus bloqué : limite connue, compensée par le signalement.

---

## 2. API HTTP

Authentification des routes « par profil » : `Authorization: Bearer <jeton de profil>` (le même que `auth.profile`). Pas de cookie, donc pas de CSRF possible. Corps en JSON (`Content-Type: application/json`, 10 Ko max).

### 2.1 Publiques (sans base de données)

| Méthode et chemin | Réponse | Usage |
|---|---|---|
| `GET /api/config` | `{ minMobileVersion: string\|null, features: { stats, wallet, purchases, purchaseSync, adRewards }, remoteConfig: { int_daily_cap: 6, rw_total_daily_cap: 10, … } }` | Au lancement. `features.*` à `false` → masquer la boutique / les vidéos récompensées. `remoteConfig` reprend les clés et valeurs par défaut de `MONETISATION_SPEC.md` §8 ; Firebase Remote Config peut les surcharger pour l'**affichage**, mais les plafonds d'Éclats et de vidéos sont **appliqués par le serveur** avec ses propres valeurs. Cache : 60 s. |
| `GET /api/shop/catalog` | `{ currency: "shards", items: [{ id, slot, name: { fr, en }, priceShards, visibleToOpponent, featured }], products: [{ productId, kind, entitlement, shards, items }] }` | Boutique. `priceShards: null` = objet non vendu en Éclats (exclusif d'un pack). Cache : 5 min. |
| `GET /api/leaderboard`, `GET /api/characters`, `GET /api/healthz` | inchangés | — |

### 2.2 Par profil (base de données requise, sinon `503 monetisation_disabled`)

| Méthode et chemin | Corps | Réponses |
|---|---|---|
| `POST /api/me` | `{ name? }` | **À appeler au démarrage.** Crée la ligne joueur si besoin. Sans en-tête `Authorization` : crée aussi un jeton et le renvoie (`profileToken`, à stocker). `201` créé / `200` existant : `{ playerId, name, shardsBalance, profileToken: string\|null }`. **`playerId` est l'`appUserID` RevenueCat (`Purchases.logIn(playerId)`) et le `userId` de la vérification SSV AdMob.** |
| `GET /api/me/entitlements` | — | `{ playerId, name, shardsBalance, noAds, entitlements: [{ entitlement, productId, expiresAt }], inventory: [itemId], equipped: { card_back?, frame?, reaction_pack?, victory_fx?, board? } }`. Au démarrage, après un achat, après « Restaurer ». `noAds` = `no_ads` ou `plus` actif → aucune bannière ni interstitiel. Crédite aussi les vidéos vérifiées non réclamées. |
| `POST /api/me/sync-purchases` | — | Relit les achats chez RevenueCat (si `REVENUECAT_API_KEY`), puis renvoie `{ entitlements, purchases, account }`. Secours quand le webhook tarde (« Achat en cours de validation »). `503 sync_not_configured` sinon. |
| `POST /api/me/ad-offers` | `{ adUnit: "rw_free_shards", rewardKey: "free_shards" \| "daily_chest" }` | **Avant** d'afficher une vidéo récompensée. `201 { nonce, rewardKey, amount, expiresAt, ssv: { userId, customData } }` → passer `ssv` à `ServerSideVerificationOptions(userId:, customData:)` de `google_mobile_ads`. `429 daily_cap_reached` → griser le bouton. `400 unknown_reward`. L'offre vaut 10 min. |
| `POST /api/me/ad-rewards/claim` | `{ nonce }` | Après `onUserEarnedReward`. `200 { status: "credited", amount, shardsBalance }` ; `202 { status: "pending" }` → AdMob n'a pas encore appelé le serveur : réessayer toutes les 2-3 s pendant 30 s, sinon la récompense sera créditée au prochain `GET /me/entitlements` (jamais perdue) ; `200 already_claimed` (idempotent) ; `404 unknown_offer`. |
| `POST /api/shop/buy` | `{ itemId }` | `200 { ok: true, shardsBalance }` ; `409 insufficient_shards` \| `already_owned` ; `400 unknown_item` \| `not_for_sale`. Le solde peut être négatif après un remboursement : la boutique refuse alors tout achat. |
| `POST /api/me/equip` | `{ slot, itemId \| null }` | Renvoie le compte. `409 not_owned`, `400 wrong_slot`. |
| `DELETE /api/me` | — | Suppression du compte (Apple 5.1.1(v)). Efface solde, droits, inventaire, récompenses ; anonymise le joueur (nom « Joueur supprimé », retiré du classement). L'app doit ensuite effacer son jeton et appeler `Purchases.logOut()`. Prévenir avant que les achats ne sont pas remboursés. |

Erreurs communes : `401 missing_profile_token`, `404 unknown_profile` (→ appeler `POST /api/me`), `503 unavailable` (base injoignable : réessayer), `429` avec `Retry-After`.

### 2.3 Appelées par les prestataires (pas par l'app)

| Chemin | Appelant | Configuration |
|---|---|---|
| `POST /api/webhooks/revenuecat` | RevenueCat | Tableau de bord RevenueCat → Integrations → Webhooks : URL `https://<serveur>/api/webhooks/revenuecat`, en-tête *Authorization* = valeur de `REVENUECAT_WEBHOOK_AUTH`. Idempotent par identifiant d'événement **et** par transaction store (un même achat n'est jamais crédité deux fois). Événements traités : `INITIAL_PURCHASE`, `RENEWAL`, `NON_RENEWING_PURCHASE` (droits, Éclats, objets), `CANCELLATION` (remboursement si `cancel_reason = CUSTOMER_SUPPORT` : retrait du droit, reprise des Éclats ; sinon rien jusqu'à l'expiration), `EXPIRATION`, `TRANSFER` (les droits suivent, pas les Éclats), `UNCANCELLATION`, `SUBSCRIPTION_EXTENDED`, `TEMPORARY_ENTITLEMENT_GRANT`, `REFUND_REVERSED` ; les autres sont notés. Les achats en environnement *Sandbox* sont acceptés (la revue Apple achète en sandbox). |
| `GET /api/admob/ssv` | AdMob | Console AdMob → bloc d'annonces récompensées → *Server-side verification* : URL `https://<serveur>/api/admob/ssv`. Signature ECDSA vérifiée avec les clés publiques de Google (`ADMOB_SSV_KEYS_URL`, cache 24 h, nouvelle lecture si `key_id` inconnu, au plus 1/min). Vérifie aussi que `custom_data` est un nonce émis pour ce `user_id`. |

### 2.4 Identifiants produits (stores et RevenueCat)

`animewho.noads` (droit `no_ads`), `animewho.starter_pack` (500 Éclats + `card_back_dawn` + `frame_rookie`), `animewho.shards_100` / `_550` / `_1200`, `animewho.plus.monthly` / `.yearly` (droit `plus`), `animewho.theme.<slug>` (`theme_<slug>`), `animewho.pass.sNN` (`pass_sNN`). La correspondance est dans `artifacts/api-server/src/lib/monetisation/catalog.ts` : **le serveur décide** de ce qu'un produit donne, pas l'app. Dans RevenueCat, créer les *entitlements* `no_ads` et `plus` avec ces noms.

---

## 3. Limites et adresses IP partagées (CGNAT)

| Limite | Web | App mobile | Variable |
|---|---:|---:|---|
| Connexions temps réel par IP | 20 | 100 | `MAX_CONNECTIONS_PER_IP` / `MAX_CONNECTIONS_PER_IP_MOBILE` |
| Connexions temps réel par profil | — | 3 | `MAX_CONNECTIONS_PER_PROFILE` |
| Requêtes HTTP par IP et par minute | 120 | 600 (avec jeton) | `HTTP_RATE_LIMIT_PER_IP` / `HTTP_RATE_LIMIT_PER_IP_AUTHENTICATED` |
| Requêtes HTTP par profil et par minute | — | 60 | `HTTP_RATE_LIMIT_PER_PROFILE` |
| Sessions simultanées (tout le serveur) | 2 000 | (partagé) | `MAX_SESSIONS` |

**Classement Elo** (parties rapides, première manche, 2 parties classées par paire et par jour — inchangé) :

| Situation | Classée ? |
|---|---|
| Deux adresses IP différentes, deux profils différents | Oui (comme avant) |
| Même profil des deux côtés | Jamais |
| Même installation (`device`) des deux côtés | Jamais |
| Même IP, au moins un navigateur | Jamais (comme avant) |
| Même IP, deux apps mobiles (CGNAT probable) | Oui **seulement si** les deux profils ont déjà ≥ 5 parties classées (`SHARED_NETWORK_MIN_RANKED_GAMES`) **et** chacun a eu < 3 parties classées « même réseau » sur 24 h (`SHARED_NETWORK_RANKED_PER_DAY`). Ces parties sont marquées `games.shared_network`. |

**Compromis assumé.** Le type « mobile » est **déclaratif** : un script hors navigateur peut se dire « mobile », envoyer des jetons de profil et d'installation inventés. Ce qu'il gagne est borné : 100 connexions par IP au lieu de 20 (il faut toujours 20 IP pour saturer 2 000 sessions), et pour gonfler un Elo sur une seule IP il lui faut des profils « établis » (5 parties classées gagnées ou perdues contre des adresses **différentes**), puis il est limité à 3 parties par profil et par jour, toujours 2 par paire. Avant ce changement, tous les joueurs mobiles derrière une même IP d'opérateur étaient privés de classement et plafonnés à 20 à eux tous. Une attestation d'app (App Attest / Play Integrity) rendrait le type « mobile » vérifiable : voir « Prochaines étapes ».

### Ce que le contrôle d'origine protège (et pourquoi le changement ne le rouvre pas)

Les en-têtes CORS ne s'appliquent pas aux WebSocket : sans contrôle, **n'importe quel site** pourrait ouvrir des connexions de jeu depuis le navigateur de ses visiteurs. Il n'y a pas de cookie à voler ici, mais ces visiteurs apporteraient des **adresses IP résidentielles réelles et variées** : de quoi contourner la limite par IP et la règle Elo « deux adresses différentes » (ferme de comptes distribuée). Le contrôle (`origin.ts`) refuse tout `Origin` qui n'est pas celui du site (ou `ALLOWED_ORIGINS`).

Le changement ne rouvre pas ce trou parce que :
1. Un navigateur envoie **toujours** `Origin` lors d'une ouverture de WebSocket et un script de page ne peut ni le retirer ni le modifier. Un site tiers est donc refusé **avant** même la lecture du handshake (le contrôle porte sur la requête HTTP d'upgrade ; `auth.client` est lu après, au niveau Socket.IO).
2. Le profil « mobile » exige **à la fois** `client: "mobile"` **et** l'absence d'`Origin`. Une page de notre propre site qui se dirait « mobile » reste traitée comme un navigateur.
3. Les clients sans `Origin` étaient **déjà** acceptés (ils peuvent de toute façon forger cet en-tête) ; le seul changement pour eux est la limite par IP plus haute, compensée par la limite par profil et par les règles Elo ci-dessus.

Côté HTTP, les routes par profil utilisent un en-tête `Authorization` (jamais un cookie) : un site tiers ne peut pas le faire envoyer par le navigateur d'un joueur ni lire la réponse (CORS fermé par défaut).

---

## 4. Variables d'environnement (serveur)

| Variable | Défaut | Rôle |
|---|---|---|
| `MIN_MOBILE_VERSION` | (aucune) | Version minimale de l'app (ex. `1.2.0`). Valeur mal formée = ignorée (jamais de blocage général par erreur). |
| `MAX_SESSIONS` | 2000 | Sessions simultanées (voir `SCALING.md`). |
| `MAX_CONNECTIONS_PER_IP` / `MAX_CONNECTIONS_PER_IP_MOBILE` / `MAX_CONNECTIONS_PER_PROFILE` | 20 / 100 / 3 | Voir §3. |
| `HTTP_RATE_LIMIT_PER_IP` / `HTTP_RATE_LIMIT_PER_IP_AUTHENTICATED` / `HTTP_RATE_LIMIT_PER_PROFILE` | 120 / 600 / 60 | Requêtes par minute. |
| `SHARED_NETWORK_MIN_RANKED_GAMES` / `SHARED_NETWORK_RANKED_PER_DAY` | 5 / 3 | Règle Elo « même réseau mobile ». |
| `DATABASE_URL` | (aucune) | Active statistiques, classement, portefeuille, droits, récompenses. |
| `REVENUECAT_WEBHOOK_AUTH` | (aucune) | Secret de l'en-tête *Authorization* du webhook. Sans elle : webhook désactivé (404). |
| `REVENUECAT_API_KEY` | (aucune) | Clé **secrète** API v1 RevenueCat, pour `POST /me/sync-purchases`. Jamais dans l'app. |
| `REVENUECAT_API_URL` | `https://api.revenuecat.com` | Tests uniquement. |
| `ADMOB_SSV_KEYS_URL` | `https://www.gstatic.com/admob/reward/verifier-keys.json` | Tests uniquement. |
| `REMOTE_CONFIG_JSON` | (aucune) | Surcharge des clés de `GET /api/config`, ex. `{"rw_free_shards_daily_cap":2}`. Clés inconnues et types faux ignorés. |

---

## 5. Base de données (créée automatiquement au démarrage)

Nouvelles tables (`lib/db/src/schema/monetisation.ts`, reflétées dans `ensure-schema.ts`, vérifié identique à `drizzle-kit push`) : `entitlements`, `wallet_ledger` (unique `(reason, ref)`), `purchases` (uniques `store_transaction_id`, `rc_event_id`), `webhook_events` (clé = id d'événement), `ad_offers`, `ad_rewards` (clé = `transaction_id` AdMob, `nonce` unique), `inventory`, `equipped`, `reports`. Nouvelles colonnes : `players.shards_balance`, `players.deleted_at`, `games.shared_network` (ajoutées par `ALTER TABLE … ADD COLUMN IF NOT EXISTS` sur une base existante).

Invariant : `players.shards_balance` = somme de `wallet_ledger` pour ce joueur (écrits dans la même transaction).

---

## 6. Prochaines étapes côté serveur (non réalisées)

- Éclats de fin de partie (`shards_pvp_win/loss`, `shards_bot_game` avec plafond) dans `recordGame`, et la vidéo « Doubler mes Éclats » (`rw_double_shards`).
- Indice / vie supplémentaire contre l'ordinateur (`use_bot_hint`, `use_bot_extra_life`) et pause du chrono pendant une vidéo (`bot_ad_pause` / `bot_ad_resume`).
- Cosmétiques équipés diffusés dans `room_joined` / `game_start`, packs de réactions possédés acceptés par `react`, thème imposé par `create_room`.
- Quêtes et coffre quotidiens, 150 Éclats mensuels de l'abonnement `plus`.
- Liaison de compte Sign in with Apple / Google (`account_links`) et suppression côté RevenueCat (`DELETE /v1/subscribers/{id}`) lors de `DELETE /api/me`.
- Attestation d'app (App Attest / Play Integrity) pour rendre le type « mobile » vérifiable.
- Revue des signalements : aujourd'hui, requête SQL sur `reports` + journaux ; prévoir un petit outil de modération et des sanctions (bannissement de profil).
