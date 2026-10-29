import 'package:animewho/application/game_controller.dart';
import 'package:animewho/application/monetization_controller.dart';
import 'package:animewho/data/storage/key_value_store.dart';
import 'package:animewho/domain/game/client_events.dart';
import 'package:animewho/domain/game/game_reducer.dart';
import 'package:animewho/domain/game/game_state.dart';
import 'package:animewho/domain/game/server_events.dart';
import 'package:animewho/domain/models/character.dart';
import 'package:animewho/domain/models/protocol_models.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

Map<String, dynamic> players([int myLives = 3, int oppLives = 3]) => {
      'players': [
        {'id': 'me', 'name': 'Moi', 'lives': myLives},
        {'id': 'opp', 'name': 'Rival', 'lives': oppLives},
      ],
    };

Map<String, dynamic> snapshot({String phase = 'playing', String? myCharacterId = 'c1', List<String> eliminated = const []}) =>
    {
      'code': 'ROOM42',
      'phase': phase,
      ...players(2, 3),
      'characters': boardJson(),
      'myCharacterId': myCharacterId,
      'myEliminatedIds': eliminated,
      'opponentReady': true,
      'opponentConnected': true,
      'mode': 'quick',
      'currentTurnPlayerId': 'me',
      'pendingQuestion': null,
      'awaitingAnswerFor': null,
      'log': [
        {'type': 'qna', 'answer': 'yes', 'askerId': 'me', 'question': null, 'verified': true, 'attribute': 'gender', 'value': 'female'},
      ],
      'winnerId': null,
      'gameOverReason': null,
      'opponentCharacterId': null,
      'rematchRequestedBy': null,
      'timer': {'actingPlayerId': 'me', 'msLeft': 30000},
    };

