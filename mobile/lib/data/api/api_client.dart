import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../domain/models/character.dart';
import '../../domain/models/protocol_models.dart';

class ApiException implements Exception {
  ApiException(this.statusCode, this.message);
  final int statusCode;
  final String message;
  @override
  String toString() => 'ApiException($statusCode): $message';
}

/// Routes HTTP du serveur (`lib/api-spec/openapi.yaml`, base `/api`).
class ApiClient {
  ApiClient({required this.baseUrl, http.Client? client}) : _client = client ?? http.Client();

  final String baseUrl;
  final http.Client _client;
  static const _timeout = Duration(seconds: 10);

  Uri _uri(String path) => Uri.parse('$baseUrl/api$path');

  Future<Object?> _get(String path) async {
    final res = await _client.get(_uri(path), headers: {'Accept': 'application/json'}).timeout(_timeout);
    if (res.statusCode != 200) throw ApiException(res.statusCode, res.body);
    return jsonDecode(utf8.decode(res.bodyBytes));
  }

  /// `GET /api/healthz`
  Future<bool> health() async {
    final body = await _get('/healthz');
    return body is Map && body['status'] == 'ok';
  }

  /// `GET /api/characters` : tout le casting (noms, traits, portraits) vient du serveur.
  Future<List<Character>> characters() async => parseCharacters(await _get('/characters'));

  /// `GET /api/leaderboard` (503 sans base de données).
  Future<Leaderboard> leaderboard() async {
    final body = await _get('/leaderboard');
    if (body is! Map) throw ApiException(200, 'réponse inattendue');
    return Leaderboard.fromJson(Map<String, dynamic>.from(body));
  }

  void close() => _client.close();
}
