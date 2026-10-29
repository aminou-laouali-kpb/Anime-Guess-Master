import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/monetization/analytics_service.dart';
import '../data/socket/game_socket.dart';
import '../data/storage/key_value_store.dart';
import '../domain/game/client_events.dart';
import '../domain/game/game_reducer.dart';
import '../domain/game/game_state.dart';
import '../domain/game/server_events.dart';
import '../domain/models/character.dart';
import '../domain/models/protocol_models.dart';
import 'monetization_controller.dart';
import 'providers.dart';

/// Durée d'affichage d'une réaction flottante (comme le web).
const kReactionLifetime = Duration(milliseconds: 2600);

/// Au-delà de cette absence en arrière-plan, la connexion est rouverte au
/// retour même si elle semble ouverte (iOS laisse des sockets « zombies »).
const kForceReconnectAfterBackground = Duration(seconds: 30);

/// Contrôleur de jeu : relie la connexion temps réel, le réducteur pur
/// (`reduceGameEvent`) et le stockage local (jeton de session). Équivalent du
/// `GameProvider` du client web.
class GameController extends Notifier<GameState> {
  late GameSocket _socket;
  late KeyValueStore _store;
  late AnalyticsService _analytics;
  late DateTime Function() _now;
  StreamSubscription<ServerEvent>? _sub;
  final _notices = StreamController<GameNotice>.broadcast();
  final Map<int, Timer> _reactionTimers = {};
  int _logSeq = 0;
  int _reactionSeq = 0;
  DateTime? _roundStartedAt;
  DateTime? _queueJoinedAt;
  DateTime? _disconnectedAt;
  BotLevel? _botLevel;
  int _round = 0;

  /// Messages à afficher (toasts). L'interface les traduit.
  Stream<GameNotice> get notices => _notices.stream;

  /// Durée de la dernière partie (pour la règle « partie ≥ 60 s » des pubs).
  Duration? lastGameDuration;

  @override
  GameState build() {
    _socket = ref.watch(gameSocketProvider);
    _store = ref.watch(keyValueStoreProvider);
    _analytics = ref.watch(analyticsProvider);
    _now = ref.watch(clockProvider);
    _sub = _socket.events.listen(_onEvent);
    ref.onDispose(() {
      _sub?.cancel();
      for (final t in _reactionTimers.values) {
        t.cancel();
      }
      _notices.close();
    });
    final initial = GameState(
      myName: _store.getString(StoreKeys.playerName) ?? '',
      reactionsMuted: _store.getString(StoreKeys.muteReactions) == '1',
      verifiedOnly: _store.getString(StoreKeys.verifiedOnly) == '1',
      blockedPlayers: _loadBlocked(),
    );
    _analytics.logEvent(AnalyticsEvents.appOpen, {'source': 'organic'});
    _socket.connect();
    return initial;
  }

  List<BlockedPlayer> _loadBlocked() {
    final raw = _store.getString(StoreKeys.blockedPlayers);
    if (raw == null) return const [];
    try {
      return [for (final e in jsonDecode(raw) as List) ?BlockedPlayer.fromJson(e)];
    } catch (_) {
      return const [];
    }
  }

  // ── Événements serveur ───────────────────────────────────────────────────

  void _onEvent(ServerEvent event) {
    final previous = state;
    final now = _now();
    final result = reduceGameEvent(
      previous,
      event,
      now: now,
      newLogId: () => 'live-${++_logSeq}',
      newReactionId: () => ++_reactionSeq,
    );
    state = result.state;
    _track(previous, event, now);
    for (final effect in result.effects) {
      _run(effect, previous, now);
    }
  }

