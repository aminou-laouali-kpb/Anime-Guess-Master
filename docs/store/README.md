# Préparation des stores — AnimeWho

Dossier de mise sur l'App Store et Google Play de l'app mobile (Flutter, `mobile/`). Rédigé le 29 octobre 2026 sans pouvoir consulter le propriétaire, mis à jour le 27 novembre 2026 (comptes développeur déjà ouverts, budget zéro, casting généré par code : voir la note de révision de `../business-plan/BUSINESS_PLAN.md`) : les choix faits par défaut sont marqués **[Hypothèse]** ou **[à valider]**.

| Fichier | Contenu |
|---|---|
| [`FICHES_STORES.md`](./FICHES_STORES.md) | Nom, sous-titre, descriptions courte et longue (FR + EN), mots-clés ASO, catégorie, classification d'âge argumentée (PEGI/IARC, Apple), visuels, coordonnées |
| [`DONNEES_STORES.md`](./DONNEES_STORES.md) | Réponses aux formulaires « Sécurité des données » (Google) et « Confidentialité de l'app » (Apple), données réellement collectées par le serveur |
| [`POLITIQUE_CONFIDENTIALITE.md`](./POLITIQUE_CONFIDENTIALITE.md) | Brouillon de politique de confidentialité (AdMob, RevenueCat, Firebase, consentement, mineurs 13+) |
| [`CGU.md`](./CGU.md) | Brouillon de conditions d'utilisation (conduite, modération, Éclats, achats, publicité) |
| [`CHECKLIST_SOUMISSION.md`](./CHECKLIST_SOUMISSION.md) | Checklist complète : propriété intellectuelle (5.2), comptes, signature, suppression de compte (5.1.1(v)), contenu généré par les joueurs (1.2), achats, publicité, revue |

Côté serveur, le contrat pour l'app est dans [`../mobile/SERVER_CHANGES.md`](../mobile/SERVER_CHANGES.md) et la montée en charge dans [`../mobile/SCALING.md`](../mobile/SCALING.md).

## Décisions humaines nécessaires avant soumission

1. **Casting original livré** et chargement des portraits externes coupé (BLOQUANT, `CHECKLIST_SOUMISSION.md` A).
2. **Comptes développeur** (déjà ouverts) : vérifier qu'ils sont au nom du titulaire des droits ; nom « AnimeWho » vérifié (recherche gratuite ; dépôt financé par les premiers revenus) ; identifiant `com.animewho.app` confirmé.
3. **Relecture juridique** (sans juriste payant au départ : ressources CNIL et consultations gratuites, BUSINESS_PLAN §6.3) de la politique de confidentialité et des CGU (durées de conservation, médiateur de la consommation, sort des Éclats en cas d'arrêt du service).
4. **Qui modère** les signalements et sous quel délai (24 h annoncées).
5. Domaine (≈ 10-20 €/an, seule dépense recommandée avant soumission) ou pages sur un hébergement gratuit (assistance, confidentialité, CGU, suppression de compte, `app-ads.txt`).
