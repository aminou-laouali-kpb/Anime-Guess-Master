import '../models/character.dart';
import '../models/protocol_models.dart';
import 'client_events.dart';
import 'game_state.dart';
import 'server_events.dart';

/// Message à afficher au joueur (toast). Le texte est choisi par l'interface
/// (traductions), le domaine ne fournit que le type et les paramètres.
enum NoticeKind {
  gameNotRecovered,
  characterAssigned,
  myTimeoutAnswering,
  myTimeoutPlaying,
  opponentTimedOut,
  tooManyConnections,
  serverFull,
  myWrongGuess,
  opponentWrongGuess,
  opponentDisconnected,
  opponentReconnected,
  opponentLeftGame,
  opponentLeftRoom,
  opponentWantsRematch,
  serverMessage,
  reportSent,
  reportLimit,
  playerBlocked,
}

enum NoticeSeverity { info, success, warning, error }

class GameNotice {
  const GameNotice(this.kind, this.severity, {this.text, this.number});
  final NoticeKind kind;
  final NoticeSeverity severity;

  /// Nom de personnage ou message du serveur (déjà en français).
  final String? text;

  /// Secondes de grâce, etc.
  final int? number;
}

/// Effets que le contrôleur doit exécuter après un événement.
sealed class GameEffect {
  const GameEffect();
}

class PersistSessionToken extends GameEffect {
  const PersistSessionToken(this.token);
  final String token;
}

class PersistBlockedPlayers extends GameEffect {
  const PersistBlockedPlayers(this.players);
  final List<BlockedPlayer> players;
}

class PersistProfileToken extends GameEffect {
  const PersistProfileToken(this.token);
  final String token;
}

class SendEvent extends GameEffect {
  const SendEvent(this.event);
  final ClientEvent event;
}

class ShowNotice extends GameEffect {
  const ShowNotice(this.notice);
  final GameNotice notice;
}

/// Une réaction flottante à retirer de l'écran après sa durée de vie.
class ExpireReaction extends GameEffect {
  const ExpireReaction(this.reactionId);
  final int reactionId;
}

/// Une partie vient de se terminer EN DIRECT (pas une fin restaurée après
/// reconnexion) : sert aux Éclats, à la pub et aux analytics.
class GameFinished extends GameEffect {
  const GameFinished({required this.won, required this.reason, required this.mode});
  final bool won;
  final GameOverReason reason;
  final RoomMode? mode;
}

/// Une partie (manche) commence : file d'attente → sélection, ou revanche.
class RoundStarted extends GameEffect {
  const RoundStarted({required this.mode, required this.isRematch});
  final RoomMode mode;
  final bool isRematch;
}

class GameReduction {
  const GameReduction(this.state, [this.effects = const []]);
  final GameState state;
  final List<GameEffect> effects;
}

/// Nombre maximal de réactions flottantes affichées à la fois.
const int kMaxLiveReactions = 6;

