import '../models/character.dart';
import '../models/protocol_models.dart';

/// Événements reçus du serveur (`ServerToClientEvents` de socket.ts), plus les
/// événements de connexion propres à Socket.IO (connect, disconnect…).
sealed class ServerEvent {
  const ServerEvent();

  /// Décode un événement brut. Renvoie [UnknownServerEvent] pour un nom inconnu
  /// ou une charge utile mal formée : un message inattendu ne doit jamais faire
  /// planter l'app.
  static ServerEvent decode(String name, Object? data) {
    try {
      return _decode(name, _asMap(data)) ?? UnknownServerEvent(name, data);
    } catch (_) {
      return UnknownServerEvent(name, data);
    }
  }

  static Map<String, dynamic> _asMap(Object? data) {
    if (data is Map) return Map<String, dynamic>.from(data);
    // Certains clients enveloppent l'unique argument dans une liste.
    if (data is List && data.isNotEmpty && data.first is Map) {
      return Map<String, dynamic>.from(data.first as Map);
    }
    return const {};
  }

  static String _str(Map<String, dynamic> m, String k) {
    final v = m[k];
    if (v is! String) throw FormatException('champ $k manquant');
    return v;
  }

  static int _int(Map<String, dynamic> m, String k) {
    final v = m[k];
    if (v is! num) throw FormatException('champ $k manquant');
    return v.toInt();
  }

  static ServerEvent? _decode(String name, Map<String, dynamic> m) {
    switch (name) {
      case 'session':
        return SessionEvent(
          token: _str(m, 'token'),
          playerId: _str(m, 'playerId'),
          client: m['client'] as String?,
        );
      case 'profile':
        return ProfileEvent(token: _str(m, 'token'));
      case 'my_stats':
        return MyStatsEvent(MyStatsPayload.fromJson(m));
      case 'rating_update':
        return RatingUpdateEvent(RatingUpdate.fromJson(m));
      case 'state_sync':
        final room = m['room'];
        return StateSyncEvent(room is Map ? RoomSnapshot.fromJson(Map<String, dynamic>.from(room)) : null);
      case 'in_queue':
        return InQueueEvent(position: _int(m, 'position'));
      case 'room_created':
        return RoomCreatedEvent(code: _str(m, 'code'));
      case 'room_joined':
      case 'rematch_started':
        final players = parsePlayers(m['players']);
        final characters = parseCharacters(m['characters']);
        final mode = RoomMode.fromWire(m['mode']) ?? RoomMode.quick;
        final code = _str(m, 'code');
        return name == 'room_joined'
            ? RoomJoinedEvent(code: code, players: players, characters: characters, mode: mode)
            : RematchStartedEvent(code: code, players: players, characters: characters, mode: mode);
      case 'opponent_ready':
        return const OpponentReadyEvent();
      case 'game_start':
        return GameStartEvent(
          currentTurnPlayerId: _str(m, 'currentTurnPlayerId'),
          players: parsePlayers(m['players']),
        );
      case 'question_asked':
        return QuestionAskedEvent(question: _str(m, 'question'), askerId: m['askerId'] as String? ?? '');
      case 'awaiting_answer':
        return AwaitingAnswerEvent(question: _str(m, 'question'));
      case 'question_answered':
        final entry = GameLogEntry.fromJson({...m, 'type': 'qna'}, '');
        if (entry is! QnaEntry) throw const FormatException('qna invalide');
        return QuestionAnsweredEvent(entry: entry, currentTurnPlayerId: _str(m, 'currentTurnPlayerId'));
      case 'wrong_guess':
        return WrongGuessEvent(
          guesserId: _str(m, 'guesserId'),
          guessedCharacterId: _str(m, 'guessedCharacterId'),
          lives: _int(m, 'lives'),
          currentTurnPlayerId: _str(m, 'currentTurnPlayerId'),
        );
      case 'game_over':
        return GameOverEvent(
          winnerId: _str(m, 'winnerId'),
          reason: GameOverReason.fromWire(m['reason']) ?? GameOverReason.correctGuess,
          opponentCharacterId: m['opponentCharacterId'] as String?,
        );
      case 'opponent_left':
        return const OpponentLeftEvent();
      case 'timer':
        return TimerEvent(TimerPayload.fromJson(m));
      case 'reaction':
        return ReactionEvent(playerId: _str(m, 'playerId'), emoji: _str(m, 'emoji'));
      case 'character_assigned':
        return CharacterAssignedEvent(characterId: _str(m, 'characterId'));
      case 'turn_timeout':
        return TurnTimeoutEvent(
          playerId: _str(m, 'playerId'),
          lives: _int(m, 'lives'),
          currentTurnPlayerId: _str(m, 'currentTurnPlayerId'),
          whileAnswering: m['while'] == 'answering',
        );
      case 'opponent_disconnected':
        return OpponentDisconnectedEvent(graceSeconds: (m['graceSeconds'] as num?)?.toInt() ?? 45);
      case 'opponent_reconnected':
        return const OpponentReconnectedEvent();
      case 'rematch_requested':
        return RematchRequestedEvent(byPlayerId: _str(m, 'byPlayerId'));
      case 'error':
        return ServerErrorEvent(message: _str(m, 'message'));
      case 'player_reported':
        return PlayerReportedEvent(ok: m['ok'] == true);
      case 'player_blocked':
        return PlayerBlockedEvent(blockKey: _str(m, 'blockKey'), name: m['name'] as String? ?? '');
    }
    return null;
  }
}

// ── Événements de connexion (émis par la couche socket, pas par le jeu) ──────

class ConnectedEvent extends ServerEvent {
  const ConnectedEvent();
}

class DisconnectedEvent extends ServerEvent {
  const DisconnectedEvent(this.reason);
  final String reason;

