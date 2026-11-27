# AnimeWho — Business plan de l'application mobile

> Version 1.1 — 27 novembre 2026 (version 1.0 du 29 octobre 2026). La v1.0 a été rédigée sans pouvoir consulter le propriétaire ; ses décisions par défaut sont signalées **[Hypothèse]** ou **[Décision]** et regroupées en annexe A, où figurent aussi les décisions prises par le propriétaire le 27 novembre 2026 **[Propriétaire]**. Les montants sont en euros, hors TVA sauf mention contraire. « M1 » désigne novembre 2026, premier mois du projet ; le lancement sur les stores est prévu à **M4 (février 2027)**.
>
> Document compagnon : [`MONETISATION_SPEC.md`](./MONETISATION_SPEC.md) (spécification technique de la monétisation pour l'app Flutter et le serveur). Modèle financier : [`model/model.mjs`](./model/model.mjs) (`node docs/business-plan/model/model.mjs` imprime tous les tableaux du §9).

> **Révision du 27 novembre 2026** — décisions du propriétaire, qui remplacent les hypothèses de la v1.0 :
> 1. **Comptes développeur App Store et Google Play déjà ouverts** : les étapes et coûts « créer la société », « D-U-N-S », « ouvrir les comptes » sont supprimés ; il reste à vérifier que les comptes sont au nom de la bonne entité (§8.4). Les frais Apple (99 $/an ≈ 92 €) restent dus tant que le compte existe, mais ils sont **déjà payés par ailleurs** : ils sont exclus du modèle (§8.3).
> 2. **Budget de départ zéro, aucun salaire.** Plus d'illustrateurs (l'ancien poste ≈ 6 000 € puis 700 €/mois disparaît) : les 120 personnages sont **produits en interne, portraits SVG générés par code** (§6.3, §6.4). Plus de développeur Flutter freelance (l'app `mobile/` existe ; le fondateur la maintient), plus d'acquisition ni de marketing payants, plus de juriste payant (alternatives gratuites et risques : §6.3, §11).
> 3. **Seul coût restant : l'hébergement** (§8.3) : ≈ 8 €/mois dans le modèle (petit serveur dans l'UE + Postgres), 0 € possible avec une offre gratuite (avec des limites), ≈ 35-65 €/mois si l'on reste sur la Reserved VM Replit actuelle.
> 4. **Croissance purement organique** : installations environ divisées par deux par rapport à la v1.0, rétention légèrement abaissée pour tenir compte du style visuel plus simple (§9.1).
> 5. **Modèle financier reconstruit** (le script de la v1.0 était perdu), versionné dans `model/model.mjs`, contrôlé contre les chiffres de la v1.0 et par un second calcul indépendant (§9.6) ; il tient compte désormais du délai de 2 mois entre un revenu et son versement.
> 6. **Nouveaux chiffres** (§1, §9) : besoin de financement de quelques dizaines d'euros ; résultat An 3 de +2 603 € (prudent), +44 871 € (médian), +428 032 € (optimiste), **sans rémunération du fondateur, avant charges sociales et impôt**. Le « plan de repli » de la v1.0 disparaît : il n'y a plus de coûts à couper.
> 7. Feuille de route, prochaines étapes et risques réécrits (§11-13) ; checklist de soumission mise à jour (`docs/store/`).

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

**Le produit.** AnimeWho est un jeu de déduction à deux joueurs, en français, sur le principe « devine le personnage secret de l'adversaire par des questions oui/non », appliqué à l'univers anime. Il fonctionne aujourd'hui en version web : parties rapides avec appariement automatique, parties privées par code à 6 caractères, parties contre l'ordinateur (3 niveaux), classement Elo, reconnexion sans perte de partie, serveur arbitre qui empêche la triche. Une app Flutter (iOS + Android) est écrite (`mobile/`). Le code est propre, testé (tests d'intégration avec de vrais sockets, CI GitHub), et sobre en coûts (un seul processus Node.js, Postgres optionnel).

**Comment gagner de l'argent.** La réponse courte : **un modèle freemium hybride**, gratuit à télécharger, financé par :

1. **la publicité** (vidéos récompensées choisies par le joueur, interstitiels rares entre deux parties, bannière hors partie) — ≈ 36 % du chiffre d'affaires de l'An 3 (médian) ;
2. **les achats intégrés cosmétiques et de confort** (« Sans pub » à 3,99 €, packs de démarrage, dos de cartes, thèmes de plateau, packs de réactions, monnaie « Éclats ») — ≈ 37 % ;
3. puis, une fois l'audience installée, **un abonnement « AnimeWho+ »** (2,99 €/mois ou 19,99 €/an, à partir de M10) et **un pass de saison** (4,99 € par saison de 8 semaines, à partir de M16), complétés par du **sponsoring** (tournois, partenariats éditeurs/événements) à partir de la 3ᵉ année dans le médian.

**Jamais de « pay-to-win »** : tout ce qui se vend est cosmétique ou de confort ; l'Elo reste un pur reflet du talent. C'est à la fois un choix d'éthique, de rétention et de réputation dans une communauté (les fans d'anime) très sensible à ces pratiques.

**Le point bloquant à régler avant toute chose : la propriété intellectuelle.** Les 165 personnages actuels (Naruto, One Piece, Demon Slayer…) et leurs portraits (récupérés sur AniList) appartiennent à Shueisha, Kodansha, Toei, etc. L'App Store (règle 5.2.1) et Google Play (politique « Propriété intellectuelle ») refusent ou retirent les apps qui utilisent sans autorisation des œuvres protégées, *a fortiori* monétisées ; les ayants droit d'anime ont commencé à demander le retrait d'apps aux stores (cas *Jujutsu Kaisen*, décembre 2025). **[Décision]** La version mobile est lancée avec **un casting 100 % original** (« AnimeWho Originals » : 120 personnages). **[Propriétaire]** Ce casting est **produit en interne, sans dépense** : les portraits sont **générés par code** (SVG, style anime simplifié), à partir des 8 traits vérifiés de chaque personnage ; le propriétaire détient tous les droits sur le code et sur les images. Le rendu est plus simple qu'une illustration professionnelle (§6.4) ; des illustrations payantes pourront venir plus tard, **financées par les revenus** (phase 2/3). Les vrais personnages ne reviendront que **sous licence** (phase 3) ou, après validation juridique, sous forme de **grilles privées textuelles créées par les joueurs** (phase 2). La version web actuelle doit être alignée avant le lancement mobile (voir §6).

**Budget : zéro.** **[Propriétaire]** Aucune dépense au départ : pas d'illustrateur, pas de freelance, pas de marketing payant, pas de juriste payant, aucun salaire. Les comptes développeur Apple et Google existent déjà (les 99 $/an d'Apple sont payés par ailleurs et exclus du modèle). **Le seul coût incompressible est l'hébergement du serveur** : ≈ 8 €/mois retenus dans le modèle (petit serveur dans l'UE avec Postgres), 0 € possible au lancement avec une offre « toujours gratuite » sous conditions, ≈ 35-65 €/mois si l'on reste sur la Reserved VM Replit actuelle (§8.3).

**Les chiffres (36 mois, M1 = novembre 2026, lancement M4 = février 2027, croissance 100 % organique).**

| Scénario | Installations cumulées M36 | DAU fin An 3 | CA net An 3 | Coûts An 3 | Résultat An 3 | Besoin de financement max | Trésorerie cumulée M36 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Prudent | 86 250 | 628 | 2 727 € | 123 € | +2 603 € | 41 € | +4 120 € |
| **Médian (référence)** | **398 000** | **5 463** | **45 501 €** | **630 €** | **+44 871 €** | **46 €** | **+61 404 €** |
| Optimiste | 1 597 500 | 37 230 | 433 209 € | 5 177 € | +428 032 € | 128 € | +559 617 € |

