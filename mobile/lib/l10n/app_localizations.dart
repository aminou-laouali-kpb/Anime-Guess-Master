import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_fr.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('fr')];

  /// Nom de l'app. Ne jamais utiliser le nom d'un jeu de société concurrent.
  ///
  /// In fr, this message translates to:
  /// **'AnimeWho'**
  String get appTitle;

  /// No description provided for @homeTagline.
  ///
  /// In fr, this message translates to:
  /// **'Duel de déduction anime'**
  String get homeTagline;

  /// No description provided for @homeNicknameLabel.
  ///
  /// In fr, this message translates to:
  /// **'Pseudo'**
  String get homeNicknameLabel;

  /// No description provided for @homeEdit.
  ///
  /// In fr, this message translates to:
  /// **'Modifier'**
  String get homeEdit;

  /// No description provided for @homeQuickPlay.
  ///
  /// In fr, this message translates to:
  /// **'Partie rapide'**
  String get homeQuickPlay;

  /// No description provided for @homeCreatePrivate.
  ///
  /// In fr, this message translates to:
  /// **'Créer une partie privée'**
  String get homeCreatePrivate;

  /// No description provided for @homeJoinWithCode.
  ///
  /// In fr, this message translates to:
  /// **'Rejoindre avec un code'**
  String get homeJoinWithCode;

  /// No description provided for @homeVsComputer.
  ///
  /// In fr, this message translates to:
  /// **'Contre l’ordinateur'**
  String get homeVsComputer;

  /// No description provided for @homeLeaderboard.
  ///
  /// In fr, this message translates to:
  /// **'Classement'**
  String get homeLeaderboard;

  /// No description provided for @homeHowToPlay.
  ///
  /// In fr, this message translates to:
  /// **'Comment jouer'**
  String get homeHowToPlay;

  /// No description provided for @homeShop.
  ///
  /// In fr, this message translates to:
  /// **'Boutique'**
  String get homeShop;

  /// No description provided for @homeDailyChest.
  ///
  /// In fr, this message translates to:
  /// **'Coffre du jour'**
  String get homeDailyChest;

  /// No description provided for @nameDialogTitle.
  ///
  /// In fr, this message translates to:
  /// **'Choisis ton nom de combat'**
  String get nameDialogTitle;

  /// No description provided for @nameDialogBody.
  ///
  /// In fr, this message translates to:
  /// **'Quel nom veux-tu porter dans l’arène ?'**
  String get nameDialogBody;

  /// No description provided for @nameHint.
  ///
  /// In fr, this message translates to:
  /// **'ex. RôninDuSoir'**
  String get nameHint;

  /// No description provided for @saveAndContinue.
  ///
  /// In fr, this message translates to:
  /// **'Enregistrer et continuer'**
  String get saveAndContinue;

  /// No description provided for @joinDialogTitle.
  ///
  /// In fr, this message translates to:
  /// **'Rejoindre une partie privée'**
  String get joinDialogTitle;

  /// No description provided for @joinDialogBody.
  ///
  /// In fr, this message translates to:
  /// **'Saisis le code à 6 caractères donné par ton adversaire.'**
  String get joinDialogBody;

  /// No description provided for @joinCodeLabel.
  ///
  /// In fr, this message translates to:
  /// **'Code de la partie'**
  String get joinCodeLabel;

  /// No description provided for @joinSubmit.
  ///
  /// In fr, this message translates to:
  /// **'Entrer dans l’arène'**
  String get joinSubmit;

  /// No description provided for @botDialogTitle.
  ///
  /// In fr, this message translates to:
  /// **'Contre l’ordinateur'**
  String get botDialogTitle;

  /// No description provided for @botDialogBody.
  ///
  /// In fr, this message translates to:
  /// **'Entraîne-toi seul. Ces parties ne comptent pas dans le classement.'**
  String get botDialogBody;

  /// No description provided for @botEasy.
  ///
  /// In fr, this message translates to:
  /// **'Facile'**
  String get botEasy;

  /// No description provided for @botEasyHint.
  ///
  /// In fr, this message translates to:
  /// **'Pose des questions au hasard et devine trop vite.'**
  String get botEasyHint;

  /// No description provided for @botNormal.
  ///
  /// In fr, this message translates to:
  /// **'Normal'**
  String get botNormal;

  /// No description provided for @botNormalHint.
  ///
  /// In fr, this message translates to:
  /// **'Joue correctement, sans être parfait.'**
  String get botNormalHint;

  /// No description provided for @botHard.
  ///
  /// In fr, this message translates to:
  /// **'Difficile'**
  String get botHard;

  /// No description provided for @botHardHint.
  ///
  /// In fr, this message translates to:
  /// **'Choisit toujours la meilleure question.'**
  String get botHardHint;

  /// No description provided for @howToTitle.
  ///
  /// In fr, this message translates to:
  /// **'Comment jouer'**
  String get howToTitle;

  /// No description provided for @howTo1.
  ///
  /// In fr, this message translates to:
  /// **'1. Choix : chaque joueur choisit en secret un personnage parmi les 24 de la grille.'**
  String get howTo1;

  /// No description provided for @howTo2.
  ///
  /// In fr, this message translates to:
  /// **'2. Déduction : à tour de rôle, posez des questions fermées (oui / non) sur le personnage secret de l’adversaire (ex. « Ton personnage a-t-il les cheveux roses ? »).'**
  String get howTo2;

  /// No description provided for @howTo3.
  ///
  /// In fr, this message translates to:
  /// **'3. Élimination : selon la réponse, touche les personnages de ta grille pour les écarter. Touche-les à nouveau pour les remettre.'**
  String get howTo3;

  /// No description provided for @howTo4.
  ///
  /// In fr, this message translates to:
  /// **'4. Victoire : quand tu penses avoir trouvé, utilise ton tour pour deviner ! Une mauvaise réponse coûte une vie, et à 3 vies perdues tu as perdu. Chaque tour est chronométré : si le temps est écoulé, tu perds aussi une vie.'**
  String get howTo4;

  /// No description provided for @understood.
  ///
  /// In fr, this message translates to:
  /// **'Compris'**
  String get understood;

  /// No description provided for @cancel.
  ///
  /// In fr, this message translates to:
  /// **'Annuler'**
  String get cancel;

  /// No description provided for @close.
  ///
  /// In fr, this message translates to:
  /// **'Fermer'**
  String get close;

  /// No description provided for @back.
  ///
  /// In fr, this message translates to:
  /// **'Retour'**
  String get back;

  /// No description provided for @continueLabel.
  ///
  /// In fr, this message translates to:
  /// **'Continuer'**
  String get continueLabel;

  /// No description provided for @notNow.
  ///
  /// In fr, this message translates to:
  /// **'Plus tard'**
  String get notNow;

  /// No description provided for @queueSearching.
  ///
  /// In fr, this message translates to:
  /// **'Recherche d’un adversaire'**
  String get queueSearching;

  /// No description provided for @lobbyWaiting.
  ///
  /// In fr, this message translates to:
  /// **'En attente d’un adversaire'**
  String get lobbyWaiting;

  /// No description provided for @queuePosition.
  ///
  /// In fr, this message translates to:
  /// **'Position dans la file : {position}'**
  String queuePosition(int position);

  /// No description provided for @queuePositionUnknown.
  ///
  /// In fr, this message translates to:
  /// **'Position dans la file : …'**
  String get queuePositionUnknown;

  /// No description provided for @lobbySendCode.
  ///
  /// In fr, this message translates to:
  /// **'Envoie ce code à la personne avec qui tu veux jouer.'**
  String get lobbySendCode;

  /// No description provided for @queueNobodyYet.
  ///
  /// In fr, this message translates to:
  /// **'Personne pour l’instant ? Entraîne-toi en attendant.'**
  String get queueNobodyYet;

  /// No description provided for @queuePlayBot.
  ///
  /// In fr, this message translates to:
  /// **'Jouer contre l’ordinateur'**
  String get queuePlayBot;

  /// No description provided for @lobbyCodeLabel.
  ///
  /// In fr, this message translates to:
  /// **'Code de la partie'**
  String get lobbyCodeLabel;

  /// No description provided for @copyCode.
  ///
  /// In fr, this message translates to:
  /// **'Copier le code'**
  String get copyCode;

  /// No description provided for @codeCopied.
  ///
  /// In fr, this message translates to:
  /// **'Code copié !'**
  String get codeCopied;

  /// No description provided for @selectionTitle.
  ///
  /// In fr, this message translates to:
  /// **'Choisis ton personnage secret'**
  String get selectionTitle;

  /// No description provided for @selectionWaiting.
  ///
  /// In fr, this message translates to:
  /// **'En attente de l’adversaire'**
  String get selectionWaiting;

  /// No description provided for @selectionCountdown.
  ///
  /// In fr, this message translates to:
  /// **'encore {seconds} s — sinon on choisit pour toi'**
  String selectionCountdown(int seconds);

  /// No description provided for @confirmChoice.
  ///
  /// In fr, this message translates to:
  /// **'Valider mon choix'**
  String get confirmChoice;

  /// No description provided for @waitingOpponent.
  ///
  /// In fr, this message translates to:
  /// **'En attente de l’adversaire…'**
  String get waitingOpponent;

  /// No description provided for @versus.
  ///
  /// In fr, this message translates to:
  /// **'VS'**
  String get versus;

  /// No description provided for @opponentDefault.
  ///
  /// In fr, this message translates to:
  /// **'Adversaire'**
  String get opponentDefault;

  /// No description provided for @leaveTooltip.
  ///
  /// In fr, this message translates to:
  /// **'Abandonner la partie'**
  String get leaveTooltip;

  /// No description provided for @leaveTitle.
  ///
  /// In fr, this message translates to:
  /// **'Abandonner la partie ?'**
  String get leaveTitle;

  /// No description provided for @leaveBodyLoss.
  ///
  /// In fr, this message translates to:
  /// **'Ton adversaire gagnera la partie et elle comptera comme une défaite dans tes statistiques.'**
  String get leaveBodyLoss;

  /// No description provided for @leaveBodyNoLoss.
  ///
  /// In fr, this message translates to:
  /// **'Tu reviendras à l’accueil et ton adversaire sera prévenu.'**
  String get leaveBodyNoLoss;

  /// No description provided for @keepPlaying.
  ///
  /// In fr, this message translates to:
  /// **'Continuer à jouer'**
  String get keepPlaying;

  /// No description provided for @abandon.
  ///
  /// In fr, this message translates to:
  /// **'Abandonner'**
  String get abandon;

  /// No description provided for @yourTurn.
  ///
  /// In fr, this message translates to:
  /// **'À toi de jouer'**
  String get yourTurn;

  /// No description provided for @opponentTurn.
  ///
  /// In fr, this message translates to:
  /// **'Tour de l’adversaire'**
  String get opponentTurn;

  /// No description provided for @opponentDisconnectedBanner.
  ///
  /// In fr, this message translates to:
  /// **'Adversaire déconnecté — on l’attend…'**
  String get opponentDisconnectedBanner;

  /// No description provided for @secondsShort.
  ///
  /// In fr, this message translates to:
  /// **'{seconds} s'**
  String secondsShort(int seconds);

  /// No description provided for @livesSemantics.
  ///
  /// In fr, this message translates to:
  /// **'{name} : {lives} vies sur 3'**
  String livesSemantics(String name, int lives);

  /// No description provided for @you.
  ///
  /// In fr, this message translates to:
  /// **'Toi'**
  String get you;

  /// No description provided for @youWithCharacter.
  ///
  /// In fr, this message translates to:
  /// **'Toi · {name}'**
  String youWithCharacter(String name);

  /// No description provided for @askShort.
  ///
  /// In fr, this message translates to:
  /// **'Question'**
  String get askShort;

  /// No description provided for @askLong.
  ///
  /// In fr, this message translates to:
  /// **'Poser une question'**
  String get askLong;

  /// No description provided for @guessAction.
  ///
  /// In fr, this message translates to:
  /// **'Deviner'**
  String get guessAction;

  /// No description provided for @logTitle.
  ///
  /// In fr, this message translates to:
  /// **'Historique'**
  String get logTitle;

  /// No description provided for @closeLog.
  ///
  /// In fr, this message translates to:
  /// **'Fermer l’historique'**
  String get closeLog;

  /// No description provided for @questionReceived.
  ///
  /// In fr, this message translates to:
  /// **'Question reçue !'**
  String get questionReceived;

  /// No description provided for @answerWithin.
  ///
  /// In fr, this message translates to:
  /// **'Réponds dans les {seconds} s ou tu perds une vie'**
  String answerWithin(int seconds);

  /// No description provided for @yourCharacterIs.
  ///
  /// In fr, this message translates to:
  /// **'Ton personnage : {name} ({universe})'**
  String yourCharacterIs(String name, String universe);

  /// No description provided for @answerHonestly.
  ///
  /// In fr, this message translates to:
  /// **'Réponds honnêtement : ton personnage et toutes tes réponses seront révélés à la fin.'**
  String get answerHonestly;

  /// No description provided for @yesUpper.
  ///
  /// In fr, this message translates to:
  /// **'OUI'**
  String get yesUpper;

  /// No description provided for @noUpper.
  ///
  /// In fr, this message translates to:
  /// **'NON'**
  String get noUpper;

  /// No description provided for @waitingAnswer.
  ///
  /// In fr, this message translates to:
  /// **'En attente de la réponse…'**
  String get waitingAnswer;

  /// No description provided for @opponentHasSeconds.
  ///
  /// In fr, this message translates to:
  /// **'L’adversaire a {seconds} s pour répondre'**
  String opponentHasSeconds(int seconds);

  /// No description provided for @askVerifiedHelp.
  ///
  /// In fr, this message translates to:
  /// **'Le jeu répond à ta place à partir de la fiche du personnage : impossible de mentir.'**
  String get askVerifiedHelp;

  /// No description provided for @askFreeHelp.
  ///
  /// In fr, this message translates to:
  /// **'C’est ton adversaire qui répond : sa réponse pourra être vérifiée à la fin de la partie.'**
  String get askFreeHelp;

  /// No description provided for @verifiedTab.
  ///
  /// In fr, this message translates to:
  /// **'Question vérifiée'**
  String get verifiedTab;

  /// No description provided for @freeTab.
  ///
  /// In fr, this message translates to:
  /// **'Question libre'**
  String get freeTab;

  /// No description provided for @pickValueHint.
  ///
  /// In fr, this message translates to:
  /// **'Choisis une réponse possible ci-dessus.'**
  String get pickValueHint;

  /// No description provided for @freeQuestionHint.
  ///
  /// In fr, this message translates to:
  /// **'ex. Ton personnage se bat-il avec une épée ?'**
  String get freeQuestionHint;

  /// No description provided for @send.
  ///
  /// In fr, this message translates to:
  /// **'Envoyer'**
  String get send;

  /// No description provided for @guessTitle.
  ///
  /// In fr, this message translates to:
  /// **'Ton pronostic'**
  String get guessTitle;

  /// No description provided for @guessBody.
  ///
  /// In fr, this message translates to:
  /// **'Choisis un personnage puis confirme. Une mauvaise réponse te coûte 1 vie !'**
  String get guessBody;

  /// No description provided for @searchCharacter.
  ///
  /// In fr, this message translates to:
  /// **'Rechercher un personnage…'**
  String get searchCharacter;

  /// No description provided for @noCharacterLeft.
  ///
  /// In fr, this message translates to:
  /// **'Plus aucun personnage ! Remets-en un sur ta grille d’abord.'**
  String get noCharacterLeft;

  /// No description provided for @noMatch.
  ///
  /// In fr, this message translates to:
  /// **'Aucun personnage ne correspond à « {query} ».'**
  String noMatch(String query);

  /// No description provided for @guessConfirmPrompt.
  ///
  /// In fr, this message translates to:
  /// **'Deviner {name} ?'**
  String guessConfirmPrompt(String name);

  /// No description provided for @tapToChoose.
  ///
  /// In fr, this message translates to:
  /// **'Touche un personnage pour le choisir.'**
  String get tapToChoose;

  /// No description provided for @confirm.
  ///
  /// In fr, this message translates to:
  /// **'Confirmer'**
  String get confirm;

  /// No description provided for @noActionYet.
  ///
  /// In fr, this message translates to:
  /// **'Aucune action pour l’instant.'**
  String get noActionYet;

  /// No description provided for @answerToast.
  ///
  /// In fr, this message translates to:
  /// **'Réponse : {answer}'**
  String answerToast(String answer);

  /// No description provided for @ruledOutCount.
  ///
  /// In fr, this message translates to:
  /// **'{count, plural, =1{1 personnage ne correspond pas.} other{{count} personnages ne correspondent pas.}}'**
  String ruledOutCount(int count);

  /// No description provided for @eliminateThem.
  ///
  /// In fr, this message translates to:
  /// **'Les écarter'**
  String get eliminateThem;

  /// No description provided for @mySecretTitle.
  ///
  /// In fr, this message translates to:
  /// **'Ton personnage secret'**
  String get mySecretTitle;

  /// No description provided for @mySecretBody.
  ///
  /// In fr, this message translates to:
  /// **'C’est lui que ton adversaire doit deviner.'**
  String get mySecretBody;

  /// No description provided for @attrHair.
  ///
  /// In fr, this message translates to:
  /// **'Cheveux'**
  String get attrHair;

  /// No description provided for @attrEyes.
  ///
  /// In fr, this message translates to:
  /// **'Yeux'**
  String get attrEyes;

  /// No description provided for @attrGender.
  ///
  /// In fr, this message translates to:
  /// **'Genre'**
  String get attrGender;

  /// No description provided for @attrAge.
  ///
  /// In fr, this message translates to:
  /// **'Âge'**
  String get attrAge;

  /// No description provided for @attrSpecies.
  ///
  /// In fr, this message translates to:
  /// **'Espèce'**
  String get attrSpecies;

  /// No description provided for @attrAlignment.
  ///
  /// In fr, this message translates to:
  /// **'Camp'**
  String get attrAlignment;

  /// No description provided for @attrRole.
  ///
  /// In fr, this message translates to:
  /// **'Rôle'**
  String get attrRole;

  /// Trait « anime » côté serveur : l'œuvre ou l'univers original du personnage.
  ///
  /// In fr, this message translates to:
  /// **'Univers'**
  String get attrUniverse;

  /// No description provided for @roleLine.
  ///
  /// In fr, this message translates to:
  /// **'rôle {role}'**
  String roleLine(String role);

  /// No description provided for @qHairBald.
  ///
  /// In fr, this message translates to:
  /// **'Ton personnage est-il chauve ?'**
  String get qHairBald;

  /// No description provided for @qHair.
  ///
  /// In fr, this message translates to:
  /// **'Ton personnage a-t-il les cheveux {value} ?'**
  String qHair(String value);

  /// No description provided for @qEyes.
  ///
  /// In fr, this message translates to:
  /// **'Ton personnage a-t-il les yeux {value} ?'**
  String qEyes(String value);

  /// No description provided for @qFemale.
  ///
  /// In fr, this message translates to:
  /// **'Ton personnage est-il une femme ?'**
  String get qFemale;

  /// No description provided for @qMale.
  ///
  /// In fr, this message translates to:
  /// **'Ton personnage est-il un homme ?'**
  String get qMale;

  /// No description provided for @qAge.
  ///
  /// In fr, this message translates to:
  /// **'Ton personnage est-il {value} ?'**
  String qAge(String value);

  /// No description provided for @qSpecies.
  ///
  /// In fr, this message translates to:
  /// **'Ton personnage est-il de l’espèce « {value} » ?'**
  String qSpecies(String value);

  /// No description provided for @qAlignment.
  ///
  /// In fr, this message translates to:
  /// **'Ton personnage est-il {value} ?'**
  String qAlignment(String value);

  /// No description provided for @qRole.
  ///
  /// In fr, this message translates to:
  /// **'Ton personnage est-il un personnage {value} ?'**
  String qRole(String value);

  /// No description provided for @qUniverse.
  ///
  /// In fr, this message translates to:
  /// **'Ton personnage vient-il de « {value} » ?'**
  String qUniverse(String value);

  /// No description provided for @logVerified.
  ///
  /// In fr, this message translates to:
  /// **'Vérifiée'**
  String get logVerified;

  /// No description provided for @logUnverified.
  ///
  /// In fr, this message translates to:
  /// **'Non vérifiée'**
  String get logUnverified;

  /// No description provided for @logAsker.
  ///
  /// In fr, this message translates to:
  /// **'{name} :'**
  String logAsker(String name);

  /// No description provided for @logAnswer.
  ///
  /// In fr, this message translates to:
  /// **'Réponse :'**
  String get logAnswer;

  /// No description provided for @answerYesLower.
  ///
  /// In fr, this message translates to:
  /// **'oui'**
  String get answerYesLower;

  /// No description provided for @answerNoLower.
  ///
  /// In fr, this message translates to:
  /// **'non'**
  String get answerNoLower;

  /// No description provided for @logGuessed.
  ///
  /// In fr, this message translates to:
  /// **'{name} a tenté :'**
  String logGuessed(String name);

  /// No description provided for @logMissed.
  ///
  /// In fr, this message translates to:
  /// **'Raté ! Une vie en moins.'**
  String get logMissed;

  /// No description provided for @logTimeout.
  ///
  /// In fr, this message translates to:
  /// **'{name} : temps écoulé — une vie en moins.'**
  String logTimeout(String name);

  /// No description provided for @victoryByForfeit.
  ///
  /// In fr, this message translates to:
  /// **'Victoire par abandon'**
  String get victoryByForfeit;

  /// No description provided for @victory.
  ///
  /// In fr, this message translates to:
  /// **'Victoire !'**
  String get victory;

  /// No description provided for @defeat.
  ///
  /// In fr, this message translates to:
  /// **'Défaite'**
  String get defeat;

  /// No description provided for @outOfLivesMe.
  ///
  /// In fr, this message translates to:
  /// **'Tu n’as plus de vies !'**
  String get outOfLivesMe;

  /// No description provided for @outOfLivesOpponent.
  ///
  /// In fr, this message translates to:
  /// **'L’adversaire n’a plus de vies !'**
  String get outOfLivesOpponent;

  /// No description provided for @guessedRight.
  ///
  /// In fr, this message translates to:
  /// **'Bien deviné !'**
  String get guessedRight;

  /// No description provided for @opponentGuessed.
  ///
  /// In fr, this message translates to:
  /// **'L’adversaire a deviné ton personnage !'**
  String get opponentGuessed;

  /// No description provided for @opponentQuit.
  ///
  /// In fr, this message translates to:
  /// **'Ton adversaire a quitté la partie.'**
  String get opponentQuit;

  /// No description provided for @ratingLine.
  ///
  /// In fr, this message translates to:
  /// **'Score : {rating} ({delta})'**
  String ratingLine(int rating, String delta);

  /// No description provided for @unranked.
  ///
  /// In fr, this message translates to:
  /// **'Partie non classée — comptée dans tes statistiques'**
  String get unranked;

  /// No description provided for @trainingGame.
  ///
  /// In fr, this message translates to:
  /// **'Partie d’entraînement — non comptée au classement'**
  String get trainingGame;

  /// No description provided for @theirSecret.
  ///
  /// In fr, this message translates to:
  /// **'Son personnage secret :'**
  String get theirSecret;

  /// No description provided for @acceptRematch.
  ///
  /// In fr, this message translates to:
  /// **'Accepter la revanche'**
  String get acceptRematch;

  /// No description provided for @rematch.
  ///
  /// In fr, this message translates to:
  /// **'Revanche'**
  String get rematch;

  /// No description provided for @backHome.
  ///
  /// In fr, this message translates to:
  /// **'Retour à l’accueil'**
  String get backHome;

  /// No description provided for @recapTitle.
  ///
  /// In fr, this message translates to:
  /// **'Récapitulatif de la partie'**
  String get recapTitle;

  /// No description provided for @recapCompare.
  ///
  /// In fr, this message translates to:
  /// **'Compare les réponses « non vérifiées » de ton adversaire avec la fiche de {name} ci-dessus.'**
  String recapCompare(String name);

  /// No description provided for @shardsEarned.
  ///
  /// In fr, this message translates to:
  /// **'+{count} Éclats gagnés'**
  String shardsEarned(int count);

  /// No description provided for @doubleShards.
  ///
  /// In fr, this message translates to:
  /// **'▶ Doubler mes Éclats'**
  String get doubleShards;

  /// No description provided for @noVideo.
  ///
  /// In fr, this message translates to:
  /// **'Pas de vidéo disponible'**
  String get noVideo;

  /// No description provided for @shardsDoubled.
  ///
  /// In fr, this message translates to:
  /// **'Éclats doublés !'**
  String get shardsDoubled;

  /// No description provided for @connectionLost.
  ///
  /// In fr, this message translates to:
  /// **'Connexion perdue : reconnexion en cours…'**
  String get connectionLost;

  /// No description provided for @connectionReplacedTitle.
  ///
  /// In fr, this message translates to:
  /// **'Connexion interrompue'**
  String get connectionReplacedTitle;

  /// No description provided for @connectionReplacedBody.
  ///
  /// In fr, this message translates to:
  /// **'Cette partie a été ouverte sur un autre appareil ou dans un autre onglet.'**
  String get connectionReplacedBody;

  /// No description provided for @resumeHere.
  ///
  /// In fr, this message translates to:
  /// **'Reprendre ici'**
  String get resumeHere;

  /// No description provided for @noticeGameNotRecovered.
  ///
  /// In fr, this message translates to:
  /// **'Connexion perdue. Ta partie n’a pas pu être récupérée.'**
  String get noticeGameNotRecovered;

  /// No description provided for @noticeCharacterAssigned.
  ///
  /// In fr, this message translates to:
  /// **'Temps écoulé ! Ton personnage, choisi au hasard : {name}.'**
  String noticeCharacterAssigned(String name);

  /// No description provided for @noticeMyTimeoutAnswering.
  ///
  /// In fr, this message translates to:
  /// **'Pas de réponse à temps ! Tu perds une vie.'**
  String get noticeMyTimeoutAnswering;

  /// No description provided for @noticeMyTimeoutPlaying.
  ///
  /// In fr, this message translates to:
  /// **'Temps écoulé ! Tu perds une vie et ton tour.'**
  String get noticeMyTimeoutPlaying;

  /// No description provided for @noticeOpponentTimedOut.
  ///
  /// In fr, this message translates to:
  /// **'Ton adversaire a dépassé le temps et perd une vie.'**
  String get noticeOpponentTimedOut;

  /// No description provided for @noticeTooManyConnections.
  ///
  /// In fr, this message translates to:
  /// **'Trop de connexions depuis ton réseau. Réessaie dans un instant.'**
  String get noticeTooManyConnections;

  /// No description provided for @noticeServerFull.
  ///
  /// In fr, this message translates to:
  /// **'Le serveur est complet pour le moment. Réessaie dans un instant.'**
  String get noticeServerFull;

  /// No description provided for @noticeMyWrongGuess.
  ///
  /// In fr, this message translates to:
  /// **'Raté ! Tu perds une vie.'**
  String get noticeMyWrongGuess;

  /// No description provided for @noticeOpponentWrongGuess.
  ///
  /// In fr, this message translates to:
  /// **'L’adversaire s’est trompé !'**
  String get noticeOpponentWrongGuess;

  /// No description provided for @noticeOpponentDisconnected.
  ///
  /// In fr, this message translates to:
  /// **'Ton adversaire a perdu la connexion. On l’attend jusqu’à {seconds} s…'**
  String noticeOpponentDisconnected(int seconds);

  /// No description provided for @noticeOpponentReconnected.
  ///
  /// In fr, this message translates to:
  /// **'Ton adversaire est de retour !'**
  String get noticeOpponentReconnected;

  /// No description provided for @noticeOpponentLeftGame.
  ///
  /// In fr, this message translates to:
  /// **'Ton adversaire a quitté la partie.'**
  String get noticeOpponentLeftGame;

  /// No description provided for @noticeOpponentLeftRoom.
  ///
  /// In fr, this message translates to:
  /// **'Ton adversaire a quitté la salle.'**
  String get noticeOpponentLeftRoom;

  /// No description provided for @noticeOpponentWantsRematch.
  ///
  /// In fr, this message translates to:
  /// **'Ton adversaire veut une revanche !'**
  String get noticeOpponentWantsRematch;

  /// No description provided for @reactionThumbsUp.
  ///
  /// In fr, this message translates to:
  /// **'Pouce levé'**
  String get reactionThumbsUp;

  /// No description provided for @reactionLaugh.
  ///
  /// In fr, this message translates to:
  /// **'Mort de rire'**
  String get reactionLaugh;

  /// No description provided for @reactionSurprised.
  ///
  /// In fr, this message translates to:
  /// **'Surpris'**
  String get reactionSurprised;

  /// No description provided for @reactionAwkward.
  ///
  /// In fr, this message translates to:
  /// **'Gêné'**
  String get reactionAwkward;

  /// No description provided for @reactionThinking.
  ///
  /// In fr, this message translates to:
  /// **'Je réfléchis'**
  String get reactionThinking;

  /// No description provided for @reactionShocked.
  ///
  /// In fr, this message translates to:
  /// **'Choqué'**
  String get reactionShocked;

  /// No description provided for @reactionFire.
  ///
  /// In fr, this message translates to:
  /// **'En feu'**
  String get reactionFire;

  /// No description provided for @reactionClap.
  ///
  /// In fr, this message translates to:
  /// **'Bravo'**
  String get reactionClap;

  /// No description provided for @sendReaction.
  ///
  /// In fr, this message translates to:
  /// **'Envoyer une réaction'**
  String get sendReaction;

  /// No description provided for @muteReactions.
  ///
  /// In fr, this message translates to:
  /// **'Masquer les réactions de l’adversaire'**
  String get muteReactions;

  /// No description provided for @unmuteReactions.
  ///
  /// In fr, this message translates to:
  /// **'Afficher les réactions de l’adversaire'**
  String get unmuteReactions;

  /// No description provided for @leaderboardBody.
  ///
  /// In fr, this message translates to:
  /// **'Score Elo des parties rapides. Les parties privées comptent dans tes statistiques, pas dans le classement.'**
  String get leaderboardBody;

  /// No description provided for @myStatsTitle.
  ///
  /// In fr, this message translates to:
  /// **'Tes statistiques'**
  String get myStatsTitle;

  /// No description provided for @statsEmpty.
  ///
  /// In fr, this message translates to:
  /// **'Termine une partie pour commencer tes statistiques.'**
  String get statsEmpty;

  /// No description provided for @statsDisabled.
  ///
  /// In fr, this message translates to:
  /// **'Les statistiques ne sont pas disponibles sur ce serveur.'**
  String get statsDisabled;

  /// No description provided for @statScore.
  ///
  /// In fr, this message translates to:
  /// **'Score'**
  String get statScore;

  /// No description provided for @statRank.
  ///
  /// In fr, this message translates to:
  /// **'Rang'**
  String get statRank;

  /// No description provided for @statWinRate.
  ///
  /// In fr, this message translates to:
  /// **'Taux de victoire'**
  String get statWinRate;

  /// No description provided for @statGames.
  ///
  /// In fr, this message translates to:
  /// **'Parties'**
  String get statGames;

  /// No description provided for @statWins.
  ///
  /// In fr, this message translates to:
  /// **'Gagnées'**
  String get statWins;

  /// No description provided for @statBestStreak.
  ///
  /// In fr, this message translates to:
  /// **'Meilleure série'**
  String get statBestStreak;

  /// No description provided for @streakLine.
  ///
  /// In fr, this message translates to:
  /// **'{count} victoires d’affilée !'**
  String streakLine(int count);

  /// No description provided for @gamesToRank.
  ///
  /// In fr, this message translates to:
  /// **'Encore {count} partie(s) rapide(s) pour apparaître au classement.'**
  String gamesToRank(int count);

  /// No description provided for @topPlayers.
  ///
  /// In fr, this message translates to:
  /// **'Meilleurs joueurs'**
  String get topPlayers;

  /// No description provided for @leaderboardUnavailable.
  ///
  /// In fr, this message translates to:
  /// **'Classement indisponible pour le moment.'**
  String get leaderboardUnavailable;

  /// No description provided for @leaderboardEmpty.
  ///
  /// In fr, this message translates to:
  /// **'Personne n’est encore classé. Joue {count} parties rapides pour être le premier nom ici !'**
  String leaderboardEmpty(int count);

  /// No description provided for @meSuffix.
  ///
  /// In fr, this message translates to:
  /// **'{name} (toi)'**
  String meSuffix(String name);

  /// No description provided for @rankedGames.
  ///
  /// In fr, this message translates to:
  /// **'{count} parties'**
  String rankedGames(int count);

  /// No description provided for @shopTitle.
  ///
  /// In fr, this message translates to:
  /// **'Boutique'**
  String get shopTitle;

  /// No description provided for @shardsBalance.
  ///
  /// In fr, this message translates to:
  /// **'{count} Éclats'**
  String shardsBalance(int count);

  /// No description provided for @noAdsTitle.
  ///
  /// In fr, this message translates to:
  /// **'Sans pub'**
  String get noAdsTitle;

  /// No description provided for @noAdsBody.
  ///
  /// In fr, this message translates to:
  /// **'Supprime interstitiels et bannières à vie. Les vidéos récompensées restent disponibles si tu le souhaites.'**
  String get noAdsBody;

  /// No description provided for @noAdsOwned.
  ///
  /// In fr, this message translates to:
  /// **'Activé — merci pour ton soutien !'**
  String get noAdsOwned;

  /// No description provided for @starterPackTitle.
  ///
  /// In fr, this message translates to:
  /// **'Pack de démarrage'**
  String get starterPackTitle;

  /// No description provided for @starterPackBody.
  ///
  /// In fr, this message translates to:
  /// **'500 Éclats + dos de carte « Aube » + cadre « Recrue ». Achetable une seule fois.'**
  String get starterPackBody;

  /// No description provided for @shardPacksTitle.
  ///
  /// In fr, this message translates to:
  /// **'Packs d’Éclats'**
  String get shardPacksTitle;

  /// No description provided for @shardPackBonus.
  ///
  /// In fr, this message translates to:
  /// **'{count} Éclats'**
  String shardPackBonus(int count);

  /// No description provided for @freeShardsTitle.
  ///
  /// In fr, this message translates to:
  /// **'Éclats gratuits'**
  String get freeShardsTitle;

  /// No description provided for @freeShardsBody.
  ///
  /// In fr, this message translates to:
  /// **'Regarde une courte vidéo pour gagner {count} Éclats.'**
  String freeShardsBody(int count);

  /// No description provided for @watchVideo.
  ///
  /// In fr, this message translates to:
  /// **'▶ Regarder'**
  String get watchVideo;

  /// No description provided for @restorePurchases.
  ///
  /// In fr, this message translates to:
  /// **'Restaurer mes achats'**
  String get restorePurchases;

  /// No description provided for @restoreDone.
  ///
  /// In fr, this message translates to:
  /// **'Achats restaurés.'**
  String get restoreDone;

  /// No description provided for @restoreFailed.
  ///
  /// In fr, this message translates to:
  /// **'Impossible de restaurer les achats pour le moment.'**
  String get restoreFailed;

  /// No description provided for @purchaseSuccess.
  ///
  /// In fr, this message translates to:
  /// **'Merci ! Achat confirmé.'**
  String get purchaseSuccess;

  /// No description provided for @purchasePending.
  ///
  /// In fr, this message translates to:
  /// **'Achat en cours de validation…'**
  String get purchasePending;

  /// No description provided for @purchaseFailed.
  ///
  /// In fr, this message translates to:
  /// **'L’achat n’a pas abouti.'**
  String get purchaseFailed;

  /// No description provided for @purchaseUnavailable.
  ///
  /// In fr, this message translates to:
  /// **'La boutique n’est pas disponible pour le moment.'**
  String get purchaseUnavailable;

  /// No description provided for @buy.
  ///
  /// In fr, this message translates to:
  /// **'Acheter'**
  String get buy;

  /// No description provided for @owned.
  ///
  /// In fr, this message translates to:
  /// **'Possédé'**
  String get owned;

  /// No description provided for @shopFooter.
  ///
  /// In fr, this message translates to:
  /// **'Prix TTC. Les Éclats servent uniquement aux cosmétiques, ne s’échangent pas et ne donnent aucun avantage en partie contre un humain. Aucune loot box : chaque achat a un contenu connu à l’avance.'**
  String get shopFooter;

  /// No description provided for @shopDemoNotice.
  ///
  /// In fr, this message translates to:
  /// **'Boutique de démonstration : aucun paiement réel.'**
  String get shopDemoNotice;

  /// No description provided for @privacyOptions.
  ///
  /// In fr, this message translates to:
  /// **'Options de confidentialité'**
  String get privacyOptions;

  /// No description provided for @shardsCredited.
  ///
  /// In fr, this message translates to:
  /// **'+{count} Éclats !'**
  String shardsCredited(int count);

  /// No description provided for @chestTitle.
  ///
  /// In fr, this message translates to:
  /// **'Coffre du jour'**
  String get chestTitle;

  /// No description provided for @chestBody.
  ///
  /// In fr, this message translates to:
  /// **'Reviens chaque jour : la série monte jusqu’au jour 7 (100 Éclats). Un jour manqué la remet à zéro.'**
  String get chestBody;

  /// No description provided for @chestOpen.
  ///
  /// In fr, this message translates to:
  /// **'Ouvrir le coffre'**
  String get chestOpen;

  /// No description provided for @chestAlreadyOpened.
  ///
  /// In fr, this message translates to:
  /// **'Déjà ouvert aujourd’hui. Reviens demain !'**
  String get chestAlreadyOpened;

  /// No description provided for @chestReward.
  ///
  /// In fr, this message translates to:
  /// **'+{count} Éclats (jour {day} de la série)'**
  String chestReward(int count, int day);

  /// No description provided for @chestBonus.
  ///
  /// In fr, this message translates to:
  /// **'▶ Ouvrir un 2e coffre'**
  String get chestBonus;

  /// No description provided for @chestStreakDay.
  ///
  /// In fr, this message translates to:
  /// **'Jour {day}'**
  String chestStreakDay(int day);

  /// No description provided for @trackingTitle.
  ///
  /// In fr, this message translates to:
  /// **'Des pubs plus pertinentes ?'**
  String get trackingTitle;

  /// No description provided for @trackingBody.
  ///
  /// In fr, this message translates to:
  /// **'AnimeWho est gratuit grâce à la publicité. À l’écran suivant, iOS te demandera si l’app peut utiliser ton identifiant publicitaire. Tu peux refuser : le jeu reste exactement le même.'**
  String get trackingBody;

  /// No description provided for @upsellTitle.
  ///
  /// In fr, this message translates to:
  /// **'Marre des pubs ?'**
  String get upsellTitle;

  /// No description provided for @upsellBody.
  ///
  /// In fr, this message translates to:
  /// **'Supprime-les à vie pour {price}.'**
  String upsellBody(String price);

  /// No description provided for @upsellCta.
  ///
  /// In fr, this message translates to:
  /// **'Voir l’offre'**
  String get upsellCta;

  /// No description provided for @eliminatedSemantics.
  ///
  /// In fr, this message translates to:
  /// **'{name}, écarté'**
  String eliminatedSemantics(String name);

  /// No description provided for @characterSemantics.
  ///
  /// In fr, this message translates to:
  /// **'{name} ({universe})'**
  String characterSemantics(String name, String universe);

  /// No description provided for @playerOptions.
  ///
  /// In fr, this message translates to:
  /// **'Options du joueur'**
  String get playerOptions;

  /// No description provided for @reportPlayer.
  ///
  /// In fr, this message translates to:
  /// **'Signaler'**
  String get reportPlayer;

  /// No description provided for @blockPlayer.
  ///
  /// In fr, this message translates to:
  /// **'Bloquer ce joueur'**
  String get blockPlayer;

  /// No description provided for @reportTitle.
  ///
  /// In fr, this message translates to:
  /// **'Signaler {name}'**
  String reportTitle(String name);

  /// No description provided for @reportBody.
  ///
  /// In fr, this message translates to:
  /// **'Le signalement est envoyé à l’équipe de modération avec les questions libres de ce joueur.'**
  String get reportBody;

  /// No description provided for @reasonInsult.
  ///
  /// In fr, this message translates to:
  /// **'Insultes'**
  String get reasonInsult;

  /// No description provided for @reasonSexual.
  ///
  /// In fr, this message translates to:
  /// **'Contenu sexuel'**
  String get reasonSexual;

  /// No description provided for @reasonHate.
  ///
  /// In fr, this message translates to:
  /// **'Haine ou discrimination'**
  String get reasonHate;

  /// No description provided for @reasonSpam.
  ///
  /// In fr, this message translates to:
  /// **'Spam'**
  String get reasonSpam;

  /// No description provided for @reasonCheating.
  ///
  /// In fr, this message translates to:
  /// **'Triche'**
  String get reasonCheating;

  /// No description provided for @reasonOther.
  ///
  /// In fr, this message translates to:
  /// **'Autre'**
  String get reasonOther;

  /// No description provided for @reportSend.
  ///
  /// In fr, this message translates to:
  /// **'Envoyer le signalement'**
  String get reportSend;

  /// No description provided for @blockTitle.
  ///
  /// In fr, this message translates to:
  /// **'Bloquer {name} ?'**
  String blockTitle(String name);

  /// No description provided for @blockBody.
  ///
  /// In fr, this message translates to:
  /// **'Vous ne serez plus jamais mis face à face en partie rapide, et ce joueur ne pourra plus rejoindre tes parties privées.'**
  String get blockBody;

  /// No description provided for @noticeReportSent.
  ///
  /// In fr, this message translates to:
  /// **'Merci, ton signalement a été envoyé.'**
  String get noticeReportSent;

  /// No description provided for @noticeReportLimit.
  ///
  /// In fr, this message translates to:
  /// **'Tu as atteint la limite de signalements pour cette session.'**
  String get noticeReportLimit;

  /// No description provided for @noticePlayerBlocked.
  ///
  /// In fr, this message translates to:
  /// **'{name} est bloqué.'**
  String noticePlayerBlocked(String name);

  /// No description provided for @settingsTitle.
  ///
  /// In fr, this message translates to:
  /// **'Réglages'**
  String get settingsTitle;

  /// No description provided for @verifiedOnlyTitle.
  ///
  /// In fr, this message translates to:
  /// **'Questions vérifiées uniquement'**
  String get verifiedOnlyTitle;

  /// No description provided for @verifiedOnlyBody.
  ///
  /// In fr, this message translates to:
  /// **'Refuse les questions libres tapées par tes adversaires.'**
  String get verifiedOnlyBody;

  /// No description provided for @blockedPlayersTitle.
  ///
  /// In fr, this message translates to:
  /// **'Joueurs bloqués'**
  String get blockedPlayersTitle;

  /// No description provided for @noBlockedPlayers.
  ///
  /// In fr, this message translates to:
  /// **'Aucun joueur bloqué.'**
  String get noBlockedPlayers;

  /// No description provided for @unblock.
  ///
  /// In fr, this message translates to:
  /// **'Débloquer'**
  String get unblock;

  /// No description provided for @appOutdatedTitle.
  ///
  /// In fr, this message translates to:
  /// **'Mise à jour nécessaire'**
  String get appOutdatedTitle;

  /// No description provided for @appOutdatedFallback.
  ///
  /// In fr, this message translates to:
  /// **'Cette version d’AnimeWho n’est plus prise en charge. Mets l’app à jour pour continuer à jouer.'**
  String get appOutdatedFallback;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['fr'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'fr':
      return AppLocalizationsFr();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
