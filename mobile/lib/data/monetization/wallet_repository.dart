import 'dart:async';
import 'dart:convert';

import '../../domain/models/account_models.dart';
import '../../domain/models/protocol_models.dart';
import '../../domain/monetization/ad_policy.dart';
import '../../domain/monetization/products.dart';
import '../../domain/monetization/wallet.dart';
import '../api/account_api.dart';
import '../storage/key_value_store.dart';

/// Ce que l'implémentation sait faire (le serveur n'a pas encore tout,
/// voir docs/mobile/SERVER_CHANGES.md §6 « Prochaines étapes »).
class WalletCapabilities {
  const WalletCapabilities({
    required this.gameRewards,
    required this.freeDailyChest,
    required this.cosmetics,
    required this.serverBacked,
  });

  /// Éclats de fin de partie (et donc « Doubler mes Éclats »).
  final bool gameRewards;

  /// Coffre quotidien gratuit (le coffre BONUS par vidéo passe par les ad-offers).
  final bool freeDailyChest;

  /// Catalogue cosmétique, achat en Éclats, équipement.
  final bool cosmetics;

  /// Solde et droits tenus par le serveur (source de vérité, spec §0.4).
  final bool serverBacked;
}

/// Solde d'Éclats, droits, cosmétiques et coffre quotidien. Découpé en
/// OPÉRATIONS calquées sur les routes serveur (SERVER_CHANGES.md §2.2).
abstract class WalletRepository {
  WalletCapabilities get capabilities;

  Future<WalletState> fetch();

  /// Éclats d'une partie terminée. [ref] identifie la partie (idempotence).
  Future<WalletState> creditGame({required String ref, required RoomMode? mode, required bool won, required DateTime now});

  /// Ouvre le coffre gratuit du jour. null si déjà ouvert ou non pris en charge.
  Future<({WalletState wallet, int reward, int streakDay})?> claimDailyChest(DateTime now);

  /// Avant une vidéo récompensée : nonce + options SSV. null si plafond atteint
  /// ou emplacement non pris en charge.
  Future<AdOffer?> prepareAdReward(AdPlacement placement, {required int amount});

  /// Après `onUserEarnedReward`. `reward` vaut 0 si le serveur n'a pas encore
  /// reçu la vérification AdMob (elle sera créditée plus tard, jamais perdue).
  Future<({WalletState wallet, int reward})> claimAdReward(AdPlacement placement, AdOffer offer, {required DateTime now});

  Future<WalletState> applyPurchase(ShopProduct product, {required Set<String> entitlements});
  Future<WalletState> applyRestore({required Set<String> entitlements, required Set<String> ownedProductIds});

  Future<List<CatalogItem>> catalog();
  Future<WalletState> buyItem(String itemId);
  Future<WalletState> equip(String slot, String? itemId);

  /// Supprime le compte (Apple 5.1.1(v)) et les données locales du portefeuille.
  Future<void> deleteAccount();
}

/// Implémentation LOCALE (factice / hors-ligne / tests / serveur sans base).
/// Pas sûre (modifiable par le joueur) : acceptable seulement tant que les
/// Éclats locaux ne s'échangent contre rien.
class LocalWalletRepository implements WalletRepository {
  LocalWalletRepository(this._store, {this.rewards = const ShardRewards()});

  final KeyValueStore _store;
  final ShardRewards rewards;
  final Set<String> _creditedRefs = {};
  int _nonceSeq = 0;

  @override
  WalletCapabilities get capabilities =>
      const WalletCapabilities(gameRewards: true, freeDailyChest: true, cosmetics: false, serverBacked: false);

  WalletState _read() {
    final raw = _store.getString(StoreKeys.wallet);
    if (raw == null) return const WalletState();
    try {
      return WalletState.fromJson(Map<String, dynamic>.from(jsonDecode(raw) as Map));
    } catch (_) {
      return const WalletState();
    }
  }