void main() {
  group('reduceGameEvent (pur)', () {
    final now = DateTime(2027, 1, 1, 12);
    var seq = 0;
    GameReduction reduce(GameState s, String name, [Object? data]) => reduceGameEvent(
          s,
          ServerEvent.decode(name, data),
          now: now,
          newLogId: () => 'l${++seq}',
          newReactionId: () => ++seq,
        );

    test('session : identifiant public en état, jeton secret à persister', () {
      final r = reduce(const GameState(), 'session', {'token': 'T' * 32, 'playerId': 'me'});
      expect(r.state.myPlayerId, 'me');
      expect(r.effects.whereType<PersistSessionToken>().single.token, 'T' * 32);
    });

    test('profile : persisté puis demande des stats', () {
      final r = reduce(const GameState(), 'profile', {'token': 'P' * 32});
      expect(r.effects.whereType<PersistProfileToken>(), hasLength(1));
      expect(r.effects.whereType<SendEvent>().single.event, isA<GetMyStats>());
    });

    test('reconnexion : instantané restauré (phase, éliminations, chrono, journal)', () {
      final r = reduce(const GameState(myPlayerId: 'me', phase: GamePhase.home), 'state_sync',
          {'room': snapshot(eliminated: ['c2'])});
      final s = r.state;
      expect(s.phase, GamePhase.playing);
      expect(s.roomCode, 'ROOM42');
      expect(s.myEliminatedIds, ['c2']);
      expect(s.myCharacter?.id, 'c1');
      expect(s.isMyTurn, isTrue);
      expect(s.timer!.deadline, now.add(const Duration(seconds: 30)));
      expect(s.gameLog.single.isRestored, isTrue);
      expect(s.me!.lives, 2);
    });

    test('reconnexion en file : on se remet dans la file', () {
      final r = reduce(const GameState(phase: GamePhase.queue, myName: 'Moi'), 'state_sync', {'room': null});
      final sent = r.effects.whereType<SendEvent>().single.event as JoinLobby;
      expect(sent.playerName, 'Moi');
      expect(r.state.phase, GamePhase.queue);
    });

    test('reconnexion échouée en partie : retour accueil + message', () {
      final r = reduce(const GameState(phase: GamePhase.playing, roomCode: 'X'), 'state_sync', {'room': null});
      expect(r.state.phase, GamePhase.home);
      expect(r.state.roomCode, isNull);
      expect(r.effects.whereType<ShowNotice>().single.notice.kind, NoticeKind.gameNotRecovered);
    });

    test('déconnexion par le serveur (autre appareil) : connexion remplacée', () {
      var s = reduce(const GameState(), 'connect').state;
      expect(reduceGameEvent(s, const ConnectedEvent(), now: now, newLogId: () => '', newReactionId: () => 0)
          .state
          .isConnected, isTrue);
      s = reduceGameEvent(s, const DisconnectedEvent('io server disconnect'),
              now: now, newLogId: () => '', newReactionId: () => 0)
          .state;
      expect(s.connectionReplaced, isTrue);
      expect(s.isConnected, isFalse);
      s = reduceGameEvent(s, const DisconnectedEvent('transport close'), now: now, newLogId: () => '', newReactionId: () => 0)
          .state;
      expect(s.connectionReplaced, isTrue, reason: 'une coupure réseau ne l’efface pas');
    });

    test('déroulé : room_joined → game_start → question → mauvaise réponse → fin', () {
      var s = const GameState(myPlayerId: 'me', phase: GamePhase.queue);
      var r = reduce(s, 'room_joined', {'code': 'R1', 'phase': 'selection', ...players(), 'characters': boardJson(), 'mode': 'quick'});
      s = r.state;
      expect(s.phase, GamePhase.selection);
      expect(r.effects.whereType<RoundStarted>().single.isRematch, isFalse);
      s = reduce(s, 'opponent_ready').state;
      expect(s.opponentReady, isTrue);
      s = reduce(s, 'game_start', {'currentTurnPlayerId': 'opp', ...players()}).state;
      expect(s.phase, GamePhase.playing);
      expect(s.canAct, isFalse);
      s = reduce(s, 'question_asked', {'question': 'Épée ?', 'askerId': 'opp'}).state;
      expect(s.pendingQuestion, 'Épée ?');
      s = reduce(s, 'question_answered', {
        'type': 'qna', 'question': 'Épée ?', 'verified': false, 'attribute': null, 'value': null,
        'answer': 'no', 'askerId': 'opp', 'currentTurnPlayerId': 'me',
      }).state;
      expect(s.pendingQuestion, isNull);
      expect(s.canAct, isTrue);
      expect(s.gameLog.single, isA<QnaEntry>());
      r = reduce(s, 'wrong_guess', {'guesserId': 'me', 'guessedCharacterId': 'c4', 'lives': 2, 'currentTurnPlayerId': 'opp'});
      s = r.state;
      expect(s.me!.lives, 2);
      expect(r.effects.whereType<ShowNotice>().single.notice.kind, NoticeKind.myWrongGuess);
      r = reduce(s, 'game_over', {'winnerId': 'opp', 'reason': 'correct_guess', 'opponentCharacterId': 'c9'});
      expect(r.state.phase, GamePhase.ended);
      expect(r.state.revealedOpponentCharacter?.id, 'c9');
      final finished = r.effects.whereType<GameFinished>().single;
      expect(finished.won, isFalse);
      expect(finished.mode, RoomMode.quick);
    });

    test('fin restaurée après reconnexion : pas de GameFinished (pas de double comptage)', () {
      final ended = reduce(const GameState(myPlayerId: 'me'), 'state_sync', {'room': snapshot(phase: 'ended')}).state;
      final r = reduce(ended, 'game_over', {'winnerId': 'me', 'reason': 'correct_guess', 'opponentCharacterId': 'c2'});
      expect(r.effects.whereType<GameFinished>(), isEmpty);
    });

    test('chrono dépassé : vie perdue, tour passé', () {
      var s = reduce(const GameState(myPlayerId: 'me'), 'state_sync', {'room': snapshot()}).state;
      final r = reduce(s, 'turn_timeout', {'playerId': 'me', 'lives': 1, 'currentTurnPlayerId': 'opp', 'while': 'playing'});
      s = r.state;
      expect(s.me!.lives, 1);
      expect(s.gameLog.last, isA<TimeoutEntry>());
      expect(r.effects.whereType<ShowNotice>().single.notice.kind, NoticeKind.myTimeoutPlaying);
    });

    test('adversaire parti en pleine partie : victoire par abandon', () {
      final s = reduce(const GameState(myPlayerId: 'me'), 'state_sync', {'room': snapshot()}).state;
      final r = reduce(s, 'opponent_left');
      expect(r.state.phase, GamePhase.ended);
      expect(r.state.gameOverReason, GameOverReason.opponentLeft);
      expect(r.state.isWinner, isTrue);
      expect(r.effects.whereType<GameFinished>().single.won, isTrue);
    });

    test('revanche', () {
      var s = reduce(const GameState(myPlayerId: 'me'), 'state_sync', {'room': snapshot(phase: 'ended')}).state;
      var r = reduce(s, 'rematch_requested', {'byPlayerId': 'opp'});
      expect(r.state.rematchRequestedBy, 'opp');
      expect(r.effects.whereType<ShowNotice>().single.notice.kind, NoticeKind.opponentWantsRematch);
      r = reduce(r.state, 'rematch_started', {'code': 'ROOM42', 'phase': 'selection', ...players(), 'characters': boardJson(), 'mode': 'quick'});
      s = r.state;
      expect(s.phase, GamePhase.selection);
      expect(s.myCharacterId, isNull);
      expect(s.gameLog, isEmpty);
      expect(r.effects.whereType<RoundStarted>().single.isRematch, isTrue);
    });

    test('réactions : masquées si coupées, 6 au plus à l’écran', () {
      var s = const GameState(myPlayerId: 'me', reactionsMuted: true);
      s = reduce(s, 'reaction', {'playerId': 'opp', 'emoji': '🔥'}).state;
      expect(s.reactions, isEmpty);
      s = s.copyWith(reactionsMuted: false);
      for (var i = 0; i < 9; i++) {
        s = reduce(s, 'reaction', {'playerId': 'opp', 'emoji': '👏'}).state;
      }
      expect(s.reactions, hasLength(kMaxLiveReactions));
    });

    test('erreur serveur en file : retour à l’accueil', () {
      final r = reduce(const GameState(phase: GamePhase.lobby), 'error', {'message': 'Partie introuvable.'});
      expect(r.state.phase, GamePhase.home);
      expect(r.effects.whereType<ShowNotice>().single.notice.text, 'Partie introuvable.');
    });
  });

  group('GameController (avec faux socket)', () {
    test('se connecte au démarrage, persiste le jeton de session et le relit', () async {
      final h = TestHarness();
      final c = h.container();
      addTearDown(c.dispose);
      c.read(gameControllerProvider);
      expect(h.socket.connectCalls, 1);
      h.socket.receive('session', {'token': 'S' * 32, 'playerId': 'me'});
      h.socket.receive('profile', {'token': 'P' * 32});
      await Future<void>.delayed(Duration.zero);
      expect(h.store.getString(StoreKeys.sessionToken), 'S' * 32);
      expect(h.store.getString(StoreKeys.profileToken), 'P' * 32);
      expect(h.socket.sentOf<GetMyStats>(), hasLength(1));
      expect(c.read(gameControllerProvider).myPlayerId, 'me');
    });

    test('pseudo et préférence de réactions relus depuis le stockage', () {
      final h = TestHarness(stored: {StoreKeys.playerName: 'Kenji', StoreKeys.muteReactions: '1'});
      final c = h.container();
      addTearDown(c.dispose);
      final s = c.read(gameControllerProvider);
      expect(s.myName, 'Kenji');
      expect(s.reactionsMuted, isTrue);
    });

    test('retour au premier plan : reconnexion si la connexion est tombée', () {
      final h = TestHarness();
      final c = h.container();
      addTearDown(c.dispose);
      final ctrl = c.read(gameControllerProvider.notifier);
      h.socket.connected = false;
      ctrl.onAppResumed(away: const Duration(seconds: 5));
      expect(h.socket.connectCalls, 2);
      h.socket.connected = true;
      ctrl.onAppResumed(away: const Duration(seconds: 5));
      expect(h.socket.reconnectCalls, 0, reason: 'connexion saine après une courte absence');
      ctrl.onAppResumed(away: const Duration(minutes: 2));
      expect(h.socket.reconnectCalls, 1, reason: 'longue absence : socket possiblement « zombie »');
    });

    test('connexion remplacée : pas de reconnexion automatique, « Reprendre ici » la relance', () {
      final h = TestHarness();
      final c = h.container();
      addTearDown(c.dispose);
      final ctrl = c.read(gameControllerProvider.notifier);
      h.socket.push(const DisconnectedEvent('io server disconnect'));
      ctrl.onAppResumed(away: const Duration(minutes: 5));
      expect(h.socket.connectCalls, 1);
      expect(h.socket.reconnectCalls, 0);
      ctrl.resumeHere();
      expect(h.socket.reconnectCalls, 1);
      expect(c.read(gameControllerProvider).connectionReplaced, isFalse);
    });

    test('actions envoyées au serveur', () {
      final h = TestHarness(stored: {StoreKeys.playerName: 'Moi'});
      final c = h.container();
      addTearDown(c.dispose);
      final ctrl = c.read(gameControllerProvider.notifier);
      ctrl.joinQueue();
      expect(c.read(gameControllerProvider).phase, GamePhase.queue);
      ctrl.playVsBot(BotLevel.easy);
      ctrl.askVerifiedQuestion(VerifiableAttribute.eyeColor, 'red');
      ctrl.makeGuess('c3');
      ctrl.syncEliminations({'c1', 'c2'});
      ctrl.leaveGame();
      expect(h.socket.sent.map((e) => e.name).toList(),
          ['join_lobby', 'play_vs_bot', 'ask_question', 'make_guess', 'sync_eliminations', 'leave_room']);
      expect(c.read(gameControllerProvider).phase, GamePhase.home);
      expect(h.analytics.names, containsAll(['app_open', 'queue_join', 'queue_left', 'question_ask']));
    });

    test('fin de partie en direct : Éclats crédités, historique pub incrémenté, analytics', () async {
      final h = TestHarness();
      final c = h.container();
      addTearDown(c.dispose);
      c.read(gameControllerProvider);
      c.read(monetizationControllerProvider);
      h.socket.receive('session', {'token': 'S' * 32, 'playerId': 'me'});
      h.socket.receive('room_joined', {'code': 'R1', 'phase': 'selection', ...players(), 'characters': boardJson(), 'mode': 'quick'});
      h.socket.receive('game_start', {'currentTurnPlayerId': 'me', ...players()});
      h.socket.receive('game_over', {'winnerId': 'me', 'reason': 'correct_guess', 'opponentCharacterId': 'c2'});
      await Future<void>.delayed(const Duration(milliseconds: 10));
      final m = c.read(monetizationControllerProvider);
      expect(m.history.gamesCompleted, 1);
      expect(m.wallet.balance, 20);
      expect(m.lastGameReward?.amount, 20);
      expect(h.analytics.names, containsAll(['game_start', 'game_end']));
    });
  });
}
