// ignore: unused_import
import 'package:intl/intl.dart' as intl;

import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for French (`fr`).
class AppLocalizationsFr extends AppLocalizations {
  AppLocalizationsFr([String locale = 'fr']) : super(locale);

  @override
  String get appTitle => 'AnimeWho';

  @override
  String get homeTagline => 'Duel de déduction anime';

  @override
  String get homeNicknameLabel => 'Pseudo';

  @override
  String get homeEdit => 'Modifier';

  @override
  String get homeQuickPlay => 'Partie rapide';

  @override
  String get homeCreatePrivate => 'Créer une partie privée';

  @override
  String get homeJoinWithCode => 'Rejoindre avec un code';

  @override
  String get homeVsComputer => 'Contre l’ordinateur';

  @override
  String get homeLeaderboard => 'Classement';

  @override
  String get homeHowToPlay => 'Comment jouer';

  @override
  String get homeShop => 'Boutique';

  @override
  String get homeDailyChest => 'Coffre du jour';

  @override
  String get nameDialogTitle => 'Choisis ton nom de combat';

  @override
  String get nameDialogBody => 'Quel nom veux-tu porter dans l’arène ?';

  @override
  String get nameHint => 'ex. RôninDuSoir';

  @override
  String get saveAndContinue => 'Enregistrer et continuer';

  @override
  String get joinDialogTitle => 'Rejoindre une partie privée';

  @override
  String get joinDialogBody =>
      'Saisis le code à 6 caractères donné par ton adversaire.';

  @override
  String get joinCodeLabel => 'Code de la partie';

  @override
  String get joinSubmit => 'Entrer dans l’arène';

  @override
  String get botDialogTitle => 'Contre l’ordinateur';

  @override
  String get botDialogBody =>
      'Entraîne-toi seul. Ces parties ne comptent pas dans le classement.';

  @override
  String get botEasy => 'Facile';

  @override
  String get botEasyHint => 'Pose des questions au hasard et devine trop vite.';

  @override
  String get botNormal => 'Normal';

  @override
  String get botNormalHint => 'Joue correctement, sans être parfait.';

  @override
  String get botHard => 'Difficile';

  @override
  String get botHardHint => 'Choisit toujours la meilleure question.';

  @override
  String get howToTitle => 'Comment jouer';

  @override
  String get howTo1 =>
      '1. Choix : chaque joueur choisit en secret un personnage parmi les 24 de la grille.';

  @override
  String get howTo2 =>
      '2. Déduction : à tour de rôle, posez des questions fermées (oui / non) sur le personnage secret de l’adversaire (ex. « Ton personnage a-t-il les cheveux roses ? »).';

  @override
  String get howTo3 =>
      '3. Élimination : selon la réponse, touche les personnages de ta grille pour les écarter. Touche-les à nouveau pour les remettre.';

  @override
  String get howTo4 =>
      '4. Victoire : quand tu penses avoir trouvé, utilise ton tour pour deviner ! Une mauvaise réponse coûte une vie, et à 3 vies perdues tu as perdu. Chaque tour est chronométré : si le temps est écoulé, tu perds aussi une vie.';

  @override
  String get understood => 'Compris';

  @override
  String get cancel => 'Annuler';

  @override
  String get close => 'Fermer';

  @override
  String get back => 'Retour';

  @override
  String get continueLabel => 'Continuer';

  @override
  String get notNow => 'Plus tard';

  @override
  String get queueSearching => 'Recherche d’un adversaire';

  @override
  String get lobbyWaiting => 'En attente d’un adversaire';

  @override
  String queuePosition(int position) {
    return 'Position dans la file : $position';
  }

  @override
  String get queuePositionUnknown => 'Position dans la file : …';

  @override
  String get lobbySendCode =>
      'Envoie ce code à la personne avec qui tu veux jouer.';

  @override
  String get queueNobodyYet =>
      'Personne pour l’instant ? Entraîne-toi en attendant.';