  Future<WalletState> _write(WalletState w) async {
    await _store.setString(StoreKeys.wallet, jsonEncode(w.toJson()));
    return w;
  }

  @override
  Future<WalletState> fetch() async => _read();

  @override
  Future<WalletState> creditGame({
    required String ref,
    required RoomMode? mode,
    required bool won,
    required DateTime now,
  }) async {
    var w = _read();
    if (!_creditedRefs.add(ref)) return w;
    final today = dayKey(now);
    final botToday = w.botGamesRewardedDay == today ? w.botGamesRewardedToday : 0;
    final amount = rewards.forGame(mode: mode, won: won, botGamesRewardedToday: botToday);
    w = w.copyWith(
      balance: w.balance + amount,
      botGamesRewardedDay: today,
      botGamesRewardedToday: mode == RoomMode.bot && amount > 0 ? botToday + 1 : botToday,
    );
    return _write(w);
  }

  @override
  Future<({WalletState wallet, int reward, int streakDay})?> claimDailyChest(DateTime now) async {
    final w = _read();
    if (!DailyChest.canClaim(w, now)) return null;
    final day = DailyChest.nextStreakDay(w, now);
    final reward = DailyChest.rewardFor(day);
    final next = await _write(w.copyWith(balance: w.balance + reward, chestStreak: day, lastChestDay: dayKey(now)));
    return (wallet: next, reward: reward, streakDay: day);
  }

  /// Marque le coffre bonus du jour comme pris (aussi utilisé par le serveur
  /// pour l'affichage, le plafond réel étant côté serveur).
  Future<WalletState> markBonusChest(DateTime now) async =>
      _write(_read().copyWith(bonusChestDay: dayKey(now)));

  @override
  Future<AdOffer?> prepareAdReward(AdPlacement placement, {required int amount}) async => AdOffer(
        nonce: 'local-${++_nonceSeq}',
        rewardKey: placement.id,
        amount: amount,
        ssvUserId: null,
        ssvCustomData: null,
      );

  @override
  Future<({WalletState wallet, int reward})> claimAdReward(
    AdPlacement placement,
    AdOffer offer, {
    required DateTime now,
  }) async {
    var w = _read();
    if (placement == AdPlacement.rwDailyChest) w = w.copyWith(bonusChestDay: dayKey(now));
    final next = await _write(w.copyWith(balance: w.balance + offer.amount));
    return (wallet: next, reward: offer.amount);
  }

  @override
  Future<WalletState> applyPurchase(ShopProduct product, {required Set<String> entitlements}) async {
    final w = _read();
    final alreadyOwned = product.kind == ProductKind.nonConsumable && w.ownedProducts.contains(product.id);
    return _write(w.copyWith(
      balance: alreadyOwned ? w.balance : w.balance + product.shards,
      entitlements: {...w.entitlements, ...entitlements, if (product.entitlement != null) product.entitlement!},
      ownedProducts: product.kind == ProductKind.nonConsumable ? {...w.ownedProducts, product.id} : w.ownedProducts,
    ));
  }

  @override
  Future<WalletState> applyRestore({required Set<String> entitlements, required Set<String> ownedProductIds}) async {
    final w = _read();
    return _write(w.copyWith(
      entitlements: {...w.entitlements, ...entitlements},
      ownedProducts: {...w.ownedProducts, ...ownedProductIds.where((id) => Products.byId(id) != null)},
    ));
  }

  @override
  Future<List<CatalogItem>> catalog() async => const [];

  @override
  Future<WalletState> buyItem(String itemId) async => throw UnsupportedError('cosmétiques : serveur requis');

  @override
  Future<WalletState> equip(String slot, String? itemId) async => throw UnsupportedError('cosmétiques : serveur requis');

  @override
  Future<void> deleteAccount() => _store.remove(StoreKeys.wallet);
}

