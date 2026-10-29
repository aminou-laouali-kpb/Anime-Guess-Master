import 'dart:async';

import 'package:animewho/application/providers.dart';
import 'package:animewho/data/api/account_api.dart';
import 'package:animewho/data/monetization/ads_service.dart';
import 'package:animewho/data/monetization/analytics_service.dart';
import 'package:animewho/data/monetization/purchases_service.dart';
import 'package:animewho/data/socket/game_socket.dart';
import 'package:animewho/data/storage/key_value_store.dart';
import 'package:animewho/domain/game/client_events.dart';
import 'package:animewho/domain/game/server_events.dart';
import 'package:animewho/domain/models/character.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;

/// Faux socket : enregistre ce que l'app envoie, laisse le test simuler le serveur.
class FakeGameSocket implements GameSocket {
  final _controller = StreamController<ServerEvent>.broadcast(sync: true);
  final List<ClientEvent> sent = [];
  bool connected = false;
  int connectCalls = 0;
  int reconnectCalls = 0;

  /// Simule un message brut du serveur (passe par le décodeur réel).
  void receive(String name, [Object? data]) => _controller.add(ServerEvent.decode(name, data));

  void push(ServerEvent e) => _controller.add(e);

  List<T> sentOf<T extends ClientEvent>() => sent.whereType<T>().toList();

  @override
  Stream<ServerEvent> get events => _controller.stream;

  @override
  bool get isConnected => connected;

  @override
  void connect() {
    connectCalls++;
  }

  @override
  void disconnect() => connected = false;

  @override
  void reconnect() {
    reconnectCalls++;
  }

  @override
  void send(ClientEvent event) => sent.add(event);

  @override
  Future<void> dispose() => _controller.close();
}

Character fakeCharacter(
  String id, {
  String? name,
  String universe = 'Lycée Sakura',
  String gender = 'male',
  String hair = 'black',
  String eyes = 'blue',
  String age = 'teen',
  String species = 'human',
  String alignment = 'hero',
  String role = 'main',
}) =>
    Character(
      id: id,
      name: name ?? 'Perso $id',
      universe: universe,
      gender: gender,
      hairColor: hair,
      eyeColor: eyes,
      ageRange: age,
      species: species,
      alignment: alignment,
      role: role,
    );

/// Une grille de 24 personnages inventés, variés sur les traits.
List<Character> fakeBoard() => [
      for (var i = 0; i < 24; i++)
        fakeCharacter(
          'c$i',
          name: 'Héros ${String.fromCharCode(65 + i)}',
          universe: i.isEven ? 'Lycée Sakura' : 'Néo-Tokyo 2099',
          gender: i % 3 == 0 ? 'female' : 'male',
          hair: const ['black', 'pink', 'blonde', 'none'][i % 4],
          eyes: const ['blue', 'red', 'green'][i % 3],
          age: const ['child', 'teen', 'adult'][i % 3],
          alignment: const ['hero', 'villain', 'antihero', 'neutral'][i % 4],
          role: i % 5 == 0 ? 'main' : 'secondary',
        ),
    ];

List<Map<String, dynamic>> boardJson() => [for (final c in fakeBoard()) c.toJson()];

/// Conteneur Riverpod entièrement factice.
class TestHarness {
  TestHarness({DateTime Function()? clock, Map<String, String>? stored})
      : socket = FakeGameSocket(),
        store = InMemoryStore(stored),
        ads = FakeAdsService(),
        purchases = FakePurchasesService(),
        analytics = RecordingAnalyticsService(),
        now = clock ?? DateTime.now;

  final FakeGameSocket socket;
  final InMemoryStore store;
  final FakeAdsService ads;
  final FakePurchasesService purchases;
  final RecordingAnalyticsService analytics;
  final DateTime Function() now;

  List<Override> get overrides => [
        gameSocketProvider.overrideWithValue(socket),
        keyValueStoreProvider.overrideWithValue(store),
        adsServiceProvider.overrideWithValue(ads),
        purchasesServiceProvider.overrideWithValue(purchases),
        analyticsProvider.overrideWithValue(analytics),
        clockProvider.overrideWithValue(now),
        accountApiProvider.overrideWithValue(accountApi),
      ];

  /// null : aucune route compte (portefeuille local). Un test peut fournir une
  /// `AccountApi` branchée sur un `MockClient`.
  AccountApi? accountApi;

  ProviderContainer container() => ProviderContainer(overrides: overrides);
}
