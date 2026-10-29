import 'dart:async';

import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../config/app_config.dart';
import '../../domain/game/client_events.dart';
import '../../domain/game/server_events.dart';

/// Données d'authentification envoyées à chaque (re)connexion : le jeton de
/// session (rend sa place au joueur) et le jeton de profil (statistiques).
typedef HandshakeAuth = Map<String, Object?> Function();

/// Connexion temps réel au serveur de jeu. Interface pour pouvoir la remplacer
/// par un faux dans les tests.
abstract class GameSocket {
  Stream<ServerEvent> get events;
  bool get isConnected;

  /// (Re)connecte. Sans effet si déjà connecté.
  void connect();

  /// Ferme la connexion (les parties restent réservées 45 s côté serveur).
  void disconnect();

  /// Coupe et rouvre la connexion avec le jeton courant (retour d'arrière-plan,
  /// « Reprendre ici » après une prise de contrôle par un autre appareil).
  void reconnect();

  void send(ClientEvent event);
  Future<void> dispose();
}

/// Implémentation Socket.IO conforme au serveur existant :
/// chemin `/api/socket.io`, auth `{token, profile}` relue à chaque connexion.
class SocketIoGameSocket implements GameSocket {
  SocketIoGameSocket({
    required String baseUrl,
    required HandshakeAuth auth,
    Map<String, String>? extraHeaders,
    List<String> transports = const ['websocket', 'polling'],
  }) {
    final options = io.OptionBuilder()
        .setPath(AppConfig.socketPath)
        .setTransports(transports)
        .disableAutoConnect()
        .enableForceNew()
        .enableReconnection()
        .setReconnectionDelay(1000)
        .setReconnectionDelayMax(5000)
        // Relue à chaque tentative : un jeton reçu après la 1re connexion sert
        // dès la reconnexion suivante.
        .setAuthFn((callback) {
      final values = auth();
      callback({
        for (final e in values.entries)
          if (e.value != null) e.key: e.value,
      });
    });
    if (extraHeaders != null && extraHeaders.isNotEmpty) options.setExtraHeaders(extraHeaders);

    _socket = io.io(baseUrl, options.build());
    _socket.onConnect((_) => _add(const ConnectedEvent()));
    _socket.onDisconnect((reason) => _add(DisconnectedEvent('$reason')));
    _socket.onConnectError((err) => _add(_connectError(err)));
    _socket.onAny((event, [data]) => _add(ServerEvent.decode(event, data)));
  }

  late final io.Socket _socket;
  final _controller = StreamController<ServerEvent>.broadcast();

  void _add(ServerEvent e) {
    if (!_controller.isClosed) _controller.add(e);
  }

  /// Refus du serveur : `{message, data}` (ex. `app_outdated` avec le texte à afficher).
  static ConnectErrorEvent _connectError(Object? err) {
    if (err is Map) {
      final data = err['data'];
      return ConnectErrorEvent(
        '${err['message']}',
        userMessage: data is Map ? data['message'] as String? : null,
        minVersion: data is Map ? data['minVersion'] as String? : null,
      );
    }
    return ConnectErrorEvent('$err');
  }

  @override
  Stream<ServerEvent> get events => _controller.stream;

  @override
  bool get isConnected => _socket.connected;

  @override
  void connect() {
    if (!_socket.connected) _socket.connect();
  }

  @override
  void disconnect() => _socket.disconnect();

  @override
  void reconnect() {
    _socket.disconnect();
    _socket.connect();
  }

  @override
  void send(ClientEvent event) {
    final payload = event.payload;
    if (payload == null) {
      _socket.emit(event.name);
    } else {
      _socket.emit(event.name, payload);
    }
  }

  @override
  Future<void> dispose() async {
    _socket.dispose();
    await _controller.close();
  }
}
