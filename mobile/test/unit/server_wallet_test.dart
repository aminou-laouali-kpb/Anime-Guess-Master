import 'dart:convert';

import 'package:animewho/application/monetization_controller.dart';
import 'package:animewho/data/api/account_api.dart';
import 'package:animewho/data/monetization/wallet_repository.dart';
import 'package:animewho/data/storage/key_value_store.dart';
import 'package:animewho/domain/monetization/ad_config.dart';
import 'package:animewho/domain/monetization/ad_policy.dart';
import 'package:animewho/domain/monetization/products.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import '../helpers/fakes.dart';

/// Faux serveur conforme à docs/mobile/SERVER_CHANGES.md §2.
class FakeServer {
  final requests = <http.Request>[];
  int balance = 100;
  bool noAds = false;
  int pendingClaims = 1;
  bool capReached = false;
  bool deleted = false;
  final inventory = <String>{};

  http.Response json(Object body, [int status = 200]) =>
      http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});

  Map<String, dynamic> account() => {
        'playerId': 'pub-1',
        'name': 'Moi',
        'shardsBalance': balance,
        'noAds': noAds,
        'entitlements': [
          if (noAds) {'entitlement': 'no_ads', 'productId': 'animewho.noads', 'expiresAt': null},
        ],
        'inventory': inventory.toList(),
        'equipped': {'card_back': 'card_back_neon'},
      };

  late final client = MockClient((req) async {
    requests.add(req);
    final auth = req.headers['authorization'];
    final path = req.url.path;
    if (path == '/api/config') {
      return json({
        'minMobileVersion': null,
        'features': {'stats': true, 'wallet': true, 'purchases': true, 'purchaseSync': false, 'adRewards': true},
        'remoteConfig': {'int_daily_cap': 2, 'rw_free_shards_amount': 40, 'banners_enabled': false},
      });
    }
    if (path == '/api/shop/catalog') {
      return json({
        'currency': 'shards',
        'items': [
          {'id': 'card_back_neon', 'slot': 'card_back', 'name': {'fr': 'Néon', 'en': 'Neon'}, 'priceShards': 300, 'visibleToOpponent': true, 'featured': true},
        ],
        'products': [],
      });
    }
    if (auth != 'Bearer ${'P' * 32}') return json({'error': 'missing_profile_token'}, 401);
    switch ('${req.method} $path') {
      case 'POST /api/me':
        return json({'playerId': 'pub-1', 'name': 'Moi', 'shardsBalance': balance, 'profileToken': null});
      case 'GET /api/me/entitlements':
        return json(account());
      case 'POST /api/me/sync-purchases':
        return json({'error': 'sync_not_configured'}, 503);
      case 'POST /api/me/ad-offers':
        if (capReached) return json({'error': 'daily_cap_reached'}, 429);
        final body = jsonDecode(req.body) as Map;
        return json({
          'nonce': 'n1',
          'rewardKey': body['rewardKey'],
          'amount': 40,
          'expiresAt': '2027-01-01T00:10:00Z',
          'ssv': {'userId': 'pub-1', 'customData': 'n1'},
        }, 201);
      case 'POST /api/me/ad-rewards/claim':
        if (pendingClaims-- > 0) return json({'status': 'pending'}, 202);
        balance += 40;
        return json({'status': 'credited', 'amount': 40, 'shardsBalance': balance});
      case 'POST /api/shop/buy':
        balance -= 300;
        inventory.add('card_back_neon');
        return json({'ok': true, 'shardsBalance': balance});
      case 'DELETE /api/me':
        deleted = true;
        return json({'deleted': true});
    }
    return json({'error': 'not_found'}, 404);
  });

  AccountApi api(InMemoryStore store) =>
      AccountApi(baseUrl: 'http://srv', profileToken: () => store.getString(StoreKeys.profileToken), client: client);
}

