import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/monetization/ads_service.dart';
import '../data/monetization/analytics_service.dart';
import '../data/monetization/purchases_service.dart';
import '../data/monetization/wallet_repository.dart';
import '../domain/models/account_models.dart';
import '../domain/monetization/ad_config.dart';
import '../data/storage/key_value_store.dart';
import '../domain/models/protocol_models.dart';
import '../domain/monetization/ad_policy.dart';
import '../domain/monetization/products.dart';
import '../domain/monetization/wallet.dart';
import 'providers.dart';

/// Gain de la dernière partie, pour « Doubler mes Éclats ».
class GameReward {
  const GameReward({required this.amount, this.doubled = false});
  final int amount;
  final bool doubled;
}

class MonetizationState {
  const MonetizationState({
    required this.wallet,
    required this.history,
    this.prices = const {},
    this.consent,
    this.lastGameReward,
    this.trackingPromptPending = false,
    this.noAdsUpsellPending = false,
    this.ready = false,
    this.playerId,
    this.capabilities = const WalletCapabilities(
      gameRewards: true,
      freeDailyChest: true,
      cosmetics: false,
      serverBacked: false,
    ),
    this.remoteConfig,
    this.catalog = const [],
  });

  final WalletState wallet;
  final AdHistory history;

  /// Prix localisés (store) par identifiant produit.
  final Map<String, String> prices;
  final ConsentResult? consent;
  final GameReward? lastGameReward;

  /// Afficher l'écran explicatif ATT (après la 2e partie, iOS).
  final bool trackingPromptPending;
  final bool noAdsUpsellPending;
  final bool ready;

  /// Identifiant public du joueur (`POST /api/me`) = appUserID RevenueCat.
  final String? playerId;
  final WalletCapabilities capabilities;
  final RemoteConfig? remoteConfig;
  final List<CatalogItem> catalog;

  bool get hasNoAds => Entitlements.removesAds(wallet.entitlements);

  MonetizationState copyWith({
    WalletState? wallet,
    AdHistory? history,
    Map<String, String>? prices,
    ConsentResult? consent,
    GameReward? lastGameReward,
    bool clearLastGameReward = false,
    bool? trackingPromptPending,
    bool? noAdsUpsellPending,
    bool? ready,
    String? playerId,
    bool clearPlayerId = false,
    WalletCapabilities? capabilities,
    RemoteConfig? remoteConfig,
    List<CatalogItem>? catalog,
  }) =>
      MonetizationState(
        wallet: wallet ?? this.wallet,
        history: history ?? this.history,
        prices: prices ?? this.prices,
        consent: consent ?? this.consent,
        lastGameReward: clearLastGameReward ? null : (lastGameReward ?? this.lastGameReward),
        trackingPromptPending: trackingPromptPending ?? this.trackingPromptPending,
        noAdsUpsellPending: noAdsUpsellPending ?? this.noAdsUpsellPending,
        ready: ready ?? this.ready,
        playerId: clearPlayerId ? null : (playerId ?? this.playerId),
        capabilities: capabilities ?? this.capabilities,
        remoteConfig: remoteConfig ?? this.remoteConfig,
        catalog: catalog ?? this.catalog,
      );
}

/// Orchestration de la monétisation : règles de fréquence (AdPolicy, pure),
/// régie (AdsService), achats (PurchasesService), solde (WalletRepository),
/// analytics. Aucune dépendance au SDK concret.
class MonetizationController extends Notifier<MonetizationState> {
  late AdsService _ads;
  late PurchasesService _purchases;
  late AnalyticsService _analytics;
  late AdPolicy _policy;
  late KeyValueStore _store;
  late DateTime Function() _now;
  late WalletRepository _wallet;
  bool _started = false;

  AdConfig get adConfig => _policy.config;

  @override
  MonetizationState build() {
    _ads = ref.watch(adsServiceProvider);
    _purchases = ref.watch(purchasesServiceProvider);
    _analytics = ref.watch(analyticsProvider);
    _policy = ref.watch(adPolicyProvider);
    _store = ref.watch(keyValueStoreProvider);
    _now = ref.watch(clockProvider);
    _wallet = ref.watch(walletRepositoryProvider);
    final history = _loadHistory();
    // Le solde est lu de façon asynchrone (le serveur le fournira à terme).
    Future.microtask(_refreshWallet);
    return MonetizationState(wallet: const WalletState(), history: history);
  }

