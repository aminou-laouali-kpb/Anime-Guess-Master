import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:purchases_flutter/purchases_flutter.dart';

import '../../domain/monetization/products.dart';
import 'purchases_service.dart';

/// Implémentation RevenueCat (`purchases_flutter`). La clé publique est fournie
/// par `--dart-define=REVENUECAT_APPLE_KEY=...` / `REVENUECAT_GOOGLE_KEY=...`.
///
/// TODO(RevenueCat) : créer dans le tableau de bord les produits de
/// MONETISATION_SPEC §3.1 et les droits `no_ads` / `plus`, puis le webhook
/// vers `POST /api/webhooks/revenuecat`.
class RevenueCatPurchasesService implements PurchasesService {
  RevenueCatPurchasesService({required this.apiKey});

  final String apiKey;
  bool _configured = false;
  final Map<String, StoreProduct> _products = {};

  @override
  bool get isAvailable => _configured;

  @override
  Future<void> initialize({String? appUserId}) async {
    if (_configured || apiKey.isEmpty) return;
    if (kDebugMode) await Purchases.setLogLevel(LogLevel.debug);
    final config = PurchasesConfiguration(apiKey)..appUserID = appUserId;
    await Purchases.configure(config);
    _configured = true;
  }

  @override
  Future<Map<String, String>> loadPrices(List<ShopProduct> products) async {
    if (!_configured) return const {};
    try {
      final found = await Purchases.getProducts(
        products.map((p) => p.id).toList(),
        productCategory: ProductCategory.nonSubscription,
      );
      for (final p in found) {
        _products[p.identifier] = p;
      }
      return {for (final p in found) p.identifier: p.priceString};
    } on PlatformException {
      return const {};
    }
  }

  @override
  Future<PurchaseOutcome> purchase(ShopProduct product) async {
    if (!_configured) return const PurchaseOutcome(PurchaseStatus.unavailable);
    var storeProduct = _products[product.id];
    if (storeProduct == null) {
      await loadPrices([product]);
      storeProduct = _products[product.id];
    }
    if (storeProduct == null) return const PurchaseOutcome(PurchaseStatus.unavailable, errorCode: 'product_not_found');
    try {
      final result = await Purchases.purchase(PurchaseParams.storeProduct(storeProduct));
      return PurchaseOutcome(
        PurchaseStatus.success,
        entitlements: result.customerInfo.entitlements.active.keys.toSet(),
      );
    } on PlatformException catch (e) {
      final code = PurchasesErrorHelper.getErrorCode(e);
      return PurchaseOutcome(
        switch (code) {
          PurchasesErrorCode.purchaseCancelledError => PurchaseStatus.cancelled,
          PurchasesErrorCode.paymentPendingError => PurchaseStatus.pending,
          _ => PurchaseStatus.failed,
        },
        errorCode: code.name,
      );
    }
  }

  @override
  Future<RestoreOutcome> restore() async {
    if (!_configured) return const RestoreOutcome(success: false);
    try {
      final info = await Purchases.restorePurchases();
      return RestoreOutcome(
        success: true,
        entitlements: info.entitlements.active.keys.toSet(),
        ownedProductIds: info.allPurchasedProductIdentifiers.toSet(),
      );
    } on PlatformException {
      return const RestoreOutcome(success: false);
    }
  }

  @override
  Future<Set<String>> activeEntitlements() async {
    if (!_configured) return const {};
    try {
      final info = await Purchases.getCustomerInfo();
      return info.entitlements.active.keys.toSet();
    } on PlatformException {
      return const {};
    }
  }
}
