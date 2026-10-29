import 'character.dart';

// Modèles partagés par le protocole temps réel. Ils reflètent exactement les
// types de `artifacts/anime-guess-who/src/lib/socket.ts` et de game-engine.ts.

enum RoomMode {
  quick,
  private,
  bot;

  static RoomMode? fromWire(Object? raw) => switch (raw) {
        'quick' => RoomMode.quick,
        'private' => RoomMode.private,
        'bot' => RoomMode.bot,
        _ => null,
      };
}

enum BotLevel { easy, normal, hard }

enum GameOverReason {
  correctGuess('correct_guess'),
  outOfLives('out_of_lives'),
  opponentLeft('opponent_left');

  const GameOverReason(this.wire);
  final String wire;

  static GameOverReason? fromWire(Object? raw) {
    for (final r in values) {
      if (r.wire == raw) return r;
    }
    return null;
  }
}

enum Answer {
  yes,
  no;

  static Answer? fromWire(Object? raw) => switch (raw) {
        'yes' => Answer.yes,
        'no' => Answer.no,
        _ => null,
      };
}

/// Doit correspondre à `REACTIONS` du moteur de jeu (le serveur refuse le reste).
const List<String> kReactions = ['👍', '😂', '😮', '😅', '🤔', '😱', '🔥', '👏'];

/// Vies au départ (MAX_LIVES côté serveur).
const int kMaxLives = 3;

class PlayerState {
  const PlayerState({required this.id, required this.name, required this.lives});

  final String id;
  final String name;
  final int lives;

  factory PlayerState.fromJson(Map<String, dynamic> json) => PlayerState(
        id: json['id'] as String? ?? '',
        name: json['name'] as String? ?? '',
        lives: (json['lives'] as num?)?.toInt() ?? kMaxLives,
      );

  PlayerState copyWith({int? lives}) => PlayerState(id: id, name: name, lives: lives ?? this.lives);
}

/// Entrée du journal de partie. [id] est local (clé d'affichage) : les entrées
/// restaurées après une reconnexion ont un id préfixé par `restored-`.
sealed class GameLogEntry {
  const GameLogEntry(this.id);
  final String id;

  bool get isRestored => id.startsWith('restored-');

  /// Lit une entrée telle que le serveur la stocke (`room.log`).
  static GameLogEntry? fromJson(Map<String, dynamic> json, String id) {
    switch (json['type']) {
      case 'qna':
        final answer = Answer.fromWire(json['answer']);
        if (answer == null) return null;
        return QnaEntry(
          id: id,
          answer: answer,
          askerId: json['askerId'] as String? ?? '',
          question: json['question'] as String?,
          verified: json['verified'] == true,
          attribute: VerifiableAttribute.fromWire(json['attribute']),
          value: json['value'] as String?,
        );
      case 'guess':
        return GuessEntry(
          id: id,
          guesserId: json['guesserId'] as String? ?? '',
          guessedCharacterId: json['guessedCharacterId'] as String? ?? '',
        );
      case 'timeout':
        return TimeoutEntry(id: id, playerId: json['playerId'] as String? ?? '');
    }
    return null;
  }
}

class QnaEntry extends GameLogEntry {
  const QnaEntry({
    required String id,
    required this.answer,
    required this.askerId,
    required this.question,
    required this.verified,
    required this.attribute,
    required this.value,
  }) : super(id);

  final Answer answer;
  final String askerId;

  /// Question libre (texte tapé), null pour une question vérifiée.
  final String? question;
  final bool verified;
  final VerifiableAttribute? attribute;
  final String? value;
}

class GuessEntry extends GameLogEntry {
  const GuessEntry({required String id, required this.guesserId, required this.guessedCharacterId}) : super(id);
  final String guesserId;
  final String guessedCharacterId;
}

class TimeoutEntry extends GameLogEntry {
  const TimeoutEntry({required String id, required this.playerId}) : super(id);
  final String playerId;
}

/// `actingPlayerId` : qui doit agir avant l'échéance (null = les deux joueurs).
class TimerPayload {
  const TimerPayload({required this.actingPlayerId, required this.msLeft});

  final String? actingPlayerId;
  final int? msLeft;

  factory TimerPayload.fromJson(Map<String, dynamic>? json) => TimerPayload(
        actingPlayerId: json?['actingPlayerId'] as String?,
        msLeft: (json?['msLeft'] as num?)?.toInt(),
      );
}

enum RoomPhase {
  waiting,
  selection,
  playing,
  ended;

  static RoomPhase fromWire(Object? raw) => switch (raw) {
        'selection' => RoomPhase.selection,
        'playing' => RoomPhase.playing,
        'ended' => RoomPhase.ended,
        _ => RoomPhase.waiting,
      };
}

/// Tout ce qu'il faut pour reconstruire l'écran après une reconnexion.
class RoomSnapshot {
  const RoomSnapshot({
    required this.code,
    required this.phase,
    required this.players,
    required this.characters,
    required this.myCharacterId,
    required this.myEliminatedIds,
    required this.opponentReady,
    required this.opponentConnected,
    required this.mode,
    required this.currentTurnPlayerId,
    required this.pendingQuestion,
    required this.awaitingAnswerFor,
    required this.log,
    required this.winnerId,
    required this.gameOverReason,
    required this.opponentCharacterId,
    required this.rematchRequestedBy,
    required this.timer,
  });

  final String code;
  final RoomPhase phase;
  final List<PlayerState> players;
  final List<Character> characters;
  final String? myCharacterId;
  final List<String> myEliminatedIds;
  final bool opponentReady;
  final bool opponentConnected;
  final RoomMode mode;
  final String? currentTurnPlayerId;
  final String? pendingQuestion;
  final String? awaitingAnswerFor;
  final List<GameLogEntry> log;
  final String? winnerId;
  final GameOverReason? gameOverReason;
  final String? opponentCharacterId;
  final String? rematchRequestedBy;
  final TimerPayload timer;

