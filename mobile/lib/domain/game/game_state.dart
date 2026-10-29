import '../models/character.dart';
import '../models/protocol_models.dart';

/// Écran courant, piloté par le serveur (comme `GamePhase` du web).
enum GamePhase { home, queue, lobby, selection, playing, ended }

/// Échéance convertie en heure locale : le décalage d'horloge client/serveur
/// n'a donc aucune importance.
class TurnTimer {
  const TurnTimer({required this.actingPlayerId, required this.deadline});
  final String? actingPlayerId;
  final DateTime deadline;

  static TurnTimer? fromPayload(TimerPayload payload, DateTime now) => payload.msLeft == null
      ? null
      : TurnTimer(actingPlayerId: payload.actingPlayerId, deadline: now.add(Duration(milliseconds: payload.msLeft!)));

  /// Secondes restantes, arrondies au supérieur (comme le web).
  int secondsLeft(DateTime now) {
    final ms = deadline.difference(now).inMilliseconds;
    return ms <= 0 ? 0 : (ms / 1000).ceil();
  }
}

class LiveReaction {
  const LiveReaction({required this.id, required this.playerId, required this.emoji});
  final int id;
  final String playerId;
  final String emoji;
}

/// Joueur bloqué : la clé vient du serveur (`player_blocked`) et lui est
/// renvoyée à chaque connexion (`auth.blocked`).
class BlockedPlayer {
  const BlockedPlayer({required this.key, required this.name});
  final String key;
  final String name;

  Map<String, String> toJson() => {'key': key, 'name': name};
  static BlockedPlayer? fromJson(Object? raw) =>
      raw is Map && raw['key'] is String ? BlockedPlayer(key: raw['key'] as String, name: '${raw['name'] ?? ''}') : null;
}

const Object _unset = Object();

/// État complet d'une session de jeu côté app. Immuable : chaque événement
/// produit un nouvel état (voir game_reducer.dart).
class GameState {
  const GameState({
    this.phase = GamePhase.home,
    this.roomCode,
    this.roomMode,
    this.queuePosition,
    this.players = const [],
    this.characters = const [],
    this.myPlayerId,
    this.myCharacterId,
    this.myEliminatedIds = const [],
    this.opponentReady = false,
    this.opponentConnected = true,
    this.opponentLeft = false,
    this.currentTurnId,
    this.pendingQuestion,
    this.awaitingAnswerFor,
    this.gameLog = const [],
    this.winnerId,
    this.gameOverReason,
    this.revealedOpponentCharacterId,
    this.rematchRequestedBy,
    this.timer,
    this.reactions = const [],
    this.reactionsMuted = false,
    this.myStats,
    this.ratingUpdate,
    this.isConnected = false,
    this.hasConnectedOnce = false,
    this.connectionReplaced = false,
    this.myName = '',
    this.appOutdatedMessage,
    this.verifiedOnly = false,
    this.blockedPlayers = const [],
  });

  final GamePhase phase;
  final String? roomCode;
  final RoomMode? roomMode;
  final int? queuePosition;
  final List<PlayerState> players;
  final List<Character> characters;
  final String? myPlayerId;
  final String? myCharacterId;

  /// Restauré par le serveur après une reconnexion.
  final List<String> myEliminatedIds;
  final bool opponentReady;
  final bool opponentConnected;
  final bool opponentLeft;
  final String? currentTurnId;

  /// Question à laquelle je dois répondre.
  final String? pendingQuestion;

  /// Question que j'ai posée, en attente de réponse.
  final String? awaitingAnswerFor;
  final List<GameLogEntry> gameLog;
  final String? winnerId;
  final GameOverReason? gameOverReason;
  final String? revealedOpponentCharacterId;
  final String? rematchRequestedBy;
  final TurnTimer? timer;
  final List<LiveReaction> reactions;
  final bool reactionsMuted;
  final MyStatsPayload? myStats;
  final RatingUpdate? ratingUpdate;
  final bool isConnected;
  final bool hasConnectedOnce;

  /// Le serveur a fermé notre connexion (partie ouverte sur un autre appareil).
  final bool connectionReplaced;
  final String myName;

  /// Le serveur refuse cette version de l'app (`app_outdated`) : texte à afficher.
  final String? appOutdatedMessage;

  /// Refuser les questions libres des adversaires.
  final bool verifiedOnly;
  final List<BlockedPlayer> blockedPlayers;

  // ── Dérivés ──────────────────────────────────────────────────────────────

  PlayerState? get me => _find(players, (p) => p.id == myPlayerId);
  PlayerState? get opponent => _find(players, (p) => p.id != myPlayerId);
  Character? characterById(String? id) => id == null ? null : _find(characters, (c) => c.id == id);
  Character? get myCharacter => characterById(myCharacterId);
  Character? get revealedOpponentCharacter => characterById(revealedOpponentCharacterId);
  bool get isMyTurn => currentTurnId != null && currentTurnId == myPlayerId;