  void _run(GameEffect effect, GameState previous, DateTime now) {
    switch (effect) {
      case PersistSessionToken(:final token):
        unawaited(_store.setString(StoreKeys.sessionToken, token));
      case PersistBlockedPlayers(:final players):
        unawaited(_store.setString(StoreKeys.blockedPlayers, jsonEncode([for (final p in players) p.toJson()])));
      case PersistProfileToken(:final token):
        unawaited(_store.setString(StoreKeys.profileToken, token));
      case SendEvent(:final event):
        _socket.send(event);
      case ShowNotice(:final notice):
        if (!_notices.isClosed) _notices.add(notice);
      case ExpireReaction(:final reactionId):
        _reactionTimers[reactionId] = Timer(kReactionLifetime, () {
          _reactionTimers.remove(reactionId);
          state = state.copyWith(reactions: [for (final r in state.reactions) if (r.id != reactionId) r]);
        });
      case RoundStarted(:final mode, :final isRematch):
        _round = isRematch ? _round + 1 : 1;
        ref.read(monetizationControllerProvider.notifier).onRoundStarted();
        if (!isRematch && previous.phase == GamePhase.queue && _queueJoinedAt != null) {
          _analytics.logEvent(AnalyticsEvents.queueMatched, {'wait_s': now.difference(_queueJoinedAt!).inSeconds});
          _queueJoinedAt = null;
        }
        if (mode != RoomMode.bot) _botLevel = null;
      case GameFinished(:final won, :final reason, :final mode):
        final started = _roundStartedAt;
        lastGameDuration = started == null ? null : now.difference(started);
        _roundStartedAt = null;
        final myId = previous.myPlayerId;
        _analytics.logEvent(AnalyticsEvents.gameEnd, {
          'mode': mode?.name,
          'result': won ? 'win' : 'loss',
          'reason': reason.wire,
          'duration_s': lastGameDuration?.inSeconds,
          'questions': previous.gameLog.whereType<QnaEntry>().where((e) => e.askerId == myId).length,
        });
        unawaited(ref.read(monetizationControllerProvider.notifier).onGameFinished(
              gameRef: '${previous.roomCode}:$_round:$myId',
              mode: mode,
              won: won,
            ));
    }
  }

  /// Analytics liées aux transitions (sans effet sur l'état).
  void _track(GameState previous, ServerEvent event, DateTime now) {
    switch (event) {
      case DisconnectedEvent():
        _disconnectedAt ??= now;
      case StateSyncEvent(:final room):
        final since = _disconnectedAt;
        if (since != null) {
          _analytics.logEvent(AnalyticsEvents.reconnect, {
            'away_s': now.difference(since).inSeconds,
            'success': room != null || previous.phase == GamePhase.home || previous.phase == GamePhase.queue,
          });
          _disconnectedAt = null;
        }
      case GameStartEvent():
        _roundStartedAt = now;
        _analytics.logEvent(AnalyticsEvents.gameStart, {
          'mode': state.roomMode?.name,
          'bot_level': _botLevel?.name,
          'ranked': state.roomMode == RoomMode.quick && _round <= 1,
          'round': _round,
        });
      default:
        break;
    }
  }

  // ── Actions du joueur ────────────────────────────────────────────────────

  void setMyName(String name) {
    final clean = name.trim();
    unawaited(_store.setString(StoreKeys.playerName, clean));
    state = state.copyWith(myName: clean);
  }

  void _leaveQueueAnalytics({required bool fallbackBot}) {
    final joined = _queueJoinedAt;
    if (state.phase == GamePhase.queue && joined != null) {
      _analytics.logEvent(AnalyticsEvents.queueLeft, {
        'wait_s': _now().difference(joined).inSeconds,
        'fallback_bot': fallbackBot,
      });
    }
    _queueJoinedAt = null;
  }

  void joinQueue() {
    if (state.myName.isEmpty) return;
    state = state.resetGame().copyWith(phase: GamePhase.queue);
    _queueJoinedAt = _now();
    _analytics.logEvent(AnalyticsEvents.queueJoin, {'mode': 'quick'});
    _socket.send(JoinLobby(state.myName));
  }

  void joinRoom(String code) {
    if (state.myName.isEmpty) return;
    state = state.resetGame();
    _analytics.logEvent(AnalyticsEvents.roomJoin, {'theme': null, 'via': 'code'});
    _socket.send(JoinRoom(code.trim().toUpperCase(), state.myName));
  }

  void createPrivateRoom() {
    if (state.myName.isEmpty) return;
    state = state.resetGame().copyWith(phase: GamePhase.lobby);
    _analytics.logEvent(AnalyticsEvents.roomCreate, {'theme': null});
    _socket.send(CreateRoom(state.myName));
  }

  void playVsBot(BotLevel level) {
    if (state.myName.isEmpty) return;
    _leaveQueueAnalytics(fallbackBot: true);
    _botLevel = level;
    state = state.resetGame();
    _socket.send(PlayVsBot(state.myName, level));
  }