  factory RoomSnapshot.fromJson(Map<String, dynamic> json) {
    final rawLog = json['log'] is List ? json['log'] as List : const [];
    final log = <GameLogEntry>[];
    for (var i = 0; i < rawLog.length; i++) {
      final raw = rawLog[i];
      if (raw is Map) {
        final entry = GameLogEntry.fromJson(Map<String, dynamic>.from(raw), 'restored-$i');
        if (entry != null) log.add(entry);
      }
    }
    return RoomSnapshot(
      code: json['code'] as String? ?? '',
      phase: RoomPhase.fromWire(json['phase']),
      players: parsePlayers(json['players']),
      characters: parseCharacters(json['characters']),
      myCharacterId: json['myCharacterId'] as String?,
      myEliminatedIds: (json['myEliminatedIds'] as List?)?.whereType<String>().toList() ?? const [],
      opponentReady: json['opponentReady'] == true,
      opponentConnected: json['opponentConnected'] == true,
      mode: RoomMode.fromWire(json['mode']) ?? RoomMode.quick,
      currentTurnPlayerId: json['currentTurnPlayerId'] as String?,
      pendingQuestion: json['pendingQuestion'] as String?,
      awaitingAnswerFor: json['awaitingAnswerFor'] as String?,
      log: log,
      winnerId: json['winnerId'] as String?,
      gameOverReason: GameOverReason.fromWire(json['gameOverReason']),
      opponentCharacterId: json['opponentCharacterId'] as String?,
      rematchRequestedBy: json['rematchRequestedBy'] as String?,
      timer: TimerPayload.fromJson(json['timer'] is Map ? Map<String, dynamic>.from(json['timer'] as Map) : null),
    );
  }
}

List<PlayerState> parsePlayers(Object? raw) => raw is List
    ? raw.whereType<Map>().map((m) => PlayerState.fromJson(Map<String, dynamic>.from(m))).toList()
    : const [];

List<Character> parseCharacters(Object? raw) => raw is List
    ? raw.whereType<Map>().map((m) => Character.fromJson(Map<String, dynamic>.from(m))).toList()
    : const [];

class PlayerStats {
  const PlayerStats({
    required this.id,
    required this.name,
    required this.rating,
    required this.rank,
    required this.gamesPlayed,
    required this.rankedGames,
    required this.wins,
    required this.losses,
    required this.currentStreak,
    required this.bestStreak,
  });

  final String id;
  final String name;
  final int rating;
  final int? rank;
  final int gamesPlayed;
  final int rankedGames;
  final int wins;
  final int losses;
  final int currentStreak;
  final int bestStreak;

  int get winRatePercent => gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).round() : 0;

  factory PlayerStats.fromJson(Map<String, dynamic> json) {
    int n(String k) => (json[k] as num?)?.toInt() ?? 0;
    return PlayerStats(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      rating: n('rating'),
      rank: (json['rank'] as num?)?.toInt(),
      gamesPlayed: n('gamesPlayed'),
      rankedGames: n('rankedGames'),
      wins: n('wins'),
      losses: n('losses'),
      currentStreak: n('currentStreak'),
      bestStreak: n('bestStreak'),
    );
  }
}

class MyStatsPayload {
  const MyStatsPayload({required this.enabled, required this.minRankedGames, required this.stats});

  final bool enabled;
  final int minRankedGames;

  /// null jusqu'à la première partie terminée.
  final PlayerStats? stats;

  factory MyStatsPayload.fromJson(Map<String, dynamic> json) => MyStatsPayload(
        enabled: json['enabled'] == true,
        minRankedGames: (json['minRankedGames'] as num?)?.toInt() ?? 5,
        stats: json['stats'] is Map ? PlayerStats.fromJson(Map<String, dynamic>.from(json['stats'] as Map)) : null,
      );
}

class RatingUpdate {
  const RatingUpdate({required this.ranked, required this.rating, required this.delta});

  final bool ranked;
  final int rating;
  final int delta;

  factory RatingUpdate.fromJson(Map<String, dynamic> json) => RatingUpdate(
        ranked: json['ranked'] == true,
        rating: (json['rating'] as num?)?.toInt() ?? 0,
        delta: (json['delta'] as num?)?.toInt() ?? 0,
      );
}

class LeaderboardEntry {
  const LeaderboardEntry({
    required this.rank,
    required this.id,
    required this.name,
    required this.rating,
    required this.wins,
    required this.losses,
    required this.rankedGames,
  });

  final int rank;
  final String id;
  final String name;
  final int rating;
  final int wins;
  final int losses;
  final int rankedGames;

  factory LeaderboardEntry.fromJson(Map<String, dynamic> json) {
    int n(String k) => (json[k] as num?)?.toInt() ?? 0;
    return LeaderboardEntry(
      rank: n('rank'),
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      rating: n('rating'),
      wins: n('wins'),
      losses: n('losses'),
      rankedGames: n('rankedGames'),
    );
  }
}

class Leaderboard {
  const Leaderboard({required this.enabled, required this.minRankedGames, required this.entries});

  final bool enabled;
  final int minRankedGames;
  final List<LeaderboardEntry> entries;

  factory Leaderboard.fromJson(Map<String, dynamic> json) => Leaderboard(
        enabled: json['enabled'] == true,
        minRankedGames: (json['minRankedGames'] as num?)?.toInt() ?? 5,
        entries: (json['entries'] as List? ?? const [])
            .whereType<Map>()
            .map((m) => LeaderboardEntry.fromJson(Map<String, dynamic>.from(m)))
            .toList(),
      );
}
