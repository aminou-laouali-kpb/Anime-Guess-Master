import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../data/api/api_client.dart';
import '../data/monetization/admob_ads_service.dart';
import '../data/monetization/ads_service.dart';
import '../data/monetization/analytics_service.dart';
import '../data/monetization/purchases_service.dart';
import '../data/monetization/revenuecat_purchases_service.dart';
import '../data/monetization/wallet_repository.dart';
import '../data/socket/game_socket.dart';
import '../data/storage/key_value_store.dart';
import '../domain/monetization/ad_config.dart';
import '../domain/monetization/ad_policy.dart';

// Injection de dépendances. Chaque service est un provider surchargeable :
// `main.dart` branche les vraies implémentations, les tests des faux.

final appConfigProvider = Provider<AppConfig>((ref) => AppConfig.fromEnvironment());

/// Doit être surchargé (ouvert de façon asynchrone dans `main`).
final keyValueStoreProvider = Provider<KeyValueStore>((ref) => InMemoryStore());

/// Horloge injectable (tests des règles de fréquence, chronos).
final clockProvider = Provider<DateTime Function()>((ref) => DateTime.now);

final gameSocketProvider = Provider<GameSocket>((ref) {
  final config = ref.watch(appConfigProvider);
  final store = ref.watch(keyValueStoreProvider);
  final socket = SocketIoGameSocket(
    baseUrl: config.apiBaseUrl,
    // Contrat serveur : docs/mobile/SERVER_CHANGES.md §1.1. Relu à chaque
    // (re)connexion, donc toujours à jour (jetons, joueurs bloqués…).
    auth: () => mobileHandshake(store),
  );
  ref.onDispose(socket.dispose);
  return socket;
});

/// Champs `auth` du handshake Socket.IO.
Map<String, Object?> mobileHandshake(KeyValueStore store) {
  final platform = kIsWeb
      ? null
      : switch (defaultTargetPlatform) {
          TargetPlatform.iOS => 'ios',
          TargetPlatform.android => 'android',
          _ => null,
        };
  List<String> blockedKeys() {
    final raw = store.getString(StoreKeys.blockedPlayers);
    if (raw == null) return const [];
    try {
      return [
        for (final e in jsonDecode(raw) as List)
          if (e is Map && e['key'] is String) e['key'] as String,
      ].take(200).toList();
    } catch (_) {
      return const [];
    }
  }

  return {
    'client': 'mobile',
    'appVersion': AppConfig.appVersion,
    'platform': platform,
    'device': ensureInstallId(store),
    'token': store.getString(StoreKeys.sessionToken),
    'profile': store.getString(StoreKeys.profileToken),
    'blocked': blockedKeys(),
    'verifiedOnly': store.getString(StoreKeys.verifiedOnly) == '1',
  };
}

final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient(baseUrl: ref.watch(appConfigProvider).apiBaseUrl);
  ref.onDispose(client.close);
  return client;
});

final analyticsProvider = Provider<AnalyticsService>(
  (ref) => ref.watch(appConfigProvider).verboseAnalytics ? const LogAnalyticsService() : const NoopAnalyticsService(),
);

/// AdMob seulement sur Android/iOS ET si `--dart-define=ENABLE_ADMOB=true`.
final adsServiceProvider = Provider<AdsService>((ref) {
  final config = ref.watch(appConfigProvider);
  final mobile = !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android || defaultTargetPlatform == TargetPlatform.iOS);
  return config.enableAdMob && mobile ? AdMobAdsService() : FakeAdsService(showBannerPlaceholder: kDebugMode);
});

/// RevenueCat seulement sur Android/iOS avec une clé ; sinon boutique factice.
final purchasesServiceProvider = Provider<PurchasesService>((ref) {
  final config = ref.watch(appConfigProvider);
  if (kIsWeb) return FakePurchasesService();
  final key = switch (defaultTargetPlatform) {
    TargetPlatform.iOS => config.revenueCatAppleKey,
    TargetPlatform.android => config.revenueCatGoogleKey,
    _ => '',
  };
  return key.isEmpty ? FakePurchasesService() : RevenueCatPurchasesService(apiKey: key);
});

final walletRepositoryProvider = Provider<WalletRepository>(
  (ref) => LocalWalletRepository(ref.watch(keyValueStoreProvider)),
);

/// TODO(remote-config) : valeurs Firebase Remote Config.
final adConfigProvider = Provider<AdConfig>((ref) => const AdConfig());

final adPolicyProvider = Provider<AdPolicy>((ref) => AdPolicy(ref.watch(adConfigProvider)));