/// Implémentation SERVEUR : solde, droits, inventaire et récompenses vidéo
/// viennent du serveur (source de vérité). Le coffre gratuit et les Éclats de
/// fin de partie n'existent pas encore côté serveur (§6) : non proposés.
class ServerWalletRepository implements WalletRepository {
  ServerWalletRepository(this._api, this._local);

  final AccountApi _api;

  /// Garde l'état d'affichage purement local (jour du coffre bonus).
  final LocalWalletRepository _local;

  /// Réclamation : réessai toutes les 2,5 s pendant 30 s (SSV AdMob en route).
  Duration claimRetryDelay = const Duration(milliseconds: 2500);
  Duration claimTimeout = const Duration(seconds: 30);

  @override
  WalletCapabilities get capabilities =>
      const WalletCapabilities(gameRewards: false, freeDailyChest: false, cosmetics: true, serverBacked: true);

  Future<WalletState> _merge(AccountSnapshot a) async {
    final local = await _local.fetch();
    return local.copyWith(
      balance: a.shardsBalance,
      entitlements: {...a.entitlements, if (a.noAds) Entitlements.noAds},
      ownedProducts: a.ownedProductIds,
      inventory: a.inventory,
      equipped: a.equipped,
    );
  }

  @override
  Future<WalletState> fetch() async => _merge(await _api.account());

  // TODO(serveur §6) : Éclats de fin de partie crédités par recordGame.
  @override
  Future<WalletState> creditGame({required String ref, required RoomMode? mode, required bool won, required DateTime now}) =>
      fetch();

  // TODO(serveur §6) : coffre quotidien gratuit.
  @override
  Future<({WalletState wallet, int reward, int streakDay})?> claimDailyChest(DateTime now) async => null;

  static String? rewardKeyFor(AdPlacement p) => switch (p) {
        AdPlacement.rwFreeShards => 'free_shards',
        AdPlacement.rwDailyChest => 'daily_chest',
        _ => null,
      };

  @override
  Future<AdOffer?> prepareAdReward(AdPlacement placement, {required int amount}) async {
    final key = rewardKeyFor(placement);
    if (key == null) return null;
    try {
      return await _api.createAdOffer(adUnit: placement.id, rewardKey: key);
    } on AccountApiException {
      return null; // 429 daily_cap_reached, 503… → bouton grisé
    }
  }

  @override
  Future<({WalletState wallet, int reward})> claimAdReward(
    AdPlacement placement,
    AdOffer offer, {
    required DateTime now,
  }) async {
    if (placement == AdPlacement.rwDailyChest) await _local.markBonusChest(now);
    final end = DateTime.now().add(claimTimeout);
    var reward = 0;
    while (true) {
      final r = await _api.claimAdReward(offer.nonce);
      if (r.status == ClaimStatus.credited || r.status == ClaimStatus.alreadyClaimed) {
        reward = r.amount ?? offer.amount;
        break;
      }
      if (r.status == ClaimStatus.unknownOffer || DateTime.now().isAfter(end)) break;
      await Future<void>.delayed(claimRetryDelay);
    }
    return (wallet: await fetch(), reward: reward);
  }

  Future<WalletState> _sync() async {
    try {
      return await _merge(await _api.syncPurchases());
    } on AccountApiException {
      return fetch(); // 503 sync_not_configured : le webhook fera foi
    }
  }

  @override
  Future<WalletState> applyPurchase(ShopProduct product, {required Set<String> entitlements}) => _sync();

  @override
  Future<WalletState> applyRestore({required Set<String> entitlements, required Set<String> ownedProductIds}) => _sync();

  @override
  Future<List<CatalogItem>> catalog() => _api.catalog();

  @override
  Future<WalletState> buyItem(String itemId) async {
    await _api.buyItem(itemId);
    return fetch();
  }

  @override
  Future<WalletState> equip(String slot, String? itemId) async => _merge(await _api.equip(slot, itemId));

  @override
  Future<void> deleteAccount() async {
    await _api.deleteProfile();
    await _local.deleteAccount();
  }
}
