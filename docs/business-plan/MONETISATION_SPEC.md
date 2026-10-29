# AnimeWho — Spécification de la monétisation (app Flutter + serveur)

> Version 1.0 — 29 octobre 2026. Compagnon technique de [`BUSINESS_PLAN.md`](./BUSINESS_PLAN.md) (§5 et §9). Toute valeur numérique marquée `RC:` est une **clé Firebase Remote Config** avec sa valeur par défaut : elle peut être changée sans nouvelle version de l'app.
>
> Conventions : « Phase 1 » = v1 au lancement (M4, février 2027) ; « Phase 2 » = M10 ; « Phase 3 » = M16. **[Hypothèse]** = choix fait sans le propriétaire.

---

## 0. Principes non négociables

1. **Aucun avantage payant en partie contre un humain.** Ni indice, ni vie, ni temps supplémentaire, ni information sur le personnage adverse. Les seuls avantages (indice, vie supplémentaire) existent **contre l'ordinateur**, ne comptent ni pour les statistiques ni pour l'Elo, et s'obtiennent par vidéo récompensée.
2. **Jamais de publicité pendant une partie contre un humain** (écrans Sélection et Partie), ni quand un adversaire humain attend.
3. **Aucune loot box** : tout achat donne un contenu connu à l'avance.
4. **Le serveur est la seule source de vérité** pour les droits (sans pub, abonnement), le solde d'Éclats, l'inventaire et les cosmétiques affichés à l'adversaire — comme il l'est déjà pour les règles du jeu.
5. **Tout plafond publicitaire est pilotable à distance** (Remote Config) et testable en A/B.
6. **Contenu original uniquement** : aucun cosmétique, thème ou personnage ne reprend une propriété intellectuelle tierce (voir BUSINESS_PLAN §6).

---

## 1. Prérequis : identité du joueur et comptes

Aujourd'hui il n'y a pas de comptes : un jeton de profil secret est conservé par le navigateur et seule son empreinte SHA-256 est stockée (`players.token_hash`). Les achats exigent davantage (restauration sur un nouvel appareil, remboursements).