/// Applique un événement serveur à l'état. Fonction PURE : aucune E/S, l'heure
/// et les identifiants sont fournis par l'appelant. Reproduit fidèlement les
/// gestionnaires de `GameContext.tsx` du client web.
GameReduction reduceGameEvent(
  GameState s,
  ServerEvent event, {
  required DateTime now,
  required String Function() newLogId,
  required int Function() newReactionId,
}) {
  GameReduction only(GameState next) => GameReduction(next);
  GameNotice notice(NoticeKind k, NoticeSeverity sev, {String? text, int? number}) =>
      GameNotice(k, sev, text: text, number: number);

  switch (event) {
    case ConnectedEvent():
      return only(s.copyWith(isConnected: true, hasConnectedOnce: true, connectionReplaced: false));

    case DisconnectedEvent():
      return only(s.copyWith(isConnected: false, connectionReplaced: event.byServer ? true : null));

    case ConnectErrorEvent(:final message):
      if (event.appOutdated) {
        // Ne pas réessayer : le joueur doit mettre l'app à jour.
        return only(s.copyWith(appOutdatedMessage: event.userMessage ?? ''));
      }
      if (message == 'too_many_connections') {
        return GameReduction(s, [ShowNotice(notice(NoticeKind.tooManyConnections, NoticeSeverity.error))]);
      }
      if (message == 'server_full') {
        return GameReduction(s, [ShowNotice(notice(NoticeKind.serverFull, NoticeSeverity.error))]);
      }
      return only(s);

    case SessionEvent(:final token, :final playerId):
      return GameReduction(s.copyWith(myPlayerId: playerId), [PersistSessionToken(token)]);

    case ProfileEvent(:final token):
      return GameReduction(s, [PersistProfileToken(token), const SendEvent(GetMyStats())]);

    case MyStatsEvent(:final payload):
      return only(s.copyWith(myStats: payload));

    case RatingUpdateEvent(:final update):
      return GameReduction(s.copyWith(ratingUpdate: update), [const SendEvent(GetMyStats())]);

    case StateSyncEvent(:final room):
      if (room != null) return only(applySnapshot(s, room, now));
      if (s.phase == GamePhase.queue) {
        // Le serveur retire de la file les joueurs déconnectés : on se remet en file.
        return GameReduction(s, [SendEvent(JoinLobby(s.myName))]);
      }
      if (s.phase != GamePhase.home) {
        return GameReduction(
          s.resetGame().copyWith(phase: GamePhase.home),
          [ShowNotice(notice(NoticeKind.gameNotRecovered, NoticeSeverity.error))],
        );
      }
      return only(s);

    case InQueueEvent(:final position):
      return only(s.copyWith(phase: GamePhase.queue, queuePosition: position));

    case RoomCreatedEvent(:final code):
      return only(s.copyWith(phase: GamePhase.lobby, roomCode: code));

    case RoomJoinedEvent():
      return GameReduction(
        startNewRound(s.copyWith(roomCode: event.code, roomMode: event.mode), event.players, event.characters),
        [RoundStarted(mode: event.mode, isRematch: false)],
      );

    case RematchStartedEvent():
      return GameReduction(
        startNewRound(s.copyWith(roomMode: event.mode), event.players, event.characters),
        [RoundStarted(mode: event.mode, isRematch: true)],
      );

    case OpponentReadyEvent():
      return only(s.copyWith(opponentReady: true));

    case ReactionEvent(:final playerId, :final emoji):
      if (playerId != s.myPlayerId && s.reactionsMuted) return only(s);
      final id = newReactionId();
      final kept = s.reactions.length >= kMaxLiveReactions
          ? s.reactions.sublist(s.reactions.length - (kMaxLiveReactions - 1))
          : s.reactions;
      return GameReduction(
        s.copyWith(reactions: [...kept, LiveReaction(id: id, playerId: playerId, emoji: emoji)]),
        [ExpireReaction(id)],
      );

    case TimerEvent(:final payload):
      return only(s.copyWith(timer: TurnTimer.fromPayload(payload, now)));

    case CharacterAssignedEvent(:final characterId):
      return GameReduction(s.copyWith(myCharacterId: characterId), [
        ShowNotice(notice(NoticeKind.characterAssigned, NoticeSeverity.info,
            text: s.characterById(characterId)?.name ?? '?')),
      ]);

    case TurnTimeoutEvent():
      final mine = event.playerId == s.myPlayerId;
      return GameReduction(
        s.copyWith(
          pendingQuestion: null,
          awaitingAnswerFor: null,
          gameLog: [...s.gameLog, TimeoutEntry(id: newLogId(), playerId: event.playerId)],
          players: [for (final p in s.players) p.id == event.playerId ? p.copyWith(lives: event.lives) : p],
          currentTurnId: event.currentTurnPlayerId,
        ),
        [
          ShowNotice(mine
              ? notice(event.whileAnswering ? NoticeKind.myTimeoutAnswering : NoticeKind.myTimeoutPlaying,
                  NoticeSeverity.error)
              : notice(NoticeKind.opponentTimedOut, NoticeSeverity.success)),
        ],
      );

    case GameStartEvent():
      return only(s.copyWith(
        phase: GamePhase.playing,
        currentTurnId: event.currentTurnPlayerId,
        players: event.players,
      ));

    case QuestionAskedEvent(:final question):
      return only(s.copyWith(pendingQuestion: question));

    case AwaitingAnswerEvent(:final question):
      return only(s.copyWith(awaitingAnswerFor: question));

    case QuestionAnsweredEvent(:final entry, :final currentTurnPlayerId):
      final logged = QnaEntry(
        id: newLogId(),
        answer: entry.answer,
        askerId: entry.askerId,
        question: entry.question,
        verified: entry.verified,
        attribute: entry.attribute,
        value: entry.value,
      );
      return only(s.copyWith(
        pendingQuestion: null,
        awaitingAnswerFor: null,
        gameLog: [...s.gameLog, logged],
        currentTurnId: currentTurnPlayerId,
      ));

    case WrongGuessEvent():
      final mine = event.guesserId == s.myPlayerId;
      return GameReduction(
        s.copyWith(
          gameLog: [
            ...s.gameLog,
            GuessEntry(id: newLogId(), guesserId: event.guesserId, guessedCharacterId: event.guessedCharacterId),
          ],
          players: [for (final p in s.players) p.id == event.guesserId ? p.copyWith(lives: event.lives) : p],
          currentTurnId: event.currentTurnPlayerId,
        ),
        [
          ShowNotice(mine
              ? notice(NoticeKind.myWrongGuess, NoticeSeverity.error)
              : notice(NoticeKind.opponentWrongGuess, NoticeSeverity.success)),
        ],
      );

    case GameOverEvent():
      final next = s.copyWith(
        phase: GamePhase.ended,
        winnerId: event.winnerId,
        revealedOpponentCharacterId: event.opponentCharacterId,
        gameOverReason: event.reason,
        pendingQuestion: null,
        awaitingAnswerFor: null,
        rematchRequestedBy: null,
      );
      return GameReduction(next, [
        if (s.phase != GamePhase.ended)
          GameFinished(won: event.winnerId == s.myPlayerId, reason: event.reason, mode: s.roomMode),
      ]);

    case OpponentDisconnectedEvent(:final graceSeconds):
      return GameReduction(s.copyWith(opponentConnected: false), [
        if (s.phase != GamePhase.ended)
          ShowNotice(notice(NoticeKind.opponentDisconnected, NoticeSeverity.warning, number: graceSeconds)),
      ]);

    case OpponentReconnectedEvent():
      return GameReduction(s.copyWith(opponentConnected: true), [
        if (s.phase != GamePhase.ended) ShowNotice(notice(NoticeKind.opponentReconnected, NoticeSeverity.success)),
      ]);

    case OpponentLeftEvent():
      final base = s.copyWith(opponentLeft: true, rematchRequestedBy: null);
      if (s.phase == GamePhase.selection || s.phase == GamePhase.playing) {
        return GameReduction(
          base.copyWith(
            phase: GamePhase.ended,
            gameOverReason: GameOverReason.opponentLeft,
            winnerId: s.myPlayerId,
          ),
          [
            ShowNotice(notice(NoticeKind.opponentLeftGame, NoticeSeverity.error)),
            // Une victoire par abandon ne compte pas pour la pub / les Éclats
            // si la partie n'avait pas commencé.
            if (s.phase == GamePhase.playing)
              GameFinished(won: true, reason: GameOverReason.opponentLeft, mode: s.roomMode),
          ],
        );
      }
      if (s.phase == GamePhase.ended) {
        return GameReduction(base, [ShowNotice(notice(NoticeKind.opponentLeftRoom, NoticeSeverity.info))]);
      }
      return only(base);

    case RematchRequestedEvent(:final byPlayerId):
      return GameReduction(s.copyWith(rematchRequestedBy: byPlayerId), [
        if (byPlayerId != s.myPlayerId) ShowNotice(notice(NoticeKind.opponentWantsRematch, NoticeSeverity.info)),
      ]);

    case ServerErrorEvent(:final message):
      final backHome = s.phase == GamePhase.queue || s.phase == GamePhase.lobby;
      return GameReduction(
        backHome ? s.copyWith(phase: GamePhase.home) : s,
        [ShowNotice(notice(NoticeKind.serverMessage, NoticeSeverity.error, text: message))],
      );

    case PlayerReportedEvent(:final ok):
      return GameReduction(s, [
        ShowNotice(ok
            ? notice(NoticeKind.reportSent, NoticeSeverity.success)
            : notice(NoticeKind.reportLimit, NoticeSeverity.warning)),
      ]);

    case PlayerBlockedEvent(:final blockKey, :final name):
      final blocked = [
        for (final b in s.blockedPlayers)
          if (b.key != blockKey) b,
        BlockedPlayer(key: blockKey, name: name),
      ];
      return GameReduction(s.copyWith(blockedPlayers: blocked), [
        PersistBlockedPlayers(blocked),
        ShowNotice(notice(NoticeKind.playerBlocked, NoticeSeverity.info, text: name)),
      ]);

    case UnknownServerEvent():
      return only(s);
  }
}