void main() {
  test('AccountApi : en-tête Bearer, config publique sans jeton, modèles', () async {
    final server = FakeServer();
    final store = InMemoryStore({StoreKeys.profileToken: 'P' * 32});
    final api = server.api(store);
    final config = await api.config();
    expect(config.feature('wallet'), isTrue);
    expect(server.requests.last.headers.containsKey('authorization'), isFalse);
    final cfg = AdConfig.fromRemote(config.values);
    expect(cfg.intDailyCap, 2);
    expect(cfg.rwFreeShardsAmount, 40);
    expect(cfg.bannersEnabled, isFalse);
    expect(cfg.intMinGamesLifetime, 4, reason: 'clé absente : défaut de la spec');
    final profile = await api.register(name: 'Moi');
    expect(profile.playerId, 'pub-1');
    expect(server.requests.last.headers['authorization'], 'Bearer ${'P' * 32}');
    final catalog = await api.catalog();
    expect(catalog.single.nameFor('fr'), 'Néon');
  });

  test('ServerWalletRepository : solde serveur, offre + réclamation (pending puis crédité), plafond', () async {
    final server = FakeServer();
    final store = InMemoryStore({StoreKeys.profileToken: 'P' * 32});
    final repo = ServerWalletRepository(server.api(store), LocalWalletRepository(store))
      ..claimRetryDelay = Duration.zero;
    var w = await repo.fetch();
    expect(w.balance, 100);
    expect(w.equipped['card_back'], 'card_back_neon');
    expect(repo.capabilities.serverBacked, isTrue);

    expect(await repo.prepareAdReward(AdPlacement.rwDoubleShards, amount: 10), isNull,
        reason: 'pas encore géré par le serveur');
    final offer = (await repo.prepareAdReward(AdPlacement.rwFreeShards, amount: 30))!;
    expect(offer.ssvCustomData, 'n1');
    final claimed = await repo.claimAdReward(AdPlacement.rwFreeShards, offer, now: DateTime(2027));
    expect(claimed.reward, 40);
    expect(claimed.wallet.balance, 140);

    server.capReached = true;
    expect(await repo.prepareAdReward(AdPlacement.rwFreeShards, amount: 30), isNull);

    server.noAds = true;
    w = await repo.applyPurchase(Products.noAds, entitlements: const {});
    expect(Entitlements.removesAds(w.entitlements), isTrue, reason: 'sync 503 → relecture du compte');

    w = await repo.buyItem('card_back_neon');
    expect(w.inventory, contains('card_back_neon'));
    await repo.deleteAccount();
    expect(server.deleted, isTrue);
  });

  test('contrôleur : bascule sur le serveur au démarrage, SSV transmis, suppression du compte', () async {
    final server = FakeServer();
    final h = TestHarness(stored: {StoreKeys.profileToken: 'P' * 32});
    h.accountApi = server.api(h.store);
    final c = h.container();
    addTearDown(c.dispose);
    final m = c.read(monetizationControllerProvider.notifier);
    await m.startup();
    final s = c.read(monetizationControllerProvider);
    expect(s.playerId, 'pub-1');
    expect(h.purchases.appUserId, 'pub-1', reason: 'appUserID RevenueCat = playerId');
    expect(s.capabilities.serverBacked, isTrue);
    expect(s.wallet.balance, 100);
    expect(s.catalog, hasLength(1));
    expect(m.bannerAllowed(AdPlacement.banHome, AdScreen.home), isFalse, reason: 'banners_enabled=false distant');
    expect(m.adConfig.intDailyCap, 2);

    server.pendingClaims = 0;
    expect(await m.watchFreeShards(), 40);
    expect(h.ads.ssvCustomData.single, 'n1');
    expect(c.read(monetizationControllerProvider).wallet.balance, 140);

    expect(await m.deleteAccount(), isTrue);
    expect(h.store.getString(StoreKeys.profileToken), isNull);
    expect(h.purchases.appUserId, isNull);
    expect(c.read(monetizationControllerProvider).playerId, isNull);
  });
}
