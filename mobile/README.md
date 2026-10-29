# AnimeWho — application mobile (Flutter)

Portage du jeu web AnimeWho (`artifacts/anime-guess-who`) en application iOS + Android, une seule base de code Flutter. L'app parle au **serveur existant** (`artifacts/api-server`) : même protocole temps réel que le web, plus le contrat mobile décrit dans [`docs/mobile/SERVER_CHANGES.md`](../docs/mobile/SERVER_CHANGES.md).

- SDK : Flutter 3.47 / Dart 3.13. Identifiant : `com.animewho.app` (Android et iOS). Nom affiché : **AnimeWho**.
- Tout est en français ; l'i18n est prête (`lib/l10n/app_fr.arb`, `flutter_localizations`).

## Lancer

```bash
cd mobile
flutter pub get
flutter run                                   # émulateur Android : serveur sur http://10.0.2.2:8080
flutter run --dart-define=API_BASE_URL=http://192.168.1.20:8080   # téléphone réel / simulateur iOS
```

Serveur local (à la racine du dépôt) : `pnpm install` puis `PORT=8080 pnpm --filter @workspace/api-server run dev`.

### `--dart-define`

| Clé | Défaut | Rôle |
|---|---|---|
| `API_BASE_URL` | `http://10.0.2.2:8080` en debug Android, sinon `https://api.animewho.app` (**placeholder à remplacer**) | Adresse du serveur (HTTP + Socket.IO sur `/api/socket.io`) |
| `ENABLE_ADMOB` | `false` | `true` : vraies pubs AdMob (IDs de **test** Google). Sinon régie factice |
| `REVENUECAT_APPLE_KEY` / `REVENUECAT_GOOGLE_KEY` | vide | Clé publique RevenueCat. Vide : boutique factice (aucun paiement) |
| `VERBOSE_ANALYTICS` | `true` en debug | Affiche les événements analytics dans la console |

Sur le web (`flutter build web`, utilisé seulement comme test de compilation) les pubs et achats sont toujours factices, et le navigateur envoie un en-tête `Origin` : le serveur doit lister l'adresse dans `ALLOWED_ORIGINS`.

## Vérifications

```bash
flutter analyze                 # 0 problème
flutter test                    # tests unitaires + widgets (les tests « live » sont sautés)
flutter build web --release     # test de compilation

# Test d'intégration RÉEL contre le serveur (partie contre l'ordinateur, coupure/reconnexion,
# revanche, partie privée à deux clients, signaler/bloquer, routes compte) :
PORT=8080 GAME_TIME_SCALE=0.25 pnpm --filter @workspace/api-server run dev    # à la racine
ANIMEWHO_LIVE_URL=http://127.0.0.1:8080 flutter test test/integration
# Contrôle de version : serveur lancé avec MIN_MOBILE_VERSION=9.0.0, puis
ANIMEWHO_OUTDATED_URL=http://127.0.0.1:8081 flutter test test/integration --plain-name "version trop ancienne"
```

## Architecture

| Couche | Dossier | Contenu |
|---|---|---|
| Domaine (Dart pur, testé) | `lib/domain/` | Modèles (`models/`), protocole typé (`game/server_events.dart`, `client_events.dart`), **réducteur pur** de l'état de jeu (`game/game_reducer.dart`, copie fidèle de `GameContext.tsx`), logique de grille (`game/board.dart`), règles de fréquence pub (`monetization/ad_policy.dart`), Éclats / coffre / pack de démarrage (`monetization/wallet.dart`), catalogue IAP (`products.dart`) |
| Données | `lib/data/` | `socket/game_socket.dart` (Socket.IO, interface + implémentation), `api/` (HTTP public et routes compte en `Bearer`), `storage/` (shared_preferences), `monetization/` (interfaces `AdsService`, `PurchasesService`, `WalletRepository`, `AnalyticsService` + implémentations réelles et factices) |
| Application | `lib/application/` | Riverpod : `GameController` (socket ↔ réducteur ↔ stockage, cycle de vie), `MonetizationController` (pubs, achats, portefeuille), `providers.dart` (injection) |
| Interface | `lib/ui/` | Écrans (accueil, file/salle, sélection, partie, fin, boutique, classement, coffre, réglages) et widgets ; thème sombre « Midnight Anime » repris de `src/index.css` |