/// Nouvelle manche (première partie ou revanche) : écran de sélection.
GameState startNewRound(GameState s, List<PlayerState> players, List<Character> characters) => s.copyWith(
      phase: GamePhase.selection,
      ratingUpdate: null,
      players: players,
      characters: characters,
      opponentReady: false,
      opponentConnected: true,
      opponentLeft: false,
      myCharacterId: null,
      myEliminatedIds: const [],
      currentTurnId: null,
      pendingQuestion: null,
      awaitingAnswerFor: null,
      gameLog: const [],
      winnerId: null,
      gameOverReason: null,
      revealedOpponentCharacterId: null,
      rematchRequestedBy: null,
    );

const Map<RoomPhase, GamePhase> _snapshotPhases = {
  RoomPhase.waiting: GamePhase.lobby,
  RoomPhase.selection: GamePhase.selection,
  RoomPhase.playing: GamePhase.playing,
  RoomPhase.ended: GamePhase.ended,
};

/// Reconstruit l'écran à partir de l'instantané envoyé à la reconnexion.
GameState applySnapshot(GameState s, RoomSnapshot room, DateTime now) => s.copyWith(
      phase: _snapshotPhases[room.phase],
      roomCode: room.code,
      roomMode: room.mode,
      queuePosition: null,
      players: room.players,
      characters: room.characters,
      myCharacterId: room.myCharacterId,
      myEliminatedIds: room.myEliminatedIds,
      opponentReady: room.opponentReady,
      opponentConnected: room.opponentConnected,
      opponentLeft: room.phase != RoomPhase.waiting && room.players.length < 2,
      currentTurnId: room.currentTurnPlayerId,
      pendingQuestion: room.pendingQuestion,
      awaitingAnswerFor: room.awaitingAnswerFor,
      gameLog: room.log,
      winnerId: room.winnerId,
      gameOverReason: room.gameOverReason,
      revealedOpponentCharacterId: room.opponentCharacterId,
      rematchRequestedBy: room.rematchRequestedBy,
      timer: TurnTimer.fromPayload(room.timer, now),
    );