  AdHistory _loadHistory() {
    final raw = _store.getString(StoreKeys.adHistory);
    if (raw != null) {
      try {
        return AdHistory.fromJson(Map<String, dynamic>.from(jsonDecode(raw) as Map), fallbackNow: _now());
      } catch (_) {}
    }
    final fresh = AdHistory.fresh(_now());
    unawaited(_store.setString(StoreKeys.adHistory, jsonEncode(fresh.toJson())));
    return fresh;
  }

  void _setHistory(AdHistory h) {
    state = state.copyWith(history: h);
    unawaited(_store.setString(StoreKeys.adHistory, jsonEncode(h.toJson())));
  }

  Future<void> _refreshWallet() async {
    final wallet = await _wallet.fetch();
    state = state.copyWith(wallet: wallet, ready: true);
  }

  /// Au démarrage, après la première image : consentement (UMP) AVANT toute
  /// requête publicitaire, puis SDK pub, préchargement et boutique.
  Future<void> startup() async {
    if (_started) return;
    _started = true;
    try {
      final consent = await _ads.gatherConsent();
      state = state.copyWith(consent: consent);
      _analytics.logEvent(AnalyticsEvents.consentResult, {'gdpr': _gdprLabel(consent), 'att': 'na'});
      _analytics.setUserProperty(AnalyticsUserProps.adConsent, _gdprLabel(consent));
      await _ads.initialize();
      unawaited(_ads.preload());
    } catch (_) {
      // Pas de pub plutôt qu'un jeu bloqué.
    }
    await _connectAccount();
    try {
      await _purchases.initialize(appUserId: state.playerId);
      await refreshEntitlements();
      await loadPrices();
    } catch (_) {}
  }

  /// `GET /api/config` (plafonds distants, fonctions actives) puis, si le
  /// serveur gère les portefeuilles, `POST /api/me` et bascule sur le
  /// portefeuille serveur. Hors-ligne ou serveur sans base : reste en local.
  Future<void> _connectAccount() async {
    final api = ref.read(accountApiProvider);
    if (api == null) return;
    try {
      final config = await api.config();
      _policy = AdPolicy(AdConfig.fromRemote(config.values, _policy.config));
      state = state.copyWith(remoteConfig: config);
      if (!config.feature('wallet')) return;
      // Le jeton de profil arrive normalement par le socket (`profile`) : on
      // l'attend un peu pour ne pas créer deux profils différents.
      for (var i = 0; i < 50 && _store.getString(StoreKeys.profileToken) == null; i++) {
        await Future<void>.delayed(const Duration(milliseconds: 100));
      }
      final profile = await api.register(name: _store.getString(StoreKeys.playerName));
      final token = profile.profileToken;
      if (token != null && token.isNotEmpty) await _store.setString(StoreKeys.profileToken, token);
      _wallet = ServerWalletRepository(api, LocalWalletRepository(_store));
      state = state.copyWith(playerId: profile.playerId, capabilities: _wallet.capabilities);
      await _refreshWallet();
      if (_wallet.capabilities.cosmetics) await loadCatalog();
    } catch (_) {
      // Serveur injoignable ou ancien : le portefeuille local reste en place.
    }
  }

  Future<void> loadCatalog() async {
    try {
      state = state.copyWith(catalog: await _wallet.catalog());
    } catch (_) {}
  }

  /// Achat d'un cosmétique en Éclats (`POST /api/shop/buy`). false = refusé.
  Future<bool> buyItem(String itemId) async {
    try {
      state = state.copyWith(wallet: await _wallet.buyItem(itemId));
      _analytics.logEvent(AnalyticsEvents.itemPurchase, {'item_id': itemId});
      return true;
    } catch (_) {
      return false;
    }
  }

