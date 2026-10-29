// Modèles des routes « compte / boutique » du serveur
// (docs/mobile/SERVER_CHANGES.md §2, schémas dans lib/api-spec/openapi.yaml).

/// `GET /api/config`
class RemoteConfig {
  const RemoteConfig({this.minMobileVersion, this.features = const {}, this.values = const {}});

  final String? minMobileVersion;

  /// `stats`, `wallet`, `purchases`, `purchaseSync`, `adRewards`.
  final Map<String, bool> features;

  /// Clés Remote Config de MONETISATION_SPEC §8 (nombres ou booléens).
  final Map<String, Object> values;

  bool feature(String name) => features[name] ?? false;

  factory RemoteConfig.fromJson(Map<String, dynamic> json) {
    final f = json['features'];
    final v = json['remoteConfig'];
    return RemoteConfig(
      minMobileVersion: json['minMobileVersion'] as String?,
      features: f is Map ? {for (final e in f.entries) '${e.key}': e.value == true} : const {},
      values: v is Map
          ? {
              for (final e in v.entries)
                if (e.value is num || e.value is bool) '${e.key}': e.value as Object,
            }
          : const {},
    );
  }
}

/// `POST /api/me`
class RegisteredProfile {
  const RegisteredProfile({required this.playerId, required this.name, required this.shardsBalance, this.profileToken});
  final String playerId;
  final String name;
  final int shardsBalance;

  /// Renvoyé seulement si le profil a été créé sans jeton.
  final String? profileToken;

  factory RegisteredProfile.fromJson(Map<String, dynamic> json) => RegisteredProfile(
        playerId: json['playerId'] as String? ?? '',
        name: json['name'] as String? ?? '',
        shardsBalance: (json['shardsBalance'] as num?)?.toInt() ?? 0,
        profileToken: json['profileToken'] as String?,
      );
}

/// `GET /api/me/entitlements` (schéma `Account`).
class AccountSnapshot {
  const AccountSnapshot({
    required this.playerId,
    required this.name,
    required this.shardsBalance,
    required this.noAds,
    required this.entitlements,
    required this.ownedProductIds,
    required this.inventory,
    required this.equipped,
  });

  final String playerId;
  final String name;
  final int shardsBalance;
  final bool noAds;

  /// Droits actifs (`no_ads`, `plus`, `theme_<slug>`…).
  final Set<String> entitlements;
  final Set<String> ownedProductIds;
  final Set<String> inventory;

  /// Emplacement → objet équipé.
  final Map<String, String> equipped;

  factory AccountSnapshot.fromJson(Map<String, dynamic> json) {
    final ents = (json['entitlements'] as List? ?? const []).whereType<Map>();
    final eq = json['equipped'];
    return AccountSnapshot(
      playerId: json['playerId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      shardsBalance: (json['shardsBalance'] as num?)?.toInt() ?? 0,
      noAds: json['noAds'] == true,
      entitlements: {for (final e in ents) if (e['entitlement'] is String) e['entitlement'] as String},
      ownedProductIds: {for (final e in ents) if (e['productId'] is String) e['productId'] as String},
      inventory: {...(json['inventory'] as List? ?? const []).whereType<String>()},
      equipped: eq is Map ? {for (final e in eq.entries) if (e.value is String) '${e.key}': e.value as String} : const {},
    );
  }
}

/// Objet cosmétique du catalogue (`GET /api/shop/catalog`).
class CatalogItem {
  const CatalogItem({
    required this.id,
    required this.slot,
    required this.names,
    required this.priceShards,
    required this.visibleToOpponent,
    required this.featured,
  });

  final String id;

  /// `card_back`, `frame`, `reaction_pack`, `victory_fx`, `board`.
  final String slot;
  final Map<String, String> names;

  /// null : non vendu en Éclats (exclusif d'un pack).
  final int? priceShards;
  final bool visibleToOpponent;
  final bool featured;

  String nameFor(String languageCode) => names[languageCode] ?? names['fr'] ?? id;

  factory CatalogItem.fromJson(Map<String, dynamic> json) {
    final n = json['name'];
    return CatalogItem(
      id: json['id'] as String? ?? '',
      slot: json['slot'] as String? ?? '',
      names: n is Map ? {for (final e in n.entries) '${e.key}': '${e.value}'} : const {},
      priceShards: (json['priceShards'] as num?)?.toInt(),
      visibleToOpponent: json['visibleToOpponent'] == true,
      featured: json['featured'] == true,
    );
  }
}

/// `POST /api/me/ad-offers` : à obtenir AVANT d'afficher une vidéo récompensée.
class AdOffer {
  const AdOffer({
    required this.nonce,
    required this.rewardKey,
    required this.amount,
    required this.ssvUserId,
    required this.ssvCustomData,
  });

  final String nonce;
  final String rewardKey;
  final int amount;

  /// À passer à `ServerSideVerificationOptions(userId:, customData:)`.
  final String? ssvUserId;
  final String? ssvCustomData;

  factory AdOffer.fromJson(Map<String, dynamic> json) {
    final ssv = json['ssv'];
    return AdOffer(
      nonce: json['nonce'] as String? ?? '',
      rewardKey: json['rewardKey'] as String? ?? '',
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      ssvUserId: ssv is Map ? ssv['userId'] as String? : null,
      ssvCustomData: ssv is Map ? ssv['customData'] as String? : null,
    );
  }
}

enum ClaimStatus { credited, alreadyClaimed, pending, unknownOffer }

/// `POST /api/me/ad-rewards/claim`
class ClaimResult {
  const ClaimResult({required this.status, this.amount, this.shardsBalance});
  final ClaimStatus status;
  final int? amount;
  final int? shardsBalance;

  factory ClaimResult.fromJson(Map<String, dynamic> json) => ClaimResult(
        status: switch (json['status']) {
          'credited' => ClaimStatus.credited,
          'already_claimed' => ClaimStatus.alreadyClaimed,
          'pending' => ClaimStatus.pending,
          _ => ClaimStatus.unknownOffer,
        },
        amount: (json['amount'] as num?)?.toInt(),
        shardsBalance: (json['shardsBalance'] as num?)?.toInt(),
      );
}
