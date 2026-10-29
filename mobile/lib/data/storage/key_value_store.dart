import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

/// Stockage clé/valeur synchrone en lecture (le jeton de session doit être lu
/// sans attendre au moment de chaque (re)connexion Socket.IO).
abstract class KeyValueStore {
  String? getString(String key);
  Future<void> setString(String key, String value);
  Future<void> remove(String key);
}

/// Implémentation persistante (`shared_preferences`).
class SharedPreferencesStore implements KeyValueStore {
  SharedPreferencesStore(this._prefs);
  final SharedPreferences _prefs;

  static Future<SharedPreferencesStore> open() async => SharedPreferencesStore(await SharedPreferences.getInstance());

  @override
  String? getString(String key) {
    try {
      return _prefs.getString(key);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> setString(String key, String value) async {
    try {
      await _prefs.setString(key, value);
    } catch (_) {
      // Stockage indisponible : le jeu marche, il ne survivra juste pas à un redémarrage.
    }
  }

  @override
  Future<void> remove(String key) async {
    try {
      await _prefs.remove(key);
    } catch (_) {}
  }
}

/// Implémentation en mémoire (tests, script d'intégration).
class InMemoryStore implements KeyValueStore {
  InMemoryStore([Map<String, String>? initial]) : values = {...?initial};
  final Map<String, String> values;

  @override
  String? getString(String key) => values[key];

  @override
  Future<void> setString(String key, String value) async => values[key] = value;

  @override
  Future<void> remove(String key) async => values.remove(key);
}

/// Clés persistées. Mêmes noms que le client web (localStorage) par cohérence.
class StoreKeys {
  const StoreKeys._();

  /// Jeton de session secret : rend sa place au joueur après une coupure.
  static const sessionToken = 'anime_who_session';

  /// Jeton de profil (statistiques, classement). TODO(spec §1) : le déplacer
  /// dans le trousseau sécurisé (`flutter_secure_storage`) avant la sortie.
  static const profileToken = 'anime_who_profile';
  static const playerName = 'anime_who_name';
  static const muteReactions = 'anime_who_mute_reactions';
  static const adHistory = 'anime_who_ad_history';
  static const wallet = 'anime_who_wallet_v1';

  /// Identifiant aléatoire d'installation (jamais l'identifiant publicitaire).
  static const installId = 'anime_who_install_id';

  /// Joueurs bloqués `[{key, name}]`, renvoyés au serveur à chaque connexion.
  static const blockedPlayers = 'anime_who_blocked';
  static const verifiedOnly = 'anime_who_verified_only';
}

/// Identifiant d'installation (22 caractères base64url), créé au premier appel.
String ensureInstallId(KeyValueStore store) {
  final existing = store.getString(StoreKeys.installId);
  if (existing != null && existing.length >= 8) return existing;
  final rnd = Random.secure();
  final id = base64Url.encode(List<int>.generate(16, (_) => rnd.nextInt(256))).replaceAll('=', '');
  store.setString(StoreKeys.installId, id);
  return id;
}