  @override
  String get queuePlayBot => 'Jouer contre l’ordinateur';

  @override
  String get lobbyCodeLabel => 'Code de la partie';

  @override
  String get copyCode => 'Copier le code';

  @override
  String get codeCopied => 'Code copié !';

  @override
  String get selectionTitle => 'Choisis ton personnage secret';

  @override
  String get selectionWaiting => 'En attente de l’adversaire';

  @override
  String selectionCountdown(int seconds) {
    return 'encore $seconds s — sinon on choisit pour toi';
  }

  @override
  String get confirmChoice => 'Valider mon choix';

  @override
  String get waitingOpponent => 'En attente de l’adversaire…';

  @override
  String get versus => 'VS';

  @override
  String get opponentDefault => 'Adversaire';

  @override
  String get leaveTooltip => 'Abandonner la partie';

  @override
  String get leaveTitle => 'Abandonner la partie ?';

  @override
  String get leaveBodyLoss =>
      'Ton adversaire gagnera la partie et elle comptera comme une défaite dans tes statistiques.';

  @override
  String get leaveBodyNoLoss =>
      'Tu reviendras à l’accueil et ton adversaire sera prévenu.';

  @override
  String get keepPlaying => 'Continuer à jouer';

  @override
  String get abandon => 'Abandonner';

  @override
  String get yourTurn => 'À toi de jouer';

  @override
  String get opponentTurn => 'Tour de l’adversaire';

  @override
  String get opponentDisconnectedBanner =>
      'Adversaire déconnecté — on l’attend…';

  @override
  String secondsShort(int seconds) {
    return '$seconds s';
  }

  @override
  String livesSemantics(String name, int lives) {
    return '$name : $lives vies sur 3';
  }

  @override
  String get you => 'Toi';

  @override
  String youWithCharacter(String name) {
    return 'Toi · $name';
  }

  @override
  String get askShort => 'Question';

  @override
  String get askLong => 'Poser une question';

  @override
  String get guessAction => 'Deviner';

  @override
  String get logTitle => 'Historique';

  @override
  String get closeLog => 'Fermer l’historique';

  @override
  String get questionReceived => 'Question reçue !';

  @override
  String answerWithin(int seconds) {
    return 'Réponds dans les $seconds s ou tu perds une vie';
  }

  @override
  String yourCharacterIs(String name, String universe) {
    return 'Ton personnage : $name ($universe)';
  }

  @override
  String get answerHonestly =>
      'Réponds honnêtement : ton personnage et toutes tes réponses seront révélés à la fin.';

  @override
  String get yesUpper => 'OUI';

  @override
  String get noUpper => 'NON';

  @override
  String get waitingAnswer => 'En attente de la réponse…';

  @override
  String opponentHasSeconds(int seconds) {
    return 'L’adversaire a $seconds s pour répondre';
  }

  @override
  String get askVerifiedHelp =>
      'Le jeu répond à ta place à partir de la fiche du personnage : impossible de mentir.';

  @override
  String get askFreeHelp =>
      'C’est ton adversaire qui répond : sa réponse pourra être vérifiée à la fin de la partie.';

  @override
  String get verifiedTab => 'Question vérifiée';

  @override
  String get freeTab => 'Question libre';

  @override
  String get pickValueHint => 'Choisis une réponse possible ci-dessus.';

  @override
  String get freeQuestionHint => 'ex. Ton personnage se bat-il avec une épée ?';

  @override
  String get send => 'Envoyer';

  @override
  String get guessTitle => 'Ton pronostic';

  @override
  String get guessBody =>
      'Choisis un personnage puis confirme. Une mauvaise réponse te coûte 1 vie !';

  @override
  String get searchCharacter => 'Rechercher un personnage…';

  @override
  String get noCharacterLeft =>
      'Plus aucun personnage ! Remets-en un sur ta grille d’abord.';

