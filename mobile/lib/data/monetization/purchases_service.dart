import '../../domain/monetization/products.dart';

enum PurchaseStatus {
  success,
  cancelled,

  /// Paiement en attente (ex. carte prépayée, accord parental).
  pending,
  failed,

  /// Boutique non configurée (pas de clé RevenueCat, web…).
  unavailable,
}

class PurchaseOutcome {
  const PurchaseOutcome(this.status, {this.entitlements = const {}, this.errorCode});
  final PurchaseStatus status;

  /// Droits actifs après l'achat (selon RevenueCat).
  final Set<String> entitlements;
  final String? errorCode;
}

class RestoreOutcome {
  const RestoreOutcome({required this.success, this.entitlements = const {}, this.ownedProductIds = const {}});
  final bool success;
  final Set<String> entitlements;

  /// Produits non consommables retrouvés.
  final Set<String> ownedProductIds;
}

/// Achats intégrés derrière une interface : RevenueCat en vrai, factice par
/// défaut / en tests / sur le web.
///
/// Rappel (spec §5) : l'app n'est jamais la source de vérité. Le serveur
/// crédite Éclats et droits à partir des webhooks RevenueCat ; après un achat
/// l'app doit relire `GET /api/me/entitlements` (TODO serveur).
abstract class PurchasesService {
  /// [appUserId] : identifiant public du joueur (`players.id`), ou null.
  Future<void> initialize({String? appUserId});

  bool get isAvailable;

  /// Prix localisés par identifiant produit (vide si indisponible).
  Future<Map<String, String>> loadPrices(List<ShopProduct> products);

  Future<PurchaseOutcome> purchase(ShopProduct product);

  /// « Restaurer les achats » (exigé par Apple).
  Future<RestoreOutcome> restore();

  Future<Set<String>> activeEntitlements();

  /// Après la suppression du compte : oublie l'utilisateur RevenueCat.
  Future<void> logOut();
}

/// Boutique factice : achats instantanés, aucun paiement.
class FakePurchasesService implements PurchasesService {
  FakePurchasesService({this.nextStatus = PurchaseStatus.success});

  PurchaseStatus nextStatus;
  final Set<String> _entitlements = {};
  final Set<String> _owned = {};
  final List<String> purchased = [];

  @override
  Future<void> initialize({String? appUserId}) async => this.appUserId = appUserId;

  @override
  bool get isAvailable => true;

  @override
  Future<Map<String, String>> loadPrices(List<ShopProduct> products) async =>
      {for (final p in products) p.id: p.fallbackPrice};

  @override
  Future<PurchaseOutcome> purchase(ShopProduct product) async {
    if (nextStatus != PurchaseStatus.success) return PurchaseOutcome(nextStatus);
    purchased.add(product.id);
    if (product.entitlement != null) _entitlements.add(product.entitlement!);
    if (product.kind == ProductKind.nonConsumable) _owned.add(product.id);
    return PurchaseOutcome(PurchaseStatus.success, entitlements: {..._entitlements});
  }

  @override
  Future<RestoreOutcome> restore() async =>
      RestoreOutcome(success: true, entitlements: {..._entitlements}, ownedProductIds: {..._owned});

  @override
  Future<Set<String>> activeEntitlements() async => {..._entitlements};

  String? appUserId;

  @override
  Future<void> logOut() async {
    appUserId = null;
    _entitlements.clear();
    _owned.clear();
  }
}
