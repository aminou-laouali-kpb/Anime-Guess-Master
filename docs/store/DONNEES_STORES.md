# Déclarations de données : Google « Sécurité des données » et Apple « Confidentialité de l'app »

> Brouillon à recopier dans la Play Console (*Contenu de l'app › Sécurité des données*) et App Store Connect (*Confidentialité de l'app*). Établi d'après le code du serveur (octobre 2026) et la pile prévue de l'app (MONETISATION_SPEC : AdMob + UMP, RevenueCat, Firebase Analytics / Remote Config / Crashlytics). **À revérifier** quand l'app est terminée : chaque SDK ajouté change les réponses. Les SDK publient leurs propres divulgations, à croiser : AdMob (« Google Mobile Ads SDK — Data disclosure »), Firebase (« Data disclosure for Google Play's data safety section »), RevenueCat (« Apple App Privacy » / « Google Play data safety » dans leur documentation).
>
> Principe : déclarer **ce que l'app et ses SDK collectent**, même si c'est le SDK et non nous qui l'utilise.

## 0. Ce que collecte le serveur AnimeWho (constaté dans le code)

| Donnée | Où | Durée |
|---|---|---|
| Pseudonyme choisi (24 caractères max, filtré) | `players.name`, visible des adversaires et au classement | Jusqu'à suppression du compte |
| Jeton de profil | **Seule son empreinte SHA-256** est stockée (`players.token_hash`) ; le jeton reste sur l'appareil | Idem |
| Identifiant public du joueur (aléatoire) | `players.id` ; transmis à RevenueCat (`appUserID`) et à AdMob (SSV `user_id`) | Idem |
| Statistiques (parties, victoires, Elo, séries) et historique des parties | `players`, `games` | Idem (les parties restent, liées à un joueur anonymisé) |
| Achats (produit, store, identifiant de transaction, date, statut) — **aucune donnée de paiement** | `purchases`, `entitlements`, `wallet_ledger` | Durée légale de conservation comptable **[à valider]** ; détachés de toute personne après suppression |
| Récompenses publicitaires (identifiant de transaction AdMob, emplacement) | `ad_offers`, `ad_rewards` | Jusqu'à suppression du compte |
| Questions libres | **En mémoire** pendant la partie seulement ; **enregistrées** uniquement en cas de signalement (`reports`, avec empreintes des profils) et dans les journaux | Signalements : 1 an **[à valider]** |
| Adresse IP | **En mémoire** pour les limites anti-abus et la règle de classement ; **non stockée** en base ; journalisée seulement quand un client est déconnecté pour envoi massif de messages (anti-abus) ; le proxy de l'hébergeur peut aussi la journaliser | Durée de la connexion |
| Identifiant d'installation (`device`) | Haché, **en mémoire seulement** | Durée de la connexion |

---

## 1. Google Play — Sécurité des données

### Questions générales

| Question | Réponse |
|---|---|
| L'app collecte-t-elle ou partage-t-elle des types de données requis ? | **Oui** |
| Toutes les données collectées sont-elles chiffrées en transit ? | **Oui** (HTTPS / WSS uniquement) |
| Proposez-vous un moyen de demander la suppression des données ? | **Oui** — dans l'app (Réglages › Supprimer mon compte) et via l'URL `https://animewho.app/suppression-compte` |
| L'app a-t-elle fait l'objet d'une validation de sécurité indépendante (MASA) ? | Non (facultatif) |

### Types de données

« Partagée » au sens de Google = transférée à un tiers **hors** prestataires agissant pour notre compte. AdMob utilise les données aussi pour ses propres fins publicitaires : c'est un **partage**. RevenueCat, Firebase et l'hébergeur agissent comme **sous-traitants** : collecte, pas partage.

