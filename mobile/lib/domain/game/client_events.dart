import '../models/character.dart';
import '../models/protocol_models.dart';

/// Événements envoyés au serveur (`ClientToServerEvents` de socket.ts).
/// [name] est le nom sur le fil, [payload] la charge utile JSON (null = aucune).
sealed class ClientEvent {
  const ClientEvent();
  String get name;
  Map<String, dynamic>? get payload => null;

  @override
  String toString() => 'ClientEvent($name, $payload)';
}

class JoinLobby extends ClientEvent {
  const JoinLobby(this.playerName);
  final String playerName;
  @override
  String get name => 'join_lobby';
  @override
  Map<String, dynamic> get payload => {'name': playerName};
}

class CreateRoom extends ClientEvent {
  const CreateRoom(this.playerName);
  final String playerName;
  @override
  String get name => 'create_room';
  @override
  Map<String, dynamic> get payload => {'name': playerName};
}

class PlayVsBot extends ClientEvent {
  const PlayVsBot(this.playerName, this.level);
  final String playerName;
  final BotLevel level;
  @override
  String get name => 'play_vs_bot';
  @override
  Map<String, dynamic> get payload => {'name': playerName, 'level': level.name};
}

class JoinRoom extends ClientEvent {
  const JoinRoom(this.code, this.playerName);
  final String code;
  final String playerName;
  @override
  String get name => 'join_room';
  @override
  Map<String, dynamic> get payload => {'code': code, 'name': playerName};
}

class LeaveRoom extends ClientEvent {
  const LeaveRoom();
  @override
  String get name => 'leave_room';
}

class SelectCharacter extends ClientEvent {
  const SelectCharacter(this.characterId);
  final String characterId;
  @override
  String get name => 'select_character';
  @override
  Map<String, dynamic> get payload => {'characterId': characterId};
}

class AskFreeQuestion extends ClientEvent {
  const AskFreeQuestion(this.question);
  final String question;
  @override
  String get name => 'ask_question';
  @override
  Map<String, dynamic> get payload => {'question': question};
}

class AskVerifiedQuestion extends ClientEvent {
  const AskVerifiedQuestion(this.attribute, this.value);
  final VerifiableAttribute attribute;
  final String value;
  @override
  String get name => 'ask_question';
  @override
  Map<String, dynamic> get payload => {'attribute': attribute.wire, 'value': value};
}

class AnswerQuestion extends ClientEvent {
  const AnswerQuestion(this.answer);
  final Answer answer;
  @override
  String get name => 'answer_question';
  @override
  Map<String, dynamic> get payload => {'answer': answer.name};
}

class MakeGuess extends ClientEvent {
  const MakeGuess(this.characterId);
  final String characterId;
  @override
  String get name => 'make_guess';
  @override
  Map<String, dynamic> get payload => {'characterId': characterId};
}

class SyncEliminations extends ClientEvent {
  const SyncEliminations(this.eliminatedIds);
  final List<String> eliminatedIds;
  @override
  String get name => 'sync_eliminations';
  @override
  Map<String, dynamic> get payload => {'eliminatedIds': eliminatedIds};
}

class RequestRematch extends ClientEvent {
  const RequestRematch();
  @override
  String get name => 'request_rematch';
}

class AcceptRematch extends ClientEvent {
  const AcceptRematch();
  @override
  String get name => 'accept_rematch';
}

class GetMyStats extends ClientEvent {
  const GetMyStats();
  @override
  String get name => 'get_my_stats';
}

class React extends ClientEvent {
  const React(this.emoji);
  final String emoji;
  @override
  String get name => 'react';
  @override
  Map<String, dynamic> get payload => {'emoji': emoji};
}

/// Motifs de signalement acceptés par le serveur (`report_player`).
enum ReportReason { insult, sexual, hate, spam, cheating, other }

/// Signale l'adversaire courant (ou celui qui vient de partir). Apple 1.2.
class ReportPlayer extends ClientEvent {
  const ReportPlayer(this.reason);
  final ReportReason reason;
  @override
  String get name => 'report_player';
  @override
  Map<String, dynamic> get payload => {'reason': reason.name};
}

/// Bloque l'adversaire courant : plus jamais apparié avec lui.
class BlockPlayer extends ClientEvent {
  const BlockPlayer();
  @override
  String get name => 'block_player';
}

/// Refuser (ou non) les questions libres des adversaires.
class SetVerifiedOnly extends ClientEvent {
  const SetVerifiedOnly(this.enabled);
  final bool enabled;
  @override
  String get name => 'set_verified_only';
  @override
  Map<String, dynamic> get payload => {'enabled': enabled};
}
