import 'package:animewho/app.dart';
import 'package:animewho/application/game_controller.dart';
import 'package:animewho/data/storage/key_value_store.dart';
import 'package:animewho/domain/game/client_events.dart';
import 'package:animewho/domain/game/game_state.dart';
import 'package:animewho/domain/game/server_events.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

Map<String, dynamic> _players() => {
      'players': [
        {'id': 'me', 'name': 'Moi', 'lives': 3},
        {'id': 'opp', 'name': 'Rival', 'lives': 3},
      ],
    };

Future<TestHarness> pumpApp(WidgetTester tester, {Map<String, String>? stored}) async {
  tester.view.physicalSize = const Size(1080, 2340);
  tester.view.devicePixelRatio = 2.75;
  addTearDown(tester.view.reset);
  final h = TestHarness(stored: stored);
  await tester.pumpWidget(ProviderScope(overrides: h.overrides, child: const AnimeWhoApp(startMonetization: false)));
  await tester.pump();
  return h;
}

Future<void> startGame(WidgetTester tester, TestHarness h, {String mode = 'quick', String turn = 'me'}) async {
  h.socket.receive('session', {'token': 'S' * 32, 'playerId': 'me'});
  h.socket.receive('room_joined', {'code': 'R1', 'phase': 'selection', ..._players(), 'characters': boardJson(), 'mode': mode});
  await tester.pump();
  h.socket.receive('character_assigned', {'characterId': 'c1'});
  h.socket.receive('game_start', {'currentTurnPlayerId': turn, ..._players()});
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
  // Le toast « personnage choisi au hasard » couvrirait les boutons d'action.
  scaffoldMessengerKey.currentState?.removeCurrentSnackBar();
  await tester.pump();
}

