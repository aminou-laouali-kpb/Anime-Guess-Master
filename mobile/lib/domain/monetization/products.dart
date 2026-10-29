/// Catalogue des produits in-app de phase 1 (MONETISATION_SPEC §3.1).
/// Identifiants identiques sur l'App Store et Google Play.
enum ProductKind { nonConsumable, consumable }

class ShopProduct {
  const ShopProduct({
    required this.id,
    required this.kind,
    required this.fallbackPrice,
    this.shards = 0,
    this.entitlement,
  });

  final String id;
  final ProductKind kind;

  /// Prix TTC France de la spec, affiché seulement si le store ne répond pas
  /// (le prix réel, localisé, vient toujours du store).
  final String fallbackPrice;

  /// Éclats contenus (packs, pack de démarrage).
  final int shards;

  /// Droit RevenueCat débloqué (`no_ads`…).
  final String? entitlement;
}

class Products {
  const Products._();

  static const noAds = ShopProduct(
    id: 'animewho.noads',
    kind: ProductKind.nonConsumable,
    fallbackPrice: '3,99 €',
    entitlement: Entitlements.noAds,
  );
  static const starterPack = ShopProduct(
    id: 'animewho.starter_pack',
    kind: ProductKind.nonConsumable,
    fallbackPrice: '1,99 €',
    shards: 500,
  );
  static const shards100 = ShopProduct(
    id: 'animewho.shards_100',
    kind: ProductKind.consumable,
    fallbackPrice: '0,99 €',
    shards: 100,
  );
  static const shards550 = ShopProduct(
    id: 'animewho.shards_550',
    kind: ProductKind.consumable,
    fallbackPrice: '4,99 €',
    shards: 550,
  );
  static const shards1200 = ShopProduct(
    id: 'animewho.shards_1200',
    kind: ProductKind.consumable,
    fallbackPrice: '9,99 €',
    shards: 1200,
  );

  static const shardPacks = [shards100, shards550, shards1200];
  static const all = [noAds, starterPack, ...shardPacks];

  static ShopProduct? byId(String id) {
    for (final p in all) {
      if (p.id == id) return p;
    }
    return null;
  }
}

/// Droits RevenueCat (§3.1).
class Entitlements {
  const Entitlements._();
  static const noAds = 'no_ads';
  static const plus = 'plus';

  /// `no_ads` ou `plus` suppriment interstitiels et bannières.
  static bool removesAds(Set<String> active) => active.contains(noAds) || active.contains(plus);
}
