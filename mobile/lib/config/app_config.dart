import 'package:flutter/foundation.dart';

/// Configuration fixée à la compilation par `--dart-define`.
///
/// Exemples :
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.20:8080
///   flutter run --dart-define=ENABLE_ADMOB=true
///   flutter run --dart-define=REVENUECAT_GOOGLE_KEY=goog_xxx
class AppConfig {
  const AppConfig({
    required this.apiBaseUrl,
    required this.enableAdMob,
    required this.revenueCatAppleKey,
    required this.revenueCatGoogleKey,
    required this.verboseAnalytics,
  });

  /// Adresse du serveur de jeu (HTTP + Socket.IO), sans « / » final.
  final String apiBaseUrl;

  /// true : vraies publicités AdMob (IDs de TEST tant que les vrais ne sont pas
  /// renseignés dans `AdUnitIds`). false (défaut) : publicités factices.
  final bool enableAdMob;

  /// Clés publiques RevenueCat. Vides : boutique factice (aucun vrai achat).
  final String revenueCatAppleKey;
  final String revenueCatGoogleKey;

  /// Affiche les événements analytics dans la console.
  final bool verboseAnalytics;

  /// TODO(prod) : remplacer par l'adresse définitive du serveur (HTTPS).
  static const productionPlaceholderUrl = 'https://api.animewho.app';

  /// Adresse de la machine hôte vue depuis l'émulateur Android.
  static const androidEmulatorHostUrl = 'http://10.0.2.2:8080';

  static const _apiBaseUrlDefine = String.fromEnvironment('API_BASE_URL');

  static AppConfig fromEnvironment() => AppConfig(
        apiBaseUrl: resolveApiBaseUrl(
          define: _apiBaseUrlDefine,
          isDebug: kDebugMode,
          isWeb: kIsWeb,
          platform: defaultTargetPlatform,
        ),
        enableAdMob: const bool.fromEnvironment('ENABLE_ADMOB'),
        revenueCatAppleKey: const String.fromEnvironment('REVENUECAT_APPLE_KEY'),
        revenueCatGoogleKey: const String.fromEnvironment('REVENUECAT_GOOGLE_KEY'),
        verboseAnalytics: const bool.fromEnvironment('VERBOSE_ANALYTICS', defaultValue: kDebugMode),
      );

  /// Règle : `API_BASE_URL` si fourni ; sinon 10.0.2.2:8080 en debug Android
  /// (émulateur) ; sinon l'URL de production.
  static String resolveApiBaseUrl({
    required String define,
    required bool isDebug,
    required bool isWeb,
    required TargetPlatform platform,
  }) {
    final raw = define.trim().isNotEmpty
        ? define.trim()
        : (isDebug && !isWeb && platform == TargetPlatform.android)
            ? androidEmulatorHostUrl
            : productionPlaceholderUrl;
    return raw.endsWith('/') ? raw.substring(0, raw.length - 1) : raw;
  }

  /// Version envoyée au serveur (`auth.appVersion`, contrôle MIN_MOBILE_VERSION).
  /// Doit rester égale à `version:` de pubspec.yaml (vérifié par un test).
  static const appVersion = '1.0.0';

  /// Chemin Socket.IO du serveur (monté sous /api, voir server.ts).
  static const socketPath = '/api/socket.io';
}