  /// Je peux poser une question ou deviner.
  bool get canAct => isMyTurn && awaitingAnswerFor == null;
  bool get isWinner => winnerId != null && winnerId == myPlayerId;
  bool get vsBot => roomMode == RoomMode.bot;
  bool get inRoom => phase != GamePhase.home && phase != GamePhase.queue;

  static T? _find<T>(List<T> items, bool Function(T) test) {
    for (final item in items) {
      if (test(item)) return item;
    }
    return null;
  }

  GameState copyWith({
    GamePhase? phase,
    Object? roomCode = _unset,
    Object? roomMode = _unset,
    Object? queuePosition = _unset,
    List<PlayerState>? players,
    List<Character>? characters,
    Object? myPlayerId = _unset,
    Object? myCharacterId = _unset,
    List<String>? myEliminatedIds,
    bool? opponentReady,
    bool? opponentConnected,
    bool? opponentLeft,
    Object? currentTurnId = _unset,
    Object? pendingQuestion = _unset,
    Object? awaitingAnswerFor = _unset,
    List<GameLogEntry>? gameLog,
    Object? winnerId = _unset,
    Object? gameOverReason = _unset,
    Object? revealedOpponentCharacterId = _unset,
    Object? rematchRequestedBy = _unset,
    Object? timer = _unset,
    List<LiveReaction>? reactions,
    bool? reactionsMuted,
    Object? myStats = _unset,
    Object? ratingUpdate = _unset,
    bool? isConnected,
    bool? hasConnectedOnce,
    bool? connectionReplaced,
    String? myName,
    Object? appOutdatedMessage = _unset,
    bool? verifiedOnly,
    List<BlockedPlayer>? blockedPlayers,
  }) {
    T pick<T>(Object? value, T current) => identical(value, _unset) ? current : value as T;
    return GameState(
      phase: phase ?? this.phase,
      roomCode: pick(roomCode, this.roomCode),
      roomMode: pick(roomMode, this.roomMode),
      queuePosition: pick(queuePosition, this.queuePosition),
      players: players ?? this.players,
      characters: characters ?? this.characters,
      myPlayerId: pick(myPlayerId, this.myPlayerId),
      myCharacterId: pick(myCharacterId, this.myCharacterId),
      myEliminatedIds: myEliminatedIds ?? this.myEliminatedIds,
      opponentReady: opponentReady ?? this.opponentReady,
      opponentConnected: opponentConnected ?? this.opponentConnected,
      opponentLeft: opponentLeft ?? this.opponentLeft,
      currentTurnId: pick(currentTurnId, this.currentTurnId),
      pendingQuestion: pick(pendingQuestion, this.pendingQuestion),
      awaitingAnswerFor: pick(awaitingAnswerFor, this.awaitingAnswerFor),
      gameLog: gameLog ?? this.gameLog,
      winnerId: pick(winnerId, this.winnerId),
      gameOverReason: pick(gameOverReason, this.gameOverReason),
      revealedOpponentCharacterId: pick(revealedOpponentCharacterId, this.revealedOpponentCharacterId),
      rematchRequestedBy: pick(rematchRequestedBy, this.rematchRequestedBy),
      timer: pick(timer, this.timer),
      reactions: reactions ?? this.reactions,
      reactionsMuted: reactionsMuted ?? this.reactionsMuted,
      myStats: pick(myStats, this.myStats),
      ratingUpdate: pick(ratingUpdate, this.ratingUpdate),
      isConnected: isConnected ?? this.isConnected,
      hasConnectedOnce: hasConnectedOnce ?? this.hasConnectedOnce,
      connectionReplaced: connectionReplaced ?? this.connectionReplaced,
      myName: myName ?? this.myName,
      appOutdatedMessage: pick(appOutdatedMessage, this.appOutdatedMessage),
      verifiedOnly: verifiedOnly ?? this.verifiedOnly,
      blockedPlayers: blockedPlayers ?? this.blockedPlayers,
    );
  }

  /// Oublie la partie en cours (garde connexion, pseudo, stats, préférences).
  GameState resetGame() => GameState(
        phase: phase,
        myPlayerId: myPlayerId,
        reactions: reactions,
        reactionsMuted: reactionsMuted,
        myStats: myStats,
        isConnected: isConnected,
        hasConnectedOnce: hasConnectedOnce,
        connectionReplaced: connectionReplaced,
        myName: myName,
        appOutdatedMessage: appOutdatedMessage,
        verifiedOnly: verifiedOnly,
        blockedPlayers: blockedPlayers,
      );
}