| Élément | Spécification |
|---|---|
| Compte anonyme | Créé au premier lancement : le serveur émet le **jeton de profil** existant (`profile`) ; l'app le stocke dans le trousseau sécurisé (`flutter_secure_storage`). L'identifiant public `players.id` sert d'`appUserID` RevenueCat et d'identifiant AdMob SSV. |
| Liaison de compte (facultative, proposée après le 1er achat ou à la 10e partie) | **Sign in with Apple** (obligatoire sur iOS dès qu'une connexion tierce est proposée — règle Apple 4.8) et **Google Sign-In**. Permet de retrouver achats, Éclats, Elo sur un autre appareil. |
| Restauration | Bouton « Restaurer mes achats » dans Boutique et Réglages (exigé par Apple) → `Purchases.restorePurchases()` puis resynchronisation serveur. |
| Suppression de compte | Dans l'app (exigé par Apple 5.1.1(v)) : supprime les données personnelles ; prévenir que les achats ne sont pas remboursés. |
| Âge | Écran de date de naissance (mois/année) au 1er lancement : < 13 ans → accès refusé **[Hypothèse]** ; < 15 ans (France) / < 16 ans selon le pays → publicité **non personnalisée** et questions libres désactivées par défaut. |

---

## 2. Monnaie virtuelle : les « Éclats »

Une seule monnaie, gagnée en jouant **et** achetable. Pas de seconde monnaie premium. Non convertible en argent, non transférable entre joueurs.

### 2.1 Gains (crédités par le serveur uniquement)

| Source | Gain | Plafond | Clé RC |
|---|---:|---|---|
| Partie terminée contre un humain (défaite) | 10 | — | `shards_pvp_loss` = 10 |
| Partie gagnée contre un humain | 20 | — | `shards_pvp_win` = 20 |
| Partie contre l'ordinateur terminée | 5 | 10 parties récompensées / jour | `shards_bot_game` = 5, `shards_bot_daily_cap` = 10 |
| Quêtes quotidiennes (3 par jour, ex. « Gagne 2 parties », « Trouve en ≤ 5 questions », « Joue une partie privée ») | 20 à 40 chacune | 3 / jour | `quests_per_day` = 3 |
| Coffre quotidien (connexion) | 20 à 50 (jour 7 de la série : 100) | 1 / jour | — |
| Vidéo récompensée « Doubler mes Éclats » (fin de partie) | × 2 du gain de la partie | 5 / jour | `rw_double_daily_cap` = 5 |
| Vidéo récompensée « Éclats gratuits » (boutique) | 30 | 3 / jour | `rw_free_shards_amount` = 30, `rw_free_shards_daily_cap` = 3 |
| Parrainage (phase 2) | 100 pour le parrain et le filleul après 3 parties du filleul | 10 filleuls | — |

Repère d'équilibrage : un joueur actif (3 parties PvP, 1 quête, coffre) gagne ≈ 100 Éclats par jour sans payer ; un cosmétique standard coûte 300 Éclats (≈ 3 jours de jeu).

### 2.2 Dépenses

Cosmétiques de la boutique (tableau §3.3). Les Éclats ne servent **à rien d'autre** en phase 1.

---

## 3. Catalogue des produits in-app

### 3.1 Identifiants et paliers de prix

Identifiant de bundle / package **[Hypothèse]** : `com.animewho.app`. Les identifiants produits sont **identiques sur l'App Store et Google Play** (minuscules, chiffres, points et tirets bas : compatibles avec les deux). Un identifiant Apple supprimé ne peut jamais être réutilisé : ne pas créer de produits « de test » avec les identifiants définitifs.

| Identifiant produit | Type Apple / Google | Prix TTC France | Contenu | Droit RevenueCat | Phase |
|---|---|---:|---|---|---|
| `animewho.noads` | Non consommable / `inapp` (achat unique) | **3,99 €** | Supprime interstitiels et bannières **à vie** ; les vidéos récompensées restent disponibles (elles sont choisies) ; badge « Soutien » | `no_ads` | 1 |
| `animewho.starter_pack` | Non consommable / `inapp` | **1,99 €** | 500 Éclats + dos de carte exclusif « Aube » + cadre « Recrue ». Visible de la 3e partie terminée jusqu'à 7 jours après l'installation, achetable une fois | — (contenu crédité par le serveur) | 1 |
| `animewho.shards_100` | Consommable / `inapp` consommable | **0,99 €** | 100 Éclats | — | 1 |
| `animewho.shards_550` | Consommable | **4,99 €** | 550 Éclats (+10 %) | — | 1 |
| `animewho.shards_1200` | Consommable | **9,99 €** | 1 200 Éclats (+20 %) | — | 1 |
| `animewho.theme.<slug>` (ex. `animewho.theme.neo_tokyo`) | Non consommable | **2,99 €** | Un **univers de 24 personnages originaux** + son plateau. L'acheteur peut l'imposer comme grille dans **ses parties privées** ; **l'invité joue gratuitement** sur ce thème. Les personnages rejoignent aussi la rotation gratuite des parties rapides 3 mois après leur sortie (personne n'est jamais exclu d'une partie rapide) | `theme_<slug>` | 2 |
| `animewho.plus.monthly` | Abonnement auto-renouvelable (groupe Apple `animewho_plus`) / Google : abonnement `animewho_plus`, offre de base `monthly` | **2,99 €/mois** | Sans pub (comme `noads`) + **tous les thèmes** en partie privée + 1 cosmétique exclusif par mois (conservé après résiliation) + 150 Éclats/mois + historique et statistiques détaillées + badge « + » | `plus` | 2 |
| `animewho.plus.yearly` | Même groupe / offre de base `yearly` | **19,99 €/an** (−44 %), essai gratuit 7 jours | Idem | `plus` | 2 |
| `animewho.pass.s01` (puis `s02`, …) | Non consommable / `inapp` | **4,99 €** par saison (8 semaines) | Voie premium du pass de saison : ≈ 30 récompenses cosmétiques + 600 Éclats répartis. La voie gratuite existe pour tous | `pass_s01` | 3 |

Prix hors zone euro : utiliser les **grilles de prix équivalents automatiques** des stores (Apple « price equalization », Google conversion locale), puis réduire manuellement (≈ −50 %) dans les pays à faible pouvoir d'achat ciblés (Côte d'Ivoire, Sénégal, Cameroun, Maroc, Algérie, Tunisie, RDC) **[Hypothèse]**.

