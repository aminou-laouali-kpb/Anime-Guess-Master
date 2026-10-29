# AnimeWho — Business plan de l'application mobile

> Version 1.0 — 29 octobre 2026. Document rédigé sans pouvoir consulter le propriétaire : toutes les décisions prises par défaut sont signalées **[Hypothèse]** ou **[Décision]** et regroupées en annexe A. Les montants sont en euros, hors TVA sauf mention contraire. « M1 » désigne novembre 2026, premier mois du projet ; le lancement sur les stores est prévu à **M4 (février 2027)**.
>
> Document compagnon : [`MONETISATION_SPEC.md`](./MONETISATION_SPEC.md) (spécification technique de la monétisation pour l'app Flutter et le serveur).

---

## Sommaire

1. [Résumé exécutif](#1-résumé-exécutif)
2. [Produit et proposition de valeur](#2-produit-et-proposition-de-valeur)
3. [Analyse de marché et personas](#3-analyse-de-marché-et-personas)
4. [Analyse concurrentielle](#4-analyse-concurrentielle)
5. [Modèle économique : options, recommandation, phasage](#5-modèle-économique)
6. [Risque juridique majeur : la propriété intellectuelle](#6-risque-juridique-majeur--la-propriété-intellectuelle)
7. [Stratégie go-to-market et plan de lancement](#7-stratégie-go-to-market)
8. [Plan opérationnel et technique, équipe](#8-plan-opérationnel-et-technique)
9. [Projections financières sur 3 ans](#9-projections-financières-sur-3-ans)
10. [KPIs à suivre](#10-kpis-à-suivre)
11. [Risques et mitigations](#11-risques-et-mitigations)
12. [Feuille de route](#12-feuille-de-route)
13. [Prochaines étapes immédiates](#13-prochaines-étapes-immédiates)
- [Annexe A — Hypothèses et décisions prises par défaut](#annexe-a--hypothèses-et-décisions-prises-par-défaut)
- [Annexe B — Méthode de calcul des projections](#annexe-b--méthode-de-calcul-des-projections)
- [Annexe C — Sources](#annexe-c--sources)

---

## 1. Résumé exécutif

**Le produit.** AnimeWho est un jeu de déduction à deux joueurs, en français, sur le principe « devine le personnage secret de l'adversaire par des questions oui/non », appliqué à l'univers anime. Il fonctionne aujourd'hui en version web : parties rapides avec appariement automatique, parties privées par code à 6 caractères, parties contre l'ordinateur (3 niveaux), classement Elo, reconnexion sans perte de partie, serveur arbitre qui empêche la triche. Le code est propre, testé (tests d'intégration avec de vrais sockets, CI GitHub), et sobre en coûts (un seul processus Node.js, Postgres optionnel).

**Comment gagner de l'argent.** La réponse courte : **un modèle freemium hybride**, gratuit à télécharger, financé par :

1. **la publicité** (vidéos récompensées choisies par le joueur, interstitiels rares entre deux parties, bannière hors partie) — ≈ 37 % du chiffre d'affaires de l'An 3 (médian) ;
2. **les achats intégrés cosmétiques et de confort** (« Sans pub » à 3,99 €, packs de démarrage, dos de cartes, thèmes de plateau, packs de réactions, monnaie « Éclats ») — ≈ 38 % ;
3. puis, une fois l'audience installée, **un abonnement « AnimeWho+ »** (2,99 €/mois ou 19,99 €/an, à partir de M10) et **un pass de saison** (4,99 € par saison de 8 semaines, à partir de M16), complétés par du **sponsoring** (tournois, partenariats éditeurs/événements) à partir de la 2ᵉ année.

**Jamais de « pay-to-win »** : tout ce qui se vend est cosmétique ou de confort ; l'Elo reste un pur reflet du talent. C'est à la fois un choix d'éthique, de rétention et de réputation dans une communauté (les fans d'anime) très sensible à ces pratiques.

**Le point bloquant à régler avant toute chose : la propriété intellectuelle.** Les 165 personnages actuels (Naruto, One Piece, Demon Slayer…) et leurs portraits (récupérés sur AniList) appartiennent à Shueisha, Kodansha, Toei, etc. L'App Store (règle 5.2.1) et Google Play (politique « Propriété intellectuelle ») refusent ou retirent les apps qui utilisent sans autorisation des œuvres protégées, *a fortiori* monétisées ; les ayants droit d'anime ont commencé à demander le retrait d'apps aux stores (cas *Jujutsu Kaisen*, décembre 2025). **[Décision]** La version mobile est lancée avec **un casting 100 % original** (« AnimeWho Originals » : 120 personnages dessinés dans un style anime par des illustrateurs rémunérés, avec cession de droits), sur le même moteur de jeu et les mêmes 8 traits vérifiés. Les vrais personnages ne reviendront que **sous licence** (phase 3) ou, après validation par un avocat, sous forme de **grilles privées textuelles créées par les joueurs** (phase 2). La version web actuelle doit être alignée avant le lancement mobile (voir §6).

**Les chiffres (36 mois, M1 = novembre 2026).**

| Scénario | Installations cumulées M36 | DAU fin An 3 | CA net An 3 | Résultat An 3 | Besoin de financement max | Trésorerie cumulée M36 |
|---|---:|---:|---:|---:|---:|---:|
| Prudent | 186 000 | 1 683 | 7 193 € | −28 211 € | 109 681 € | −109 681 € |
| Prudent + plan de repli (dès M10) | 186 000 | 1 683 | 7 193 € | −4 511 € | 58 231 € | −58 231 € |
| **Médian (référence)** | **898 750** | **14 159** | **113 560 €** | **+42 000 €** | **49 890 €** | **−1 352 €** |
| Optimiste | 3 301 000 | 83 243 | 953 289 € | +695 368 € | 24 505 € | +967 426 € |

Dans le scénario médian, l'activité est **rentable chaque mois à partir de M16** (février 2028) et a remboursé son investissement initial **juste après M36**. Le seuil de rentabilité se situe autour de **6 900 joueurs actifs par jour** (DAU) avec la structure de coûts de l'An 3. **La rémunération du fondateur n'est pas incluse** **[Hypothèse]**.

**Ce qu'il faut retenir honnêtement.**
- Un jeu casual à deux joueurs rapporte **peu par joueur** (ARPDAU ≈ 0,02 € dans le médian, cohérent avec les références « casual » financé par la pub de 0,01 à 0,05 $). La valeur d'un joueur sur un an (≈ 0,20 €) est **très inférieure au coût d'acquisition payante** (≈ 1,20 € par installation). **La croissance doit donc être organique et virale** (parties privées entre amis, TikTok, créateurs de contenu, communautés), pas achetée.
- Le scénario prudent n'est pas viable comme entreprise : c'est un projet passion. Le plan prévoit des **points de décision chiffrés** (§12) pour passer en mode « repli » (coûts minimum) ou arrêter si la rétention et la croissance ne sont pas au rendez-vous à M7 et M10.
- Le besoin de financement à prévoir est de **≈ 50 000 €** (médian), dont ≈ 24 500 € avant même le lancement (développement Flutter, art original, juridique). Il peut être couvert par les fonds propres, un prêt d'honneur (Initiative France, Réseau Entreprendre) ou une aide à la création de jeu vidéo (CNC / Fonds d'aide au jeu vidéo), à étudier.

---

## 2. Produit et proposition de valeur

### 2.1 Ce qui existe aujourd'hui (constaté dans le code)

| Fonctionnalité | Détail | Où dans le code |
|---|---|---|
| Partie rapide | File d'attente et appariement automatique | `artifacts/api-server/src/lib/game-engine.ts` (`join_lobby`) |
| Partie privée | Code à 6 caractères à partager | `create_room` / `join_room` |
| Contre l'ordinateur | 3 niveaux (facile, normal, difficile) ; l'ordinateur suit exactement les mêmes règles et chronos qu'un humain et ne « voit » que ses propres réponses | `lib/bot.ts` |
| Grille | 24 personnages tirés au hasard parmi 165 issus de 47 œuvres | `data/characters.json` |
| Questions vérifiées | Le joueur choisit un trait parmi 8 (cheveux, yeux, genre, âge, espèce, camp, rôle, œuvre) : **c'est le serveur qui répond**, impossible de mentir | `VERIFIABLE_ATTRIBUTES` |
| Questions libres | Texte libre, réponse de l'adversaire marquée « non vérifiée », récapitulatif en fin de partie | `ask_question` |
| Vies et chronos | 3 vies ; 90 s pour choisir, 60 s par tour, 45 s pour répondre | constantes du moteur |
| Reconnexion | 45 s de grâce, chrono mis en pause, place rendue au joueur | sessions avec jeton secret |
| Classement Elo | Départ 1000, K = 32 ; seulement parties rapides, 1ʳᵉ manche, 2 parties classées max par paire et par jour, 5 parties minimum pour apparaître | `lib/stats.ts` |
| Réactions | 8 émojis, anti-spam 1 s | `react` |
| Revanche | Bouton revanche (jamais classée) | `request_rematch` |
| Sécurité | Limitation de débit, contrôle d'origine, adresse IP lue correctement derrière proxy, 2 000 sessions max, 20 connexions par IP | `rate-limit.ts`, `origin.ts` |
| Statistiques | Optionnelles (Postgres) ; pas de compte : jeton de profil dont seule l'empreinte SHA-256 est stockée | `lib/db` |

### 2.2 Forces différenciantes à valoriser dans l'app

1. **Serveur arbitre anti-triche** : le personnage secret n'est jamais envoyé au client avant la fin, les réponses aux questions vérifiées sont calculées par le serveur. Dans la plupart des « Guess Who » en ligne, on peut mentir ou inspecter le code de la page. C'est **l'argument qui rend un classement compétitif crédible**.
2. **Un ordinateur honnête et à 3 niveaux** : joue même quand personne n'est en ligne (problème n°1 des jeux multijoueurs naissants : la file d'attente vide). C'est aussi le mode « entraînement » et le mode hors pic.
3. **Robustesse mobile native** : la reconnexion avec 45 s de grâce et pause du chrono est exactement ce qu'il faut sur mobile (passage en arrière-plan, métro, réseau 3G).
4. **Parties privées par code** : moteur de viralité naturel (« je t'envoie le code sur WhatsApp/Snap »).
5. **Coûts d'exploitation très faibles** : un serveur à 20-40 € par mois tient des milliers de joueurs simultanés ; marge brute élevée.
6. **Qualité logicielle** : tests automatisés, CI, documentation — réduit le coût et le risque de l'adaptation mobile.

### 2.3 Proposition de valeur

> **« Le Qui-est-ce des fans d'anime : une partie de 3 minutes, à deux, où l'on ne peut pas tricher. »**

- Pour le joueur : rapide, social (amis ou inconnus), compétitif (Elo) ou détendu (ordinateur), gratuit et sans pub intrusive pendant la partie.
- Pour les parents et les stores : pas de messagerie libre entre inconnus (seulement des questions de jeu, filtrées et signalables, et des émojis), pas de loot box, pas de pay-to-win.

**[Attention]** La mention « Qui est-ce ? » est le nom commercial français du jeu *Guess Who?* de Hasbro : **ne pas l'utiliser dans le nom de l'app, l'icône, le sous-titre ni les mots-clés des stores** (règle Apple 4.1(c) et risque de marque). Formulation recommandée : « jeu de déduction anime à deux ». La mécanique de jeu elle-même (questions oui/non pour deviner) n'est pas protégeable.

---

## 3. Analyse de marché et personas

### 3.1 Taille et dynamique

| Indicateur | Valeur | Source |
|---|---|---|
| Marché mondial de l'anime 2024 | 33,6 Md$ (IMARC) à 38,7 Md$ (Straits) ; projection ≈ 60 Md$ d'ici 2030-2033 | IMARC ; Taylor Wessing (2025) |
| Fans d'anime dans le monde | > 800 millions (estimation) | Taylor Wessing (2025) |
| Abonnés payants Crunchyroll | 17 M (mai 2025) → 21 M (mai 2026) | Anime By The Numbers ; Broadband TV News |
| France | 2ᵉ marché mondial du manga derrière le Japon ; ≈ 36 M de mangas vendus en 2024 (≈ 309 M€), en recul depuis le pic de 2022 | GfK/NielsenIQ via Revue Conflits, Livres Hebdo |
| Audience anime en France | +20 à 35 % de visionnage en 2024 dans plusieurs pays européens dont la France | Taylor Wessing (2025) |
| Francophones dans le monde | 321 M (OIF 2022) ; 396 M (OIF, rapport 2026), dont plus de 60 % des locuteurs quotidiens en Afrique | OIF via Centre Inffo, Financial Afrik |
| Afrique / Moyen-Orient (anime) | ≈ 2,1 Md$ en 2025 | GlobalData |

Lecture : la cible n'est pas « le marché de l'anime » (dominé par le streaming et le merchandising) mais **les fans francophones de 13-35 ans qui jouent sur mobile**. On peut raisonnablement l'estimer à **plusieurs millions de personnes** en France, Belgique, Suisse et Québec, et à plusieurs dizaines de millions en Afrique francophone et au Maghreb, où la culture anime est forte (héritage des diffusions TV en français) et le mobile est le premier écran. **[Hypothèse]** Aucune donnée fiable ne permet de chiffrer précisément ce segment ; les projections du §9 sont donc construites « par le bas » (installations, rétention) et non en part de marché.

### 3.2 Zones géographiques

| Zone | Atout | Limite | Rôle dans le plan |
|---|---|---|---|
| France | 2ᵉ marché manga, Japan Expo, fort pouvoir d'achat, eCPM « tier 1 » | Concurrence pour l'attention | Cœur de cible, ≈ 45 % des joueurs **[Hypothèse]** |
| Belgique, Suisse, Luxembourg | Mêmes codes, pouvoir d'achat élevé | Petits volumes | ≈ 7 % |
| Québec / Canada francophone | Communauté anime active (Otakuthon à Montréal), eCPM élevé | Accents et vocabulaire à adapter (FR-CA) | ≈ 8 % |
| Afrique francophone (Côte d'Ivoire, Sénégal, Cameroun, RDC…) et Maghreb | Volume, jeunesse, culture anime ancienne, mobile-first | Revenu par joueur faible (eCPM 5 à 10 fois plus bas), data chère, Android d'entrée de gamme | ≈ 35 % des joueurs, ≈ 10 % des revenus |
| Autres | — | — | ≈ 5 % |

**Conséquences produit** : app légère (< 40 Mo), images compressées et embarquées, mode économie de données, Android prioritaire autant qu'iOS, prix localisés (les stores proposent des grilles de prix par pays).

### 3.3 Internationalisation

Le jeu se prête très bien à la traduction : peu de texte, des traits normalisés (`fr.ts` traduit déjà les valeurs). Ordre recommandé **[Décision]** :
1. **Anglais** (M10-M12) : marché le plus large, eCPM élevés, mais concurrence forte — lancer d'abord au Royaume-Uni, Canada, Australie, Philippines, Inde (tests ASO à faible coût).
2. **Espagnol** (M13-M18) : Amérique latine (Mexique, Argentine, Chili) très fan d'anime, eCPM moyens ; Espagne.
3. **Portugais brésilien** (M13-M18) : Brésil, l'un des plus gros marchés anime et mobile au monde.

Chaque langue = traductions de l'interface + des noms de traits + ASO local + une file d'appariement par langue (ou commune, les questions vérifiées étant traduites côté client — avantage technique du système de traits).

### 3.4 Personas

| Persona | Profil | Besoins | Ce qu'il/elle paie |
|---|---|---|---|
| **Inès, 16 ans, lycéenne à Lyon** | iPhone, TikTok et Crunchyroll, joue entre deux cours avec ses amies | Parties courtes, jouer avec ses amies, se montrer (cosmétiques, rang) | Petits achats (0,99-2,99 €) via cartes cadeaux ; regarde volontiers une vidéo pour un bonus |
| **Karim, 23 ans, étudiant à Abidjan** | Android d'entrée de gamme, forfait data limité | App légère, pas de chargement, jouer contre des inconnus et l'ordinateur | Rarement d'argent ; **source de revenu publicitaire** (vidéos récompensées) et de volume pour l'appariement |
| **Julien, 31 ans, développeur à Montréal** | Joue avec sa conjointe et des collègues, compétitif | Classement, saisons, pas de pub agressive | « Sans pub » ou abonnement AnimeWho+, pass de saison |
| **Sophie, 39 ans, mère à Bruxelles** | Joue avec ses enfants de 13 et 15 ans | Contenu sûr, pas de chat avec des inconnus, pas d'achats piégeux | Achat unique « Sans pub », éventuellement un pack de thème |
| **Théo, 20 ans, créateur TikTok anime (8 k abonnés)** | Fait des vidéos « je devine ton perso » | Format filmable, partie privée avec ses abonnés, codes de parrainage | Rien ; c'est un **canal d'acquisition** (programme créateurs) |

---

## 4. Analyse concurrentielle

| Concurrent | Type | Modèle économique | Forces | Faiblesses vs AnimeWho |
|---|---|---|---|---|
| **Akinator** (Elokence, France) | Le génie devine ton personnage (solo) | Freemium : bannières, interstitiels, vidéos récompensées, premium sans pub + personnages, app VIP payante ; CA estimé 3-4 M€/an | Notoriété mondiale, inclut des persos d'anime | Solo, pas de duel ; pubs jugées envahissantes (note ≈ 3/5 sur l'App Store selon OMR) |
| **Guess Who? Meet the Crew** (Hasbro) | Version officielle mobile | Licence Hasbro | Marque | Solo, 6 personnages, pas d'anime |
| **Pogo, Tabletopia, sites « Guess Who online »** | Web multijoueur | Pub / abonnement plateforme | Gratuits | Pas d'anime, pas mobile natif, triche possible |
| **Quiz anime** (ex. *Guess the Anime Quiz* de Jomaier sur Android, *Anime Quiz – Trivia Questions* sur iOS) | Quiz images / lettres, solo | Pub + achats d'indices | Volume de recherches « anime quiz » | Solo, utilisent souvent des images sous droits (même risque IP) |
| **Roblox « Guess the Anime »** | Jeux dans Roblox | Robux | Énorme audience (une expérience à 18,4 M de visites) | Hors stores en tant qu'app autonome ; public plus jeune |
| **Jeux de soirée en ligne** (Gartic Phone, skribbl.io, Codenames en ligne) | Party games web | Pub / gratuit | Viralité entre amis | Pas d'anime, pas de classement 1v1 |

**Positionnement** : AnimeWho est le seul à combiner **duel 1v1 en temps réel + univers anime + équité garantie par le serveur + ordinateur de secours + classement**. Le positionnement « anti-triche et sans pay-to-win » est un argument de communication.

**Leçon d'Akinator** (le cas le plus proche, et français) : un jeu de « devinette de personnage » peut faire plusieurs millions d'euros par an avec un modèle pub + premium, **mais** une pression publicitaire forte dégrade la note sur les stores. D'où les règles anti-frustration de la spec.

---

## 5. Modèle économique

### 5.1 Comparaison des options

Notation : ★ faible → ★★★★★ fort. « Risque » = risque de dégrader l'expérience, de rejet store ou réglementaire.

| Option | Potentiel de revenu | Effort de dev | Risque | Adéquation au jeu | Verdict |
|---|---|---|---|---|---|
| **App payante (ex. 2,99 €)** | ★ | ★ | Faible | Mauvaise : un jeu multijoueur a besoin de volume pour l'appariement ; le paiement à l'entrée tue la viralité | ❌ Rejeté |
| **Freemium + publicité** (récompensée, interstitielle, bannière) | ★★★ | ★★ | Moyen (frustration si excès) | Bonne : parties courtes = pauses naturelles entre deux parties | ✅ Phase 1 |
| **Suppression des pubs (achat unique)** | ★★ | ★ | Faible | Excellente, attendue par les joueurs | ✅ Phase 1 |
| **Achats cosmétiques** (dos de cartes, thèmes de plateau, cadres de profil, réactions, animations de victoire) | ★★★ | ★★★ (art + serveur pour afficher à l'adversaire) | Faible | Très bonne : l'adversaire **voit** vos cosmétiques → désir social | ✅ Phase 1 (catalogue réduit), étoffé ensuite |
| **Monnaie virtuelle « Éclats »** (gagnée en jouant, achetable) | ★★★ | ★★ | Moyen (réglementation, transparence) | Bonne : relie pub récompensée, quêtes et boutique | ✅ Phase 1 (une seule monnaie, pas de loot box) |
| **Packs de personnages / thèmes** (nouveaux castings originaux) | ★★ | ★★★ | Faible si l'hôte paie seul | Bonne si **l'hôte d'une partie privée choisit le thème et l'invité joue gratuitement** (viral) | ✅ Phase 2 |
| **Abonnement « AnimeWho+ »** | ★★★ | ★★ | Faible | Bonne pour les joueurs réguliers (sans pub + cosmétique mensuel + statistiques avancées + tous les thèmes en partie privée) | ✅ Phase 2 (M10) |
| **Pass de saison** (battle pass gratuit + premium) | ★★★★ | ★★★★ | Moyen | Bonne une fois le classement saisonnier en place | ✅ Phase 3 (M16) |
| **Tournois** | ★★ | ★★★ | **Élevé si entrée payante** (en France, un jeu d'argent avec mise et hasard relève de l'ANJ) | Bonne pour l'engagement et le sponsoring | ✅ Phase 3, **inscription gratuite uniquement**, lots offerts par sponsors, règlement déposé |
| **Sponsoring / partenariats** (éditeurs de manga, conventions, marques) | ★★ | ★ | Faible (attention à l'IP des partenaires) | Bonne : audience très ciblée | ✅ Dès An 2 |
| **Loot boxes / gacha** | ★★★★ | ★★★ | **Très élevé** (obligation d'afficher les probabilités chez Apple, débat réglementaire en Europe, réputation) | Mauvaise | ❌ Rejeté |
| **Vente de données** | — | — | Inacceptable (RGPD, confiance) | — | ❌ Rejeté |
| **Avantages en jeu payants** (indices en partie classée, vies en plus) | ★★★ | ★ | Très élevé : tue l'Elo et la communauté | — | ❌ Rejeté en JcJ ; **toléré contre l'ordinateur uniquement**, via vidéo récompensée |

### 5.2 Recommandation

> **[Décision] Modèle freemium hybride « équitable » : publicité opt-in d'abord, cosmétiques et confort ensuite, abonnement et pass de saison quand l'audience est là. Rien qui donne un avantage en partie classée.**

Pourquoi :
1. **L'audience sera majoritairement non payante** (≈ 98,5 % des joueurs mensuels ne paient pas dans le médian) et en partie dans des pays à faible pouvoir d'achat : la publicité est le seul moyen de monétiser ces joueurs, et la **vidéo récompensée** est le format le mieux payé et le mieux accepté parce qu'il est choisi.
2. **Les cosmétiques ont un vrai levier social** dans un jeu 1v1 : l'adversaire voit votre dos de carte, votre cadre et vos réactions à chaque partie.
3. **L'achat « Sans pub » et l'abonnement** captent les joueurs fidèles qui détestent la pub (Julien, Sophie) ; ils sont simples à comprendre.
4. **Le pass de saison** est le levier de revenu le plus fort des jeux F2P modernes, mais il exige un flux régulier de contenu et un classement saisonnier : on le repousse à la phase 3, quand le jeu a prouvé sa rétention.
5. **L'équité** est la promesse produit. Toute monétisation qui la casse détruit la valeur.

### 5.3 Phasage

| Phase | Période | Monétisation activée |
|---|---|---|
| **Phase 1 — Lancement** | M4 → M9 | Vidéos récompensées ; interstitiel plafonné ; bannière hors partie ; « Sans pub » 3,99 € ; Pack de démarrage 1,99 € ; packs d'Éclats 0,99 / 4,99 / 9,99 € ; boutique cosmétique (≈ 30 objets) ; coffre quotidien |
| **Phase 2 — Fidélisation** | M10 → M15 | Abonnement AnimeWho+ (2,99 €/mois, 19,99 €/an) ; packs de thèmes/personnages originaux 2,99 € (l'hôte d'une partie privée en fait profiter l'invité) ; parrainage ; premiers partenariats |
| **Phase 3 — Saisons et compétition** | M16 → M36 | Pass de saison 4,99 € (8 semaines, voie gratuite + voie premium) ; classement saisonnier ; tournois gratuits sponsorisés ; licences officielles éventuelles ; collaborations avec des créateurs |

### 5.4 Répartition attendue du chiffre d'affaires (médian, An 3)

| Source | Montant net An 3 | Part |
|---|---:|---:|
| Publicité | 41 594 € | 37 % |
| Achats intégrés ponctuels | 42 865 € | 38 % |
| Abonnement AnimeWho+ | 5 693 € | 5 % |
| Pass de saison | 11 408 € | 10 % |
| Sponsoring / partenariats | 12 000 € | 11 % |
| **Total** | **113 560 €** | 100 % |

*(Les parts sont arrondies et peuvent ne pas totaliser exactement 100 %.)*

---

## 6. Risque juridique majeur : la propriété intellectuelle

### 6.1 Le constat, sans détour

| Élément actuel | Titulaire des droits | Problème |
|---|---|---|
| **Noms et identité visuelle des personnages** (Naruto Uzumaki, Luffy, Tanjiro, Gojo…) | Éditeurs (Shueisha, Kodansha, Shogakukan…), studios (Toei, MAPPA, ufotable…), comités de production | Les personnages sont protégés par le droit d'auteur (création originale) et souvent **déposés comme marques** |
| **Portraits** chargés depuis AniList (`character-images.ts`) | Les mêmes ayants droit — AniList ne fait qu'héberger des images dont il n'est pas propriétaire | Reproduction d'œuvres protégées. En plus, les conditions de l'API AniList imposent une **licence commerciale au-delà de 150 $ de revenus par mois** et interdisent la collecte massive de données |
| **Noms d'œuvres** dans le trait « anime » et dans le marketing (« Naruto, One Piece, Demon Slayer… » dans la page web) | Marques des éditeurs | Usage commercial de marques tierces dans les métadonnées = motif de rejet store |
| Formule « Qui est-ce ? » | Hasbro | Nom commercial d'un jeu concurrent |

**Ce que disent les stores :**
- **Apple, règle 5.2.1** : « N'utilisez pas de matériel tiers protégé (marques, œuvres protégées par le droit d'auteur…) sans autorisation… Les apps doivent être soumises par la personne ou l'entité qui possède ou a obtenu sous licence la propriété intellectuelle. » Règle 5.2.2 : l'usage de contenus d'un service tiers (AniList) doit être explicitement autorisé par ses conditions. Règle 4.1(c) : pas de marque d'un autre dans le nom ou l'icône.
- **Google Play, politique « Propriété intellectuelle / usage non autorisé de contenus protégés »** : interdit les apps qui enfreignent le droit d'auteur ; même un contenu modifié peut constituer une violation ; Google peut demander la preuve des droits ; « l'approche la plus sûre est de créer quelque chose d'original ».

**Ce que font les ayants droit :** en décembre 2025, le comité de production de *Jujutsu Kaisen* a annoncé qu'il demanderait aux plateformes le retrait des jeux mobiles non licenciés reprenant ses personnages, **y compris des personnages « étrangement similaires »** ; une page App Store a disparu peu après. Bandai Namco a fait retirer de Google Play un jeu de fan *Sailor Moon*. Shueisha mène une veille active sur les contenus liés à ses œuvres.

**Conclusion honnête :** publier l'app actuelle telle quelle sur les stores, monétisée, a une **probabilité élevée de rejet à la revue** (Apple surtout) et, si elle passe, un **risque élevé de retrait** dès qu'elle gagne en visibilité — c'est-à-dire précisément au moment où elle commencerait à rapporter. Le risque inclut aussi la suspension du compte développeur (qui bloque toutes les apps futures) et, en théorie, une action en contrefaçon. **Ce risque est incompatible avec un plan d'affaires.**

### 6.2 Stratégies possibles

| Stratégie | Faisabilité | Risque juridique | Coût | Impact sur l'attrait | Verdict |
|---|---|---|---|---|---|
| A. Garder les vrais personnages et portraits, monétiser | Immédiate | **Très élevé** | 0 € | Maximal | ❌ |
| B. Garder les vrais personnages, app gratuite sans pub (« mode fan ») | Immédiate | Élevé (la gratuité n'est pas une autorisation ; rejet 5.2.1 probable) ; aucune source de revenu | 0 € | Maximal | ❌ pour les stores |
| C. **Casting 100 % original, style anime, archétypes génériques** (« le ninja blond tête brûlée », « la chasseuse de démons au sabre ») | 2-3 mois | **Faible** si pas de ressemblance avec des personnages existants (contrôle anti-ressemblance) | ≈ 6 000 € pour 120 portraits, puis ≈ 700 €/mois de nouveaux contenus | Bon : le plaisir vient de la déduction et de l'esthétique ; on perd la reconnaissance immédiate | ✅ **Retenu pour la v1** |
| D. Licences officielles (éditeurs, studios) | 6-24 mois de négociation | Nul | Minimum garanti de plusieurs dizaines de milliers d'euros + 5-15 % de royalties pour une grande licence ; hors de portée au début | Maximal | ⏳ Phase 3, en commençant par des **licences accessibles** : manga français (« manfra »), webtoons, créateurs indépendants, VTubers, en partage de revenus sans minimum garanti |
| E. Grilles personnalisées créées par les joueurs (texte seulement, privées) | 1-2 mois | Moyen : les noms seuls sont faiblement protégés, mais l'hébergement de listes de personnages tiers reste à valider ; images interdites | Faible + modération | Fort pour les parties entre amis | ⏳ Phase 2, **après avis d'avocat**, jamais mis en avant dans les métadonnées des stores, uniquement en partie privée |
| F. Contenu généré par la communauté **avec images** | — | Élevé (les joueurs téléverseraient des images sous droits ; obligations de modération Apple 1.2, DSA) | Élevé | — | ❌ |
| G. Portraits générés par IA « à la manière de » | Rapide | Élevé (ressemblance, incertitude sur les droits, rejet communautaire) | Faible | Mauvais pour l'image | ❌ |

### 6.3 Décision et mise en œuvre

**[Décision]**
1. **App mobile v1 = casting original « AnimeWho Originals »** : 120 personnages (5 grilles de 24 possibles, assez pour la variété), 8 univers originaux (par ex. *Académie des Arcanes*, *Néo-Tokyo 2099*, *Clan des Lames*, *Lycée Sakura*, *Pirates du Ciel*, *Mechas*, *Esprits et Yokai*, *Sport Shōnen*), répartis pour que les 8 traits restent discriminants. Le moteur et le format de `characters.json` ne changent pas ; la valeur du trait « anime » devient l'**univers original**.
2. **Commande à des illustrateurs** (France/Belgique/Afrique francophone : cohérent avec l'image du projet) avec **contrat de cession de droits d'auteur** écrit (exploitation mondiale, tous supports, durée légale, droit d'adaptation pour les cosmétiques) ; brief interdisant toute référence identifiable ; **revue anti-ressemblance** (grille de contrôle : coiffure + couleur + accessoire signature + tenue ne doivent pas reproduire un personnage connu) ; conservation des esquisses (preuve d'antériorité et d'originalité).
3. **Arrêt du chargement depuis AniList** : images embarquées dans l'app / servies par notre CDN. Le trait « anime » n'affiche plus de titres d'œuvres.
4. **Version web** : **[Décision]** la version web actuelle (vrais personnages) est **migrée vers le même casting original au moment du lancement mobile** (même serveur, même données, cross-play web/mobile, et le site devient une vitrine qui renvoie vers les stores). La maintenir en parallèle avec les vrais personnages créerait un lien commercial avec l'app monétisée et exposerait le compte développeur. *Option laissée au propriétaire* : conserver une archive « édition fan » non monétisée, non référencée, sans lien vers l'app — déconseillé.
5. **Marque** : recherche d'antériorité et dépôt de « AnimeWho » (INPI et/ou EUIPO, classes 9, 28 et 41) avant le lancement ; ne jamais utiliser « Qui est-ce ? ». Si la marque est indisponible, renommer avant le lancement (coût quasi nul à ce stade).
6. **Consultation d'un avocat en propriété intellectuelle** (≈ 1 500 €, inclus dans le budget juridique de 3 000 € à M1) : contrat d'illustrateur, CGU, grilles personnalisées (phase 2), règlement de tournoi (phase 3).

### 6.4 Impact sur le plan

- **Coût** : +≈ 6 000 € d'art initial et ≈ 700 €/mois ensuite (déjà intégrés au §9).
- **Délai** : la production des 120 portraits (≈ 8-10 semaines avec 2-3 illustrateurs) est sur le chemin critique du lancement à M4.
- **Attractivité** : on perd la reconnaissance immédiate (« c'est Naruto ! »). Compensations : (1) l'esthétique et l'humour des personnages originaux deviennent **la marque propre du jeu** (mascottes, stickers, merchandising possible plus tard — impossible avec des personnages sous licence) ; (2) le marketing s'appuie sur le *format* (« devine mon perso en 3 minutes ») ; (3) les grilles privées et les futures licences ramèneront des univers connus.
- **Rétention** : les hypothèses du scénario médian (D1 30 %) intègrent ce handicap ; c'est la raison principale pour laquelle le scénario prudent existe.
- **Valeur de l'actif** : un casting original est **un actif possédé**, qui a de la valeur lors d'une levée de fonds ou d'une revente ; un jeu bâti sur des IP tierces n'en a aucune.

---

## 7. Stratégie go-to-market

### 7.1 Principes

1. **Pas d'acquisition payante à grande échelle** tant que la valeur d'un joueur (LTV ≈ 0,20 € sur 365 jours dans le médian) reste inférieure au coût par installation (≈ 1,20 €). Un petit budget de **test** (300 à 800 €/mois dans le médian) sert à apprendre quelles vidéos convertissent, pas à acheter du volume ; il est coupé si le retour sur dépenses à 30 jours reste sous 30 %.
2. **La boucle virale est le moteur** : chaque partie privée envoie un lien d'invitation (lien profond `animewho.app/p/CODE` qui ouvre l'app ou la page du store). Objectif : coefficient viral K ≥ 0,3.
3. **Le contenu court est le média principal** : le format « devine mon personnage » est naturellement filmable.

### 7.2 Leviers

| Levier | Actions | Coût | Indicateur |
|---|---|---|---|
| **ASO** (référencement stores) | Titre « AnimeWho : duel de déduction anime » ; mots-clés FR (jeu anime, quiz manga, deviner personnage, jeu à deux, jeu entre amis en ligne) ; **jamais de noms d'œuvres ni « Qui est-ce »** ; captures montrant le duel et la grille ; vidéo de 20 s ; tests A/B d'icônes (Google Play Store listing experiments, Apple Product Page Optimization) ; réponses aux avis | Temps | Taux de conversion fiche → installation > 30 % |
| **TikTok / Instagram Reels / YouTube Shorts** | 3 vidéos par semaine : parties commentées, « 3 questions pour trouver », réactions, création des personnages originaux (« making-of » des illustrateurs), sondages (« quel perso original vous préférez ? ») | 0-500 €/mois (montage freelance) | Vues, installations attribuées par lien |
| **Créateurs anime francophones** | Programme créateurs : 30-50 micro-créateurs (5 k-100 k abonnés) en France, Belgique, Québec, Côte d'Ivoire, Sénégal ; code créateur (cosmétique exclusif pour leurs abonnés) ; parties privées en live avec leur communauté | Cosmétiques + 50-300 € par vidéo | Installations par code |
| **Discord** | Serveur officiel : annonces, tournois communautaires, retours de bugs, vote sur les prochains personnages | Temps | Membres actifs |
| **Reddit et forums** | r/anime (règles strictes : seulement en discussion appropriée), r/AnimeFrance, r/france (jeux), r/boardgames (mécanique) | Temps | — |
| **Conventions** | Japan Expo (Paris, juillet, > 250 000 visiteurs revendiqués) : pas de stand à plein prix au début, plutôt partenariat avec un stand d'éditeur ou d'association, tournoi sur tablettes, cartes avec QR code ; puis Paris Manga, Made in Asia (Bruxelles), Otakuthon (Montréal), festivals anime d'Abidjan et Dakar | 1 500 €/an budgétés (médian) | Installations par QR code |
| **Presse et blogs** | Jeuxvideo.com, Gamekult, Journal du Geek, Anime-Kun, Nautiljon (communiqué au lancement) | Temps | Retombées |
| **Communautés scolaires** | Le jeu est sain : clubs manga de lycées, médiathèques (événements « jeux »), sans démarchage de mineurs | Temps | — |
| **Parrainage** (phase 2) | Le parrain et le filleul reçoivent 100 Éclats quand le filleul termine 3 parties | Coût virtuel | K-factor |

### 7.3 Plan de lancement

| Quand | Étape |
|---|---|
| M1-M2 | Serveur Discord, comptes TikTok/Instagram/YouTube, début du « making-of » des personnages originaux (constitution d'une audience avant la sortie) |
| M3 | **Bêta fermée** : TestFlight (iOS) et test fermé Google Play (obligatoire pour les nouveaux comptes développeurs personnels : 12 testeurs pendant 14 jours) ; 200-500 testeurs issus du Discord |
| M3 | **Soft launch** en Belgique et au Québec (Google Play) pour mesurer D1/D7 et ajuster la pub |
| M4 (février 2027) | **Lancement** France + francophonie ; campagne créateurs (10-20 vidéos la même semaine) ; communiqué de presse ; événement « tournoi de lancement » sur Discord |
| M5-M6 | Première mise à jour de contenu (nouvel univers), mise en avant demandée aux stores (formulaire Apple « Featuring nominations », Google Play Console) |
| M9 (juillet 2027) | Japan Expo : tournoi communautaire et cartes à QR code |
| M10-M12 | Lancement de l'abonnement, version anglaise |

---

## 8. Plan opérationnel et technique

### 8.1 Architecture cible

```
┌──────────────────┐   Socket.IO (WSS)   ┌───────────────────────────┐
│ App Flutter      │ ───────────────────▶│ api-server (Node 24)      │
│ iOS + Android    │   HTTPS (REST)      │ moteur de jeu inchangé    │
│ - socket_io_client│◀───────────────────│ + comptes / droits /      │
│ - google_mobile_ads                    │   portefeuille / boutique │
│ - purchases_flutter (RevenueCat)       └──────────┬────────────────┘
│ - firebase_analytics / remote_config              │
└──────────────────┘                     ┌──────────▼──────────┐
        ▲                                │ PostgreSQL (géré)    │
        │ webhooks (achats, remboursements)│ joueurs, Elo, achats │
┌───────┴─────────┐  SSV (pub récompensée)└─────────────────────┘
│ RevenueCat /    │──────────────────────▶ /api/... (validation serveur)
│ AdMob           │
└─────────────────┘
```

- **Client Flutter** : réécriture de l'interface (≈ 5 écrans : Accueil, File d'attente, Sélection, Partie, Fin + Boutique, Profil, Classement, Réglages). Le protocole temps réel existe (`socket.ts` côté web) : le client Dart reprend les mêmes événements. Le contrôle d'origine du serveur laisse déjà passer les clients sans en-tête `Origin` (applications natives).
- **Serveur** : le moteur reste tel quel. Ajouts : comptes (anonymes + liaison Sign in with Apple / Google), droits et portefeuille (voir spec), API boutique, validation des achats et des récompenses publicitaires, cosmétiques équipés diffusés dans `room_joined` / `game_start`.
- **Web** : conservé comme vitrine, page d'invitation (liens profonds) et cross-play.

### 8.2 Passage à l'échelle de l'état en mémoire

Aujourd'hui, tout l'état des parties vit dans un seul processus (d'où le Reserved VM Replit). C'est **un bon choix pour les deux premières années** : un processus Node.js gère sans difficulté quelques milliers de connexions Socket.IO pour un jeu au tour par tour peu bavard.

Charge prévue (pic de connexions simultanées ≈ DAU × 15 min/jour ÷ 1 440 × 3 pour le pic du soir **[Hypothèse]**) :

| Scénario | Pic fin An 1 | Pic fin An 2 | Pic fin An 3 |
|---|---:|---:|---:|
| Prudent | 16 | 34 | 53 |
| Médian | 92 | 239 | 442 |
| Optimiste | 408 | 1 195 | 2 601 |

Points d'attention identifiés dans le code :
1. **`MAX_SESSIONS = 2 000`** : plafond atteint dans le scénario optimiste en An 3 → à relever après un test de charge (k6 / Artillery avec de vrais sockets, comme les tests d'intégration existants).
2. **`MAX_CONNECTIONS_PER_IP = 20`** et règle Elo « deux adresses différentes » : sur mobile, **les opérateurs partagent une même adresse IP entre des milliers d'abonnés (CGNAT)**, très courant en Afrique et chez les opérateurs mobiles français. Il faut, pour les clients authentifiés, raisonner par compte/appareil plutôt que par IP (limite par IP relevée, règle anti-collusion Elo basée sur le compte + l'appareil).
3. **Redéploiement = parties coupées** : ajouter un arrêt gracieux (refuser les nouvelles parties, laisser finir les parties en cours, max 10 min) et déployer aux heures creuses.
4. **Arrière-plan mobile** : iOS suspend la connexion quelques secondes après la mise en arrière-plan. Les 45 s de grâce couvrent un coup d'œil à un message ; prévoir un message clair et le retour automatique dans la partie.

Évolution par étapes :
- **Étape 1 (M1-M3)** : quitter Replit pour un VPS en Europe (Hetzner, Scaleway ou OVH : 5-20 €/mois, données dans l'UE pour le RGPD) + Postgres géré (≈ 15 €/mois) + sauvegardes + supervision (Sentry, Uptime Kuma). Coût ≈ 40 €/mois.
- **Étape 2 (quand le pic dépasse ≈ 1 500 connexions ou si le CPU dépasse 50 %)** : sessions et file d'appariement dans **Redis** ; plusieurs processus ; chaque partie reste attachée à **un** processus (routage par code de partie, « sticky ») ; adaptateur Socket.IO Redis pour les messages croisés. C'est la principale dette technique à rembourser en An 2 dans le scénario optimiste (≈ 3-4 semaines de développement).
- **Étape 3** : régions multiples (Europe + Amérique du Nord) si l'anglais décolle.

### 8.3 Coûts d'exploitation

| Poste | Hypothèse | Coût |
|---|---|---|
| Hébergement + base + supervision | 40 €/mois + 0,004 € par DAU et par mois | 40-400 €/mois selon scénario |
| Comptes développeur | Apple 99 $/an (≈ 92 €), Google 25 $ une fois (≈ 23 €) | ≈ 115 € la 1ʳᵉ année, 92 €/an ensuite |
| Commission des stores | 15 % (programme Small Business d'Apple et taux réduit Google sur le premier million de $ annuel ; abonnements à 15 %) | Intégré au revenu net |
| RevenueCat | Gratuit jusqu'à 2 500 $ de revenu suivi par mois, puis 1 % | Intégré |
| AdMob, Firebase Analytics, Remote Config, Crashlytics | Gratuits | 0 € |
| TVA | Collectée et reversée par les stores (prix affichés TTC) | Intégré (÷ 1,2) |

### 8.4 Équipe

| Rôle | Qui | Quand | Coût dans le plan |
|---|---|---|---|
| Fondateur : produit, serveur Node, communauté, partenariats | Propriétaire | Dès M1 | **Non rémunéré [Hypothèse]** |
| Développeur Flutter | Freelance (forfait v1 ≈ 15 000 €), puis maintenance 1 500 €/mois | M1-M3 puis continu | Inclus |
| Illustrateurs (2-3) | Freelances, contrats de cession | M1-M3 puis ≈ 24 portraits/trimestre + cosmétiques | Inclus |
| Montage vidéo / community management | Freelance à temps partiel | Dès M4 (marketing) ; 1 000 €/mois en An 3 (médian) | Inclus |
| Avocat PI, expert-comptable | Prestataires | M1, puis annuel | Inclus |
| Embauches (optimiste uniquement) | 1 dev + 1 CM en An 2 (6 000 €/mois chargés), 2 devs + CM en An 3 (11 000 €/mois) | M13+ | Inclus |

**Structure juridique [Hypothèse]** : SAS/SASU en France (≈ 300 € de création), nécessaire pour signer les contrats de cession, recevoir les paiements des stores et d'AdMob, et déposer la marque.

---

## 9. Projections financières sur 3 ans

### 9.1 Hypothèses par scénario

| Hypothèse | Prudent | Médian | Optimiste | Repère de marché |
|---|---:|---:|---:|---|
| Installations organiques par mois — An 1 / An 2 / An 3 | 3 000 / 5 500 / 7 500 | 11 000 / 24 000 / 40 000 | 32 000 / 80 000 / 160 000 | — |
| Multiplicateur du mois de lancement (M4) | ×2 | ×2,5 | ×3 | — |
| Budget d'acquisition payante (test) par mois — An 1/2/3 | 0 / 0 / 0 € | 300 / 500 / 800 € | 1 000 / 2 000 / 3 000 € | — |
| Coût par installation payante | 1,50 € | 1,20 € | 1,00 € | Casual/puzzle : 0,80-2,00 $ Android, 1,50-3,50 $ iOS (Admiral Media 2025) |
| Rétention J1 / J7 / J30 | 25 % / 6,7 % / 2,5 % | 30 % / 9,5 % / 4 % | 38 % / 13,2 % / 6 % | Médiane J1 ≈ 22 %, J7 ≈ 4 %, J30 ≈ 0,7 % ; top 10 % : 40 % / 12 % / 4 % (GameAnalytics, données 2025) |
| Ratio DAU/MAU | 15 % | 18 % | 20 % | Casual : 10-20 % |
| eCPM nets mélangés (récompensée / interstitiel / bannière) | 5 / 3 / 0,30 € | 7 / 4,5 / 0,40 € | 9 / 6 / 0,50 € | US : interstitiel ≈ 14 $ (Appodeal T4 2024), récompensée tier 1 15-30 $ ; Afrique, Amérique latine nettement plus bas |
| Impressions par DAU et par jour (récompensée / interstitiel / bannière) | 0,5 / 0,9 / 2 | 0,6 / 1,0 / 2 | 0,7 / 1,1 / 2 | Cohérent avec les plafonds de la spec |
| Joueurs sans pub (achat ou abonnement) | 1 % | 1,5 % | 2 % | — |
| Conversion mensuelle en payeur (achats ponctuels) | 0,8 % des MAU | 1,5 % | 2,5 % | 1-5 % (guides éditeurs) |
| Dépense mensuelle moyenne par payeur (TTC) | 4 € | 5 € | 6 € | — |
| Abonnés AnimeWho+ (dès M10) | 0,2 % des MAU | 0,4 % | 0,7 % | — |
| Acheteurs du pass par saison de 2 mois (dès M16) | 0,4 % des MAU | 0,8 % | 1,2 % | — |
| Sponsoring par mois — An 2 / An 3 | 0 / 0 € | 300 / 1 000 € | 1 000 / 3 000 € | — |
| Marketing par mois (hors acquisition) — An 1/2/3 | 300 / 300 / 400 € | 800 / 1 200 / 1 500 € | 1 500 / 2 500 / 4 000 € | + 3 000 € au lancement, + 1 500 € Japan Expo chaque juillet |
| Équipe salariée / CM par mois — An 1/2/3 | 0 / 0 / 0 € | 0 / 0 / 1 000 € | 0 / 6 000 / 11 000 € | — |

**Hypothèses communes** : M1-M3 sans revenu (développement) ; développement 5 000 €/mois sur M1-M3 (v1 ≈ 15 000 €) puis 1 500 €/mois ; art 2 000 €/mois sur M1-M3 (120 portraits) puis 700 €/mois ; juridique 3 000 € à M1 puis 500 €/an ; administratif 300 € à M1 puis 100 €/mois ; achats : prix TTC ÷ 1,2 (TVA) × 0,85 (commission 15 %) = **70,8 % du prix payé** revient à l'entreprise ; abonnement : 2,49 € TTC de revenu mensuel moyen par abonné (mélange mensuel 2,99 € et annuel 19,99 €) ; pass : 4,99 € par saison de 2 mois ; **pas d'impôt sur les sociétés** dans les tableaux (résultat avant impôt) ; **pas de rémunération du fondateur**.

### 9.2 Résultats synthétiques

| Indicateur | Prudent | Médian | Optimiste |
|---|---:|---:|---:|
| Installations cumulées à M36 | 186 000 | 898 750 | 3 301 000 |
| DAU fin An 1 / An 2 / An 3 | 511 / 1 102 / 1 683 | 2 959 / 7 645 / 14 159 | 13 044 / 38 255 / 83 243 |
| ARPDAU An 3 (hors sponsoring) | ≈ 0,013 € | ≈ 0,023 € | ≈ 0,037 € |
| Durée de vie moyenne d'un joueur sur 365 j (jours actifs) | 5,6 | 8,6 | 12,7 |
| Valeur d'une installation sur 365 j (LTV) | ≈ 0,07 € | ≈ 0,20 € | ≈ 0,47 € |
| CA net An 1 / An 2 / An 3 | 1 340 / 4 418 / 7 193 € | 13 498 / 55 088 / 113 560 € | 96 369 / 411 173 / 953 289 € |
| Résultat An 1 / An 2 / An 3 | −51 711 / −29 760 / −28 211 € | −46 828 / +3 475 / +42 000 € | +22 362 / +249 697 / +695 368 € |
| Premier mois bénéficiaire | jamais | M16 (févr. 2028) | M5 (mars 2027) |
| Besoin de financement maximal (creux de trésorerie) | 109 681 € (et croissant) | 49 890 € (M15) | 24 505 € (M3) |
| Trésorerie cumulée à M36 | −109 681 € | −1 352 € | +967 426 € |

### 9.3 Tableaux détaillés

#### Scénario prudent

| Indicateur | An 1 (M1-M12) | An 2 (M13-M24) | An 3 (M25-M36) |
|---|---:|---:|---:|
| Installations | 30 000 | 66 000 | 90 000 |
| Installations cumulées (fin d'année) | 30 000 | 96 000 | 186 000 |
| DAU moyen (moyenne des mois) | 333 | 950 | 1 510 |
| DAU en fin d'année (M12/M24/M36) | 511 | 1 102 | 1 683 |
| MAU en fin d'année | 3 404 | 7 347 | 11 218 |
| Pic de connexions simultanées (fin d'année) | 16 | 34 | 53 |
| ARPDAU moyen hors sponsoring (€) | 0,011 | 0,013 | 0,013 |
| Publicité (€) | 701 | 1 999 | 3 176 |
| Achats intégrés ponctuels (€ nets) | 604 | 1 723 | 2 738 |
| Abonnement AnimeWho+ (€ nets) | 35 | 268 | 426 |
| Pass de saison (€ nets) | 0 | 427 | 854 |
| Sponsoring / partenariats (€) | 0 | 0 | 0 |
| **Chiffre d'affaires net (€)** | **1 340** | **4 418** | **7 193** |
| Développement (freelance Flutter + évolutions) | 28 500 | 18 000 | 18 000 |
| Art original (portraits, cosmétiques) | 12 300 | 8 400 | 8 400 |
| Équipe salariée / community management | 0 | 0 | 0 |
| Marketing + acquisition payante | 7 200 | 5 100 | 6 300 |
| Infrastructure | 436 | 526 | 552 |
| Outils (RevenueCat, monitoring…) | 300 | 360 | 360 |
| Comptes développeur stores | 115 | 92 | 92 |
| Juridique (PI, marque, CGU) | 3 000 | 500 | 500 |
| Administratif (société, comptable) | 1 200 | 1 200 | 1 200 |
| **Total coûts (€)** | **53 051** | **34 178** | **35 404** |
| **Résultat avant impôt (€)** | **-51 711** | **-29 760** | **-28 211** |
| Trésorerie cumulée fin d'année (€) | -51 711 | -81 470 | -109 681 |

1er mois bénéficiaire : aucun ; besoin de financement max : 109 681 € (M36) ; trésorerie cumulée > 0 à partir de : jamais sur 36 mois
Seuil (M36) : coûts mensuels 2 777 € → DAU de rentabilité ≈ 6 993 (à l'ARPDAU M36 de 0,013 €)

#### Scénario médian (référence)

| Indicateur | An 1 (M1-M12) | An 2 (M13-M24) | An 3 (M25-M36) |
|---|---:|---:|---:|
| Installations | 117 750 | 293 000 | 488 000 |
| Installations cumulées (fin d'année) | 117 750 | 410 750 | 898 750 |
| DAU moyen (moyenne des mois) | 1 886 | 6 271 | 12 103 |
| DAU en fin d'année (M12/M24/M36) | 2 959 | 7 645 | 14 159 |
| MAU en fin d'année | 16 437 | 42 473 | 78 659 |
| Pic de connexions simultanées (fin d'année) | 92 | 239 | 442 |
| ARPDAU moyen hors sponsoring (€) | 0,020 | 0,023 | 0,023 |
| Publicité (€) | 6 482 | 21 549 | 41 594 |
| Achats intégrés ponctuels (€ nets) | 6 680 | 22 208 | 42 865 |
| Abonnement AnimeWho+ (€ nets) | 336 | 2 949 | 5 693 |
| Pass de saison (€ nets) | 0 | 4 781 | 11 408 |
| Sponsoring / partenariats (€) | 0 | 3 600 | 12 000 |
| **Chiffre d'affaires net (€)** | **13 498** | **55 088** | **113 560** |
| Développement (freelance Flutter + évolutions) | 28 500 | 18 000 | 18 000 |
| Art original (portraits, cosmétiques) | 12 300 | 8 400 | 8 400 |
| Équipe salariée / community management | 0 | 0 | 12 000 |
| Marketing + acquisition payante | 14 400 | 21 900 | 29 100 |
| Infrastructure | 511 | 781 | 1 061 |
| Outils (RevenueCat, monitoring…) | 300 | 740 | 1 207 |
| Comptes développeur stores | 115 | 92 | 92 |
| Juridique (PI, marque, CGU) | 3 000 | 500 | 500 |
| Administratif (société, comptable) | 1 200 | 1 200 | 1 200 |
| **Total coûts (€)** | **60 326** | **51 613** | **71 560** |
| **Résultat avant impôt (€)** | **-46 828** | **3 475** | **42 000** |
| Trésorerie cumulée fin d'année (€) | -46 828 | -43 352 | -1 352 |

1er mois bénéficiaire : M16 ; besoin de financement max : 49 890 € (M15) ; trésorerie cumulée > 0 à partir de : jamais sur 36 mois
Seuil (M36) : coûts mensuels 5 809 € → DAU de rentabilité ≈ 6 877 (à l'ARPDAU M36 de 0,023 €)

#### Scénario optimiste

| Indicateur | An 1 (M1-M12) | An 2 (M13-M24) | An 3 (M25-M36) |
|---|---:|---:|---:|
| Installations | 361 000 | 984 000 | 1 956 000 |
| Installations cumulées (fin d'année) | 361 000 | 1 345 000 | 3 301 000 |
| DAU moyen (moyenne des mois) | 8 257 | 30 302 | 68 437 |
| DAU en fin d'année (M12/M24/M36) | 13 044 | 38 255 | 83 243 |
| MAU en fin d'année | 65 218 | 191 273 | 416 215 |
| Pic de connexions simultanées (fin d'année) | 408 | 1 195 | 2 601 |
| ARPDAU moyen hors sponsoring (€) | 0,032 | 0,036 | 0,037 |
| Publicité (€) | 41 410 | 151 972 | 343 228 |
| Achats intégrés ponctuels (€ nets) | 52 637 | 193 174 | 436 283 |
| Abonnement AnimeWho+ (€ nets) | 2 322 | 22 447 | 50 696 |
| Pass de saison (€ nets) | 0 | 31 580 | 87 082 |
| Sponsoring / partenariats (€) | 0 | 12 000 | 36 000 |
| **Chiffre d'affaires net (€)** | **96 369** | **411 173** | **953 289** |
| Développement (freelance Flutter + évolutions) | 28 500 | 18 000 | 18 000 |
| Art original (portraits, cosmétiques) | 12 300 | 8 400 | 8 400 |
| Équipe salariée / community management | 0 | 72 000 | 132 000 |
| Marketing + acquisition payante | 27 000 | 55 500 | 85 500 |
| Infrastructure | 816 | 1 934 | 3 765 |
| Outils (RevenueCat, monitoring…) | 1 076 | 3 850 | 8 464 |
| Comptes développeur stores | 115 | 92 | 92 |
| Juridique (PI, marque, CGU) | 3 000 | 500 | 500 |
| Administratif (société, comptable) | 1 200 | 1 200 | 1 200 |
| **Total coûts (€)** | **74 007** | **161 476** | **257 921** |
| **Résultat avant impôt (€)** | **22 362** | **249 697** | **695 368** |
| Trésorerie cumulée fin d'année (€) | 22 362 | 272 058 | 967 426 |

1er mois bénéficiaire : M5 ; besoin de financement max : 24 505 € (M3) ; trésorerie cumulée > 0 à partir de : M10
Seuil (M36) : coûts mensuels 21 524 € → DAU de rentabilité ≈ 16 585 (à l'ARPDAU M36 de 0,037 €)

#### Scénario prudent avec plan de repli (coûts réduits dès M10 : dev 400 €, art 200 €, marketing 150 €/mois)

| Indicateur | An 1 (M1-M12) | An 2 (M13-M24) | An 3 (M25-M36) |
|---|---:|---:|---:|
| Installations | 30 000 | 66 000 | 90 000 |
| Installations cumulées (fin d'année) | 30 000 | 96 000 | 186 000 |
| DAU moyen (moyenne des mois) | 333 | 950 | 1 510 |
| DAU en fin d'année (M12/M24/M36) | 511 | 1 102 | 1 683 |
| MAU en fin d'année | 3 404 | 7 347 | 11 218 |
| Pic de connexions simultanées (fin d'année) | 16 | 34 | 53 |
| ARPDAU moyen hors sponsoring (€) | 0,011 | 0,013 | 0,013 |
| Publicité (€) | 701 | 1 999 | 3 176 |
| Achats intégrés ponctuels (€ nets) | 604 | 1 723 | 2 738 |
| Abonnement AnimeWho+ (€ nets) | 35 | 268 | 426 |
| Pass de saison (€ nets) | 0 | 427 | 854 |
| Sponsoring / partenariats (€) | 0 | 0 | 0 |
| **Chiffre d'affaires net (€)** | **1 340** | **4 418** | **7 193** |
| Développement (freelance Flutter + évolutions) | 25 200 | 4 800 | 4 800 |
| Art original (portraits, cosmétiques) | 10 800 | 2 400 | 2 400 |
| Équipe salariée / community management | 0 | 0 | 0 |
| Marketing + acquisition payante | 6 750 | 1 800 | 1 800 |
| Infrastructure | 436 | 526 | 552 |
| Outils (RevenueCat, monitoring…) | 300 | 360 | 360 |
| Comptes développeur stores | 115 | 92 | 92 |
| Juridique (PI, marque, CGU) | 3 000 | 500 | 500 |
| Administratif (société, comptable) | 1 200 | 1 200 | 1 200 |
| **Total coûts (€)** | **47 801** | **11 678** | **11 704** |
| **Résultat avant impôt (€)** | **-46 461** | **-7 260** | **-4 511** |
| Trésorerie cumulée fin d'année (€) | -46 461 | -53 720 | -58 231 |

1er mois bénéficiaire : aucun ; besoin de financement max : 58 231 € (M36) ; trésorerie cumulée > 0 à partir de : jamais sur 36 mois
Seuil (M36) : coûts mensuels 927 € → DAU de rentabilité ≈ 2 334 (à l'ARPDAU M36 de 0,013 €)

### 9.4 Sensibilité du scénario médian

| Variation (toutes choses égales par ailleurs) | Résultat An 3 | Trésorerie cumulée M36 | 1er mois bénéficiaire |
|---|---:|---:|---:|
| Base | 42 000 € | −1 352 € | M16 |
| eCPM −30 % | 29 522 € | −22 240 € | M18 |
| eCPM +30 % | 54 478 € | +19 535 € | M16 |
| Conversion en payeur divisée par 2 | 20 870 € | −36 683 € | M22 |
| Installations −30 % | 12 464 € | −49 745 € | M26 |
| Rétention J30 de 3 % au lieu de 4 % | 16 060 € | −41 944 € | M23 |

**Lecture** : le plan est d'abord sensible au **volume d'installations** et à la **rétention**, bien plus qu'aux eCPM. La priorité absolue des 6 premiers mois est donc la qualité du jeu et la viralité, pas l'optimisation de la publicité.

### 9.5 Seuil de rentabilité

Avec les coûts mensuels de M36 du médian (≈ 5 800 €, soit ≈ 4 800 € une fois déduits les 1 000 € de sponsoring), il faut **≈ 6 900 DAU** à l'ARPDAU de 0,023 €. Avec la structure minimale du plan de repli (≈ 930 €/mois), il faudrait ≈ 2 300 DAU à l'ARPDAU du prudent (0,013 €) — que même le prudent n'atteint pas sur 36 mois (1 683 DAU) : **si les indicateurs de M10 ressemblent au prudent, le projet doit être réorienté ou arrêté**, pas financé davantage.

---

## 10. KPIs à suivre

| Famille | KPI | Objectif médian | Seuil d'alerte | Outil |
|---|---|---|---|---|
| Acquisition | Installations / jour (organiques vs payantes) | ≈ 360/j en An 1 (hors pic de lancement) | < 150/j | Consoles stores, Firebase |
| | Taux de conversion fiche store | > 30 % | < 20 % | App Store Connect, Play Console |
| | Coefficient viral K (installations issues d'invitations / installations) | ≥ 0,3 | < 0,1 | Liens profonds |
| Activation | % de nouveaux joueurs qui terminent 1 partie | > 70 % | < 50 % | `game_end` |
| | Temps avant la 1ʳᵉ partie | < 60 s | > 120 s | `onboarding_complete`, `game_start` |
| Rétention | J1 / J7 / J30 | 30 % / 9,5 % / 4 % | 22 % / 5 % / 2 % | Cohortes Firebase |
| | DAU/MAU | 18 % | < 12 % | |
| Liquidité multijoueur | Temps d'attente médian en partie rapide | < 15 s | > 30 s | `queue_matched` |
| | % de files abandonnées / basculées vers l'ordinateur | < 20 % | > 40 % | `queue_left` |
| Jeu | Parties par DAU ; durée moyenne d'une partie | ≥ 3 ; 3-5 min | < 2 | `game_end` |
| | % d'abandons en cours de partie | < 10 % | > 20 % | `game_end.reason` |
| Monétisation | ARPDAU (pub + achats) | 0,02 € | < 0,012 € | AdMob + RevenueCat |
| | Impressions par DAU (récompensée / interstitiel) | 0,6 / 1,0 | — | AdMob |
| | Taux d'acceptation de la vidéo récompensée (vue / proposée) | > 25 % | < 10 % | `ad_rewarded_offer` / `ad_rewarded_complete` |
| | Conversion payeur mensuelle | 1,5 % | < 0,7 % | RevenueCat |
| | ARPPU | 5 € | — | |
| | Abonnés actifs, churn mensuel | — ; < 15 % | > 25 % | RevenueCat |
| Qualité | Note moyenne stores | ≥ 4,4 | < 4,0 | |
| | Taux de crash (sessions sans crash) | > 99,5 % | < 99 % | Crashlytics |
| | Signalements de questions libres / 1 000 parties | < 2 | > 5 | Modération |
| Finance | Trésorerie, consommation mensuelle, mois de trésorerie restants | > 6 mois | < 3 mois | Tableur |

---

## 11. Risques et mitigations

| # | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Rejet ou retrait store pour atteinte à la propriété intellectuelle** | Élevée si vrais personnages ; faible avec casting original | Critique | Casting original (§6), contrôle anti-ressemblance, contrats de cession, aucune marque tierce dans les métadonnées, avocat |
| 2 | Le casting original attire moins que les vrais personnages | Moyenne | Élevé | Qualité de l'art, humour, univers forts, vote de la communauté, grilles privées (phase 2), licences accessibles (phase 3) |
| 3 | **File d'attente vide** (pas assez de joueurs simultanés) | Élevée au début | Élevé | Proposer l'ordinateur après 20 s (en le disant clairement, jamais un faux humain), parties privées, files concentrées sur les heures de pointe, cross-play web |
| 4 | Rétention faible | Moyenne | Élevé | Quêtes quotidiennes, coffre quotidien, saisons, nouveaux univers réguliers, notifications raisonnables |
| 5 | Publicité trop intrusive → mauvaises notes | Moyenne | Moyen | Règles anti-frustration de la spec, plafonds pilotés à distance, tests A/B |
| 6 | Non-conformité RGPD / consentement publicitaire / mineurs | Moyenne | Élevé (amendes, retrait) | SDK UMP de Google (CMP certifiée IAB TCF v2.2), ATT sur iOS, âge minimum 13 ans, pub non personnalisée sous l'âge du consentement numérique (15 ans en France), pas de ciblage enfants, politique de confidentialité |
| 7 | Contenu inapproprié dans les **questions libres** (contenu généré par les joueurs) | Moyenne | Élevé (règle Apple 1.2 : filtrage, signalement, blocage obligatoires) | Filtre de mots, bouton signaler/bloquer, option « questions vérifiées uniquement » par défaut pour les moins de 16 ans, journalisation |
| 8 | CGNAT mobile : limites par IP et règle Elo faussées | Élevée | Moyen | Identité par compte/appareil (§8.2) |
| 9 | Panne / redéploiement pendant les parties | Moyenne | Moyen | Arrêt gracieux, supervision, déploiements en heures creuses |
| 10 | Dépendance aux plateformes (commission, politiques, AdMob) | Faible-moyenne | Moyen | Médiation publicitaire (2ᵉ réseau), web en complément, suivi des changements de politique |
| 11 | Triche, multi-comptes pour gonfler l'Elo | Moyenne | Moyen | Serveur arbitre (existant), règles anti-collusion, limite de parties classées par paire |
| 12 | Fraude aux achats / récompenses publicitaires | Moyenne | Faible-moyen | Validation serveur des reçus, SSV AdMob, registre des transactions idempotent |
| 13 | Tournois requalifiés en jeux d'argent | Faible si gratuits | Élevé | Inscription gratuite, aucune obligation d'achat, règlement, avis juridique |
| 14 | Épuisement du fondateur (projet porté par une personne) | Moyenne | Élevé | Freelances, périmètre v1 réduit, points de décision |
| 15 | Trésorerie insuffisante | Moyenne | Élevé | Financement de 50 k€ sécurisé avant M1, plan de repli à M10 |

---

## 12. Feuille de route

### 0-3 mois (M1-M3 : novembre 2026 → janvier 2027) — Construire légalement
- Société, comptes développeur, marque, avocat PI, CGU et politique de confidentialité.
- 120 portraits originaux + données des traits (test « aucun doublon de traits » existant à réutiliser).
- Serveur : sortie de Replit, comptes anonymes + Sign in with Apple/Google, portefeuille, droits, validation des achats et récompenses, cosmétiques équipés, signalement/blocage, limites par compte.
- App Flutter v1 : 5 écrans de jeu + boutique + profil + classement ; AdMob, RevenueCat, Firebase ; consentements.
- Bêta fermée, soft launch Belgique/Québec.
- **Point de décision M3** : D1 ≥ 25 % en soft launch, sinon reporter le lancement et itérer.

### 3-6 mois (M4-M6 : février → avril 2027) — Lancer et apprendre
- Lancement francophonie ; campagne créateurs ; Discord.
- Itérations hebdomadaires sur l'onboarding, la file d'attente, les fréquences de pub (Remote Config).
- 1er nouvel univers (24 personnages), quêtes quotidiennes.
- **Point de décision M7** : D7 ≥ 7 % et ≥ 1 500 DAU → continuer le plan médian ; sinon réduire le marketing et concentrer l'effort sur la rétention.

### 6-12 mois (M7-M12 : mai → octobre 2027) — Fidéliser et monétiser mieux
- AnimeWho+ (M10), packs de thèmes pour parties privées, parrainage.
- Japan Expo (juillet 2027).
- Version anglaise (M10-M12).
- Grilles privées textuelles (si l'avocat valide).
- **Point de décision M10** : si DAU < 1 500 et D30 < 3 % (trajectoire prudente) → **plan de repli** (développement 400 €/mois, art 200 €/mois, marketing 150 €/mois ; le jeu reste en ligne en mode maintenance) ou arrêt. Si ARPDAU > 0,02 € et DAU > 3 000 → préparer la phase 3.

### 12-36 mois (M13-M36 : novembre 2027 → octobre 2029) — Saisons, international, partenariats
- Pass de saison et classement saisonnier (M16), tournois gratuits sponsorisés.
- Espagnol et portugais brésilien.
- Licences accessibles (manga français, webtoons, créateurs, VTubers) en partage de revenus ; prospection d'éditeurs francophones (Kana, Pika, Glénat, Ki-oon, Ankama) pour des collaborations promotionnelles.
- Passage à l'architecture multi-processus (Redis) si le pic dépasse ≈ 1 500 connexions.
- Selon la trajectoire : levée de fonds (optimiste), rentabilité autofinancée (médian), maintenance (prudent).
- Pistes ultérieures : mode asynchrone (une question par jour, jeu « au long cours » avec notifications), mode équipe 2v2, merchandising des personnages originaux.

---

## 13. Prochaines étapes immédiates

Les dix actions des 30 prochains jours, dans l'ordre :

1. **Valider les décisions de l'annexe A** (surtout : casting original, migration de la version web, nom de l'app).
2. **Recherche d'antériorité sur « AnimeWho »** (INPI, EUIPO, stores) puis dépôt de marque.
3. **Rendez-vous avec un avocat en propriété intellectuelle** (contrat d'illustrateur, CGU, statut des grilles personnalisées).
4. **Créer la société** et les comptes Apple Developer (99 $/an) et Google Play Console (25 $) au nom de la société ; activer le programme Small Business d'Apple.
5. **Recruter 2-3 illustrateurs** (appel sur ArtStation, Discord d'illustrateurs francophones, écoles d'art) ; brief des 8 univers ; tableau des traits des 120 personnages.
6. **Recruter le développeur Flutter** (forfait v1, cahier des charges = `MONETISATION_SPEC.md` + écrans existants).
7. **Préparer le serveur** : branche « mobile » avec comptes, portefeuille et endpoints de validation ; test de charge ; plan de migration hors Replit.
8. **Ouvrir le Discord et les comptes sociaux**, commencer le « making-of » des personnages.
9. **Mettre en place le tableau de bord KPIs** (Firebase + AdMob + RevenueCat + tableur de trésorerie).
10. **Sécuriser ≈ 50 000 €** de financement (fonds propres, prêt d'honneur, aides : à instruire) avant d'engager les dépenses de M1-M3.

---

## Annexe A — Hypothèses et décisions prises par défaut

Le propriétaire n'ayant pas pu être consulté, les choix suivants ont été faits ; chacun peut être revu.

| # | Sujet | Décision / hypothèse retenue | Raison |
|---|---|---|---|
| 1 | Propriété intellectuelle | Casting 100 % original pour les stores ; plus de portraits AniList | Risque de rejet/retrait inacceptable (§6) |
| 2 | Version web actuelle | Migrée vers le casting original au lancement mobile | Cohérence, cross-play, pas de lien commercial avec des IP tierces |
| 3 | Nom | « AnimeWho » conservé sous réserve de disponibilité ; jamais « Qui est-ce ? » | Marque Hasbro |
| 4 | Calendrier | M1 = novembre 2026 ; lancement M4 = février 2027 | 3 mois de dev + art |
| 5 | Rémunération du fondateur | Non incluse | Inconnue ; projet porté en fonds propres |
| 6 | Structure | SAS/SASU française, comptes stores au nom de la société | Contrats de cession, paiements |
| 7 | Commission stores | 15 % (programmes petites entreprises) | Revenus stores < 1 M$/an dans tous les scénarios, y compris l'optimiste An 3 (≈ 0,57 M€ nets, ≈ 0,81 M€ payés par les joueurs) — à surveiller au-delà |
| 8 | TVA | Prix TTC ÷ 1,2 | Simplification (TVA française ; les taux varient selon les pays) |
| 9 | Répartition géographique | ≈ 60 % pays à eCPM élevé, ≈ 35 % Afrique/Maghreb, ≈ 5 % autres | Estimation, reflétée dans les eCPM mélangés |
| 10 | Gestion des achats | RevenueCat (gratuit < 2 500 $/mois) + webhooks vers notre serveur | Rapidité, multi-store, validation serveur incluse |
| 11 | Régie publicitaire | Google AdMob (+ médiation AppLovin ou Unity en phase 2) | Standard Flutter (`google_mobile_ads`), consentement UMP intégré |
| 12 | Âge minimum | 13 ans ; pub non personnalisée sous 15 ans (France) / 16 ans selon pays | RGPD, politiques Apple/Google |
| 13 | Monnaie virtuelle | Une seule monnaie (« Éclats »), gagnée et achetable, sans loot box | Simplicité, transparence |
| 14 | Pas d'avantage payant en JcJ | Indices et vie supplémentaire seulement contre l'ordinateur | Équité de l'Elo |
| 15 | Prix | Paliers ronds en euros (0,99 → 19,99 €), localisés par les stores ailleurs | Standard |

## Annexe B — Méthode de calcul des projections

Le modèle (script Node.js, 36 mois, simulation **jour par jour** des cohortes) :
1. **Installations** : installations organiques mensuelles du scénario (× multiplicateur à M4) + budget d'acquisition ÷ coût par installation, réparties uniformément sur les jours du mois.
2. **Rétention** : courbe en loi de puissance r(d) = J1 × d^(−b), avec b = ln(J1/J30) ÷ ln(30), calée sur J1 et J30 (J7 en découle). DAU(t) = Σ installations(s) × r(t − s).
3. **MAU** = DAU ÷ ratio DAU/MAU.
4. **Publicité** = DAU × 30,4 j × [impr. récompensées × eCPM + (1 − part sans pub) × (impr. interstitiels × eCPM + impr. bannières × eCPM)] ÷ 1 000.
5. **Achats ponctuels** = MAU × conversion × dépense moyenne TTC × 0,708.
6. **Abonnement** (dès M10) = MAU × taux d'abonnés × 2,49 € × 0,708. **Pass** (dès M16) = MAU × taux d'acheteurs par saison × 4,99 € ÷ 2 × 0,708.
7. **Coûts** : détaillés au §9.1 ; infrastructure = 40 € + 0,004 € × DAU (20 €/mois avant lancement) ; outils = 30 €/mois (10 € avant lancement) + 1 % du revenu brut des stores au-delà de 2 500 €/mois (RevenueCat).
8. **LTV 365 j** = (1 + Σ_{d=1..365} r(d)) × ARPDAU.
9. Toutes les valeurs des tableaux sont générées directement par le script (pas de recopie manuelle) puis arrondies à l'euro ; les totaux annuels sont la somme des 12 mois.

## Annexe C — Sources

Consultées en octobre 2026. Les chiffres de marché proviennent souvent de sources secondaires ou de cabinets aux méthodes différentes : ils servent d'ordres de grandeur.

- Apple — App Store Review Guidelines (5.2.1, 5.2.2, 4.1, 3.1.1, 3.1.2) : https://developer.apple.com/app-store/review/guidelines/
- Google Play — Usage non autorisé de contenus protégés : https://support.google.com/googleplay/android-developer/answer/9888072
- Google Play — Frais de service : https://support.google.com/googleplay/android-developer/answer/112622
- Programmes de commission réduite (Apple Small Business Program, Google 15 %) : https://www.revenuecat.com/blog/engineering/small-business-program ; https://appbot.co/blog/app-developers-apple-google-small-business-programs/
- Frais de compte développeur (Apple 99 $/an, Google 25 $) : https://splitmetrics.com/blog/google-play-apple-app-store-fees/
- RevenueCat — tarifs (gratuit jusqu'à 2 500 $ de MTR, puis 1 %) : https://www.revenuecat.com/docs/welcome/set-up-revenuecat/account-management
- AniList — conditions d'utilisation de l'API (licence commerciale au-delà de 150 $/mois) : https://docs.anilist.co/guide/terms-of-use
- eCPM — Appodeal, rapport T4 2024 : https://appodeal.com/the-mobile-ecpm-report-updated-q4-2024-view ; Playio, benchmarks 2026 : https://blog.playio.co/mobile-game-ecpm-benchmarks-2026 ; Global Games Forum (tendances Brésil/Mexique) : https://www.globalgamesforum.com/features/how-is-your-ecpm-doing-a-six-month-trend-analysis
- Rétention et ARPDAU — GameAnalytics (données 2025) : https://gameindustrylibrary.com/documents/gameanalytics-mobile-and-pc-game-benchmarks-in-2026-sponsored-by-pwn-games/insights ; https://blog.playio.co/arpdau-benchmarks-mobile-games ; https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-kpis-benchmarks-2026/
- CPI — Admiral Media : https://admiral.media/mobile-game-marketing-benchmarks/ ; Liftoff, Casual Gaming Apps Report 2025 : https://liftoff.ai/?p=34267
- Marché de l'anime — IMARC : https://www.imarcgroup.com/global-anime-market ; Taylor Wessing (sept. 2025) : https://www.taylorwessing.com/en/insights-and-events/insights/2025/09/going-super-saiyan ; GlobalData (MEA) : https://www.globaldata.com/store/report/mea-anime-market-analysis/
- Crunchyroll — abonnés : https://animebythenumbers.substack.com/p/crunchyroll-17m-subscribers ; https://www.broadbandtvnews.com/2026/05/11/crunchyroll-reaches-21-million-subscribers/
- Manga en France — Revue Conflits : https://www.revueconflits.com/la-france-terre-de-manga/ ; Livres Hebdo : https://www.livreshebdo.fr/article/le-marche-de-la-bande-dessinee-en-repli-en-2024 ; Journal du Geek : https://www.journaldugeek.com/2025/04/24/le-marche-du-manga-est-en-baisse-en-france-et-ce-nest-pas-bon-signe/
- Francophonie — OIF 2022 (321 M) : https://www.centre-inffo.fr/?p=418510 ; OIF 2026 (396 M) : https://www.financialafrik.com/2026/03/18/lafrique-locomotive-de-la-langue-francaise-rapport-oif/
- Retraits d'apps par des ayants droit — *Jujutsu Kaisen* : https://automaton-media.com/en/news/jujutsu-kaisen-production-team-cracks-down-on-rip-off-mobile-games-featuring-characters-oddly-similar-to-those-in-the-anime-we-will-be-taking-strict-measures/ ; Outlook Respawn : https://respawn.outlookindia.com/pop-culture/pop-culture-news/jujutsu-kaisen-team-moves-against-unlicensed-mobile-games
- Licences — ordres de grandeur (minimum garanti, royalties) : https://xsolla.com/game-biz-institute/articles/stop-leaving-ip-on-the-table ; https://vitrina.ai/blog/how-small-companies-license-anime-independently
- Akinator — modèle et CA estimé : https://omr.com/de/daily/akinator-story ; https://gizmodo.com/download/akinator
- Concurrents — Hasbro *Guess Who? Meet the Crew* : https://apps.apple.com/mx/app/id1624777523 ; *Guess the Anime Quiz* : https://play.google.com/store/apps/developer?id=Jomaier ; *Anime Quiz – Trivia Questions* : https://apps.apple.com/us/app/-/id6478061232 ; Roblox *Guess the Anime* : https://rotrends.com/game/7403850022/Guess-the-Anime
- Japan Expo 2025 (fréquentation revendiquée > 250 000, source secondaire) : https://spreadly.app/en/events/japan-expo-2025-paris-230
- Replit — prix des Reserved VM : https://docs.replit.com/billing/deployment-pricing
- « Qui est-ce ? » (Hasbro/MB) : https://en.wikipedia.org/wiki/Guess_Who%3F