  @override
  String noMatch(String query) {
    return 'Aucun personnage ne correspond à « $query ».';
  }

  @override
  String guessConfirmPrompt(String name) {
    return 'Deviner $name ?';
  }

  @override
  String get tapToChoose => 'Touche un personnage pour le choisir.';

  @override
  String get confirm => 'Confirmer';

  @override
  String get noActionYet => 'Aucune action pour l’instant.';

  @override
  String answerToast(String answer) {
    return 'Réponse : $answer';
  }

  @override
  String ruledOutCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count personnages ne correspondent pas.',
      one: '1 personnage ne correspond pas.',
    );
    return '$_temp0';
  }

  @override
  String get eliminateThem => 'Les écarter';

  @override
  String get mySecretTitle => 'Ton personnage secret';

  @override
  String get mySecretBody => 'C’est lui que ton adversaire doit deviner.';

  @override
  String get attrHair => 'Cheveux';

  @override
  String get attrEyes => 'Yeux';

  @override
  String get attrGender => 'Genre';

  @override
  String get attrAge => 'Âge';

  @override
  String get attrSpecies => 'Espèce';

  @override
  String get attrAlignment => 'Camp';

  @override
  String get attrRole => 'Rôle';

  @override
  String get attrUniverse => 'Univers';

  @override
  String roleLine(String role) {
    return 'rôle $role';
  }

  @override
  String get qHairBald => 'Ton personnage est-il chauve ?';

  @override
  String qHair(String value) {
    return 'Ton personnage a-t-il les cheveux $value ?';
  }

  @override
  String qEyes(String value) {
    return 'Ton personnage a-t-il les yeux $value ?';
  }

  @override
  String get qFemale => 'Ton personnage est-il une femme ?';

  @override
  String get qMale => 'Ton personnage est-il un homme ?';

  @override
  String qAge(String value) {
    return 'Ton personnage est-il $value ?';
  }

  @override
  String qSpecies(String value) {
    return 'Ton personnage est-il de l’espèce « $value » ?';
  }

  @override
  String qAlignment(String value) {
    return 'Ton personnage est-il $value ?';
  }

  @override
  String qRole(String value) {
    return 'Ton personnage est-il un personnage $value ?';
  }

  @override
  String qUniverse(String value) {
    return 'Ton personnage vient-il de « $value » ?';
  }

  @override
  String get logVerified => 'Vérifiée';

  @override
  String get logUnverified => 'Non vérifiée';

  @override
  String logAsker(String name) {
    return '$name :';
  }

  @override
  String get logAnswer => 'Réponse :';

  @override
  String get answerYesLower => 'oui';

  @override
  String get answerNoLower => 'non';

  @override
  String logGuessed(String name) {
    return '$name a tenté :';
  }

  @override
  String get logMissed => 'Raté ! Une vie en moins.';

  @override
  String logTimeout(String name) {
    return '$name : temps écoulé — une vie en moins.';
  }

  @override
  String get victoryByForfeit => 'Victoire par abandon';

  @override
  String get victory => 'Victoire !';

  @override
  String get defeat => 'Défaite';

  @override
  String get outOfLivesMe => 'Tu n’as plus de vies !';

  @override
  String get outOfLivesOpponent => 'L’adversaire n’a plus de vies !';

  @override
  String get guessedRight => 'Bien deviné !';

  @override
  String get opponentGuessed => 'L’adversaire a deviné ton personnage !';

  @override
  String get opponentQuit => 'Ton adversaire a quitté la partie.';

  @override
  String ratingLine(int rating, String delta) {
    return 'Score : $rating ($delta)';
  }

  @override
  String get unranked => 'Partie non classée — comptée dans tes statistiques';

  @override
  String get trainingGame =>
      'Partie d’entraînement — non comptée au classement';

  @override
  String get theirSecret => 'Son personnage secret :';

  @override
  String get acceptRematch => 'Accepter la revanche';

  @override
  String get rematch => 'Revanche';

  @override
  String get backHome => 'Retour à l’accueil';

  @override
  String get recapTitle => 'Récapitulatif de la partie';

  @override
  String recapCompare(String name) {
    return 'Compare les réponses « non vérifiées » de ton adversaire avec la fiche de $name ci-dessus.';
  }

  @override
  String shardsEarned(int count) {
    return '+$count Éclats gagnés';
  }

  @override
  String get doubleShards => '▶ Doubler mes Éclats';

  @override
  String get noVideo => 'Pas de vidéo disponible';

  @override
  String get shardsDoubled => 'Éclats doublés !';

  @override
  String get connectionLost => 'Connexion perdue : reconnexion en cours…';

  @override
  String get connectionReplacedTitle => 'Connexion interrompue';

  @override
  String get connectionReplacedBody =>
      'Cette partie a été ouverte sur un autre appareil ou dans un autre onglet.';

  @override
  String get resumeHere => 'Reprendre ici';

  @override
  String get noticeGameNotRecovered =>
      'Connexion perdue. Ta partie n’a pas pu être récupérée.';

  @override
  String noticeCharacterAssigned(String name) {
    return 'Temps écoulé ! Ton personnage, choisi au hasard : $name.';
  }

  @override
  String get noticeMyTimeoutAnswering =>
      'Pas de réponse à temps ! Tu perds une vie.';

  @override
  String get noticeMyTimeoutPlaying =>
      'Temps écoulé ! Tu perds une vie et ton tour.';

  @override
  String get noticeOpponentTimedOut =>
      'Ton adversaire a dépassé le temps et perd une vie.';

  @override
  String get noticeTooManyConnections =>
      'Trop de connexions depuis ton réseau. Réessaie dans un instant.';

  @override
  String get noticeServerFull =>
      'Le serveur est complet pour le moment. Réessaie dans un instant.';

  @override
  String get noticeMyWrongGuess => 'Raté ! Tu perds une vie.';

  @override
  String get noticeOpponentWrongGuess => 'L’adversaire s’est trompé !';

  @override
  String noticeOpponentDisconnected(int seconds) {
    return 'Ton adversaire a perdu la connexion. On l’attend jusqu’à $seconds s…';
  }

  @override
  String get noticeOpponentReconnected => 'Ton adversaire est de retour !';

  @override
  String get noticeOpponentLeftGame => 'Ton adversaire a quitté la partie.';

  @override
  String get noticeOpponentLeftRoom => 'Ton adversaire a quitté la salle.';

  @override
  String get noticeOpponentWantsRematch => 'Ton adversaire veut une revanche !';

  @override
  String get reactionThumbsUp => 'Pouce levé';

  @override
  String get reactionLaugh => 'Mort de rire';

  @override
  String get reactionSurprised => 'Surpris';

  @override
  String get reactionAwkward => 'Gêné';

  @override
  String get reactionThinking => 'Je réfléchis';

  @override
  String get reactionShocked => 'Choqué';

  @override
  String get reactionFire => 'En feu';

  @override
  String get reactionClap => 'Bravo';

  @override
  String get sendReaction => 'Envoyer une réaction';

  @override
  String get muteReactions => 'Masquer les réactions de l’adversaire';

  @override
  String get unmuteReactions => 'Afficher les réactions de l’adversaire';

  @override
  String get leaderboardBody =>
      'Score Elo des parties rapides. Les parties privées comptent dans tes statistiques, pas dans le classement.';

  @override
  String get myStatsTitle => 'Tes statistiques';

  @override
  String get statsEmpty =>
      'Termine une partie pour commencer tes statistiques.';

  @override
  String get statsDisabled =>
      'Les statistiques ne sont pas disponibles sur ce serveur.';

  @override
  String get statScore => 'Score';

  @override
  String get statRank => 'Rang';

  @override
  String get statWinRate => 'Taux de victoire';

  @override
  String get statGames => 'Parties';

  @override
  String get statWins => 'Gagnées';

  @override
  String get statBestStreak => 'Meilleure série';

  @override
  String streakLine(int count) {
    return '$count victoires d’affilée !';
  }

  @override
  String gamesToRank(int count) {
    return 'Encore $count partie(s) rapide(s) pour apparaître au classement.';
  }

  @override
  String get topPlayers => 'Meilleurs joueurs';

  @override
  String get leaderboardUnavailable =>
      'Classement indisponible pour le moment.';

  @override
  String leaderboardEmpty(int count) {
    return 'Personne n’est encore classé. Joue $count parties rapides pour être le premier nom ici !';
  }

  @override
  String meSuffix(String name) {
    return '$name (toi)';
  }

  @override
  String rankedGames(int count) {
    return '$count parties';
  }

  @override
  String get shopTitle => 'Boutique';

  @override
  String shardsBalance(int count) {
    return '$count Éclats';
  }

  @override
  String get noAdsTitle => 'Sans pub';

  @override
  String get noAdsBody =>
      'Supprime interstitiels et bannières à vie. Les vidéos récompensées restent disponibles si tu le souhaites.';

  @override
  String get noAdsOwned => 'Activé — merci pour ton soutien !';

  @override
  String get starterPackTitle => 'Pack de démarrage';

  @override
  String get starterPackBody =>
      '500 Éclats + dos de carte « Aube » + cadre « Recrue ». Achetable une seule fois.';

  @override
  String get shardPacksTitle => 'Packs d’Éclats';

  @override
  String shardPackBonus(int count) {
    return '$count Éclats';
  }

  @override
  String get freeShardsTitle => 'Éclats gratuits';

  @override
  String freeShardsBody(int count) {
    return 'Regarde une courte vidéo pour gagner $count Éclats.';
  }

  @override
  String get watchVideo => '▶ Regarder';

  @override
  String get restorePurchases => 'Restaurer mes achats';

  @override
  String get restoreDone => 'Achats restaurés.';

  @override
  String get restoreFailed =>
      'Impossible de restaurer les achats pour le moment.';

  @override
  String get purchaseSuccess => 'Merci ! Achat confirmé.';

  @override
  String get purchasePending => 'Achat en cours de validation…';

  @override
  String get purchaseFailed => 'L’achat n’a pas abouti.';

  @override
  String get purchaseUnavailable =>
      'La boutique n’est pas disponible pour le moment.';

  @override
  String get buy => 'Acheter';

  @override
  String get owned => 'Possédé';

  @override
  String get shopFooter =>
      'Prix TTC. Les Éclats servent uniquement aux cosmétiques, ne s’échangent pas et ne donnent aucun avantage en partie contre un humain. Aucune loot box : chaque achat a un contenu connu à l’avance.';

  @override
  String get shopDemoNotice =>
      'Boutique de démonstration : aucun paiement réel.';

  @override
  String get privacyOptions => 'Options de confidentialité';

  @override
  String shardsCredited(int count) {
    return '+$count Éclats !';
  }

  @override
  String get chestTitle => 'Coffre du jour';

  @override
  String get chestBody =>
      'Reviens chaque jour : la série monte jusqu’au jour 7 (100 Éclats). Un jour manqué la remet à zéro.';

  @override
  String get chestOpen => 'Ouvrir le coffre';

  @override
  String get chestAlreadyOpened => 'Déjà ouvert aujourd’hui. Reviens demain !';

  @override
  String chestReward(int count, int day) {
    return '+$count Éclats (jour $day de la série)';
  }

  @override
  String get chestBonus => '▶ Ouvrir un 2e coffre';

  @override
  String chestStreakDay(int day) {
    return 'Jour $day';
  }

  @override
  String get trackingTitle => 'Des pubs plus pertinentes ?';

  @override
  String get trackingBody =>
      'AnimeWho est gratuit grâce à la publicité. À l’écran suivant, iOS te demandera si l’app peut utiliser ton identifiant publicitaire. Tu peux refuser : le jeu reste exactement le même.';

  @override
  String get upsellTitle => 'Marre des pubs ?';

  @override
  String upsellBody(String price) {
    return 'Supprime-les à vie pour $price.';
  }

  @override
  String get upsellCta => 'Voir l’offre';

  @override
  String eliminatedSemantics(String name) {
    return '$name, écarté';
  }

  @override
  String characterSemantics(String name, String universe) {
    return '$name ($universe)';
  }

  @override
  String get playerOptions => 'Options du joueur';

  @override
  String get reportPlayer => 'Signaler';

  @override
  String get blockPlayer => 'Bloquer ce joueur';

  @override
  String reportTitle(String name) {
    return 'Signaler $name';
  }

  @override
  String get reportBody =>
      'Le signalement est envoyé à l’équipe de modération avec les questions libres de ce joueur.';

  @override
  String get reasonInsult => 'Insultes';

  @override
  String get reasonSexual => 'Contenu sexuel';

  @override
  String get reasonHate => 'Haine ou discrimination';

  @override
  String get reasonSpam => 'Spam';

  @override
  String get reasonCheating => 'Triche';

  @override
  String get reasonOther => 'Autre';

  @override
  String get reportSend => 'Envoyer le signalement';

  @override
  String blockTitle(String name) {
    return 'Bloquer $name ?';
  }

  @override
  String get blockBody =>
      'Vous ne serez plus jamais mis face à face en partie rapide, et ce joueur ne pourra plus rejoindre tes parties privées.';

  @override
  String get noticeReportSent => 'Merci, ton signalement a été envoyé.';

  @override
  String get noticeReportLimit =>
      'Tu as atteint la limite de signalements pour cette session.';

  @override
  String noticePlayerBlocked(String name) {
    return '$name est bloqué.';
  }

  @override
  String get settingsTitle => 'Réglages';

  @override
  String get verifiedOnlyTitle => 'Questions vérifiées uniquement';

  @override
  String get verifiedOnlyBody =>
      'Refuse les questions libres tapées par tes adversaires.';

  @override
  String get blockedPlayersTitle => 'Joueurs bloqués';

  @override
  String get noBlockedPlayers => 'Aucun joueur bloqué.';

  @override
  String get unblock => 'Débloquer';

  @override
  String get appOutdatedTitle => 'Mise à jour nécessaire';

  @override
  String get appOutdatedFallback =>
      'Cette version d’AnimeWho n’est plus prise en charge. Mets l’app à jour pour continuer à jouer.';

  @override
  String get deleteAccount => 'Supprimer mon compte';

  @override
  String get deleteAccountTitle => 'Supprimer ton compte ?';

  @override
  String get deleteAccountBody =>
      'Ton solde d’Éclats, tes droits (Sans pub…), tes cosmétiques et tes statistiques seront effacés définitivement. Les achats déjà effectués ne sont pas remboursés.';

  @override
  String get deleteAccountConfirm => 'Supprimer définitivement';

  @override
  String get accountDeleted => 'Compte supprimé.';

  @override
  String get accountDeleteFailed =>
      'La suppression a échoué. Réessaie plus tard.';

  @override
  String get cosmeticsTitle => 'Cosmétiques';

  @override
  String itemPrice(int count) {
    return '$count Éclats';
  }

  @override
  String get equipLabel => 'Équiper';

  @override
  String get equippedLabel => 'Équipé';

  @override
  String get notForSale => 'Exclusif';

  @override
  String get buyItemFailed => 'Achat impossible (solde insuffisant ?).';

  @override
  String get rewardPending =>
      'Récompense en cours de validation : elle arrivera dans ton solde.';

  @override
  String get chestServerSoon =>
      'Le coffre gratuit arrive bientôt. En attendant, ouvre un coffre bonus en vidéo.';
}
