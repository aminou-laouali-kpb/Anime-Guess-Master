# Checklist de soumission App Store et Google Play

> À dérouler pour la version 1.0 (bêta fermée à M3, lancement à M4). ☐ = à faire. Les points marqués **BLOQUANT** provoquent un rejet ou un retrait s'ils manquent. Références : App Review Guidelines d'Apple (numéros de règle), politiques du programme Google Play. Les exigences de version de SDK changent chaque année : les revérifier au moment de la soumission.

## A. Contenu et propriété intellectuelle — BLOQUANT (Apple 5.2, Google « Propriété intellectuelle »)

- ☐ **Casting 100 % original** livré (BUSINESS_PLAN §6.3) : `artifacts/api-server/src/data/characters.json` remplacé par les personnages originaux ; la valeur du trait « anime » devient l'univers original. Aucun nom, visuel, tenue ou accessoire signature de personnage existant (grille anti-ressemblance remplie pour chaque portrait).
- ☐ **Plus aucun portrait chargé depuis un service tiers** : `character-images.ts` désactivé ; images embarquées dans l'app ou servies par notre CDN.
- ☐ Contrats de **cession de droits** signés avec chaque illustrateur (exploitation mondiale, tous supports, adaptation pour les cosmétiques) ; esquisses archivées.
- ☐ Nom « AnimeWho » : recherche d'antériorité faite et dépôt engagé (INPI/EUIPO, classes 9, 28, 41). Sinon, renommer **avant** la première soumission (le nom d'app est réservé dans App Store Connect).
- ☐ Aucune marque, œuvre ou jeu tiers dans : nom, sous-titre, mots-clés, descriptions, captures, vidéo, icône, notes de version, textes in-app, noms des cosmétiques (Apple 2.3.7, 4.1, 5.2.1 ; Google « Métadonnées »).
- ☐ Le compte développeur est **au nom de la société titulaire des droits** (Apple 5.2 : l'app doit être soumise par le détenteur ou le licencié de la propriété intellectuelle).
- ☐ Notes pour la revue Apple : une phrase indiquant que tous les personnages et illustrations sont **originaux, créés pour l'app et cédés à la société** (contrats disponibles sur demande).

## B. Comptes développeur

- ☐ Société créée (SASU/SAS), numéro **D-U-N-S** obtenu (gratuit, quelques jours à 2 semaines) — requis par Apple pour un compte organisation.
- ☐ **Apple Developer Program** (organisation) : 99 $/an. Accords « Applications payantes » signés, informations bancaires et fiscales remplies (sinon les achats intégrés ne fonctionnent pas, même en revue). Adhésion au **App Store Small Business Program** (commission 15 %).
- ☐ **Google Play Console** (organisation) : 25 $ une fois, vérification d'identité de l'organisation (D-U-N-S), profil de paiement marchand. Un compte **personnel** créé depuis fin 2023 impose un **test fermé de 12 testeurs pendant 14 jours** avant la production : le compte organisation l'évite, mais le test fermé reste recommandé (BUSINESS_PLAN §7.3).
- ☐ Comptes **AdMob** (même compte Google que la console de préférence), **RevenueCat**, **Firebase** ; accès partagés à au moins deux personnes (pas de compte personnel unique).
- ☐ Domaine `animewho.app` (ou autre) : pages assistance, confidentialité, CGU, suppression de compte, `app-ads.txt`.

## C. Signature et build

- ☐ **iOS** : identifiant d'app `com.animewho.app` **[Hypothèse — définitif après 1re soumission]**, capacités *In-App Purchase* (et *Sign in with Apple* en phase 2) ; certificat de distribution et profil gérés par Xcode (*automatic signing*) ou par une **clé API App Store Connect** pour la CI (fastlane / Codemagic) ; clé stockée dans les secrets de la CI, jamais dans le dépôt.
- ☐ **Android** : clé d'**upload** générée (`keytool`), stockée dans un coffre (gestionnaire de mots de passe de la société) **et** sauvegardée hors ligne ; **Play App Signing** activé (Google garde la clé de signature de l'app) ; `key.properties` et `*.jks` dans `.gitignore`.
- ☐ Versions : `version: 1.0.0+1` dans `pubspec.yaml` ; le numéro de build augmente à chaque envoi. Régler **`MIN_MOBILE_VERSION`** côté serveur seulement quand une version doit être forcée.
- ☐ SDK cibles exigés à la date d'envoi : Android **targetSdk** au niveau requis par Google (API 35 obligatoire depuis le 31/08/2025 ; vérifier l'exigence 2026) ; iOS compilé avec le **SDK exigé par Apple** (iOS 26 SDK / Xcode 26 depuis avril 2026, à vérifier).
- ☐ Obfuscation Dart (`--obfuscate --split-debug-info`) et symboles envoyés à Crashlytics.
- ☐ Permissions Android minimales : `INTERNET`, `com.google.android.gms.permission.AD_ID` (pub) ; **aucune** permission de localisation, contacts, stockage.
- ☐ iOS `Info.plist` : `NSUserTrackingUsageDescription`, `GADApplicationIdentifier`, `SKAdNetworkItems` ; **Privacy manifest** (`PrivacyInfo.xcprivacy`) de l'app et des SDK.