### 3.2 Gratuit vs payant

| Fonctionnalité | Gratuit | `noads` | `plus` |
|---|:---:|:---:|:---:|
| Tous les modes de jeu (rapide, privée, ordinateur 3 niveaux), classement Elo, revanche, réactions de base | ✅ | ✅ | ✅ |
| Tous les personnages de la rotation en partie rapide | ✅ | ✅ | ✅ |
| Interstitiels et bannières | Oui (plafonnés) | ❌ | ❌ |
| Vidéos récompensées (facultatives) | ✅ | ✅ | ✅ |
| Imposer un thème payant en partie privée | Thèmes achetés | Thèmes achetés | Tous |
| Cosmétiques | Avec Éclats ou packs | idem | idem + 1 exclusif/mois |
| Historique détaillé des parties, statistiques par trait | Résumé | Résumé | ✅ |

### 3.3 Boutique cosmétique (phase 1 : ≈ 30 objets)

| Catégorie | Visible par l'adversaire ? | Exemples | Prix |
|---|:---:|---|---:|
| Dos de cartes (grille) | ✅ | « Sakura », « Néon », « Encre », « Or » | 300-600 Éclats |
| Cadres de profil | ✅ | « Flammes », « Pixel », « Lune » | 300-500 Éclats |
| Packs de réactions (4 émojis animés originaux chacun) | ✅ | « Choc », « Victoire », « Mignon » | 400 Éclats |
| Animation de victoire | ✅ | « Pluie de pétales », « Éclair » | 500-800 Éclats |
| Plateau (fond de l'écran de jeu, vu seulement par soi) | ❌ | « Dojo », « Toits de Tokyo » | 300 Éclats |

Rotation : 4 objets « vedettes » par semaine (mise en avant, pas d'urgence artificielle de type compte à rebours de quelques minutes). Prix toujours affichés en Éclats **et**, pour les packs d'Éclats, en euros.

---

## 4. Publicité

**Régie** : Google AdMob via `google_mobile_ads` ; **médiation** (AppLovin ou Unity Ads) en phase 2 pour augmenter les eCPM. **Consentement** : SDK Google UMP (CMP certifiée IAB TCF v2.2) avant toute requête publicitaire dans l'EEE, au Royaume-Uni et en Suisse ; **App Tracking Transparency** sur iOS (demandée après la 2e partie, avec écran explicatif, pas au premier lancement) ; `tagForUnderAgeOfConsent` pour les mineurs sous l'âge du consentement numérique ; contenu publicitaire classé `MaxAdContentRating.t` (Teen) **[Hypothèse]**.

### 4.1 Emplacements

| ID interne (nom du bloc AdMob) | Format | Écran | Déclencheur | Récompense / effet | Plafond (clé RC) | Phase |
|---|---|---|---|---|---|---|
| `rw_double_shards` | Récompensée | **Fin de partie** (`Ended`) | Bouton « ▶ Doubler mes Éclats » à côté du gain | Gain de la partie × 2 | 5 / jour (`rw_double_daily_cap`) | 1 |
| `rw_daily_chest` | Récompensée | **Accueil**, coffre quotidien | Bouton « ▶ Ouvrir un 2e coffre » après ouverture du coffre gratuit | Coffre bonus (20-50 Éclats) | 1 / jour | 1 |
| `rw_free_shards` | Récompensée | **Boutique** | Tuile « Éclats gratuits » | 30 Éclats | 3 / jour (`rw_free_shards_daily_cap`) | 1 |
| `rw_bot_hint` | Récompensée | **Partie contre l'ordinateur uniquement** | Bouton « Indice » | Le serveur élimine 3 personnages qui ne peuvent pas être le secret de l'ordinateur | 1 / partie (`rw_bot_hint_per_game`) | 1 |
| `rw_bot_extra_life` | Récompensée | **Partie contre l'ordinateur uniquement**, quand la dernière vie est perdue | « ▶ Continuer avec 1 vie » | +1 vie | 1 / partie | 1 |
| `int_post_game` | Interstitiel | **Transition** Fin de partie → Accueil **ou** → nouvelle recherche de partie rapide | Au moment où le joueur quitte l'écran de fin (jamais si une revanche est demandée ou acceptée) | — | Voir §4.2 | 1 |
| `ban_home` | Bannière adaptative ancrée en bas | **Accueil** | Affichage | — | — | 1 |
| `ban_queue` | Bannière adaptative | **File d'attente** (`QueueLobby`) | Affichage pendant la recherche | — | — | 1 |
| `ban_leaderboard` | Bannière adaptative | **Classement**, **Profil** | Affichage | — | — | 1 |
| `appopen_resume` | App Open | — | **Non utilisé** (trop intrusif pour un jeu à sessions courtes) | — | — | ❌ |

Écrans **sans aucune publicité** : Sélection du personnage, Partie (contre un humain), toute phase de reconnexion, écran d'achat, onboarding/tutoriel, écran de consentement.

Les détenteurs de `no_ads` ou `plus` ne voient ni bannière ni interstitiel ; ils gardent l'accès volontaire aux vidéos récompensées.

### 4.2 Règles anti-frustration (interstitiel)

Toutes les conditions doivent être vraies pour afficher `int_post_game` :

| Règle | Valeur par défaut (clé RC) |
|---|---|
| Le joueur n'a ni `no_ads` ni `plus` | — |
| Nombre de parties terminées depuis l'installation ≥ N | 4 (`int_min_games_lifetime`) |
| Ancienneté de l'installation ≥ H heures | 24 (`int_min_install_age_h`) |
| Parties terminées depuis le dernier interstitiel ≥ N | 2 (`int_games_between`) |
| Temps écoulé depuis le dernier interstitiel ≥ S secondes | 180 (`int_min_interval_s`) |
| Interstitiels aujourd'hui < N | 6 (`int_daily_cap`) |
| La partie a duré ≥ 60 s (pas d'abandon immédiat) | 60 (`int_min_game_duration_s`) |
| Pas d'interstitiel après 2 défaites consécutives | true (`int_skip_after_loss_streak`) |
| Aucun achat dans les 10 dernières minutes | 600 (`int_quiet_after_purchase_s`) |
| Aucune vidéo récompensée regardée dans les 120 dernières secondes | 120 (`int_quiet_after_rewarded_s`) |
| Aucun adversaire humain n'attend le joueur (revanche, partie privée en cours de création) | — |

Autres règles :
- **Vidéos récompensées** : total 10 / jour toutes sources confondues (`rw_total_daily_cap` = 10) ; toujours précédées d'un bouton explicite indiquant la récompense ; si aucune pub n'est disponible (`no fill`), le bouton est grisé avec « Pas de vidéo disponible » — jamais de récompense perdue après une vidéo complète (voir §5.4).
- **Proposition « Sans pub »** : après le 10e interstitiel vu, une seule fois, un écran doux « Marre des pubs ? 3,99 € à vie » (`noads_upsell_after_interstitials` = 10), puis au plus une fois par mois.
- **Partie contre l'ordinateur** : pendant une vidéo récompensée, le serveur **met en pause** le chrono de la partie (nouvel événement `bot_ad_pause` / `bot_ad_resume`, refusé hors mode `bot`, durée max 60 s).
- **Hors ligne / réseau faible** : ne jamais bloquer le flux de jeu en attendant une pub (délai de chargement max 2 s, sinon on passe).
- **Préchargement** : un interstitiel et une récompensée préchargés en arrière-plan à l'Accueil, jamais pendant une partie (économie de données — persona Afrique).

### 4.3 Cohérence avec le business plan

Les plafonds ci-dessus visent, dans le scénario médian, **≈ 0,6 récompensée et ≈ 1,0 interstitiel par DAU et par jour, et ≈ 2 bannières** (avec ≈ 3 parties par DAU) — les valeurs utilisées dans les projections (BUSINESS_PLAN §9.1). Si les mesures réelles s'en écartent de plus de 30 %, mettre à jour le modèle.

---

## 5. Côté serveur : validation des achats, droits et récompenses

### 5.1 Choix d'architecture

**[Décision]** **RevenueCat** (`purchases_flutter`) gère l'achat côté app et la validation des reçus auprès d'Apple (App Store Server API) et de Google (Play Developer API). Notre serveur **ne fait jamais confiance au client** : il reçoit les **webhooks RevenueCat** et, en cas de doute, interroge l'API REST RevenueCat (`GET /v1/subscribers/{app_user_id}`). Gratuit jusqu'à 2 500 $ de revenu suivi par mois, puis 1 %.

*Alternative (si sortie de RevenueCat)* : App Store Server Notifications V2 + App Store Server API (vérification JWS) ; Google Real-time Developer Notifications (Pub/Sub) + `purchases.products.get` / `purchases.subscriptionsv2.get`, puis `acknowledge` sous 3 jours (sinon Google rembourse automatiquement). Le schéma de données ci-dessous reste valable.

### 5.2 Schéma de base (ajouts dans `lib/db/src/schema/`, à refléter dans `ensure-schema.ts`)

| Table | Colonnes principales | Rôle |
|---|---|---|
| `account_links` | `player_id` → `players.id`, `provider` (`apple`/`google`), `subject` (identifiant fourni par le fournisseur, unique) | Liaison de compte |
| `purchases` | `id`, `player_id`, `product_id`, `store` (`app_store`/`play_store`), `store_transaction_id` (**unique**), `rc_event_id` (**unique**), `price_eur_ttc`, `status` (`active`/`refunded`/`expired`), `purchased_at` | Journal des achats, idempotence |
| `entitlements` | `player_id`, `entitlement` (`no_ads`, `plus`, `theme_<slug>`, `pass_s01`), `expires_at` (null = à vie), `source_purchase_id` | Droits actifs (cache du serveur, source de vérité pour le jeu) |
| `wallet_ledger` | `id`, `player_id`, `delta` (±), `reason` (`pvp_win`, `quest`, `rw_double`, `purchase`, `spend_item`, `refund_clawback`, …), `ref` (id de partie / transaction / pub), **unique (`reason`, `ref`)** | Registre append-only des Éclats ; le solde = somme (avec colonne `shards_balance` dénormalisée dans `players`, mise à jour dans la même transaction) |
| `ad_rewards` | `transaction_id` (**unique**, fourni par AdMob SSV), `player_id`, `ad_unit`, `reward_key`, `nonce`, `verified_at`, `consumed_at` | Récompenses publicitaires vérifiées |
| `items` | `id`, `category`, `price_shards`, `available_from`, `available_to`, `season` | Catalogue cosmétique (aussi exposé à l'app) |
| `inventory` | `player_id`, `item_id` (unique ensemble), `acquired_at`, `source` | Objets possédés |
| `equipped` | `player_id`, `card_back`, `frame`, `reaction_pack`, `victory_fx`, `board` | Objets équipés |

### 5.3 Endpoints et événements

| Endpoint / événement | Auth | Comportement |
|---|---|---|
| `POST /api/webhooks/revenuecat` | En-tête `Authorization` secret partagé configuré dans RevenueCat ; IP non utilisée | Traite `INITIAL_PURCHASE`, `NON_RENEWING_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE`, `TRANSFER`, `REFUND` (ou `CANCELLATION` avec raison remboursement). **Idempotent** par `rc_event_id`. Crédite Éclats / droits dans une transaction SQL. Répond 200 rapidement (traitement < 1 s). |
| `GET /api/me/entitlements` | Jeton de profil (en-tête) | Droits, solde, inventaire, équipement — l'app l'appelle au démarrage, après achat et après restauration |
| `POST /api/me/sync-purchases` | Jeton de profil | Force une relecture via l'API RevenueCat (secours si le webhook tarde) |
| `GET /api/admob/ssv` | **Signature AdMob** (ECDSA, clés publiques `https://www.gstatic.com/admob/reward/verifier-keys.json`, mises en cache 24 h) | Vérifie la signature, l'unicité de `transaction_id`, le `user_id` (= `players.id`) et `custom_data` (= nonce émis par le serveur pour cette proposition, valable 10 min). Enregistre dans `ad_rewards`. |
| `POST /api/me/ad-rewards/claim` | Jeton de profil | Le client réclame la récompense d'une vidéo vue (`nonce`) : le serveur ne crédite que si `ad_rewards` contient une ligne vérifiée non consommée ; plafonds quotidiens appliqués **côté serveur**. Si la SSV n'est pas encore arrivée : réessai jusqu'à 30 s, puis la récompense reste en attente et est créditée au prochain `GET /api/me/entitlements`. |
| `POST /api/me/ad-offers` | Jeton de profil | Émet un `nonce` pour une proposition de vidéo (`ad_unit`, `reward_key`) en vérifiant les plafonds |
| `POST /api/shop/buy` | Jeton de profil | Achat d'un objet en Éclats : vérifie le solde et la disponibilité, débite et ajoute à l'inventaire dans une seule transaction ; refuse si solde négatif |
| `POST /api/me/equip` | Jeton de profil | Vérifie la possession avant d'équiper |
| Socket `room_joined` / `game_start` (existants) | — | **Ajouter** `cosmetics: { cardBack, frame, reactionPack, victoryFx }` pour chaque joueur, **lus depuis `equipped` côté serveur** (jamais transmis par le client) |
| Socket `react` (existant) | — | Accepter les émojis des packs possédés (vérification serveur) en plus des 8 réactions de base |
| Socket `use_bot_hint`, `use_bot_extra_life` (nouveaux) | — | Refusés si la partie n'est pas en mode `bot` ; exigent un `nonce` de récompense vérifié et non consommé |
| Socket `bot_ad_pause` / `bot_ad_resume` (nouveaux) | — | Mode `bot` uniquement ; pause du chrono ≤ 60 s, 2 fois par partie max |
| `create_room` (existant) | — | Nouveau paramètre facultatif `theme` : accepté seulement si l'hôte possède `theme_<slug>` ou `plus` |
| Fin de partie (existant `recordGame`) | — | Crédite les Éclats de partie via `wallet_ledger` (`ref` = id de partie + joueur), même sans compte lié |

### 5.4 Règles de robustesse

- **Idempotence partout** (contraintes d'unicité ci-dessus) : un webhook rejoué ou une double réclamation ne crédite jamais deux fois.
- **Remboursements** : retrait du droit (`no_ads`, `plus`, thème, pass) ; pour les packs d'Éclats, écriture `refund_clawback` (le solde peut devenir négatif : la boutique est alors bloquée jusqu'à retour à ≥ 0 ; les objets déjà achetés sont conservés pour ne pas créer de litige).
- **Consommables** : les packs d'Éclats sont « consommés » côté store par RevenueCat ; le crédit côté serveur dépend du webhook, pas de l'app.
- **Panne du serveur** : l'app affiche « Achat en cours de validation » et relance `sync-purchases` ; aucun achat n'est perdu (RevenueCat conserve l'historique).
- **Journalisation** : chaque crédit/débit d'Éclats et chaque changement de droit est journalisé (Pino) avec `player_id`, montant, raison — sans données de paiement.
- **Limites de débit** : endpoints boutique et récompenses soumis au limiteur existant (`rate-limit.ts`), par compte et non par IP (CGNAT mobile).
- **Comptes multiples** : les récompenses quotidiennes sont plafonnées par compte **et** par identifiant d'appareil haché (anti-ferme de comptes).

### 5.5 Conformité des achats

- Apple 3.1.1 : tout déblocage passe par l'achat intégré ; aucun lien vers un paiement externe **[Hypothèse : pas de boutique web en phase 1]**.
- Apple 3.1.2 et Google : écran d'abonnement affichant clairement prix, durée, renouvellement automatique, lien CGU et politique de confidentialité, lien de gestion/résiliation ; essai gratuit expliqué.
- Droit européen de la consommation : rétractation de 14 jours pour contenu numérique gérée par les stores ; afficher le prix TTC.
- Pas de loot box : aucune déclaration de probabilités nécessaire.
- Mineurs : pas de messages incitatifs du type « demande à tes parents » ; pas de prix masqués derrière la monnaie pour les packs d'Éclats (euros affichés).

---

## 6. Modération (prérequis store lié au contenu des joueurs)

Les **questions libres** sont du contenu généré par les joueurs et visible par un inconnu : Apple (règle 1.2) exige un filtre, un moyen de **signaler** et de **bloquer**. À livrer avant la soumission :
- Filtre de mots (FR + EN, liste maintenue) côté serveur dans `ask_question` ; texte refusé → message neutre.
- Bouton « Signaler » sur chaque question libre reçue et bouton « Bloquer ce joueur » (l'appariement évite ensuite ce joueur).
- Option « Questions vérifiées uniquement » (par défaut pour les moins de 16 ans) : l'adversaire ne peut pas envoyer de question libre.
- Noms de joueurs : filtre existant des caractères dangereux + filtre de mots.

---

## 7. Événements analytics

Outil : **Firebase Analytics** (consentement : Consent Mode, collecte limitée sans consentement dans l'EEE). Les revenus « officiels » sont ceux du serveur et de RevenueCat ; Firebase sert au comportement. Noms en `snake_case`, aucune donnée personnelle (pas de nom de joueur, pas d'IP).

### 7.1 Propriétés utilisateur

`install_cohort` (AAAA-SS), `country`, `app_lang`, `has_no_ads` (bool), `is_plus` (bool), `payer_tier` (`none`/`minnow` < 5 €/`dolphin` 5-50 €/`whale` > 50 €), `elo_bucket` (par tranches de 100), `age_band` (`13_14`/`15_17`/`18_plus`), `ad_consent` (`personalized`/`npa`/`none`), `linked_account` (bool).

### 7.2 Événements

| Événement | Paramètres | Déclencheur |
|---|---|---|
| `first_open` (auto), `app_open` | `source` (`organic`, `invite_link`, `push`) | Ouverture |
| `onboarding_step` / `onboarding_complete` | `step`, `duration_s` | Tutoriel |
| `consent_result` | `gdpr` (`personalized`/`npa`/`refused`), `att` (`authorized`/`denied`/`na`) | Consentements |
| `queue_join` | `mode` (`quick`) | Entrée en file |
| `queue_matched` | `wait_s` | Adversaire trouvé |
| `queue_left` | `wait_s`, `fallback_bot` (bool) | Sortie de file |
| `room_create` / `room_join` | `theme`, `via` (`code`/`link`) | Parties privées |
| `invite_share` | `channel` (`whatsapp`, `copy`, `system`, …) | Partage de code |
| `game_start` | `mode` (`quick`/`private`/`bot`), `bot_level`, `ranked`, `theme`, `round` | Début |
| `question_ask` | `type` (`verified`/`free`), `attribute` | Question |
| `game_end` | `mode`, `result` (`win`/`loss`), `reason` (`correct_guess`/`out_of_lives`/`opponent_left`), `duration_s`, `questions`, `elo_delta`, `shards_earned` | Fin |
| `rematch` | `action` (`request`/`accept`) | Revanche |
| `reconnect` | `away_s`, `success` (bool) | Reconnexion |
| `report_player` / `block_player` | `reason` | Modération |
| `quest_complete` | `quest_id`, `reward` | Quête |
| `daily_chest_open` | `streak_day`, `bonus` (bool) | Coffre |
| `ad_rewarded_offer` | `placement` (`rw_double_shards`, …) | Bouton de vidéo affiché |
| `ad_rewarded_start` / `ad_rewarded_complete` / `ad_rewarded_fail` | `placement`, `error_code` | Cycle de vie |
| `ad_reward_granted` | `placement`, `reward_key`, `amount`, `latency_ms` | Crédit serveur confirmé |
| `ad_interstitial_eligible` / `ad_interstitial_show` / `ad_interstitial_skip` | `skip_reason` (`cap`, `interval`, `loss_streak`, `no_fill`, …) | Décision d'interstitiel |
| `ad_banner_impression` | `placement` | Bannière |
| `ad_impression` (paid event AdMob → Firebase) | `ad_platform`, `ad_format`, `ad_unit_name`, `value`, `currency` | Revenu publicitaire estimé (ARPDAU) |
| `shop_view` | `tab`, `source` (`home`, `ended`, `upsell`) | Boutique |
| `iap_view` | `product_id`, `placement` | Fiche produit / paywall |
| `iap_start` | `product_id` | Lancement de l'achat |
| `iap_success` (côté app) + confirmation serveur `purchase_validated` | `product_id`, `price`, `currency`, `is_trial` | Achat |
| `iap_fail` / `iap_cancel` | `product_id`, `error_code` | Échec |
| `restore_purchases` | `restored_count` | Restauration |
| `item_purchase` | `item_id`, `category`, `price_shards` | Achat en Éclats |
| `item_equip` | `item_id`, `category` | Équipement |
| `sub_start` / `sub_renew` / `sub_cancel` / `sub_expire` (depuis webhooks) | `product_id`, `period` | Abonnement |
| `upsell_noads_show` / `upsell_noads_click` | `interstitials_seen` | Proposition « Sans pub » |
| `account_link` | `provider` | Liaison de compte |

### 7.3 Tableaux de bord minimum

Rétention J1/J7/J30 par cohorte et par pays ; entonnoir file → partie → fin ; temps d'attente ; ARPDAU (pub + achats) par pays ; taux d'acceptation des récompensées par emplacement ; raisons de non-affichage des interstitiels ; conversion payeur et ARPPU ; churn abonnement.

---

## 8. Clés Remote Config (récapitulatif)

| Clé | Défaut | Rôle |
|---|---|---|
| `int_min_games_lifetime` | 4 | Parties avant le 1er interstitiel |
| `int_min_install_age_h` | 24 | Heures avant le 1er interstitiel |
| `int_games_between` | 2 | Parties entre deux interstitiels |
| `int_min_interval_s` | 180 | Intervalle minimal |
| `int_daily_cap` | 6 | Max interstitiels / jour |
| `int_min_game_duration_s` | 60 | Durée minimale de partie |
| `int_skip_after_loss_streak` | true | Pas d'interstitiel après 2 défaites |
| `int_quiet_after_purchase_s` | 600 | Silence après achat |
| `int_quiet_after_rewarded_s` | 120 | Silence après récompensée |
| `rw_total_daily_cap` | 10 | Max récompensées / jour |
| `rw_double_daily_cap` | 5 | « Doubler » / jour |
| `rw_free_shards_amount` / `rw_free_shards_daily_cap` | 30 / 3 | Éclats gratuits |
| `rw_bot_hint_per_game` | 1 | Indices contre l'ordinateur |
| `noads_upsell_after_interstitials` | 10 | Proposition « Sans pub » |
| `banners_enabled` | true | Coupe-circuit bannières |
| `starter_pack_window_days` | 7 | Fenêtre du pack de démarrage |
| `queue_bot_fallback_s` | 20 | Délai avant de proposer l'ordinateur (proposition explicite, jamais un faux humain) |
| `shards_pvp_win` / `shards_pvp_loss` / `shards_bot_game` / `shards_bot_daily_cap` | 20 / 10 / 5 / 10 | Économie |

Les plafonds de récompenses et de gains d'Éclats sont **aussi** appliqués par le serveur (Remote Config ne fait que l'affichage côté app) : la configuration serveur lit les mêmes valeurs depuis des variables d'environnement ou une table `config`.

---

## 9. Critères d'acceptation (v1)

1. Un achat `animewho.noads` sur iPhone supprime interstitiels et bannières en < 10 s, et reste actif après réinstallation + « Restaurer » ou après connexion Apple/Google sur Android.
2. Un webhook RevenueCat rejoué 3 fois ne crédite qu'une fois ; un remboursement retire le droit.
3. Une requête SSV forgée (signature invalide, `transaction_id` déjà vu, `user_id` différent) ne crédite rien.
4. Aucun interstitiel avant la 4e partie terminée ni pendant les 24 premières heures ; jamais sur les écrans Sélection/Partie ; jamais si une revanche est en cours.
5. `use_bot_hint` envoyé dans une partie rapide est refusé par le serveur.
6. Un client qui envoie un cosmétique non possédé ne le voit pas affiché chez l'adversaire (le serveur diffuse ce qui est en base).
7. Avec le consentement refusé dans l'EEE, seules des publicités non personnalisées sont demandées (vérifiable dans les logs du SDK).
8. Tous les événements du §7.2 apparaissent dans Firebase DebugView lors d'une partie complète de test.
9. Les tests d'intégration serveur existants (`pnpm run test`) passent toujours ; nouveaux tests pour le webhook, la SSV, le portefeuille et les règles socket ajoutées.