**Gestion d'état : Riverpod 3 (Notifier, sans génération de code).** Choisi plutôt que Provider pour : l'injection et la surcharge de chaque service dans les tests (`ProviderContainer(overrides: …)`, sans `BuildContext`), les `select` qui évitent de redessiner la grille de 24 cartes à chaque tic de chrono, et un contrôleur testable hors widgets (le test d'intégration réel pilote le même `GameController` que l'UI).

**Reconnexion transparente** : le jeton de session (`session`) est persisté et relu à **chaque** handshake ; Socket.IO se reconnecte seul après une coupure ; au retour d'arrière-plan l'app reconnecte (et force une nouvelle connexion après 30 s d'absence, iOS laissant des sockets « zombies ») ; le serveur renvoie `state_sync` (phase, éliminations, chrono restant, journal). En file d'attente, l'app se remet en file ; si la partie est perdue, retour à l'accueil avec un message. « Connexion remplacée » (partie ouverte ailleurs) : bouton « Reprendre ici ».

**Casting indépendant du code** : personnages, traits, univers et portraits viennent du serveur ; aucun nom de personnage ni d'œuvre dans l'app. Le trait `anime` est affiché « Univers » (prêt pour le casting original du BUSINESS_PLAN §6). Les traductions de traits ne couvrent que des mots génériques (couleurs, espèces génériques) ; une valeur inconnue s'affiche telle quelle. Aucune mention de « Qui est-ce ? » (vérifié par un test). Portraits : `cached_network_image` avec repli « initiales sur dégradé ».

**Monétisation** (MONETISATION_SPEC.md) : toutes les règles de fréquence sont dans `AdPolicy` (pure, testée) : interstitiel `int_post_game` seulement en quittant l'écran de fin, jamais avant la 4e partie ni les 24 premières heures, 2 parties et 180 s entre deux, 6/jour, pas après 2 défaites, pas si une revanche est en jeu, pas après un achat (10 min) ou une vidéo (120 s), partie ≥ 60 s ; vidéos récompensées 10/jour au total + plafonds par emplacement ; bannières seulement Accueil / File / Classement ; **aucune pub en Sélection ni en Partie**. Les valeurs viennent de `GET /api/config` (`remoteConfig`) avec les défauts de la spec. Consentement UMP avant toute requête pub ; ATT (iOS) demandé après la 2e partie, précédé d'un écran explicatif. Boutique : Sans pub, pack de démarrage (3e partie → J+7), packs d'Éclats, Éclats gratuits (vidéo), cosmétiques (si le serveur les fournit), Restaurer mes achats. Coffre quotidien (série de 7 jours) + coffre bonus en vidéo.

**Portefeuille** : au démarrage, `GET /api/config` ; si `features.wallet`, `POST /api/me` (son `playerId` devient l'`appUserID` RevenueCat et le `userId` SSV AdMob) puis `ServerWalletRepository` : solde, droits et inventaire viennent du serveur ; vidéo = `POST /me/ad-offers` (nonce + options SSV passées à AdMob) → `POST /me/ad-rewards/claim` (réessais pendant 30 s si « pending ») ; achats et restauration → `POST /me/sync-purchases` puis relecture ; cosmétiques `POST /shop/buy` et `/me/equip` ; suppression de compte `DELETE /api/me` (Réglages). Serveur sans base, hors-ligne ou tests : `LocalWalletRepository` (factice).

**Modération** (Apple 1.2) : menu « Signaler / Bloquer » sur l'adversaire (partie et écran de fin) ; clés de blocage stockées et renvoyées dans `auth.blocked` ; option « Questions vérifiées uniquement » (Réglages). Handshake mobile : `client: "mobile"`, `appVersion`, `platform`, `device` (UUID d'installation, jamais l'IDFA), `profile`, `token`, `blocked`, `verifiedOnly`, sans en-tête `Origin`. Erreur `app_outdated` → écran « Mise à jour nécessaire ».

## Décisions prises sans le propriétaire

- Riverpod 3 (justifié ci-dessus). Pas de polices personnalisées (Outfit / Bricolage Grotesque) : polices système en gras, à ajouter en assets plus tard.
- La « Partie rapide → proposer l'ordinateur » apparaît après 15 s (comme le web ; la spec propose 20 s via `queue_bot_fallback_s`).
- Le titre de l'écran « Deviner » est « Ton pronostic » (le web utilisait la marque Hasbro). Le dialogue de pseudo n'évoque plus d'œuvre (« Choisis ton nom de combat »).
- Les messages d'erreur du serveur (`error`) sont affichés tels quels (déjà en français).
- Le serveur ne crédite pas encore les Éclats de fin de partie ni le coffre gratuit (SERVER_CHANGES §6) : en mode serveur, « Doubler mes Éclats » et le coffre gratuit sont masqués (le coffre bonus en vidéo reste proposé) ; en mode local ils fonctionnent.
- Indice / vie supplémentaire contre l'ordinateur (`rw_bot_hint`, `rw_bot_extra_life`) : prévus dans `AdPolicy` mais non proposés tant que le serveur n'a pas `use_bot_hint` / `use_bot_extra_life`.

## Reste à faire avant soumission aux stores

1. **AdMob** : créer l'app et les blocs (`int_post_game`, `rw_*`, `ban_*`), remplacer les IDs de test dans `lib/data/monetization/admob_ads_service.dart`, `AndroidManifest.xml` (`APPLICATION_ID`) et `Info.plist` (`GADApplicationIdentifier`) ; configurer la SSV vers `/api/admob/ssv` ; resynchroniser `SKAdNetworkItems` avec la liste Google ; configurer le message UMP (RGPD) dans la console AdMob.
2. **RevenueCat / stores** : créer les produits (`animewho.noads`, `animewho.starter_pack`, `animewho.shards_100/550/1200`) et les droits `no_ads` / `plus` ; webhook vers `/api/webhooks/revenuecat` ; passer les clés en `--dart-define`.
3. **Casting original** (BUSINESS_PLAN §6) côté serveur : l'app n'a rien à changer.
4. **Icônes et écran de lancement** (icônes Flutter par défaut actuellement), captures, fiche store sans nom d'œuvre ni « Qui est-ce ».
5. **Signature** : keystore Android (`signingConfig` release, aujourd'hui la clé de debug) ; certificats et profils iOS ; `ios/Podfile` (iOS ≥ 13) généré au premier `pod install`.
6. Vraie **URL de production** (`AppConfig.productionPlaceholderUrl`) en HTTPS.
7. Jeton de profil dans le trousseau (`flutter_secure_storage`, spec §1) ; écran d'âge (spec §1) ; liaison Sign in with Apple / Google ; Firebase Analytics (+ Consent Mode) et Remote Config derrière les interfaces existantes ; bouton « Mettre à jour » vers la fiche store (`url_launcher`) ; partage du code de partie (`share_plus`, liens profonds `animewho.app/p/CODE`).
8. Traduction anglaise : `lib/l10n/app_en.arb` + table `_en` dans `trait_labels.dart`.

## Besoins côté serveur (pour l'équipe serveur)

- **Origine** : l'app native n'envoie pas d'en-tête `Origin` → acceptée par `origin.ts` (vérifié en test réel). Pour la version web Flutter : ajouter son adresse à `ALLOWED_ORIGINS`.
- Le contrat de `docs/mobile/SERVER_CHANGES.md` est implémenté côté app et vérifié contre le serveur (handshake mobile, `app_outdated`, `player_blocked` / `player_reported`, `GET /api/config`). Les routes `/api/me*` et `/api/shop/*` sont testées contre un faux serveur conforme (le serveur local de test n'avait pas de `DATABASE_URL`).
- À venir (§6 du contrat) et attendu par l'app : Éclats de fin de partie + « Doubler » (`rw_double_shards`), coffre quotidien gratuit, `use_bot_hint` / `use_bot_extra_life` / `bot_ad_pause`, cosmétiques diffusés dans `room_joined` / `game_start`.
- Libellés de traits localisés fournis par le serveur (ou liste fermée de valeurs) quand le casting original arrivera : aujourd'hui l'app traduit les valeurs connues et affiche les autres telles quelles.
- Messages `error` du serveur en français uniquement : prévoir des codes d'erreur stables pour l'anglais.