## D. Exigences liées au compte et aux données

1. ☐ **Suppression de compte dans l'app** — BLOQUANT (Apple 5.1.1(v), Google « Suppression de compte ») : Réglages › « Supprimer mon compte » → écran d'avertissement (perte des Éclats et objets, achats non remboursés, **l'abonnement se résilie dans les réglages du store** + lien de gestion) → `DELETE /api/me` → effacement du jeton local, `Purchases.logOut()`. Fonctionne sans e-mail ni support.
2. ☐ **Restaurer mes achats** (Apple 3.1.1) dans la Boutique et les Réglages → `Purchases.restorePurchases()` puis `GET /api/me/entitlements`.
3. ☐ **URL de suppression** (Google, obligatoire dans *Sécurité des données*) : page web expliquant la suppression dans l'app **et** permettant de la demander sans l'app (formulaire avec l'identifiant de joueur visible dans Réglages › À propos → l'opérateur appelle la fonction serveur `deleteAccount(playerId)`, même effet que `DELETE /api/me` ; **[outil d'administration à prévoir]**).
4. ☐ Politique de confidentialité publiée (`POLITIQUE_CONFIDENTIALITE.md`), liée dans l'app et les fiches.
5. ☐ Formulaires **Sécurité des données** (Google) et **Confidentialité de l'app** (Apple) remplis d'après `DONNEES_STORES.md`, **après** l'intégration finale des SDK.
6. ☐ Écran d'**âge** au premier lancement (< 13 ans : accès refusé ; règles mineurs : pub non personnalisée, `verifiedOnly`).
7. ☐ Consentement **UMP** (UE/Royaume-Uni/Suisse) avant toute pub ; **ATT** après la 2e partie avec écran explicatif (Apple 5.1.2 : aucune incitation, aucune fonction conditionnée au « oui ») ; lien « Gérer mes choix publicitaires » dans les Réglages (re-affiche le formulaire UMP).

## E. Contenu généré par les utilisateurs — BLOQUANT (Apple 1.2, Google « Contenus générés par les utilisateurs »)

Les **questions libres** et les **pseudonymes** sont du contenu généré par les joueurs, vu par des inconnus. Apple exige les quatre points suivants ; le serveur fournit déjà les trois premiers (voir `docs/mobile/SERVER_CHANGES.md` §1.4).

- ☐ **Filtre** du contenu répréhensible : serveur (`moderation.ts`, FR + EN) ✅ ; enrichir la liste à partir des signalements. Le même filtre s'applique aux **pseudonymes** (remplacés par « Joueur ») ✅.
- ☐ **Signaler** : bouton sur chaque question libre reçue **et** sur l'écran de fin de partie → événement `report_player` ✅ (serveur). Confirmation à l'utilisateur.
- ☐ **Bloquer** : bouton « Bloquer ce joueur » → `block_player` ✅ ; liste des bloqués stockée par l'app et renvoyée dans le handshake ; écran « Joueurs bloqués » avec déblocage.
- ☐ **Coordonnées publiées** pour signaler un contenu (support@ / moderation@ dans l'app et sur la fiche) et **engagement de traitement** (24 h annoncées dans les CGU) : désigner qui lit `reports` et les journaux, et à quelle fréquence.
- ☐ CGU acceptées au premier lancement avec la règle « tolérance zéro » pour les contenus répréhensibles (Apple 1.2 l'attend explicitement).
- ☐ Option **« Questions vérifiées uniquement »** dans les Réglages (`set_verified_only`), activée par défaut sous 16 ans.
- ☐ Notes pour la revue Apple : décrire le filtre, le signalement, le blocage et le mode « questions vérifiées », et où les trouver dans l'app.

## F. Achats intégrés et publicité

- ☐ Produits créés **à l'identique** dans App Store Connect et Play Console (`docs/mobile/SERVER_CHANGES.md` §2.4), avec captures de revue et descriptions ; *entitlements* `no_ads` et `plus` créés dans RevenueCat ; webhook RevenueCat configuré (`REVENUECAT_WEBHOOK_AUTH`) et testé (bouton « Send test event » → réponse `noted`).
- ☐ Les achats sont soumis **avec** la version 1.0 (Apple : les premiers achats intégrés doivent être joints à une version).
- ☐ Écran d'abonnement conforme (Apple 3.1.2) : prix, durée, renouvellement automatique, essai, liens CGU et confidentialité, gestion/résiliation — **phase 2**.
- ☐ Pas de loot box ; prix des packs d'Éclats affichés en euros (Apple 3.1.1, Google « Paiements »).
- ☐ AdMob : app liée aux fiches des stores, blocs d'annonces créés, **vérification côté serveur** des vidéos récompensées configurée vers `/api/admob/ssv` ; `app-ads.txt` publié ; classement maximal des annonces *T* ; **aucune pub** sur les écrans Sélection et Partie contre un humain (Apple 4.5.4 / Google « Annonces » : pas de publicité intrusive ou inattendue). Utiliser les **identifiants de test** AdMob en développement (compte suspendu sinon).
- ☐ Firebase Remote Config : valeurs par défaut identiques à `GET /api/config` ; `banners_enabled` comme coupe-circuit.

## G. Fiches, captures et revue

- ☐ Fiches FR + EN (`FICHES_STORES.md`), catégorie, classification d'âge (IARC et Apple) remplies.
- ☐ Captures réelles avec personnages originaux, sans pub visible.
- ☐ **Notes de revue Apple** (*App Review Information*) : pas de connexion nécessaire ; comment tester une partie seul (mode « Contre l'ordinateur », ou deux appareils avec une partie privée et son code) ; où se trouvent signalement/blocage, suppression de compte, restauration ; mention du casting original. Coordonnées d'un contact joignable pendant la revue.
- ☐ Le serveur de production est **en ligne, avec base de données**, pendant la revue (sinon boutique et suppression de compte répondent 503 et la revue échoue sur 2.1 « App complète »). Vérifier `GET /api/config` → `features.wallet: true`.
- ☐ Liens profonds `animewho.app/p/CODE` : *Associated Domains* (iOS) et *App Links* vérifiés (Android) — ou retirer la fonction de la v1.
- ☐ Google : **Public cible** 13+ (pas de tranche < 13), déclaration **Annonces** (oui), **Applications gouvernementales** (non), **Applications financières** (non), **Santé** (non), **Actualités** (non).
- ☐ Bêta : TestFlight (testeurs externes = mini-revue Apple) et test fermé Google Play (12+ testeurs, 14 jours) à M3.
- ☐ Déploiement Google progressif (10 % → 50 % → 100 %) ; Apple : publication manuelle après validation, en heure creuse (un redéploiement serveur coupe les parties en cours).

## H. Serveur (état au 29/10/2026)

- ✅ Handshake mobile, version minimale (`MIN_MOBILE_VERSION`), limites CGNAT, Elo « même réseau mobile ».
- ✅ Webhook RevenueCat idempotent, vérification SSV AdMob (signature ECDSA réelle), droits, solde, boutique, équipement, suppression de compte, configuration distante, catalogue.
- ✅ Signalement, blocage, mode « questions vérifiées », filtre des questions libres.
- ✅ Filtre de mots sur les pseudonymes.
- ☐ Outil de revue des signalements ; sanctions (bannissement de profil).
- ☐ Éclats de fin de partie, quêtes, coffre, indices contre l'ordinateur (voir `SERVER_CHANGES.md` §6).
- ☐ Hébergement de production en UE (BUSINESS_PLAN §8.2 étape 1), sauvegardes de la base, supervision.