void main() {
  testWidgets('accueil : pseudo demandé au premier lancement, puis partie rapide', (tester) async {
    final h = await pumpApp(tester);
    await tester.pump();
    expect(find.text('Choisis ton nom de combat'), findsOneWidget);
    await tester.enterText(find.byKey(const Key('name-field')), 'Kenji');
    await tester.pump();
    await tester.tap(find.byKey(const Key('name-submit')));
    await tester.pumpAndSettle();
    expect(h.store.getString(StoreKeys.playerName), 'Kenji');
    expect(find.text('Kenji'), findsOneWidget);
    expect(find.textContaining('Qui est-ce'), findsNothing);

    await tester.tap(find.text('Partie rapide'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(h.socket.sentOf<JoinLobby>().single.playerName, 'Kenji');
    expect(find.text('RECHERCHE D’UN ADVERSAIRE'), findsOneWidget);
    h.socket.receive('in_queue', {'position': 1});
    await tester.pump();
    expect(find.text('Position dans la file : 1'), findsOneWidget);
    // Bannière factice autorisée dans la file d'attente.
    expect(find.byKey(const ValueKey('fake-banner-ban_queue')), findsOneWidget);
  });

  testWidgets('partie privée : le code de la salle s’affiche', (tester) async {
    final h = await pumpApp(tester, stored: {StoreKeys.playerName: 'Moi'});
    await tester.tap(find.text('Créer une partie privée'));
    await tester.pump();
    h.socket.receive('room_created', {'code': 'K7P2QX'});
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('K7P2QX'), findsOneWidget);
    expect(h.socket.sentOf<CreateRoom>(), hasLength(1));
  });

  testWidgets('sélection : choisir puis valider envoie select_character', (tester) async {
    final h = await pumpApp(tester, stored: {StoreKeys.playerName: 'Moi'});
    h.socket.receive('session', {'token': 'S' * 32, 'playerId': 'me'});
    h.socket.receive('room_joined', {'code': 'R1', 'phase': 'selection', ..._players(), 'characters': boardJson(), 'mode': 'quick'});
    h.socket.receive('timer', {'actingPlayerId': null, 'msLeft': 90000});
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('CHOISIS TON PERSONNAGE SECRET'), findsOneWidget);
    expect(find.textContaining('SINON ON CHOISIT POUR TOI'), findsOneWidget);
    // Aucune pub sur l'écran de sélection.
    expect(find.byKey(const ValueKey('fake-banner-ban_home')), findsNothing);
    await tester.tap(find.text('Héros C'));
    await tester.pump();
    await tester.tap(find.byKey(const Key('confirm-character')));
    await tester.pump();
    expect(h.socket.sentOf<SelectCharacter>().single.characterId, 'c2');
    expect(find.text('EN ATTENTE DE L’ADVERSAIRE'), findsOneWidget);
  });

  testWidgets('partie : question vérifiée, élimination d’une carte', (tester) async {
    final h = await pumpApp(tester, stored: {StoreKeys.playerName: 'Moi'});
    await startGame(tester, h);
    expect(find.byKey(const Key('turn-banner')), findsOneWidget);
    expect(find.text('À TOI DE JOUER'), findsOneWidget);

    // Écarter une carte : synchronisée avec le serveur.
    await tester.tap(find.text('Héros E'));
    await tester.pump();
    expect(h.socket.sentOf<SyncEliminations>().last.eliminatedIds, ['c4']);

    await tester.tap(find.byKey(const Key('ask-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ChoiceChip, 'Yeux'));
    await tester.pump();
    await tester.tap(find.widgetWithText(ChoiceChip, 'rouges'));
    await tester.pump();
    expect(find.text('« Ton personnage a-t-il les yeux rouges ? »'), findsOneWidget);
    await tester.tap(find.byKey(const Key('send-question')));
    await tester.pumpAndSettle();
    final sent = h.socket.sentOf<AskVerifiedQuestion>().single;
    expect(sent.payload, {'attribute': 'eyeColor', 'value': 'red'});

    // Réponse du serveur : proposition d'écarter les personnages exclus.
    h.socket.receive('question_answered', {
      'type': 'qna', 'question': null, 'verified': true, 'attribute': 'eyeColor', 'value': 'red',
      'answer': 'yes', 'askerId': 'me', 'currentTurnPlayerId': 'opp',
    });
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    expect(find.text('Les écarter'), findsOneWidget);
    expect(find.text('TOUR DE L’ADVERSAIRE'), findsOneWidget);
  });

  testWidgets('partie : question libre reçue, réponse OUI', (tester) async {
    final h = await pumpApp(tester, stored: {StoreKeys.playerName: 'Moi'});
    await startGame(tester, h, turn: 'opp');
    h.socket.receive('question_asked', {'question': 'Porte-t-il un chapeau ?', 'askerId': 'opp'});
    await tester.pump();
    expect(find.byKey(const Key('incoming-question')), findsOneWidget);
    await tester.tap(find.text('OUI'));
    await tester.pump();
    expect(h.socket.sent.whereType<AnswerQuestion>().single.payload, {'answer': 'yes'});
  });

  testWidgets('fin : victoire, révélation, revanche et retour à l’accueil', (tester) async {
    final h = await pumpApp(tester, stored: {StoreKeys.playerName: 'Moi'});
    await startGame(tester, h);
    h.socket.receive('game_over', {'winnerId': 'me', 'reason': 'correct_guess', 'opponentCharacterId': 'c7'});
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('VICTOIRE !'), findsOneWidget);
    expect(find.byKey(const Key('revealed-card')), findsOneWidget);
    expect(find.text('+20 Éclats gagnés'), findsOneWidget);

    await tester.ensureVisible(find.byKey(const Key('rematch')));
    await tester.pump();
    await tester.tap(find.byKey(const Key('rematch')));
    await tester.pump();
    expect(h.socket.sentOf<RequestRematch>(), hasLength(1));

    await tester.ensureVisible(find.byKey(const Key('back-home')));
    await tester.tap(find.byKey(const Key('back-home')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(h.socket.sentOf<LeaveRoom>(), hasLength(1));
    final container = ProviderScope.containerOf(tester.element(find.byType(GameShell)));
    expect(container.read(gameControllerProvider).phase, GamePhase.home);
    // 1re partie : l'interstitiel est refusé par les règles de fréquence.
    expect(h.ads.interstitialsShown, isEmpty);
    expect(h.analytics.names, contains('ad_interstitial_skip'));
  });

  testWidgets('connexion perdue puis remplacée par un autre appareil', (tester) async {
    final h = await pumpApp(tester, stored: {StoreKeys.playerName: 'Moi'});
    h.socket.push(const ConnectedEvent());
    await tester.pump();
    h.socket.push(const DisconnectedEvent('transport close'));
    await tester.pump();
    expect(find.text('Connexion perdue : reconnexion en cours…'), findsOneWidget);
    h.socket.push(const DisconnectedEvent('io server disconnect'));
    await tester.pump();
    expect(find.text('Reprendre ici'), findsOneWidget);
    await tester.tap(find.text('Reprendre ici'));
    await tester.pump();
    expect(h.socket.reconnectCalls, 1);
  });
}
