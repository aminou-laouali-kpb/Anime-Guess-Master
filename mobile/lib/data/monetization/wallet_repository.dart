import 'dart:convert';

import '../../domain/models/protocol_models.dart';
import '../../domain/monetization/ad_policy.dart';
import '../../domain/monetization/products.dart';
import '../../domain/monetization/wallet.dart';
import '../storage/key_value_store.dart';

/// Solde d'Éclats, droits et coffre quotidien.
///
/// L'interface est volontairement découpée en OPÉRATIONS (et non en
/// « lire/écrire le solde ») pour correspondre aux endpoints serveur de
/// MONETISATION_SPEC §5.3 : une implémentation `ServerWalletRepository` pourra
/// la remplacer sans toucher à l'interface.
///
/// TODO(serveur) : implémenter `ServerWalletRepository` :
///  - [fetch]            → GET  /api/me/entitlements (jeton de profil)
///  - [creditGame]       → rien côté app : le serveur crédite à la fin de partie (recordGame)
///  - [claimDailyChest]  → endpoint coffre quotidien (à définir)
///  - [claimAdReward]    → POST /api/me/ad-offers puis POST /api/me/ad-rewards/claim (SSV AdMob)
///  - [applyPurchase] / [applyRestore] → POST /api/me/sync-purchases puis fetch
abstract class WalletRepository {
  Future<WalletState> fetch();

  /// Éclats d'une partie terminée. [ref] identifie la partie (idempotence).
  Future<WalletState> creditGame({required String ref, required RoomMode? mode, required bool won, required DateTime now});

  /// Ouvre le coffre gratuit du jour. Renvoie null si déjà ouvert.
  Future<({WalletState wallet, int reward, int streakDay})?> claimDailyChest(DateTime now);

  /// Crédite une vidéo récompensée regardée jusqu'au bout.
  Future<({WalletState wallet, int reward})> claimAdReward(AdPlacement placement, {required int amount, required DateTime now});

  Future<WalletState> applyPurchase(ShopProduct product, {required Set<String> entitlements});
  Future<WalletState> applyRestore({required Set<String> entitlements, required Set<String> ownedProductIds});
}

/// Implémentation LOCALE provisoire (shared_preferences). Pas sûre : un joueur
/// peut modifier ses données. Acceptable tant que les Éclats ne s'échangent
/// contre rien (aucun cosmétique en phase actuelle de l'app).
class LocalWalletRepository implements WalletRepository {
  LocalWalletRepository(this._store, {this.rewards = const ShardRewards()});

  final KeyValueStore _store;
  final ShardRewards rewards;
  final Set<String> _creditedRefs = {};

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

  @override
  Future<({WalletState wallet, int reward})> claimAdReward(
    AdPlacement placement, {
    required int amount,
    required DateTime now,
  }) async {
    var w = _read();
    if (placement == AdPlacement.rwDailyChest) w = w.copyWith(bonusChestDay: dayKey(now));
    final next = await _write(w.copyWith(balance: w.balance + amount));
    return (wallet: next, reward: amount);
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
}