  /// Le serveur a fermé la connexion (partie ouverte ailleurs) : Socket.IO ne
  /// se reconnecte pas tout seul dans ce cas.
  bool get byServer => reason == 'io server disconnect';
}

class ConnectErrorEvent extends ServerEvent {
  const ConnectErrorEvent(this.message, {this.userMessage, this.minVersion});

  /// `too_many_connections`, `server_full`, `app_outdated` ou un message technique.
  final String message;

  /// Texte à afficher fourni par le serveur (`err.data.message`), en français.
  final String? userMessage;

  /// Pour `app_outdated` : version minimale exigée.
  final String? minVersion;

  bool get appOutdated => message == 'app_outdated';
}

// ── Événements du jeu ───────────────────────────────────────────────────────

class SessionEvent extends ServerEvent {
  const SessionEvent({required this.token, required this.playerId, this.client});
  final String token;
  final String playerId;

  /// `mobile` si le serveur a reconnu l'app (handshake `client: "mobile"`).
  final String? client;
}

class ProfileEvent extends ServerEvent {
  const ProfileEvent({required this.token});
  final String token;
}

class MyStatsEvent extends ServerEvent {
  const MyStatsEvent(this.payload);
  final MyStatsPayload payload;
}

class RatingUpdateEvent extends ServerEvent {
  const RatingUpdateEvent(this.update);
  final RatingUpdate update;
}

class StateSyncEvent extends ServerEvent {
  const StateSyncEvent(this.room);
  final RoomSnapshot? room;
}

class InQueueEvent extends ServerEvent {
  const InQueueEvent({required this.position});
  final int position;
}

class RoomCreatedEvent extends ServerEvent {
  const RoomCreatedEvent({required this.code});
  final String code;
}

class RoomJoinedEvent extends ServerEvent {
  const RoomJoinedEvent({required this.code, required this.players, required this.characters, required this.mode});
  final String code;
  final List<PlayerState> players;
  final List<Character> characters;
  final RoomMode mode;
}

class RematchStartedEvent extends ServerEvent {
  const RematchStartedEvent({required this.code, required this.players, required this.characters, required this.mode});
  final String code;
  final List<PlayerState> players;
  final List<Character> characters;
  final RoomMode mode;
}

class OpponentReadyEvent extends ServerEvent {
  const OpponentReadyEvent();
}

class GameStartEvent extends ServerEvent {
  const GameStartEvent({required this.currentTurnPlayerId, required this.players});
  final String currentTurnPlayerId;
  final List<PlayerState> players;
}

class QuestionAskedEvent extends ServerEvent {
  const QuestionAskedEvent({required this.question, required this.askerId});
  final String question;
  final String askerId;
}

class AwaitingAnswerEvent extends ServerEvent {
  const AwaitingAnswerEvent({required this.question});
  final String question;
}

class QuestionAnsweredEvent extends ServerEvent {
  const QuestionAnsweredEvent({required this.entry, required this.currentTurnPlayerId});

  /// L'id de l'entrée est vide : le contrôleur lui en donne un unique.
  final QnaEntry entry;
  final String currentTurnPlayerId;
}

class WrongGuessEvent extends ServerEvent {
  const WrongGuessEvent({
    required this.guesserId,
    required this.guessedCharacterId,
    required this.lives,
    required this.currentTurnPlayerId,
  });
  final String guesserId;
  final String guessedCharacterId;
  final int lives;
  final String currentTurnPlayerId;
}

class GameOverEvent extends ServerEvent {
  const GameOverEvent({required this.winnerId, required this.reason, required this.opponentCharacterId});
  final String winnerId;
  final GameOverReason reason;
  final String? opponentCharacterId;
}

class OpponentLeftEvent extends ServerEvent {
  const OpponentLeftEvent();
}

class TimerEvent extends ServerEvent {
  const TimerEvent(this.payload);
  final TimerPayload payload;
}

class ReactionEvent extends ServerEvent {
  const ReactionEvent({required this.playerId, required this.emoji});
  final String playerId;
  final String emoji;
}

class CharacterAssignedEvent extends ServerEvent {
  const CharacterAssignedEvent({required this.characterId});
  final String characterId;
}

class TurnTimeoutEvent extends ServerEvent {
  const TurnTimeoutEvent({
    required this.playerId,
    required this.lives,
    required this.currentTurnPlayerId,
    required this.whileAnswering,
  });
  final String playerId;
  final int lives;
  final String currentTurnPlayerId;
  final bool whileAnswering;
}

class OpponentDisconnectedEvent extends ServerEvent {
  const OpponentDisconnectedEvent({required this.graceSeconds});
  final int graceSeconds;
}

class OpponentReconnectedEvent extends ServerEvent {
  const OpponentReconnectedEvent();
}

class RematchRequestedEvent extends ServerEvent {
  const RematchRequestedEvent({required this.byPlayerId});
  final String byPlayerId;
}

/// Événement `error` du serveur : message déjà rédigé en français.
class ServerErrorEvent extends ServerEvent {
  const ServerErrorEvent({required this.message});
  final String message;
}

/// Réponse à `report_player` (`ok: false` : limite de signalements atteinte).
class PlayerReportedEvent extends ServerEvent {
  const PlayerReportedEvent({required this.ok});
  final bool ok;
}

/// Réponse à `block_player` : la clé est à garder et à renvoyer dans
/// `auth.blocked` à chaque connexion (le serveur ne la garde pas).
class PlayerBlockedEvent extends ServerEvent {
  const PlayerBlockedEvent({required this.blockKey, required this.name});
  final String blockKey;
  final String name;
}

class UnknownServerEvent extends ServerEvent {
  const UnknownServerEvent(this.name, this.data);
  final String name;
  final Object? data;
}