  Future<bool> equip(String slot, String? itemId) async {
    try {
      state = state.copyWith(wallet: await _wallet.equip(slot, itemId));
      _analytics.logEvent(AnalyticsEvents.itemEquip, {'item_id': itemId, 'category': slot});
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Suppression du compte (Apple 5.1.1(v)) : serveur, RevenueCat, jetons
  /// locaux. Les achats ne sont pas remboursés (l'UI prévient avant).
  Future<bool> deleteAccount() async {
    try {
      await _wallet.deleteAccount();
    } catch (_) {
      return false;
    }
    await _purchases.logOut();
    await _store.remove(StoreKeys.profileToken);
    await _store.remove(StoreKeys.sessionToken);
    _wallet = ref.read(walletRepositoryProvider);
    state = state.copyWith(
      wallet: const WalletState(),
      clearPlayerId: true,
      capabilities: _wallet.capabilities,
      clearLastGameReward: true,
    );
    _started = false;
    return true;
  }

  static String _gdprLabel(ConsentResult c) => switch (c) {
        ConsentResult.personalized || ConsentResult.notRequired => 'personalized',
        ConsentResult.nonPersonalized => 'npa',
        _ => 'refused',
      };

  Future<void> refreshEntitlements() async {
    final active = await _purchases.activeEntitlements();
    if (active.isEmpty) return;
    final wallet = await _wallet.applyRestore(entitlements: active, ownedProductIds: const {});
    state = state.copyWith(wallet: wallet);
    _analytics.setUserProperty(AnalyticsUserProps.hasNoAds, '${state.hasNoAds}');
  }

  Future<void> loadPrices() async {
    final prices = await _purchases.loadPrices(Products.all);
    if (prices.isNotEmpty) state = state.copyWith(prices: prices);
  }

  String priceOf(ShopProduct p) => state.prices[p.id] ?? p.fallbackPrice;

  // ── Parties ──────────────────────────────────────────────────────────────

  /// Appelé par le contrôleur de jeu quand une partie se termine en direct.
  Future<void> onGameFinished({
    required String gameRef,
    required RoomMode? mode,
    required bool won,
  }) async {
    final history = state.history.recordGameCompleted(won: won);
    _setHistory(history);
    final before = state.wallet.balance;
    final wallet = await _wallet.creditGame(
          ref: gameRef,
          mode: mode,
          won: won,
          now: _now(),
        );
    state = state.copyWith(
      wallet: wallet,
      lastGameReward: GameReward(amount: wallet.balance - before),
      trackingPromptPending: _policy.shouldAskTracking(history) ? true : null,
    );
  }

  /// Nouvelle manche : le gain affiché est celui de la partie à venir.
  void onRoundStarted() {
    if (state.lastGameReward != null) state = state.copyWith(clearLastGameReward: true);
  }

  bool bannerAllowed(AdPlacement placement, AdScreen screen) =>
      _policy.bannerAllowed(placement, screen: screen, hasNoAds: state.hasNoAds);

  /// Interstitiel `int_post_game` en quittant l'écran de fin. Toutes les
  /// règles anti-frustration sont dans [AdPolicy.interstitial].
  Future<InterstitialDecision> maybeShowPostGameInterstitial({
    required Duration? lastGameDuration,
    required bool humanWaiting,
  }) async {
    final now = _now();
    final decision = _policy.interstitial(
      state.history,
      InterstitialRequest(
        now: now,
        hasNoAds: state.hasNoAds,
        lastGameDuration: lastGameDuration,
        humanWaiting: humanWaiting,
      ),
    );
    if (!decision.shouldShow) {
      _analytics.logEvent(AnalyticsEvents.adInterstitialSkip, {'skip_reason': decision.analyticsReason});
      return decision;
    }
    _analytics.logEvent(AnalyticsEvents.adInterstitialEligible, {'placement': AdPlacement.intPostGame.id});
    final shown = await _ads.showInterstitial(AdPlacement.intPostGame);
    if (!shown) {
      _analytics.logEvent(AnalyticsEvents.adInterstitialSkip, {'skip_reason': 'no_fill'});
      return decision;
    }
    _analytics.logEvent(AnalyticsEvents.adInterstitialShow, {'placement': AdPlacement.intPostGame.id});
    final history = state.history.recordInterstitialShown(_now());
    _setHistory(history);
    if (_policy.shouldShowNoAdsUpsell(history, now: _now(), hasNoAds: state.hasNoAds)) {
      state = state.copyWith(noAdsUpsellPending: true);
    }
    return decision;
  }

  RewardedDecision rewardedDecision(AdPlacement placement, AdScreen screen) =>
      _policy.rewarded(state.history, placement, now: _now(), screen: screen);

  /// Vidéo récompensée. Renvoie les Éclats crédités (0 = en cours de
  /// validation par le serveur, crédités plus tard), ou null si rien.
  Future<int?> watchRewarded(AdPlacement placement, {required AdScreen screen, required int amount}) async {
    if (!rewardedDecision(placement, screen).allowed) return null;
    // Serveur : nonce + options SSV AVANT la vidéo (plafonds appliqués côté serveur).
    final offer = await _wallet.prepareAdReward(placement, amount: amount);
    if (offer == null) {
      _analytics.logEvent(AnalyticsEvents.adRewardedFail, {'placement': placement.id, 'error_code': 'no_offer'});
      return null;
    }
    _analytics.logEvent(AnalyticsEvents.adRewardedStart, {'placement': placement.id});
    final outcome = await _ads.showRewarded(placement, ssvUserId: offer.ssvUserId, ssvCustomData: offer.ssvCustomData);
    if (outcome != RewardedOutcome.earned) {
      _analytics.logEvent(AnalyticsEvents.adRewardedFail, {
        'placement': placement.id,
        'error_code': outcome.name,
      });
      return null;
    }
    _analytics.logEvent(AnalyticsEvents.adRewardedComplete, {'placement': placement.id});
    _setHistory(state.history.recordRewardedShown(placement, _now()));
    final started = _now();
    final result = await _wallet.claimAdReward(placement, offer, now: _now());
    state = state.copyWith(wallet: result.wallet);
    if (result.reward > 0) {
      _analytics.logEvent(AnalyticsEvents.adRewardGranted, {
        'placement': placement.id,
        'reward_key': offer.rewardKey,
        'amount': result.reward,
        'latency_ms': _now().difference(started).inMilliseconds,
      });
    }
    return result.reward;
  }

  void logRewardedOffer(AdPlacement placement) =>
      _analytics.logEvent(AnalyticsEvents.adRewardedOffer, {'placement': placement.id});

  /// « Doubler mes Éclats » à la fin de la partie.
  Future<int?> doubleLastGameReward() async {
    final reward = state.lastGameReward;
    if (reward == null || reward.doubled || reward.amount <= 0) return null;
    final credited = await watchRewarded(AdPlacement.rwDoubleShards, screen: AdScreen.ended, amount: reward.amount);
    if (credited != null) state = state.copyWith(lastGameReward: GameReward(amount: reward.amount, doubled: true));
    return credited;
  }

  Future<int?> watchFreeShards() =>
      watchRewarded(AdPlacement.rwFreeShards, screen: AdScreen.home, amount: _policy.config.rwFreeShardsAmount);

  /// Vrai si le solde et les droits viennent du serveur.
  bool get serverBacked => _wallet.capabilities.serverBacked;

  // ── Coffre quotidien ─────────────────────────────────────────────────────

  bool get canClaimDailyChest => _wallet.capabilities.freeDailyChest && DailyChest.canClaim(state.wallet, _now());

  /// Coffre bonus (vidéo) : après le coffre gratuit en local ; directement
  /// quand le serveur gère la récompense (coffre gratuit pas encore côté serveur).
  bool get canClaimBonusChest =>
      (_wallet.capabilities.freeDailyChest
          ? DailyChest.canClaimBonus(state.wallet, _now())
          : state.wallet.bonusChestDay != dayKey(_now())) &&
      rewardedDecision(AdPlacement.rwDailyChest, AdScreen.home).allowed;

  Future<({int reward, int streakDay})?> claimDailyChest() async {
    final result = await _wallet.claimDailyChest(_now());
    if (result == null) return null;
    state = state.copyWith(wallet: result.wallet);
    _analytics.logEvent(AnalyticsEvents.dailyChestOpen, {'streak_day': result.streakDay, 'bonus': false});
    return (reward: result.reward, streakDay: result.streakDay);
  }

  Future<int?> openBonusChest() async {
    if (!canClaimBonusChest) return null;
    final reward = await watchRewarded(AdPlacement.rwDailyChest, screen: AdScreen.home, amount: DailyChest.bonusReward);
    if (reward != null && !_wallet.capabilities.freeDailyChest) {
      // Le jour du coffre bonus est noté localement par le dépôt serveur.
      state = state.copyWith(wallet: state.wallet.copyWith(bonusChestDay: dayKey(_now())));
    }
    if (reward != null) {
      _analytics.logEvent(AnalyticsEvents.dailyChestOpen, {'streak_day': state.wallet.chestStreak, 'bonus': true});
    }
    return reward;
  }

  // ── Achats ───────────────────────────────────────────────────────────────

  bool get starterPackVisible => StarterPackRule.visible(state.history, state.wallet, _now());

  Future<PurchaseOutcome> buy(ShopProduct product) async {
    _analytics.logEvent(AnalyticsEvents.iapStart, {'product_id': product.id});
    final outcome = await _purchases.purchase(product);
    switch (outcome.status) {
      case PurchaseStatus.success:
        final wallet = await _wallet.applyPurchase(product, entitlements: outcome.entitlements);
        _setHistory(state.history.recordPurchase(_now()));
        state = state.copyWith(wallet: wallet);
        _analytics.logEvent(AnalyticsEvents.iapSuccess, {'product_id': product.id, 'price': priceOf(product)});
        _analytics.setUserProperty(AnalyticsUserProps.hasNoAds, '${state.hasNoAds}');
      case PurchaseStatus.cancelled:
        _analytics.logEvent(AnalyticsEvents.iapCancel, {'product_id': product.id});
      case PurchaseStatus.pending:
        break;
      case PurchaseStatus.failed:
      case PurchaseStatus.unavailable:
        _analytics.logEvent(AnalyticsEvents.iapFail, {'product_id': product.id, 'error_code': outcome.errorCode});
    }
    return outcome;
  }

  Future<RestoreOutcome> restore() async {
    final outcome = await _purchases.restore();
    if (outcome.success) {
      final wallet = await _wallet.applyRestore(
            entitlements: outcome.entitlements,
            ownedProductIds: outcome.ownedProductIds,
          );
      state = state.copyWith(wallet: wallet);
    }
    _analytics.logEvent(AnalyticsEvents.restorePurchases, {
      'restored_count': outcome.entitlements.length + outcome.ownedProductIds.length,
    });
    return outcome;
  }

  void logShopView(String source) => _analytics.logEvent(AnalyticsEvents.shopView, {'tab': 'all', 'source': source});

  // ── Consentements ────────────────────────────────────────────────────────

  Future<TrackingResult> requestTracking() async {
    state = state.copyWith(trackingPromptPending: false);
    _setHistory(state.history.markTrackingPromptDone());
    final result = await _ads.requestTrackingAuthorization();
    _analytics.logEvent(AnalyticsEvents.consentResult, {
      'gdpr': _gdprLabel(state.consent ?? ConsentResult.notRequired),
      'att': switch (result) {
        TrackingResult.authorized => 'authorized',
        TrackingResult.denied => 'denied',
        TrackingResult.notApplicable => 'na',
      },
    });
    return result;
  }

  void skipTrackingPrompt() {
    state = state.copyWith(trackingPromptPending: false);
    _setHistory(state.history.markTrackingPromptDone());
  }

  void onNoAdsUpsellShown() {
    state = state.copyWith(noAdsUpsellPending: false);
    _setHistory(state.history.recordNoAdsUpsell(_now()));
    _analytics.logEvent(AnalyticsEvents.upsellNoAdsShow, {'interstitials_seen': state.history.interstitialsSeenTotal});
  }

  void onNoAdsUpsellClicked() => _analytics.logEvent(
        AnalyticsEvents.upsellNoAdsClick,
        {'interstitials_seen': state.history.interstitialsSeenTotal},
      );

  Future<void> showPrivacyOptions() => _ads.showPrivacyOptions();
}

final monetizationControllerProvider =
    NotifierProvider<MonetizationController, MonetizationState>(MonetizationController.new);