  void selectCharacter(String id) {
    state = state.copyWith(myCharacterId: id);
    _socket.send(SelectCharacter(id));
  }

  void askQuestion(String question) {
    _analytics.logEvent(AnalyticsEvents.questionAsk, {'type': 'free', 'attribute': null});
    _socket.send(AskFreeQuestion(question.trim()));
  }

  void askVerifiedQuestion(VerifiableAttribute attribute, String value) {
    _analytics.logEvent(AnalyticsEvents.questionAsk, {'type': 'verified', 'attribute': attribute.wire});
    _socket.send(AskVerifiedQuestion(attribute, value));
  }

  void answerQuestion(Answer answer) => _socket.send(AnswerQuestion(answer));

  void makeGuess(String characterId) => _socket.send(MakeGuess(characterId));

  void syncEliminations(Iterable<String> ids) {
    final list = ids.toList();
    state = state.copyWith(myEliminatedIds: list);
    _socket.send(SyncEliminations(list));
  }

  void requestRematch() {
    _analytics.logEvent(AnalyticsEvents.rematch, {'action': 'request'});
    _socket.send(const RequestRematch());
  }

  void acceptRematch() {
    _analytics.logEvent(AnalyticsEvents.rematch, {'action': 'accept'});
    _socket.send(const AcceptRematch());
  }

  void sendReaction(String emoji) {
    if (kReactions.contains(emoji)) _socket.send(React(emoji));
  }

  void setReactionsMuted(bool muted) {
    unawaited(_store.setString(StoreKeys.muteReactions, muted ? '1' : '0'));
    state = state.copyWith(
      reactionsMuted: muted,
      reactions: muted ? [for (final r in state.reactions) if (r.playerId == state.myPlayerId) r] : null,
    );
  }

  void refreshMyStats() => _socket.send(const GetMyStats());

  void logInviteShare(String channel) =>
      _analytics.logEvent(AnalyticsEvents.inviteShare, {'channel': channel});

  /// Quitte la partie ou la file et revient à l'accueil.
  void leaveGame() {
    _leaveQueueAnalytics(fallbackBot: false);
    _socket.send(const LeaveRoom());
    state = state.resetGame().copyWith(phase: GamePhase.home);
  }

  // ── Modération (Apple 1.2, spec §6) ──────────────────────────────────────

  void reportOpponent(ReportReason reason) {
    _analytics.logEvent(AnalyticsEvents.reportPlayer, {'reason': reason.name});
    _socket.send(ReportPlayer(reason));
  }

  void blockOpponent() {
    _analytics.logEvent(AnalyticsEvents.blockPlayer, {'reason': 'manual'});
    _socket.send(const BlockPlayer());
  }

  /// Débloquer : effectif à la prochaine connexion (la liste part dans `auth.blocked`).
  void unblock(String key) {
    final next = [for (final b in state.blockedPlayers) if (b.key != key) b];
    unawaited(_store.setString(StoreKeys.blockedPlayers, jsonEncode([for (final b in next) b.toJson()])));
    state = state.copyWith(blockedPlayers: next);
  }

  void setVerifiedOnly(bool enabled) {
    unawaited(_store.setString(StoreKeys.verifiedOnly, enabled ? '1' : '0'));
    state = state.copyWith(verifiedOnly: enabled);
    _socket.send(SetVerifiedOnly(enabled));
  }

  // ── Cycle de vie de l'app ────────────────────────────────────────────────

  /// Retour au premier plan : reprend la connexion (le jeton de session rend
  /// sa place au joueur ; le serveur la garde 45 s).
  void onAppResumed({required Duration away}) {
    if (state.connectionReplaced || state.appOutdatedMessage != null) return;
    if (!_socket.isConnected) {
      _socket.connect();
    } else if (away >= kForceReconnectAfterBackground) {
      _socket.reconnect();
    }
  }

  /// « Reprendre ici » après qu'un autre appareil a pris la session.
  void resumeHere() {
    state = state.copyWith(connectionReplaced: false);
    _socket.reconnect();
  }
}

final gameControllerProvider = NotifierProvider<GameController, GameState>(GameController.new);
