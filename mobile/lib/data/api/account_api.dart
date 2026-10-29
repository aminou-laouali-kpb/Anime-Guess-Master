import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../domain/models/account_models.dart';
import 'api_client.dart';

/// Erreur métier renvoyée par le serveur (`{ error: "code" }`).
class AccountApiException extends ApiException {
  AccountApiException(super.statusCode, super.message, this.code);

  /// `missing_profile_token`, `unknown_profile`, `daily_cap_reached`,
  /// `insufficient_shards`, `monetisation_disabled`, `sync_not_configured`…
  final String? code;
}

/// Routes compte / boutique / pub du serveur (docs/mobile/SERVER_CHANGES.md §2).
/// Authentification : `Authorization: Bearer <jeton de profil>` (pas de cookie).
class AccountApi {
  AccountApi({required this.baseUrl, required this.profileToken, http.Client? client})
      : _client = client ?? http.Client();

  final String baseUrl;

  /// Lu à chaque requête (le jeton peut arriver après le démarrage).
  final String? Function() profileToken;
  final http.Client _client;
  static const _timeout = Duration(seconds: 10);

  Map<String, String> _headers({bool auth = true, bool json = false}) {
    final token = profileToken();
    return {
      'Accept': 'application/json',
      if (json) 'Content-Type': 'application/json',
      if (auth && token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  Future<(int, Map<String, dynamic>)> _send(
    String method,
    String path, {
    Object? body,
    bool auth = true,
    Set<int> ok = const {200, 201},
  }) async {
    final request = http.Request(method, Uri.parse('$baseUrl/api$path'))
      ..headers.addAll(_headers(auth: auth, json: body != null));
    if (body != null) request.body = jsonEncode(body);
    final res = await http.Response.fromStream(await _client.send(request).timeout(_timeout));
    Map<String, dynamic> decoded = const {};
    if (res.bodyBytes.isNotEmpty) {
      try {
        final v = jsonDecode(utf8.decode(res.bodyBytes));
        if (v is Map) decoded = Map<String, dynamic>.from(v);
      } catch (_) {}
    }
    if (!ok.contains(res.statusCode)) {
      throw AccountApiException(res.statusCode, res.body, decoded['error'] as String?);
    }
    return (res.statusCode, decoded);
  }

  /// `GET /api/config` (public).
  Future<RemoteConfig> config() async => RemoteConfig.fromJson((await _send('GET', '/config', auth: false)).$2);

  /// `GET /api/shop/catalog` (public).
  Future<List<CatalogItem>> catalog() async {
    final (_, body) = await _send('GET', '/shop/catalog', auth: false);
    return (body['items'] as List? ?? const [])
        .whereType<Map>()
        .map((m) => CatalogItem.fromJson(Map<String, dynamic>.from(m)))
        .toList();
  }

  /// `POST /api/me` : à appeler au démarrage. Sans jeton, le serveur en crée un.
  Future<RegisteredProfile> register({String? name}) async =>
      RegisteredProfile.fromJson((await _send('POST', '/me', body: {if (name != null && name.isNotEmpty) 'name': name})).$2);

  /// `GET /api/me/entitlements`
  Future<AccountSnapshot> account() async => AccountSnapshot.fromJson((await _send('GET', '/me/entitlements')).$2);

  /// `POST /api/me/sync-purchases` : renvoie le compte à jour.
  Future<AccountSnapshot> syncPurchases() async {
    final (_, body) = await _send('POST', '/me/sync-purchases');
    return AccountSnapshot.fromJson(Map<String, dynamic>.from(body['account'] as Map? ?? const {}));
  }

  /// `POST /api/me/ad-offers` (429 `daily_cap_reached` → exception).
  Future<AdOffer> createAdOffer({required String adUnit, required String rewardKey}) async =>
      AdOffer.fromJson((await _send('POST', '/me/ad-offers', body: {'adUnit': adUnit, 'rewardKey': rewardKey})).$2);

  /// `POST /api/me/ad-rewards/claim` (200 crédité, 202 en attente, 404 offre inconnue).
  Future<ClaimResult> claimAdReward(String nonce) async =>
      ClaimResult.fromJson((await _send('POST', '/me/ad-rewards/claim', body: {'nonce': nonce}, ok: {200, 202, 404})).$2);

  /// `POST /api/shop/buy` : renvoie le nouveau solde.
  Future<int> buyItem(String itemId) async {
    final (_, body) = await _send('POST', '/shop/buy', body: {'itemId': itemId});
    return (body['shardsBalance'] as num?)?.toInt() ?? 0;
  }

  /// `POST /api/me/equip` (itemId null = déséquiper).
  Future<AccountSnapshot> equip(String slot, String? itemId) async =>
      AccountSnapshot.fromJson((await _send('POST', '/me/equip', body: {'slot': slot, 'itemId': itemId})).$2);

  /// `DELETE /api/me` : suppression du compte (Apple 5.1.1(v)).
  Future<void> deleteProfile() => _send('DELETE', '/me');

  void close() => _client.close();
}