Avec un budget zéro, il n'y a pratiquement rien à financer : l'hébergement est couvert **dès le premier mois de revenus (M4)** dans les trois scénarios (il suffit d'une trentaine de joueurs actifs par jour pour payer 8 €/mois). Le creux de trésorerie (41 à 128 €, en M5) vient uniquement du délai de 2 mois entre un revenu et son versement par AdMob, Apple et Google ; une offre d'hébergement gratuite le ramène à zéro. **Les résultats ne rémunèrent pas le fondateur et sont avant charges sociales et impôt** **[Hypothèse]** : le vrai coût du projet est son temps. Repère : dégager 1 500 €/mois en plus des coûts demande ≈ 2 200 DAU dans le médian (atteint vers M16, février 2028) et ≈ 3 800 DAU dans le prudent (jamais atteint sur 36 mois).

**Ce qu'il faut retenir honnêtement.**
- Un jeu casual à deux joueurs rapporte **peu par joueur** (ARPDAU ≈ 0,02 € dans le médian, cohérent avec les références « casual » financé par la pub de 0,01 à 0,05 $). La valeur d'un joueur sur un an (≈ 0,17 €) est **très inférieure au coût d'acquisition payante** (≈ 1,20 € par installation) : la croissance **doit** être organique et virale (parties privées entre amis, TikTok, créateurs de contenu, communautés). Le budget zéro ne change donc pas la stratégie d'acquisition ; il en retire les accélérateurs payés (créateurs rémunérés, conventions, petits tests publicitaires), d'où des installations environ **deux fois plus faibles** que dans la v1.0.
- Le budget zéro **supprime le risque financier, pas le risque d'échec** : le chiffre d'affaires médian de l'An 3 passe de 113 560 € (v1.0) à 45 501 €, mais le résultat est du même ordre (+44 871 € contre +42 000 €) parce qu'il n'y a presque plus de coûts. Le scénario prudent reste un **projet passion** (≈ 220 €/mois de résultat en An 3).
- Les limites sont ailleurs : **qualité visuelle** des portraits générés par code (risque sur la conversion des fiches stores et la rétention), **juridique sans avocat** (modèles et ressources gratuites, mais aucun conseil engageant), **hébergement gratuit** sans garantie, et **un fondateur seul** pour le développement, la communauté et la modération. Dans l'optimiste (37 000 DAU), une personne ne suffit plus : une partie des revenus devra payer modération, illustrations et développement — ce que le modèle n'inclut pas.
- Les **points de décision** du §12 portent désormais sur le temps du fondateur et sur le premier réinvestissement (illustrations, marque, nom de domaine), plus sur la levée d'argent.

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
5. **Coûts d'exploitation très faibles** : un serveur à moins de 10 € par mois (voire gratuit, §8.3) tient des centaines, puis quelques milliers de joueurs simultanés ; marge brute élevée.
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
| **Achats cosmétiques** (dos de cartes, thèmes de plateau, cadres de profil, réactions, animations de victoire) | ★★★ | ★★★ (art généré par code + serveur pour afficher à l'adversaire) | Faible | Très bonne : l'adversaire **voit** vos cosmétiques → désir social | ✅ Phase 1 (catalogue réduit), étoffé ensuite |
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
| Publicité | 16 178 € | 36 % |
| Achats intégrés ponctuels | 16 672 € | 37 % |
| Abonnement AnimeWho+ | 2 214 € | 5 % |
| Pass de saison | 4 437 € | 10 % |
| Sponsoring / partenariats | 6 000 € | 13 % |
| **Total** | **45 501 €** | 100 % |

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
| C. **Casting 100 % original, style anime, archétypes génériques** (« le ninja blond tête brûlée », « la chasseuse de démons au sabre ») | 1-2 mois (temps du fondateur) | **Faible** si pas de ressemblance avec des personnages existants (contrôle anti-ressemblance) | **0 €** : portraits SVG générés par code en interne **[Propriétaire]** ; illustrations payantes possibles plus tard, financées par les revenus | Correct : le plaisir vient de la déduction ; on perd la reconnaissance immédiate et le rendu est plus simple qu'une illustration | ✅ **Retenu pour la v1** |
| D. Licences officielles (éditeurs, studios) | 6-24 mois de négociation | Nul | Minimum garanti de plusieurs dizaines de milliers d'euros + 5-15 % de royalties pour une grande licence ; hors de portée au début | Maximal | ⏳ Phase 3, en commençant par des **licences accessibles** : manga français (« manfra »), webtoons, créateurs indépendants, VTubers, en partage de revenus sans minimum garanti |
| E. Grilles personnalisées créées par les joueurs (texte seulement, privées) | 1-2 mois | Moyen : les noms seuls sont faiblement protégés, mais l'hébergement de listes de personnages tiers reste à valider ; images interdites | Faible + modération | Fort pour les parties entre amis | ⏳ Phase 2, **après avis d'avocat**, jamais mis en avant dans les métadonnées des stores, uniquement en partie privée |
| F. Contenu généré par la communauté **avec images** | — | Élevé (les joueurs téléverseraient des images sous droits ; obligations de modération Apple 1.2, DSA) | Élevé | — | ❌ |
| G. Portraits générés par IA « à la manière de » | Rapide | Élevé (ressemblance, incertitude sur les droits, rejet communautaire) | Faible | Mauvais pour l'image | ❌ |

*Le casting « généré par code » (C) n'est pas de l'IA générative (G) : les portraits sont dessinés par un programme écrit par le propriétaire (formes, coiffures, couleurs et accessoires paramétrés), sans modèle entraîné sur des œuvres de tiers. Le propriétaire est l'auteur du code et des images, ce qui règle la question des droits ; le contrôle anti-ressemblance reste indispensable (un « ninja blond aux cheveux en pointes et à la tenue orange » ressemblerait à un personnage connu, quel que soit l'outil).*

### 6.3 Décision et mise en œuvre

**[Décision]**
1. **App mobile v1 = casting original « AnimeWho Originals »** : 120 personnages (5 grilles de 24 possibles, assez pour la variété), 8 univers originaux (par ex. *Académie des Arcanes*, *Néo-Tokyo 2099*, *Clan des Lames*, *Lycée Sakura*, *Pirates du Ciel*, *Mechas*, *Esprits et Yokai*, *Sport Shōnen*), répartis pour que les 8 traits restent discriminants. Le moteur et le format de `characters.json` ne changent pas ; la valeur du trait « anime » devient l'**univers original**.
2. **[Propriétaire] Production interne par code, sans illustrateur** : un générateur de portraits SVG (style anime simplifié : forme du visage, coiffure, couleur des cheveux et des yeux, accessoires et tenue propres à chaque univers) dessine chaque personnage à partir de ses traits, ce qui garantit que le portrait et les réponses du serveur restent cohérents. Avantages : coût nul, droits entièrement détenus par le propriétaire (aucun contrat de cession à négocier), nouveaux personnages et cosmétiques (dos de cartes, cadres, thèmes) produits au même rythme que le code, images légères (SVG ou PNG compressés, bon pour les Android d'entrée de gamme). Garde-fous : **revue anti-ressemblance** de chaque portrait (grille de contrôle : coiffure + couleur + accessoire signature + tenue ne doivent pas reproduire un personnage connu) ; aucune référence identifiable dans les noms ; **historique Git du générateur et des données conservé** (preuve d'antériorité et d'originalité). Limite honnête : le rendu est plus simple qu'une illustration professionnelle (§6.4, risque n° 2 du §11). Des **illustrations commandées** pourront remplacer ou compléter ces portraits en phase 2/3, **financées par les revenus** (avec alors un contrat de cession écrit : exploitation mondiale, tous supports, adaptation pour les cosmétiques).
3. **Arrêt du chargement depuis AniList** : images embarquées dans l'app / servies par notre CDN. Le trait « anime » n'affiche plus de titres d'œuvres.
4. **Version web** : **[Décision]** la version web actuelle (vrais personnages) est **migrée vers le même casting original au moment du lancement mobile** (même serveur, même données, cross-play web/mobile, et le site devient une vitrine qui renvoie vers les stores). La maintenir en parallèle avec les vrais personnages créerait un lien commercial avec l'app monétisée et exposerait le compte développeur. *Option laissée au propriétaire* : conserver une archive « édition fan » non monétisée, non référencée, sans lien vers l'app — déconseillé.
5. **Marque** : recherche d'antériorité **gratuite** sur « AnimeWho » avant la première soumission (bases INPI, EUIPO/TMview, WIPO Global Brand Database, recherche dans les stores) ; ne jamais utiliser « Qui est-ce ? ». Si la marque est indisponible, renommer avant le lancement (coût nul à ce stade). Le **dépôt** (INPI, 190 € pour une classe + 40 € par classe supplémentaire, classes 9, 28 et 41 : 270 €) est une dépense : il est repoussé au **premier réinvestissement financé par les revenus** (vers M6 dans le médian). Risque assumé : un tiers peut déposer le nom entre-temps (§11).
6. **[Propriétaire] Pas de juriste payant au départ.** Alternatives gratuites : modèles et guides de la **CNIL** (guide RGPD du développeur, modèles de mentions d'information, recommandations sur les mineurs et le consentement), pages d'aide d'Apple et de Google (exigences de politique de confidentialité, de suppression de compte, de contenu généré par les joueurs), ressources de l'**INPI** (guides sur la marque et le droit d'auteur), **consultations juridiques gratuites** (Points-justice / France services, permanences gratuites d'avocats organisées par les barreaux et certaines mairies), associations et communautés de développeurs indépendants. Les brouillons de CGU et de politique de confidentialité (`docs/store/`) sont relus avec ces ressources. **Ce que cela ne couvre pas** : un avis engageant sur les grilles personnalisées (phase 2), un règlement de tournoi (phase 3) ou un litige. Ces sujets sont **bloqués jusqu'à ce qu'un avis payant soit financé par les revenus** (≈ 1 000-1 500 €), ou restent hors du produit.

### 6.4 Impact sur le plan

- **Coût** : **0 €** (production interne par code) au lieu de ≈ 6 000 € d'art initial et ≈ 700 €/mois dans la v1.0. Le coût réel est le temps du fondateur (générateur, données des 120 personnages, revue anti-ressemblance).
- **Délai** : le générateur et les 120 portraits restent sur le chemin critique du lancement à M4, mais ne dépendent plus d'un recrutement ni d'un planning d'illustrateurs.
- **Qualité visuelle** : c'est la principale contrepartie. Un portrait généré par code est plus simple et plus uniforme qu'une illustration (moins d'expressivité, de poses, de détails). Cela peut réduire la conversion des fiches stores (captures moins attirantes) et la rétention : les hypothèses du §9.1 retirent 2 points de rétention J1 et 0,5 point de J30 (prudent et médian) par rapport à la v1.0. Mitigations : un style assumé et cohérent (aplats de couleur, palette forte par univers, « chibi » plutôt qu'un réalisme raté), de l'humour dans les noms et les descriptions, des animations légères, des tests A/B des captures et de l'icône, et le vote de la communauté pour améliorer les personnages les moins appréciés.
- **Plus tard** : quand la trésorerie couvre une commande d'illustrations (≈ 6 000 € pour 120 portraits) plus 3 mois de coûts — vers **M16 (février 2028) dans le médian, M7 (mai 2027) dans l'optimiste, jamais sur 36 mois dans le prudent** — des illustrations commandées peuvent remplacer les portraits générés, univers par univers, en commençant par les plus joués.
- **Attractivité** : on perd la reconnaissance immédiate (« c'est Naruto ! »). Compensations : (1) l'esthétique et l'humour des personnages originaux deviennent **la marque propre du jeu** (mascottes, stickers, merchandising possible plus tard — impossible avec des personnages sous licence) ; (2) le marketing s'appuie sur le *format* (« devine mon perso en 3 minutes ») ; (3) les grilles privées et les futures licences ramèneront des univers connus.
- **Valeur de l'actif** : un casting original — et le générateur qui le produit — est **un actif possédé**, qui a de la valeur lors d'une levée de fonds ou d'une revente ; un jeu bâti sur des IP tierces n'en a aucune.

---

## 7. Stratégie go-to-market

### 7.1 Principes

1. **Aucune acquisition payante** **[Propriétaire]** : budget zéro, et de toute façon la valeur d'un joueur (LTV ≈ 0,17 € sur 365 jours dans le médian) reste très inférieure au coût par installation (≈ 1,20 €). Un petit test publicitaire ne sera envisagé que financé par les revenus, et coupé si le retour sur dépenses à 30 jours reste sous 30 %.
2. **La boucle virale est le moteur** : chaque partie privée envoie un lien d'invitation (lien profond `animewho.app/p/CODE` qui ouvre l'app ou la page du store). Objectif : coefficient viral K ≥ 0,3.
3. **Le contenu court est le média principal** : le format « devine mon personnage » est naturellement filmable.

### 7.2 Leviers

| Levier | Actions | Coût | Indicateur |
|---|---|---|---|
| **ASO** (référencement stores) | Titre « AnimeWho : duel de déduction anime » ; mots-clés FR (jeu anime, quiz manga, deviner personnage, jeu à deux, jeu entre amis en ligne) ; **jamais de noms d'œuvres ni « Qui est-ce »** ; captures montrant le duel et la grille ; vidéo de 20 s ; tests A/B d'icônes (Google Play Store listing experiments, Apple Product Page Optimization) ; réponses aux avis | Temps | Taux de conversion fiche → installation > 30 % |
| **TikTok / Instagram Reels / YouTube Shorts** | 3 vidéos par semaine : parties commentées, « 3 questions pour trouver », réactions, création des personnages originaux (« making-of » du générateur : un personnage qui se dessine en accéléré), sondages (« quel perso original vous préférez ? ») | 0 € (tournées et montées par le fondateur avec des outils gratuits) | Vues, installations attribuées par lien |
| **Créateurs anime francophones** | Programme créateurs : 30-50 micro-créateurs (5 k-100 k abonnés) en France, Belgique, Québec, Côte d'Ivoire, Sénégal ; code créateur (cosmétique exclusif pour leurs abonnés) ; parties privées en live avec leur communauté | Cosmétiques exclusifs uniquement (pas de rémunération au départ) | Installations par code |
| **Discord** | Serveur officiel : annonces, tournois communautaires, retours de bugs, vote sur les prochains personnages | Temps | Membres actifs |
| **Reddit et forums** | r/anime (règles strictes : seulement en discussion appropriée), r/AnimeFrance, r/france (jeux), r/boardgames (mécanique) | Temps | — |
| **Conventions** | Japan Expo (Paris, juillet, > 250 000 visiteurs revendiqués) : pas de stand à plein prix au début, plutôt partenariat avec un stand d'éditeur ou d'association, tournoi sur tablettes, cartes avec QR code ; puis Paris Manga, Made in Asia (Bruxelles), Otakuthon (Montréal), festivals anime d'Abidjan et Dakar | 0 € au départ : présence en visiteur, tournoi sur le stand d'une association ou d'un partenaire ; stand, cartes imprimées et lots seulement s'ils sont financés par les revenus ou un partenaire | Installations par QR code |
| **Presse et blogs** | Jeuxvideo.com, Gamekult, Journal du Geek, Anime-Kun, Nautiljon (communiqué au lancement) | Temps | Retombées |
| **Communautés scolaires** | Le jeu est sain : clubs manga de lycées, médiathèques (événements « jeux »), sans démarchage de mineurs | Temps | — |
| **Parrainage** (phase 2) | Le parrain et le filleul reçoivent 100 Éclats quand le filleul termine 3 parties | Coût virtuel | K-factor |

### 7.3 Plan de lancement

| Quand | Étape |
|---|---|
| M1-M2 | Serveur Discord, comptes TikTok/Instagram/YouTube, début du « making-of » des personnages originaux (constitution d'une audience avant la sortie) |
| M3 | **Bêta fermée** : TestFlight (iOS) et test fermé Google Play (obligatoire pour les nouveaux comptes développeurs personnels : 12 testeurs pendant 14 jours) ; 200-500 testeurs issus du Discord |
| M3 | **Soft launch** en Belgique et au Québec (Google Play) pour mesurer D1/D7 et ajuster la pub |
| M4 (février 2027) | **Lancement** France + francophonie ; créateurs invités (codes et cosmétiques exclusifs, sans rémunération) ; communiqué de presse ; événement « tournoi de lancement » sur Discord |
| M5-M6 | Première mise à jour de contenu (nouvel univers), mise en avant demandée aux stores (formulaire Apple « Featuring nominations », Google Play Console) |
| M9 (juillet 2027) | Japan Expo : tournoi communautaire avec une association ou un stand partenaire ; cartes à QR code seulement si financées par les revenus |
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

- **Client Flutter** : écrit (`mobile/`, parité de jeu avec le web et couche de monétisation) ; reste à le stabiliser et à le maintenir, par le fondateur (aucun freelance prévu) (≈ 5 écrans : Accueil, File d'attente, Sélection, Partie, Fin + Boutique, Profil, Classement, Réglages). Le protocole temps réel existe (`socket.ts` côté web) : le client Dart reprend les mêmes événements. Le contrôle d'origine du serveur laisse déjà passer les clients sans en-tête `Origin` (applications natives).
- **Serveur** : le moteur reste tel quel. Ajouts : comptes (anonymes + liaison Sign in with Apple / Google), droits et portefeuille (voir spec), API boutique, validation des achats et des récompenses publicitaires, cosmétiques équipés diffusés dans `room_joined` / `game_start`.
- **Web** : conservé comme vitrine, page d'invitation (liens profonds) et cross-play.

### 8.2 Passage à l'échelle de l'état en mémoire

Aujourd'hui, tout l'état des parties vit dans un seul processus (d'où le Reserved VM Replit). C'est **un bon choix pour les trois années du plan dans les scénarios prudent et médian** : un processus Node.js gère sans difficulté quelques milliers de connexions Socket.IO pour un jeu au tour par tour peu bavard.

Charge prévue (pic de connexions simultanées ≈ DAU × 15 min/jour ÷ 1 440 × 3 pour le pic du soir **[Hypothèse]**) :

| Scénario | Pic fin An 1 | Pic fin An 2 | Pic fin An 3 |
|---|---:|---:|---:|
| Prudent | 7 | 13 | 20 |
| Médian | 36 | 95 | 171 |
| Optimiste | 169 | 533 | 1 163 |

Points d'attention identifiés dans le code :
1. **`MAX_SESSIONS = 2 000`** : non atteint sur 36 mois, même dans l'optimiste (≈ 1 160 connexions au pic en An 3) ; à vérifier par un test de charge sur la machine réellement choisie (une VM gratuite ou à 8 € a moins de CPU que l'ancienne hypothèse), et à relever ou abaisser en conséquence (k6 / Artillery avec de vrais sockets, comme les tests d'intégration existants).
2. **`MAX_CONNECTIONS_PER_IP = 20`** et règle Elo « deux adresses différentes » : sur mobile, **les opérateurs partagent une même adresse IP entre des milliers d'abonnés (CGNAT)**, très courant en Afrique et chez les opérateurs mobiles français. Il faut, pour les clients authentifiés, raisonner par compte/appareil plutôt que par IP (limite par IP relevée, règle anti-collusion Elo basée sur le compte + l'appareil).
3. **Redéploiement = parties coupées** : ajouter un arrêt gracieux (refuser les nouvelles parties, laisser finir les parties en cours, max 10 min) et déployer aux heures creuses.
4. **Arrière-plan mobile** : iOS suspend la connexion quelques secondes après la mise en arrière-plan. Les 45 s de grâce couvrent un coup d'œil à un message ; prévoir un message clair et le retour automatique dans la partie.

Évolution par étapes :
- **Étape 1 (M1-M3)** : quitter la Reserved VM Replit pour une machine toujours allumée dans l'UE (données dans l'UE pour le RGPD), **gratuite ou à ≈ 8 €/mois** (§8.3), avec Postgres sur la même machine, une sauvegarde quotidienne de la base hors de la machine (stockage gratuit) et une supervision gratuite (offres gratuites de Sentry et d'un service de surveillance de disponibilité).
- **Étape 2 (quand le pic dépasse ≈ 1 500 connexions ou si le CPU dépasse 50 %)** : sessions et file d'appariement dans **Redis** ; plusieurs processus ; chaque partie reste attachée à **un** processus (routage par code de partie, « sticky ») ; adaptateur Socket.IO Redis pour les messages croisés. Avec les nouvelles projections, ce seuil n'est pas atteint sur 36 mois (optimiste : ≈ 1 160 au pic en An 3) ; à préparer en An 3 si l'optimiste se confirme (≈ 3-4 semaines de développement, + un Redis géré ou installé sur la machine).
- **Étape 3** : régions multiples (Europe + Amérique du Nord) si l'anglais décolle.

### 8.3 Coûts d'exploitation

**[Propriétaire]** Budget zéro : le seul coût incompressible est l'hébergement. Le serveur doit être **toujours allumé, en un seul processus** : l'état des parties est en mémoire, donc toute offre qui met le serveur en veille quand il n'y a pas de trafic ou qui multiplie les instances (autoscale) coupe les parties en cours.

| Option d'hébergement | Coût mensuel | Limites | Verdict |
|---|---:|---|---|
| **A. Offre « toujours gratuite » d'Oracle Cloud** : VM Arm Ampere A1 (limites réduites en 2026, de l'ordre de 2 cœurs / 12 Go selon les retours, à vérifier) ou petite VM AMD, région UE (Paris, Marseille, Francfort) ; Postgres installé sur la VM | **0 €** | carte bancaire demandée à l'inscription ; une instance jugée inactive (CPU au 95ᵉ centile < 20 % sur 7 jours — **cas probable d'un petit serveur de jeu**) peut être récupérée par Oracle, sauf à passer le compte en paiement à l'usage (toujours gratuit dans les limites, mais une erreur de configuration peut alors être facturée) ; capacité Arm parfois indisponible ; limites modifiées sans préavis ; aucun support ; sauvegardes à faire soi-même | **Option gratuite crédible pour la bêta et le lancement**, à condition d'avoir une sauvegarde quotidienne de la base hors de la VM et une procédure de bascule testée (réinstallation en moins d'une heure) |
| **B. Petit serveur virtuel (VPS) dans l'UE** (Hetzner, OVHcloud, Scaleway…) ; Postgres sur la même machine | **≈ 4-8 €** (8 € retenus dans le modèle, sauvegardes comprises) + 0,004 € par DAU et par mois pour monter en gamme | administration système par le fondateur (mises à jour, pare-feu, TLS) | **Hypothèse de base du modèle** ; à prendre au plus tard quand les revenus encaissés le couvrent (dès M6) |
| **C. Replit actuel** : Reserved VM partagée 0,5 vCPU / 2 Go (≈ 15-20 $/mois) + base Postgres Replit (0,16 $ par heure où la base est active + 0,35 $ par Go et par mois) | **≈ 35-65 €** selon les heures d'activité de la base ; jusqu'à ≈ 125 € si elle ne se met jamais en veille (730 h × 0,16 $) ; un abonnement Replit peut s'y ajouter | aucun travail de migration ; coût le plus élevé et variable | À garder seulement jusqu'à la migration (M1-M3) ; vérifier la facture réelle |
| Offres qui s'endorment (Replit Autoscale, offres gratuites de Render, Koyeb…) | 0 € | **incompatibles** avec l'état en mémoire (veille, instances multiples) | ❌ |
| Postgres gratuit hébergé ailleurs (Supabase : 500 Mo, pause après 7 jours sans activité ; Neon : 0,5 Go, mise en veille avec réveil rapide) | 0 € | quotas, données hors de la machine (choisir une région UE) | Alternative si la VM gratuite est trop juste ; sans base, le jeu fonctionne mais boutique, Éclats et classement sont coupés |

**Coût mensuel minimal pour fonctionner : 0 €** avec l'option A (avec ses risques), **≈ 8 €** de façon fiable avec l'option B. La sensibilité (§9.4) montre que rester sur Replit (≈ 45 €/mois) ne change presque rien au résultat du médian, mais pèse sur le prudent (≈ 540 €/an, soit ≈ 440 € de plus que l'option B, pour ≈ 2 700 € de chiffre d'affaires en An 3).

| Autre poste | Hypothèse | Coût dans le modèle |
|---|---|---|
| Comptes développeur | **Déjà ouverts [Propriétaire]**. Apple : 99 $/an (≈ 92 €) dus tant que le compte existe, **payés par ailleurs** (coût déjà engagé, hors modèle) ; Google : 25 $ une fois, déjà payés | 0 € (≈ 92 €/an hors modèle) |
| Nom de domaine | Utile pour les liens d'invitation (`animewho.app/p/CODE`), les pages légales et `app-ads.txt` (≈ 10-20 €/an) | 0 € au départ : pages légales sur un hébergement gratuit (par ex. GitHub Pages), liens profonds retirés de la v1 ou servis par un sous-domaine gratuit ; **achat recommandé avant la première version publique si possible**, car l'adresse du serveur et des liens est figée dans l'app |
| Commission des stores | 15 % (programme Small Business d'Apple et taux réduit Google sur le premier million de $ annuel ; abonnements à 15 %) | Intégré au revenu net |
| RevenueCat | Gratuit jusqu'à 2 500 $ (≈ 2 300 €) de revenu brut mensuel, puis 1 % | Intégré (à partir de l'An 3 dans le médian) |
| AdMob, Firebase Analytics, Remote Config, Crashlytics, Sentry (offre gratuite), surveillance de disponibilité | Gratuits | 0 € |
| TVA | Collectée et reversée par les stores (prix affichés TTC) | Intégré (÷ 1,2) |
| Charges sociales et impôt sur les revenus de l'activité | Dépendent du statut (§8.4) | **Non inclus** (résultats avant charges et impôt) |

### 8.4 Équipe

| Rôle | Qui | Quand | Coût dans le plan |
|---|---|---|---|
| Fondateur : produit, serveur Node, app Flutter, générateur de personnages, communauté, modération, partenariats | Propriétaire | Dès M1 | **Non rémunéré [Propriétaire]** |
| Bêta-testeurs, modérateurs Discord, ambassadeurs | Bénévoles de la communauté (contreparties cosmétiques) | Dès M2 | 0 € |
| Illustrateurs, monteur vidéo, community manager, juriste | **Aucun au départ [Propriétaire]** ; possibles plus tard, financés par les revenus (§6.4, §12) | Phase 2/3 | 0 € dans le modèle |
| Embauches | Aucune dans les trois scénarios ; dans l'optimiste, les revenus le permettraient dès l'An 2 et ce sera nécessaire (modération, support) | — | 0 € dans le modèle |

**Structure juridique.** Les comptes développeur existent déjà **[Propriétaire]** : il n'y a ni société ni D-U-N-S à créer pour publier. Points à vérifier :
1. **Les comptes sont-ils au nom de la bonne entité ?** La règle 5.2 d'Apple exige que l'app soit soumise par le titulaire des droits. Avec un casting généré par le code du propriétaire, un compte **personnel** est cohérent (il est l'auteur) ; si le compte est celui d'une société, le propriétaire doit lui céder par écrit ses droits sur le code et les images (acte gratuit, modèle simple).
2. **Compte Google personnel** créé après novembre 2023 : test fermé obligatoire (12 testeurs pendant 14 jours) avant la production (§7.3), et adresse du développeur affichée publiquement dès que l'app vend quelque chose.
3. **Déclaration des revenus** : les versements des stores et d'AdMob sont des revenus d'activité. Si le propriétaire n'a pas encore de statut, l'immatriculation en **micro-entreprise** est gratuite (guichet unique de l'INPI) et adaptée à ces montants ; les charges sociales et l'impôt correspondants ne sont pas dans le modèle.

---

## 9. Projections financières sur 3 ans

> Tous les chiffres de cette section sont imprimés par [`model/model.mjs`](./model/model.mjs) (`node docs/business-plan/model/model.mjs`) ; rien n'est recopié à la main. La version 1.0 est reproductible avec `--v1` (§9.6).

### 9.1 Hypothèses par scénario (révision du 27/11/2026 : budget zéro)

| Hypothèse | Prudent | Médian | Optimiste | Repère de marché / changement par rapport à la v1.0 |
|---|---:|---:|---:|---|
| Installations organiques par mois — An 1 / An 2 / An 3 | 1 500 / 2 500 / 3 500 | 5 000 / 11 000 / 18 000 | 15 000 / 40 000 / 80 000 | v1.0 : 3 000 / 5 500 / 7 500 ; 11 000 / 24 000 / 40 000 ; 32 000 / 80 000 / 160 000. Environ ÷ 2 : sans créateurs rémunérés, campagne de lancement, conventions ni tests publicitaires, seuls jouent l'ASO, le bouche-à-oreille, les invitations de parties privées et le contenu publié par le fondateur |
| Multiplicateur du mois de lancement (M4) | ×1,5 | ×2 | ×2,5 | v1.0 : ×2 / ×2,5 / ×3 (plus de campagne de lancement payée) |
| Acquisition payante | 0 € | 0 € | 0 € | **[Propriétaire]** v1.0 : 0 / 300-800 / 1 000-3 000 €/mois |
| Rétention J1 / J7 / J30 | 23 % / 5,7 % / 2 % | 28 % / 8,5 % / 3,5 % | 36 % / 12,3 % / 5,5 % | v1.0 : 25/6,7/2,5 ; 30/9,5/4 ; 38/13,2/6. Portraits plus simples (§6.4). Médiane du marché J1 ≈ 22 %, J7 ≈ 4 %, J30 ≈ 0,7 % ; top 10 % : 40 % / 12 % / 4 % (GameAnalytics, données 2025) |
| Ratio DAU/MAU | 15 % | 18 % | 20 % | Casual : 10-20 % (inchangé) |
| eCPM nets mélangés (récompensée / interstitiel / bannière) | 5 / 3 / 0,30 € | 7 / 4,5 / 0,40 € | 9 / 6 / 0,50 € | Inchangé. US : interstitiel ≈ 14 $ (Appodeal T4 2024), récompensée tier 1 15-30 $ ; Afrique, Amérique latine nettement plus bas |
| Impressions par DAU et par jour (récompensée / interstitiel / bannière) | 0,5 / 0,9 / 2 | 0,6 / 1,0 / 2 | 0,7 / 1,1 / 2 | Inchangé ; cohérent avec les plafonds de la spec |
| Joueurs sans pub (achat ou abonnement) | 1 % | 1,5 % | 2 % | Inchangé |
| Conversion mensuelle en payeur (achats ponctuels) | 0,8 % des MAU | 1,5 % | 2,5 % | Inchangé ; 1-5 % (guides éditeurs) |
| Dépense mensuelle moyenne par payeur (TTC) | 4 € | 5 € | 6 € | Inchangé |
| Abonnés AnimeWho+ (dès M10) | 0,2 % des MAU | 0,4 % | 0,7 % | Inchangé |
| Acheteurs du pass par saison de 2 mois (dès M16) | 0,4 % des MAU | 0,8 % | 1,2 % | Inchangé |
| Sponsoring par mois — An 2 / An 3 | 0 / 0 € | 0 / 500 € | 500 / 2 000 € | v1.0 : 0/0 ; 300/1 000 ; 1 000/3 000 (audience plus petite) |
| Développement, art, marketing, équipe, juridique, administratif | 0 € | 0 € | 0 € | **[Propriétaire]** v1.0 : ≈ 53 000 à 74 000 € la 1ʳᵉ année |
| Hébergement (serveur + Postgres) | 8 €/mois + 0,004 € par DAU | idem | idem | v1.0 : 40 €/mois + 0,004 € par DAU (20 € avant lancement) ; options gratuites et Replit : §8.3 |
| Délai d'encaissement des revenus | 2 mois | 2 mois | 2 mois | Nouveau : AdMob paie vers le 21 du mois suivant (au-delà de 100 $ de solde), Apple ≈ 33 jours après la fin du mois fiscal, Google le 15 du mois suivant |

**Hypothèses communes** : M1-M3 sans revenu ni installation (finitions, bêta) ; achats : prix TTC ÷ 1,2 (TVA) × 0,85 (commission 15 %) = **70,8 % du prix payé** revient au développeur ; abonnement : 2,49 € TTC de revenu mensuel moyen par abonné (mélange mensuel 2,99 € et annuel 19,99 €) ; pass : 4,99 € par saison de 2 mois ; RevenueCat : 1 % du revenu brut des stores les mois où il dépasse ≈ 2 300 € (2 500 $) ; **comptes développeur hors modèle** (Apple 92 €/an payé par ailleurs) ; **pas d'impôt ni de charges sociales** (résultat avant impôt) ; **pas de rémunération du fondateur**.

### 9.2 Résultats synthétiques


| Indicateur | Prudent | Médian | Optimiste |
|---|---:|---:|---:|
| Installations cumulées à M36 | 86 250 | 398 000 | 1 597 500 |
| DAU fin An 1 / An 2 / An 3 | 212 / 414 / 628 | 1 157 / 3 027 / 5 463 | 5 422 / 17 056 / 37 230 |
| Rétention J1 / J7 / J30 | 23 % / 5,7 % / 2 % | 28 % / 8,5 % / 3,5 % | 36 % / 12,3 % / 5,5 % |
| ARPDAU An 3 (hors sponsoring) | ≈ 0,013 € | ≈ 0,023 € | ≈ 0,037 € |
| Jours actifs par installation sur 365 j | 4,6 | 7,6 | 11,7 |
| Valeur d'une installation sur 365 j (LTV) | ≈ 0,06 € | ≈ 0,17 € | ≈ 0,43 € |
| CA net An 1 / An 2 / An 3 | 544 / 1 684 / 2 727 € | 5 111 / 20 296 / 45 501 € | 38 663 / 181 169 / 433 209 € |
| Coûts An 1 / An 2 / An 3 | 102 / 113 / 123 € | 130 / 215 / 630 € | 566 / 2 266 / 5 177 € |
| Résultat An 1 / An 2 / An 3 | +441 / +1 571 / +2 603 € | +4 980 / +20 081 / +44 871 € | +38 097 / +178 904 / +428 032 € |
| Rentable chaque mois à partir de | M4 (févr. 2027) | M4 (févr. 2027) | M4 (févr. 2027) |
| Besoin de financement maximal (creux de trésorerie) | 41 € (M5) | 46 € (M5) | 128 € (M5) |
| Trésorerie cumulée à M36 | +4 120 € | +61 404 € | +559 617 € |
| DAU de rentabilité (coûts M36, hors sponsoring) | ≈ 26 | ≈ 88 | ≈ 465 |
| DAU pour dégager en plus 1 500 €/mois (avant charges) | ≈ 3 804 | ≈ 2 233 | ≈ 1 808 |

Lecture : avec des coûts quasi nuls, le résultat est presque égal au chiffre d'affaires et le premier mois de revenus est déjà bénéficiaire. Le « besoin de financement » (41 à 128 €) n'est que l'avance de l'hébergement de M1 à M5, le temps que les premiers revenus soient versés. Le « DAU de rentabilité » ne dit donc plus grand-chose ; l'indicateur utile est le nombre de DAU nécessaire pour que le projet **rémunère** le fondateur (dernière ligne).

### 9.3 Tableaux détaillés

#### Scénario prudent

| Indicateur | An 1 (M1-M12) | An 2 (M13-M24) | An 3 (M25-M36) |
|---|---:|---:|---:|
| Installations | 14 250 | 30 000 | 42 000 |
| Installations cumulées (fin d'année) | 14 250 | 44 250 | 86 250 |
| DAU moyen (moyenne des mois) | 135 | 362 | 572 |
| DAU en fin d'année (M12/M24/M36) | 212 | 414 | 628 |
| MAU en fin d'année | 1 414 | 2 757 | 4 185 |
| Pic de connexions simultanées (fin d'année) | 7 | 13 | 20 |
| ARPDAU moyen hors sponsoring (€) | 0,011 | 0,013 | 0,013 |
| Publicité (€) | 284 | 763 | 1 204 |
| Achats intégrés ponctuels (€ nets) | 245 | 657 | 1 038 |
| Abonnement AnimeWho+ (€ nets) | 14 | 102 | 162 |
| Pass de saison (€ nets) | 0 | 162 | 324 |
| Sponsoring / partenariats (€) | 0 | 0 | 0 |
| **Chiffre d'affaires net (€)** | **544** | **1 684** | **2 727** |
| Hébergement (serveur + Postgres) | 102 | 113 | 123 |
| **Total coûts (€)** | **102** | **113** | **123** |
| **Résultat avant impôt (€)** | **441** | **1 571** | **2 603** |
| Trésorerie cumulée fin d'année (€) | 296 | 1 687 | 4 120 |

1er mois bénéficiaire : M4 ; rentable chaque mois à partir de : M4 ; besoin de financement max : 41 € (M5) ; trésorerie cumulée > 0 à partir de : M6
Seuil (M36) : coûts mensuels 11 € (sponsoring 0 €) → DAU de rentabilité ≈ 26 ; sans sponsoring ≈ 26 (à l'ARPDAU M36 de 0,013 €)

#### Scénario médian (référence)

| Indicateur | An 1 (M1-M12) | An 2 (M13-M24) | An 3 (M25-M36) |
|---|---:|---:|---:|
| Installations | 50 000 | 132 000 | 216 000 |
| Installations cumulées (fin d'année) | 50 000 | 182 000 | 398 000 |
| DAU moyen (moyenne des mois) | 714 | 2 472 | 4 707 |
| DAU en fin d'année (M12/M24/M36) | 1 157 | 3 027 | 5 463 |
| MAU en fin d'année | 6 428 | 16 814 | 30 352 |
| Pic de connexions simultanées (fin d'année) | 36 | 95 | 171 |
| ARPDAU moyen hors sponsoring (€) | 0,020 | 0,023 | 0,023 |
| Publicité (€) | 2 453 | 8 495 | 16 178 |
| Achats intégrés ponctuels (€ nets) | 2 529 | 8 755 | 16 672 |
| Abonnement AnimeWho+ (€ nets) | 129 | 1 163 | 2 214 |
| Pass de saison (€ nets) | 0 | 1 884 | 4 437 |
| Sponsoring / partenariats (€) | 0 | 0 | 6 000 |
| **Chiffre d'affaires net (€)** | **5 111** | **20 296** | **45 501** |
| Hébergement (serveur + Postgres) | 130 | 215 | 322 |
| Outils (RevenueCat au-delà du seuil gratuit…) | 0 | 0 | 308 |
| **Total coûts (€)** | **130** | **215** | **630** |
| **Résultat avant impôt (€)** | **4 980** | **20 081** | **44 871** |
| Trésorerie cumulée fin d'année (€) | 3 590 | 20 911 | 61 404 |

1er mois bénéficiaire : M4 ; rentable chaque mois à partir de : M4 ; besoin de financement max : 46 € (M5) ; trésorerie cumulée > 0 à partir de : M6
Seuil (M36) : coûts mensuels 61 € (sponsoring 500 €) → DAU de rentabilité ≈ 0 ; sans sponsoring ≈ 88 (à l'ARPDAU M36 de 0,023 €)

#### Scénario optimiste

| Indicateur | An 1 (M1-M12) | An 2 (M13-M24) | An 3 (M25-M36) |
|---|---:|---:|---:|
| Installations | 157 500 | 480 000 | 960 000 |
| Installations cumulées (fin d'année) | 157 500 | 637 500 | 1 597 500 |
| DAU moyen (moyenne des mois) | 3 312 | 13 294 | 30 530 |
| DAU en fin d'année (M12/M24/M36) | 5 422 | 17 056 | 37 230 |
| MAU en fin d'année | 27 109 | 85 281 | 186 150 |
| Pic de connexions simultanées (fin d'année) | 169 | 533 | 1 163 |
| ARPDAU moyen hors sponsoring (€) | 0,032 | 0,036 | 0,037 |
| Publicité (€) | 16 608 | 66 675 | 153 116 |
| Achats intégrés ponctuels (€ nets) | 21 111 | 84 752 | 194 629 |
| Abonnement AnimeWho+ (€ nets) | 944 | 9 848 | 22 616 |
| Pass de saison (€ nets) | 0 | 13 894 | 38 848 |
| Sponsoring / partenariats (€) | 0 | 6 000 | 24 000 |
| **Chiffre d'affaires net (€)** | **38 663** | **181 169** | **433 209** |
| Hébergement (serveur + Postgres) | 255 | 734 | 1 561 |
| Outils (RevenueCat au-delà du seuil gratuit…) | 311 | 1 532 | 3 615 |
| **Total coûts (€)** | **566** | **2 266** | **5 177** |
| **Résultat avant impôt (€)** | **38 097** | **178 904** | **428 032** |
| Trésorerie cumulée fin d'année (€) | 27 537 | 178 870 | 559 617 |

1er mois bénéficiaire : M4 ; rentable chaque mois à partir de : M4 ; besoin de financement max : 128 € (M5) ; trésorerie cumulée > 0 à partir de : M6
Seuil (M36) : coûts mensuels 519 € (sponsoring 2 000 €) → DAU de rentabilité ≈ 0 ; sans sponsoring ≈ 465 (à l'ARPDAU M36 de 0,037 €)

### 9.4 Sensibilité du scénario médian

| Variation (toutes choses égales par ailleurs) | Résultat An 1 | Résultat An 3 | Trésorerie cumulée M36 | Rentable chaque mois à partir de |
|---|---:|---:|---:|---:|
| Base | +4 980 € | +44 871 € | +61 404 € | M4 |
| eCPM −30 % | +4 244 € | +40 018 € | +54 191 € | M4 |
| eCPM +30 % | +5 717 € | +49 724 € | +68 617 € | M4 |
| Conversion en payeur divisée par 2 | +3 716 € | +36 843 € | +49 323 € | M4 |
| Installations −30 % | +3 458 € | +33 396 € | +44 612 € | M4 |
| Installations +30 % | +6 503 € | +56 533 € | +78 384 € | M4 |
| Rétention J30 −1 pt (2,5 %) | +3 912 € | +33 986 € | +46 496 € | M4 |
| Hébergement Replit actuel (≈ 45 €/mois au lieu de 8 €) | +4 536 € | +44 427 € | +60 072 € | M4 |
| Hébergement gratuit (0 € fixe) | +5 076 € | +44 967 € | +61 692 € | M4 |

**Lecture** : comme dans la v1.0, le plan est d'abord sensible au **volume d'installations** et à la **rétention**, bien plus qu'aux eCPM ou à l'hébergement. Rester sur Replit (≈ 45 €/mois) coûte ≈ 440 €/an : sans effet notable sur le médian, mais cela ramène le résultat An 1 du prudent à ≈ 0 € (et l'An 3 de +2 603 € à ≈ +2 160 €). La priorité absolue des 6 premiers mois reste la qualité du jeu (y compris des portraits) et la viralité.

### 9.5 Seuil de rentabilité et capacité de réinvestissement

- **Couvrir les coûts** : ≈ 8 €/mois d'hébergement au lancement, soit une trentaine de DAU au plus. Tous les scénarios y sont dès M4.
- **Rémunérer le fondateur** : dégager 1 500 €/mois en plus des coûts (avant charges sociales et impôt) demande ≈ 2 200 DAU au niveau de monétisation du médian (atteint vers M16, février 2028), ≈ 3 800 DAU à celui du prudent (non atteint : 628 DAU à M36), ≈ 1 800 DAU à celui de l'optimiste (dès M4).
- **Financer des illustrations** (≈ 6 000 € pour 120 portraits) en gardant 3 mois de coûts d'avance : possible à partir de **M16 (février 2028) dans le médian**, **M7 (mai 2027) dans l'optimiste**, **jamais sur 36 mois dans le prudent** (trésorerie de 4 120 € à M36).
- **Premiers achats financés par les revenus**, dans l'ordre recommandé : nom de domaine (≈ 15 €/an), passage à un hébergement payant fiable (≈ 8 €/mois), dépôt de la marque (≈ 270 €, possible vers M6 dans le médian, M11 dans le prudent), avis juridique ciblé (≈ 1 000-1 500 €), puis illustrations.

### 9.6 Contrôle du modèle

- **Reconstruction.** Le script de la v1.0 avait été perdu. Il a été reconstruit à partir de l'annexe B (méthode) et de l'annexe A / §9.1 (hypothèses). Lancé avec les hypothèses de la v1.0 (`--v1`), il retrouve **les coûts publiés à l'euro près** et **les revenus à moins de 0,5 % près** (CA An 3 médian 113 486 € contre 113 560 € ; résultat An 3 41 928 € contre 42 000 € ; besoin de financement médian 49 843 € contre 49 890 € ; DAU de fin d'année à moins de 2 %). Les écarts viennent de détails non écrits de la v1.0 (définition exacte du « DAU de fin de mois », découpage des jours). Le seuil RevenueCat a été pris à 2 300 € (2 500 $), valeur qui retrouve la ligne « Outils » publiée.
- **Erreur de lecture corrigée dans la v1.0** : le médian y était dit « rentable chaque mois à partir de M16 ». M16 était en fait le **premier** mois bénéficiaire ; les mois de juillet (convention à 1 500 €) repassaient en perte jusqu'à M21. Cette erreur disparaît avec la v1.1 (plus de convention payante).
- **Second calcul indépendant.** Les trois scénarios révisés ont été recalculés par un script Python écrit séparément (même méthode, autre code) : CA, coûts, résultats annuels, trésorerie à M36, besoin de financement et DAU de M36 sont identiques à l'euro près. Contrôle de vraisemblance à la main : médian An 3 ≈ 4 707 DAU moyens × 365 j × 0,023 € ≈ 39 500 € + 6 000 € de sponsoring ≈ 45 500 € (modèle : 45 501 €).

---

## 10. KPIs à suivre

| Famille | KPI | Objectif médian | Seuil d'alerte | Outil |
|---|---|---|---|---|
| Acquisition | Installations / jour (toutes organiques) | ≈ 165/j en An 1 (hors pic de lancement) | < 80/j | Consoles stores, Firebase |
| | Taux de conversion fiche store | > 30 % | < 20 % | App Store Connect, Play Console |
| | Coefficient viral K (installations issues d'invitations / installations) | ≥ 0,3 | < 0,1 | Liens profonds |
| Activation | % de nouveaux joueurs qui terminent 1 partie | > 70 % | < 50 % | `game_end` |
| | Temps avant la 1ʳᵉ partie | < 60 s | > 120 s | `onboarding_complete`, `game_start` |
| Rétention | J1 / J7 / J30 | 28 % / 8,5 % / 3,5 % | 22 % / 5 % / 2 % | Cohortes Firebase |
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
| Finance | Revenus encaissés vs coûts du mois ; trésorerie disponible pour le prochain réinvestissement (§9.5) | Revenus ≥ coûts dès M6 | Coûts non couverts 3 mois de suite | Tableur + `model/model.mjs` recalé sur les chiffres réels |
| Temps | Heures du fondateur par semaine (développement, communauté, modération) | Soutenable | > 25 h/semaine en plus d'un autre emploi pendant 2 mois | Agenda |

---

## 11. Risques et mitigations

| # | Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Rejet ou retrait store pour atteinte à la propriété intellectuelle** | Élevée si vrais personnages ; faible avec casting original | Critique | Casting original généré par code (§6), contrôle anti-ressemblance de chaque portrait, historique Git conservé comme preuve d'originalité, aucune marque tierce dans les métadonnées |
| 2 | **Qualité visuelle insuffisante des portraits générés par code** (fiches stores moins attirantes, joueurs moins attachés aux personnages) | Moyenne à élevée | Élevé | Style simple mais assumé et cohérent (aplats, palette forte par univers), humour des noms, animations légères, tests A/B des captures et de l'icône, vote de la communauté ; illustrations commandées dès que la trésorerie le permet (M16 médian, §9.5) ; suivre le taux de conversion des fiches (> 30 %) et la rétention J1 dès la bêta |
| 3 | Le casting original attire moins que les vrais personnages | Moyenne | Élevé | Univers forts, grilles privées (phase 2, après avis juridique), licences accessibles (phase 3) |
| 4 | **Juridique sans avocat** : CGU, politique de confidentialité, consentement des mineurs, droit de rétractation, sort des Éclats rédigés sans relecture professionnelle | Moyenne | Élevé (rejet store, plainte, sanction CNIL, litige consommateur) | Modèles et guides de la CNIL, exigences d'Apple et Google suivies point par point (`docs/store/CHECKLIST_SOUMISSION.md`), consultations gratuites (Points-justice, permanences d'avocats), **aucune fonction juridiquement incertaine en v1** (pas de grilles personnalisées, pas de tournoi à lots, pas d'entrée payante) ; avis payant ciblé dès que les revenus le permettent |
| 5 | Nom « AnimeWho » déposé par un tiers avant notre dépôt (repoussé faute de budget) | Faible | Moyen (renommage) | Recherche d'antériorité gratuite avant la soumission ; dépôt INPI (≈ 270 €) comme l'un des premiers achats financés par les revenus |
| 6 | **File d'attente vide** (pas assez de joueurs simultanés) — aggravée par une croissance plus lente | Élevée au début | Élevé | Proposer l'ordinateur après 20 s (en le disant clairement, jamais un faux humain), parties privées, files concentrées sur les heures de pointe, cross-play web |
| 7 | Rétention faible | Moyenne | Élevé | Quêtes quotidiennes, coffre quotidien, saisons, nouveaux univers réguliers (générés par code, donc à coût nul), notifications raisonnables |
| 8 | Publicité trop intrusive → mauvaises notes | Moyenne | Moyen | Règles anti-frustration de la spec, plafonds pilotés à distance, tests A/B |
| 9 | Non-conformité RGPD / consentement publicitaire / mineurs | Moyenne | Élevé (amendes, retrait) | SDK UMP de Google (CMP certifiée IAB TCF v2.2), ATT sur iOS, âge minimum 13 ans, pub non personnalisée sous l'âge du consentement numérique (15 ans en France), pas de ciblage enfants, politique de confidentialité ; hébergement dans l'UE |
| 10 | Contenu inapproprié dans les **questions libres** (contenu généré par les joueurs) | Moyenne | Élevé (règle Apple 1.2 : filtrage, signalement, blocage obligatoires) | Filtre de mots, bouton signaler/bloquer, option « questions vérifiées uniquement » par défaut pour les moins de 16 ans, journalisation ; modération par le fondateur puis par des bénévoles de confiance |
| 11 | **Hébergement gratuit retiré ou instance récupérée** (offre « toujours gratuite ») ; panne sans support | Moyenne | Moyen à élevé (parties coupées, base perdue sans sauvegarde) | Sauvegarde quotidienne de la base hors de la machine, procédure de réinstallation testée, passage à un VPS à ≈ 8 €/mois dès que les revenus encaissés le couvrent (§8.3) |
| 12 | CGNAT mobile : limites par IP et règle Elo faussées | Élevée | Moyen | Identité par compte/appareil (§8.2) |
| 13 | Panne / redéploiement pendant les parties | Moyenne | Moyen | Arrêt gracieux, supervision gratuite, déploiements en heures creuses |
| 14 | Dépendance aux plateformes (commission, politiques, AdMob) | Faible-moyenne | Moyen | Médiation publicitaire (2ᵉ réseau), web en complément, suivi des changements de politique |
| 15 | Triche, multi-comptes pour gonfler l'Elo | Moyenne | Moyen | Serveur arbitre (existant), règles anti-collusion, limite de parties classées par paire |
| 16 | Fraude aux achats / récompenses publicitaires | Moyenne | Faible-moyen | Validation serveur des reçus, SSV AdMob, registre des transactions idempotent |
| 17 | Tournois requalifiés en jeux d'argent | Faible si gratuits | Élevé | Inscription gratuite, aucune obligation d'achat, règlement ; pas de tournoi à lots avant un avis juridique |
| 18 | **Épuisement du fondateur** (tout repose sur une personne, sans freelance) | Élevée | Élevé | Périmètre v1 réduit, contenu généré par code, bénévoles de la communauté, points de décision sur le temps passé (§12) ; premiers revenus réinvestis dans de l'aide ponctuelle |
| 19 | Revenus non déclarés ou mauvais statut | Faible | Moyen | Statut de micro-entrepreneur (gratuit) avant le premier versement ; charges et impôt non inclus dans le modèle |
| 20 | Comptes développeur au nom de la mauvaise entité (personne vs société) | Faible | Moyen (règle Apple 5.2, transfert d'app compliqué) | Vérifier avant la première soumission (§8.4) ; cession écrite des droits si le compte est celui d'une société |

---

## 12. Feuille de route

### 0-3 mois (M1-M3 : novembre 2026 → janvier 2027) — Construire légalement, sans dépenser
- Vérifier que les comptes Apple et Google existants sont au nom de la bonne entité (§8.4) ; activer le programme Small Business d'Apple ; recherche d'antériorité gratuite sur « AnimeWho » ; statut de micro-entrepreneur si nécessaire (gratuit).
- Générateur de portraits SVG + données des traits des 120 personnages (test « aucun doublon de traits » existant à réutiliser) ; revue anti-ressemblance.
- CGU et politique de confidentialité finalisées avec les ressources gratuites (CNIL, guides Apple/Google) ; pages publiées sur un hébergement gratuit.
- Serveur : sortie de la Reserved VM Replit vers une machine toujours allumée dans l'UE, gratuite ou à ≈ 8 €/mois (§8.3), sauvegardes quotidiennes ; comptes anonymes + Sign in with Apple/Google, portefeuille, droits, validation des achats et récompenses, cosmétiques équipés, signalement/blocage, limites par compte.
- App Flutter v1 (déjà écrite) : finitions, AdMob, RevenueCat, Firebase, consentements.
- Bêta fermée (et test fermé de 14 jours si le compte Google est personnel), soft launch Belgique/Québec.
- **Point de décision M3** : D1 ≥ 23 % en soft launch et note de la bêta sur les portraits correcte, sinon reporter le lancement et itérer (portraits, onboarding).

### 3-6 mois (M4-M6 : février → avril 2027) — Lancer et apprendre
- Lancement francophonie ; créateurs invités (codes et cosmétiques exclusifs, sans rémunération) ; Discord.
- Itérations hebdomadaires sur l'onboarding, la file d'attente, les fréquences de pub (Remote Config).
- 1er nouvel univers (24 personnages générés), quêtes quotidiennes.
- Premiers achats financés par les revenus encaissés (§9.5) : nom de domaine, hébergement payant fiable si l'offre gratuite a été retenue.
- **Point de décision M7** : D7 ≥ 6 % et ≥ 700 DAU → trajectoire médiane, continuer ; sinon concentrer le temps disponible sur la rétention et les portraits, sans rien dépenser.

### 6-12 mois (M7-M12 : mai → octobre 2027) — Fidéliser et monétiser mieux
- AnimeWho+ (M10), packs de thèmes pour parties privées, parrainage.
- Japan Expo (juillet 2027) en visiteur ou avec une association.
- Version anglaise (M10-M12).
- Dépôt de la marque (≈ 270 €) dès que la trésorerie le permet.
- **Point de décision M10** : si DAU < 400 et D30 < 2,5 % (trajectoire prudente) → **mode maintenance** : le jeu reste en ligne (≈ 8 €/mois, couverts par ses revenus), le fondateur réduit son temps aux correctifs et à la modération ; ou arrêt propre (préavis de 60 jours prévu par les CGU). Si ARPDAU > 0,02 € et DAU > 1 000 → préparer la phase 3.

### 12-36 mois (M13-M36 : novembre 2027 → octobre 2029) — Saisons, international, partenariats
- Pass de saison et classement saisonnier (M16) ; tournois gratuits sponsorisés **après un avis juridique** financé par les revenus.
- **Illustrations commandées** pour remplacer ou compléter les portraits générés, univers par univers, dès que la trésorerie couvre ≈ 6 000 € + 3 mois de coûts (M16 dans le médian, M7 dans l'optimiste).
- Espagnol et portugais brésilien.
- Licences accessibles (manga français, webtoons, créateurs, VTubers) en partage de revenus ; prospection d'éditeurs francophones (Kana, Pika, Glénat, Ki-oon, Ankama) pour des collaborations promotionnelles.
- Passage à l'architecture multi-processus (Redis) seulement si le pic dépasse ≈ 1 500 connexions (non atteint sur 36 mois, même dans l'optimiste).
- Selon la trajectoire : aide rémunérée (modération, développement) et éventuelle levée de fonds (optimiste), rémunération partielle du fondateur (médian, à partir de ≈ 2 200 DAU), maintenance (prudent).
- Pistes ultérieures : mode asynchrone (une question par jour, jeu « au long cours » avec notifications), mode équipe 2v2, merchandising des personnages originaux.

---

## 13. Prochaines étapes immédiates

Les dix actions des 30 prochains jours, dans l'ordre (aucune ne coûte d'argent) :

1. **Valider les décisions de l'annexe A** (surtout : casting généré par code, migration de la version web, nom de l'app, option d'hébergement).
2. **Vérifier les comptes développeur existants** : titulaire (personne ou société, §8.4), accords et informations fiscales et bancaires d'App Store Connect, adhésion au programme Small Business d'Apple, profil de paiement Google, obligation de test fermé si le compte Google est personnel.
3. **Recherche d'antériorité gratuite sur « AnimeWho »** (INPI, EUIPO/TMview, stores) ; renommer maintenant si nécessaire. Dépôt repoussé au premier réinvestissement.
4. **Générateur de portraits SVG** : style, palette par univers, tableau des traits des 120 personnages, grille anti-ressemblance ; premiers portraits montrés au Discord pour avis.
5. **Choisir l'hébergement** (§8.3) : ouvrir l'offre gratuite ou un VPS à ≈ 8 €/mois, y installer le serveur et Postgres, mettre en place la sauvegarde quotidienne hors de la machine et tester une restauration ; arrêter ensuite la Reserved VM Replit.
6. **Relire CGU et politique de confidentialité** (`docs/store/`) avec le guide RGPD du développeur et les modèles de la CNIL ; noter les questions ouvertes pour une permanence juridique gratuite.
7. **Préparer le serveur** : branche « mobile » avec comptes, portefeuille et endpoints de validation ; test de charge sur la machine choisie.
8. **Ouvrir le Discord et les comptes sociaux**, commencer le « making-of » du générateur de personnages ; recruter 20-50 bêta-testeurs.
9. **Mettre en place le tableau de bord KPIs** (Firebase + AdMob + RevenueCat + tableur des revenus encaissés et des coûts).
10. **Statut fiscal** : immatriculation gratuite en micro-entreprise si le propriétaire n'a pas de statut, avant le premier versement des stores.

---

## Annexe A — Hypothèses et décisions prises par défaut

La v1.0 a été rédigée sans pouvoir consulter le propriétaire ; les choix suivants ont été faits par défaut et chacun peut être revu. Les lignes marquées **[Propriétaire]** ont été décidées par le propriétaire le 27 novembre 2026 et remplacent les hypothèses précédentes.

| # | Sujet | Décision / hypothèse retenue | Raison |
|---|---|---|---|
| 1 | Propriété intellectuelle | Casting 100 % original pour les stores ; plus de portraits AniList | Risque de rejet/retrait inacceptable (§6) |
| 2 | Version web actuelle | Migrée vers le casting original au lancement mobile | Cohérence, cross-play, pas de lien commercial avec des IP tierces |
| 3 | Nom | « AnimeWho » conservé sous réserve de disponibilité (recherche gratuite, dépôt financé par les revenus) ; jamais « Qui est-ce ? » | Marque Hasbro |
| 4 | Calendrier | M1 = novembre 2026 ; lancement M4 = février 2027 | App Flutter déjà écrite ; générateur de portraits et serveur à finir |
| 5 | Rémunération du fondateur | **[Propriétaire]** Aucun salaire ; non incluse dans le modèle | Budget zéro |
| 6 | Comptes et structure | **[Propriétaire]** Comptes Apple et Google déjà ouverts ; pas de société ni de D-U-N-S à créer ; vérifier le titulaire (§8.4) ; micro-entreprise gratuite si besoin pour déclarer les revenus | Décision du propriétaire |
| 7 | Budget | **[Propriétaire]** Zéro : aucune dépense de départ ; tout achat ultérieur est financé par les revenus encaissés (§9.5) | Décision du propriétaire |
| 8 | Production du casting | **[Propriétaire]** En interne : portraits SVG générés par code, style anime simplifié, droits entièrement détenus ; illustrations payantes possibles en phase 2/3, financées par les revenus | Coût nul ; limites visuelles assumées (§6.4) |
| 9 | Acquisition et marketing | **[Propriétaire]** 0 € : croissance purement organique (ASO, viralité des parties privées, contenu publié par le fondateur, créateurs invités sans rémunération) | Budget zéro ; LTV < CPI de toute façon |
| 10 | Juridique | **[Propriétaire]** Pas de juriste payant au départ : ressources gratuites (CNIL, INPI, guides Apple/Google, consultations gratuites) ; fonctions juridiquement incertaines reportées | Risques détaillés au §11 (n° 4) |
| 11 | Hébergement | Machine toujours allumée dans l'UE, Postgres sur la même machine : ≈ 8 €/mois dans le modèle ; offre gratuite possible au lancement ; Replit (≈ 35-65 €/mois) seulement jusqu'à la migration | Seul coût incompressible (§8.3) ; état en mémoire incompatible avec la mise en veille |
| 12 | Frais Apple | 99 $/an (≈ 92 €) payés par ailleurs, hors modèle | Coût déjà engagé, indépendant du projet |
| 13 | Commission stores | 15 % (programmes petites entreprises) | Revenus stores < 1 M$/an dans tous les scénarios, y compris l'optimiste An 3 (≈ 0,26 M€ nets, ≈ 0,36 M€ payés par les joueurs) — à surveiller au-delà |
| 14 | TVA | Prix TTC ÷ 1,2 | Simplification (TVA française ; les taux varient selon les pays) |
| 15 | Répartition géographique | ≈ 60 % pays à eCPM élevé, ≈ 35 % Afrique/Maghreb, ≈ 5 % autres | Estimation, reflétée dans les eCPM mélangés |
| 16 | Gestion des achats | RevenueCat (gratuit < 2 500 $/mois) + webhooks vers notre serveur | Rapidité, multi-store, validation serveur incluse |
| 17 | Régie publicitaire | Google AdMob (+ médiation AppLovin ou Unity en phase 2) | Standard Flutter (`google_mobile_ads`), consentement UMP intégré |
| 18 | Âge minimum | 13 ans ; pub non personnalisée sous 15 ans (France) / 16 ans selon pays | RGPD, politiques Apple/Google |
| 19 | Monnaie virtuelle | Une seule monnaie (« Éclats »), gagnée et achetable, sans loot box | Simplicité, transparence |
| 20 | Pas d'avantage payant en JcJ | Indices et vie supplémentaire seulement contre l'ordinateur | Équité de l'Elo |
| 21 | Prix | Paliers ronds en euros (0,99 → 19,99 €), localisés par les stores ailleurs | Standard |

## Annexe B — Méthode de calcul des projections

Le modèle ([`model/model.mjs`](./model/model.mjs), Node.js sans dépendance, 36 mois, simulation **jour par jour** des cohortes ; `--v1` reproduit la version 1.0, `--json` exporte les valeurs mensuelles) :
1. **Installations** : installations organiques mensuelles du scénario (× multiplicateur à M4) + budget d'acquisition ÷ coût par installation (nul depuis la v1.1), réparties uniformément sur les jours calendaires du mois.
2. **Rétention** : courbe en loi de puissance r(d) = J1 × d^(−b), avec b = ln(J1/J30) ÷ ln(30), calée sur J1 et J30 (J7 en découle) ; r(0) = 1. DAU(t) = Σ installations(s) × r(t − s).
3. **MAU** = DAU ÷ ratio DAU/MAU.
4. **Publicité** = DAU moyen du mois × 30,4 j × [impr. récompensées × eCPM + (1 − part sans pub) × (impr. interstitiels × eCPM + impr. bannières × eCPM)] ÷ 1 000.
5. **Achats ponctuels** = MAU × conversion × dépense moyenne TTC × 0,708.
6. **Abonnement** (dès M10) = MAU × taux d'abonnés × 2,49 € × 0,708. **Pass** (dès M16) = MAU × taux d'acheteurs par saison × 4,99 € ÷ 2 × 0,708.
7. **Coûts** : détaillés au §9.1 ; hébergement = 8 € + 0,004 € × DAU (8 € avant lancement) ; outils = 1 % du revenu brut des stores les mois où il dépasse ≈ 2 300 € (RevenueCat), le reste sur offres gratuites.
8. **Trésorerie** : coûts payés dans le mois, revenus encaissés 2 mois plus tard ; besoin de financement = creux de la trésorerie cumulée.
9. **LTV 365 j** = (1 + Σ_{d=1..365} r(d)) × ARPDAU de l'An 3. **DAU de rentabilité** = coûts de M36 ÷ (ARPDAU de M36 × 30,4).
10. Toutes les valeurs des tableaux sont générées par le script puis arrondies à l'euro ; les totaux annuels sont la somme des 12 mois. Contrôles : §9.6.

## Annexe C — Sources

Consultées en octobre 2026 ; sources d'hébergement, de marque et juridiques ajoutées le 27 novembre 2026 (prix à revérifier au moment de l'achat : plusieurs pages officielles n'ont pas pu être ouvertes directement, les chiffres viennent en partie de sources secondaires). Les chiffres de marché proviennent souvent de sources secondaires ou de cabinets aux méthodes différentes : ils servent d'ordres de grandeur.

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
- Replit — prix des Reserved VM partagées (≈ 15-20 $/mois pour 0,5 vCPU / 2 Go, baisse annoncée en août 2026) et de la base Postgres (0,16 $ par heure de calcul, 0,35 $ par Go et par mois) : https://docs.replit.com/billing/aug-cloud-billing-updates ; https://docs.replit.com/billing/about-usage-based-billing ; source secondaire : https://axonbuild.com/blog/replit-cost-per-month/
- Oracle Cloud — ressources « Always Free » et récupération des instances inactives (CPU au 95ᵉ centile < 20 % sur 7 jours) : https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm ; réduction des limites Arm en 2026 (source secondaire) : https://infoq.com/news/2026/07/oracle-cloud-free-tier-limits/
- Postgres gratuit — Neon (limites des plans) : https://neon.com/docs/introduction/limits ; comparaison Neon / Supabase (500 Mo, pause après 7 jours d'inactivité) : https://neon.com/guides/neon-vs-supabase-free-plan
- INPI — coût d'un dépôt de marque (190 € pour une classe, 40 € par classe supplémentaire) : https://www.inpi.fr/realiser-demarches/propriete-intellectuelle/deposant-et-cout-dune-marque
- CNIL — guide RGPD du développeur et modèles de mentions : https://www.cnil.fr/fr/guide-rgpd-du-developpeur
- « Qui est-ce ? » (Hasbro/MB) : https://en.wikipedia.org/wiki/Guess_Who%3F