| Catégorie › type | Collecté | Partagé | Facultatif ? | Finalités | Source |
|---|:---:|:---:|---|---|---|
| Infos personnelles › **Nom** (pseudonyme) | ✅ | ❌ | Obligatoire (un pseudo par défaut est proposé) | Fonctionnement de l'app | Serveur |
| Infos personnelles › **ID utilisateur** (identifiant public du joueur) | ✅ | ❌ | Obligatoire | Fonctionnement, gestion du compte, prévention des fraudes | Serveur, RevenueCat |
| Infos financières › **Historique des achats** | ✅ | ❌ | Facultatif (seulement si achat) | Fonctionnement, gestion du compte | Serveur, RevenueCat |
| Position › **Position approximative** | ✅ | ✅ | Obligatoire | Publicité, prévention des fraudes | AdMob (déduite de l'adresse IP) — **à confirmer** avec la divulgation AdMob en vigueur |
| Activité dans l'app › **Interactions avec l'app** | ✅ | ✅ | Obligatoire | Analyse, publicité (mesure), fonctionnement | Firebase Analytics, AdMob |
| Activité dans l'app › **Autres contenus générés par l'utilisateur** (questions libres) | ✅ | ❌ | Facultatif (questions vérifiées possibles) | Fonctionnement, sécurité (modération) | Serveur |
| Infos et performances de l'app › **Journaux de plantage** | ✅ | ❌ | Obligatoire | Analyse (stabilité) | Crashlytics |
| Infos et performances de l'app › **Diagnostics** | ✅ | ✅ | Obligatoire | Analyse, publicité (AdMob : performances des annonces) | Firebase, AdMob |
| Appareil ou autres ID › **ID d'appareil ou autres** (identifiant publicitaire, ID d'instance Firebase, ID d'installation) | ✅ | ✅ | Obligatoire (l'identifiant publicitaire peut être réinitialisé/supprimé par l'utilisateur) | Publicité, analyse, prévention des fraudes | AdMob, Firebase, app |

Non collectés : e-mail (sauf liaison de compte Apple/Google en phase 2 — **à ajouter alors**), téléphone, adresse, position précise, contacts, photos/vidéos, fichiers audio, agenda, SMS, santé, navigation web, infos de paiement (gérées par Apple/Google).

Section **Publicités** de la console : « L'app contient des annonces » **Oui**. **Identifiant publicitaire** (Android 13+, permission `AD_ID`) : utilisé pour la publicité et l'analyse — déclarer en conséquence.

---

## 2. Apple — Confidentialité de l'app (« étiquette nutritionnelle »)

Apple distingue : **utilisées pour vous suivre** (« tracking » : croisement avec des données d'autres entreprises à des fins publicitaires — c'est le cas de la publicité personnalisée AdMob **quand l'utilisateur accepte l'ATT**), **liées à vous**, **non liées à vous**.

### Données utilisées pour vous suivre

| Type | Finalité |
|---|---|
| **Identifiants › ID de l'appareil** (IDFA, seulement si l'utilisateur accepte l'ATT) | Publicité de tiers |
| **Données d'utilisation › Données publicitaires** | Publicité de tiers |

### Données liées à vous

| Type | Finalités |
|---|---|
| **Coordonnées › Nom** (pseudonyme) | Fonctionnalités de l'app |
| **Identifiants › Identifiant utilisateur** | Fonctionnalités de l'app, gestion du compte (achats, restauration) |
| **Achats › Historique des achats** | Fonctionnalités de l'app |
| **Contenu utilisateur › Autre contenu utilisateur** (questions libres, signalements) | Fonctionnalités de l'app, modération (« Autre finalité » : sécurité) |
| **Données d'utilisation › Interactions avec le produit** | Analyses, fonctionnalités (statistiques, classement) |

### Données non liées à vous

| Type | Finalités |
|---|---|
| **Diagnostics › Données de plantage**, **Données de performance** | Analyses |
| **Localisation › Localisation approximative** (déduite de l'IP par AdMob) | Publicité de tiers — **à confirmer** avec la divulgation AdMob |

### Points iOS liés

- **App Tracking Transparency** : demande après la 2e partie, précédée d'un écran explicatif ; refus → publicité non personnalisée, rien d'autre ne change. Texte `NSUserTrackingUsageDescription` : « Ton choix permet de te montrer des publicités plus pertinentes. AnimeWho reste gratuit grâce à la publicité. »
- **Privacy manifest** (`PrivacyInfo.xcprivacy`) : celui de l'app (API à motif obligatoire utilisées par le code Flutter/natif, ex. `UserDefaults`) + ceux des SDK (Google Mobile Ads, Firebase, RevenueCat les fournissent ; vérifier qu'ils sont à jour).
- **SKAdNetwork** : ajouter les identifiants fournis par Google (et par les réseaux de médiation en phase 2) dans `Info.plist`.

---

## 3. Consentement et mineurs (rappel pour l'app)

| Situation | Comportement attendu |
|---|---|
| EEE, Royaume-Uni, Suisse | Formulaire **UMP** (CMP certifiée IAB TCF v2.2) **avant** toute requête publicitaire ; Firebase Analytics en *Consent Mode* (collecte limitée sans consentement) |
| Moins de 13 ans (écran d'âge) | Accès refusé ; aucune donnée envoyée (ne pas appeler `POST /api/me` avant l'écran d'âge) |
| 13-14 ans (France : âge du consentement numérique 15 ans) ; < 16 ans selon le pays | Publicité **non personnalisée** (`tagForUnderAgeOfConsent`, pas de demande ATT), questions libres désactivées par défaut (`verifiedOnly: true`) |
| Partout | Contenu publicitaire classé au plus *T* (Teen) |
