import 'dart:convert';
import 'dart:io';

import 'package:animewho/application/game_controller.dart';
import 'package:animewho/application/providers.dart';
import 'package:animewho/config/app_config.dart';
import 'package:animewho/data/storage/key_value_store.dart';
import 'package:animewho/domain/game/client_events.dart';
import 'package:animewho/domain/game/game_reducer.dart';
import 'package:animewho/domain/game/game_state.dart';
import 'package:animewho/domain/game/server_events.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

void main() {
  group('handshake mobile (docs/mobile/SERVER_CHANGES.md §1.1)', () {
    test('champs envoyés, identifiant d’installation stable, joueurs bloqués', () {
      final store = InMemoryStore({
        StoreKeys.sessionToken: 'S' * 32,
        StoreKeys.profileToken: 'P' * 32,
        StoreKeys.verifiedOnly: '1',
        StoreKeys.blockedPlayers: jsonEncode([
          {'key': 'k1', 'name': 'Troll'},
        ]),
      });
      final auth = mobileHandshake(store);
      expect(auth['client'], 'mobile');
      expect(auth['appVersion'], AppConfig.appVersion);
      expect(auth['token'], 'S' * 32);
      expect(auth['profile'], 'P' * 32);
      expect(auth['blocked'], ['k1']);
      expect(auth['verifiedOnly'], isTrue);
      final device = auth['device'] as String;
      expect(RegExp(r'^[A-Za-z0-9_-]{8,128}$').hasMatch(device), isTrue);
      expect(mobileHandshake(store)['device'], device, reason: 'stable entre deux connexions');
    });

    test('appVersion identique à pubspec.yaml', () {
      final pubspec = File('pubspec.yaml').readAsStringSync();
      final version = RegExp(r'^version:\s*([0-9.]+)', multiLine: true).firstMatch(pubspec)!.group(1);
      expect(AppConfig.appVersion, version);
    });
  });

  group('protocole de modération', () {
    test('décodage et charges utiles', () {
      expect((ServerEvent.decode('player_reported', {'ok': false}) as PlayerReportedEvent).ok, isFalse);
      final b = ServerEvent.decode('player_blocked', {'blockKey': 'abc', 'name': 'Troll'}) as PlayerBlockedEvent;
      expect(b.blockKey, 'abc');
      expect((ServerEvent.decode('session', {'token': 't', 'playerId': 'p', 'client': 'mobile'}) as SessionEvent).client,
          'mobile');
      expect(const ReportPlayer(ReportReason.cheating).payload, {'reason': 'cheating'});
      expect(const BlockPlayer().name, 'block_player');
      expect(const SetVerifiedOnly(true).payload, {'enabled': true});
    });

    test('app_outdated : message du serveur affiché, pas de reconnexion automatique', () {
      final r = reduceGameEvent(
        const GameState(),
        const ConnectErrorEvent('app_outdated', userMessage: 'Mets l’app à jour.', minVersion: '1.2.0'),
        now: DateTime(2027),
        newLogId: () => '',
        newReactionId: () => 0,
      );
      expect(r.state.appOutdatedMessage, 'Mets l’app à jour.');

      final h = TestHarness();
      final c = h.container();
      addTearDown(c.dispose);
      final ctrl = c.read(gameControllerProvider.notifier);
      h.socket.push(const ConnectErrorEvent('app_outdated'));
      ctrl.onAppResumed(away: const Duration(minutes: 5));
      expect(h.socket.connectCalls, 1);
    });

    test('bloquer : clé persistée et renvoyée au serveur ; débloquer ; questions vérifiées', () {
      final h = TestHarness();
      final c = h.container();
      addTearDown(c.dispose);
      final ctrl = c.read(gameControllerProvider.notifier);
      ctrl.reportOpponent(ReportReason.insult);
      ctrl.blockOpponent();
      expect(h.socket.sent.map((e) => e.name), ['report_player', 'block_player']);
      h.socket.receive('player_blocked', {'blockKey': 'key-1', 'name': 'Troll'});
      expect(c.read(gameControllerProvider).blockedPlayers.single.name, 'Troll');
      expect(mobileHandshake(h.store)['blocked'], ['key-1']);
      ctrl.unblock('key-1');
      expect(mobileHandshake(h.store)['blocked'], isEmpty);
      ctrl.setVerifiedOnly(true);
      expect(h.socket.sentOf<SetVerifiedOnly>().single.enabled, isTrue);
      expect(mobileHandshake(h.store)['verifiedOnly'], isTrue);
      expect(h.analytics.names, containsAll(['report_player', 'block_player']));
    });
  });
}
