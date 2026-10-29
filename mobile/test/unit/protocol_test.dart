import 'package:animewho/domain/game/client_events.dart';
import 'package:animewho/domain/game/server_events.dart';
import 'package:animewho/domain/models/character.dart';
import 'package:animewho/domain/models/protocol_models.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

/// Les charges utiles ci-dessous reproduisent exactement ce qu'émet
/// game-engine.ts (mêmes noms de champs).
void main() {
  group('ServerEvent.decode', () {
    test('session / profile', () {
      final s = ServerEvent.decode('session', {'token': 't' * 32, 'playerId': 'p1'}) as SessionEvent;
      expect(s.token, 't' * 32);
      expect(s.playerId, 'p1');
      expect((ServerEvent.decode('profile', {'token': 'x'}) as ProfileEvent).token, 'x');
    });

    test('room_joined avec personnages venant du serveur', () {
      final e = ServerEvent.decode('room_joined', {
        'code': 'ABC234',
        'phase': 'selection',
        'players': [
          {'id': 'p1', 'name': 'Moi', 'lives': 3},
          {'id': 'p2', 'name': 'Toi', 'lives': 3},
        ],
        'characters': boardJson(),
        'mode': 'bot',
      }) as RoomJoinedEvent;
      expect(e.code, 'ABC234');
      expect(e.mode, RoomMode.bot);
      expect(e.players.map((p) => p.name), ['Moi', 'Toi']);
      expect(e.characters, hasLength(24));
      expect(e.characters.first.universe, 'Lycée Sakura'); // champ « anime » côté serveur
    });

    test('Character.fromJson : imageUrl nul ou absent, champs inconnus ignorés', () {
      final c = Character.fromJson({
        'id': 'x',
        'name': 'Nom',
        'anime': 'Univers',
        'gender': 'female',
        'hairColor': 'Pink',
        'eyeColor': 'red',
        'ageRange': 'teen',
        'species': 'human',
        'powers': ['feu', 3],
        'alignment': 'hero',
        'role': 'main',
        'imageUrl': null,
        'nouveauChamp': true,
      });
      expect(c.imageUrl, isNull);
      expect(c.powers, ['feu']);
      expect(c.hasTrait(VerifiableAttribute.hairColor, 'pink'), isTrue, reason: 'insensible à la casse');
      expect(c.trait(VerifiableAttribute.universe), 'Univers');
    });

    test('question_answered vérifiée', () {
      final e = ServerEvent.decode('question_answered', {
        'type': 'qna',
        'question': null,
        'verified': true,
        'attribute': 'anime',
        'value': 'Lycée Sakura',
        'answer': 'yes',
        'askerId': 'p1',
        'currentTurnPlayerId': 'p2',
      }) as QuestionAnsweredEvent;
      expect(e.entry.verified, isTrue);
      expect(e.entry.attribute, VerifiableAttribute.universe);
      expect(e.entry.answer, Answer.yes);
      expect(e.currentTurnPlayerId, 'p2');
    });

    test('question_answered libre', () {
      final e = ServerEvent.decode('question_answered', {
        'type': 'qna',
        'question': 'A-t-il une épée ?',
        'verified': false,
        'attribute': null,
        'value': null,
        'answer': 'no',
        'askerId': 'p2',
        'currentTurnPlayerId': 'p1',
      }) as QuestionAnsweredEvent;
      expect(e.entry.question, 'A-t-il une épée ?');
      expect(e.entry.attribute, isNull);
    });

    test('turn_timeout, wrong_guess, game_over, timer', () {
      final t = ServerEvent.decode('turn_timeout', {
        'playerId': 'p1',
        'lives': 2,
        'currentTurnPlayerId': 'p2',
        'while': 'answering',
      }) as TurnTimeoutEvent;
      expect(t.whileAnswering, isTrue);
      final w = ServerEvent.decode('wrong_guess', {
        'guesserId': 'p1',
        'guessedCharacterId': 'c3',
        'lives': 1,
        'currentTurnPlayerId': 'p2',
      }) as WrongGuessEvent;
      expect(w.lives, 1);
      final g = ServerEvent.decode('game_over', {
        'winnerId': 'p2',
        'reason': 'out_of_lives',
        'opponentCharacterId': 'c7',
      }) as GameOverEvent;
      expect(g.reason, GameOverReason.outOfLives);
      final timer = ServerEvent.decode('timer', {'actingPlayerId': null, 'msLeft': 90000}) as TimerEvent;
      expect(timer.payload.msLeft, 90000);
      final none = ServerEvent.decode('timer', {'actingPlayerId': null, 'msLeft': null}) as TimerEvent;
      expect(none.payload.msLeft, isNull);
    });

    test('événements sans charge utile', () {
      expect(ServerEvent.decode('opponent_ready', null), isA<OpponentReadyEvent>());
      expect(ServerEvent.decode('opponent_left', null), isA<OpponentLeftEvent>());
      expect(ServerEvent.decode('opponent_reconnected', null), isA<OpponentReconnectedEvent>());
    });

    test('state_sync : nul ou instantané complet', () {
      expect((ServerEvent.decode('state_sync', {'room': null}) as StateSyncEvent).room, isNull);
      final room = (ServerEvent.decode('state_sync', {
        'room': {
          'code': 'XYZ789',
          'phase': 'playing',
          'players': [
            {'id': 'p1', 'name': 'A', 'lives': 2},
            {'id': 'p2', 'name': 'B', 'lives': 3},
          ],
          'characters': boardJson(),
          'myCharacterId': 'c1',
          'myEliminatedIds': ['c2', 'c3'],
          'opponentReady': true,
          'opponentConnected': false,
          'mode': 'quick',
          'currentTurnPlayerId': 'p1',
          'pendingQuestion': null,
          'awaitingAnswerFor': 'Question ?',
          'log': [
            {'type': 'timeout', 'playerId': 'p1'},
            {'type': 'guess', 'guesserId': 'p2', 'guessedCharacterId': 'c4'},
            {'type': 'bizarre'},
          ],
          'winnerId': null,
          'gameOverReason': null,
          'opponentCharacterId': null,
          'rematchRequestedBy': null,
          'timer': {'actingPlayerId': 'p2', 'msLeft': 12000},
        },
      }) as StateSyncEvent)
          .room!;
      expect(room.phase, RoomPhase.playing);
      expect(room.myEliminatedIds, ['c2', 'c3']);
      expect(room.log, hasLength(2), reason: 'les entrées inconnues sont ignorées');
      expect(room.log.every((e) => e.isRestored), isTrue);
      expect(room.timer.msLeft, 12000);
      expect(room.opponentConnected, isFalse);
    });

    test('my_stats et rating_update', () {
      final s = ServerEvent.decode('my_stats', {
        'enabled': true,
        'minRankedGames': 5,
        'stats': {
          'id': 'p', 'name': 'n', 'rating': 1016, 'rank': null, 'gamesPlayed': 4, 'rankedGames': 2,
          'wins': 3, 'losses': 1, 'currentStreak': 2, 'bestStreak': 3,
        },
      }) as MyStatsEvent;
      expect(s.payload.stats!.winRatePercent, 75);
      final r = ServerEvent.decode('rating_update', {'ranked': true, 'rating': 1016, 'delta': 16}) as RatingUpdateEvent;
      expect(r.update.delta, 16);
    });

    test('nom inconnu ou charge mal formée : jamais d’exception', () {
      expect(ServerEvent.decode('nouvel_evenement', {'x': 1}), isA<UnknownServerEvent>());
      expect(ServerEvent.decode('session', {'token': 3}), isA<UnknownServerEvent>());
      expect(ServerEvent.decode('wrong_guess', 'texte'), isA<UnknownServerEvent>());
    });

    test('error du serveur', () {
      final e = ServerEvent.decode('error', {'message': 'Ce n’est pas ton tour.'}) as ServerErrorEvent;
      expect(e.message, 'Ce n’est pas ton tour.');
    });
  });

  group('ClientEvent', () {
    test('noms et charges utiles conformes à ClientToServerEvents', () {
      expect(const JoinLobby('Moi').name, 'join_lobby');
      expect(const JoinLobby('Moi').payload, {'name': 'Moi'});
      expect(const PlayVsBot('Moi', BotLevel.hard).payload, {'name': 'Moi', 'level': 'hard'});
      expect(const JoinRoom('ABC234', 'Moi').payload, {'code': 'ABC234', 'name': 'Moi'});
      expect(const AskVerifiedQuestion(VerifiableAttribute.universe, 'X').payload, {'attribute': 'anime', 'value': 'X'});
      expect(const AskVerifiedQuestion(VerifiableAttribute.hairColor, 'pink').name, 'ask_question');
      expect(const AskFreeQuestion('Q ?').payload, {'question': 'Q ?'});
      expect(const AnswerQuestion(Answer.no).payload, {'answer': 'no'});
      expect(const MakeGuess('c1').payload, {'characterId': 'c1'});
      expect(const SyncEliminations(['a', 'b']).payload, {'eliminatedIds': ['a', 'b']});
      expect(const React('🔥').payload, {'emoji': '🔥'});
      expect(const LeaveRoom().payload, isNull);
      expect(const RequestRematch().name, 'request_rematch');
      expect(const AcceptRematch().name, 'accept_rematch');
      expect(const GetMyStats().name, 'get_my_stats');
      expect(const SelectCharacter('c2').payload, {'characterId': 'c2'});
      expect(const CreateRoom('Moi').name, 'create_room');
    });

    test('les 8 traits vérifiables correspondent à VERIFIABLE_ATTRIBUTES', () {
      expect(VerifiableAttribute.values.map((a) => a.wire).toList(),
          ['hairColor', 'eyeColor', 'gender', 'ageRange', 'species', 'alignment', 'role', 'anime']);
    });

    test('réactions identiques au serveur', () {
      expect(kReactions, ['👍', '😂', '😮', '😅', '🤔', '😱', '🔥', '👏']);
    });
  });
}
