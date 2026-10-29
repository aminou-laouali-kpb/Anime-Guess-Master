import 'dart:async';

import 'package:app_tracking_transparency/app_tracking_transparency.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';

import '../../domain/monetization/ad_policy.dart';
import 'ads_service.dart';

/// Identifiants de blocs publicitaires. Valeurs actuelles : IDs de TEST
/// officiels de Google (https://developers.google.com/admob/flutter/test-ads).
/// TODO(publication) : créer les blocs `int_post_game`, `rw_*`, `ban_*` dans
/// AdMob et remplacer ces valeurs (un bloc par emplacement pour les stats).
class AdUnitIds {
  const AdUnitIds._();

  static const _androidBanner = 'ca-app-pub-3940256099942544/9214589741';
  static const _androidInterstitial = 'ca-app-pub-3940256099942544/1033173712';
  static const _androidRewarded = 'ca-app-pub-3940256099942544/5224354917';
  static const _iosBanner = 'ca-app-pub-3940256099942544/2435281174';
  static const _iosInterstitial = 'ca-app-pub-3940256099942544/4411468910';
  static const _iosRewarded = 'ca-app-pub-3940256099942544/1712485313';

  static String forPlacement(AdPlacement placement, TargetPlatform platform) {
    final ios = platform == TargetPlatform.iOS;
    return switch (placement.format) {
      AdFormat.banner => ios ? _iosBanner : _androidBanner,
      AdFormat.interstitial => ios ? _iosInterstitial : _androidInterstitial,
      AdFormat.rewarded => ios ? _iosRewarded : _androidRewarded,
    };
  }
}

/// Implémentation réelle : Google Mobile Ads + UMP + ATT.
class AdMobAdsService implements AdsService {
  AdMobAdsService({TargetPlatform? platform}) : _platform = platform ?? defaultTargetPlatform;

  final TargetPlatform _platform;
  bool _canRequestAds = false;
  bool _initialized = false;
  InterstitialAd? _interstitial;
  RewardedAd? _rewarded;

  static const _interstitialLoadTimeout = Duration(seconds: 2);
  static const _rewardedLoadTimeout = Duration(seconds: 6);

  @override
  bool get canRequestAds => _canRequestAds;

  @override
  Future<ConsentResult> gatherConsent({bool underAgeOfConsent = false}) async {
    final updated = Completer<bool>();
    ConsentInformation.instance.requestConsentInfoUpdate(
      ConsentRequestParameters(tagForUnderAgeOfConsent: underAgeOfConsent),
      () => updated.complete(true),
      (error) => updated.complete(false),
    );
    if (!await updated.future) {
      // Échec réseau : on peut quand même demander des pubs si un consentement
      // antérieur le permet.
      _canRequestAds = await ConsentInformation.instance.canRequestAds();
      return _canRequestAds ? ConsentResult.personalized : ConsentResult.error;
    }
    final dismissed = Completer<void>();
    await ConsentForm.loadAndShowConsentFormIfRequired((_) => dismissed.complete());
    await dismissed.future;

    _canRequestAds = await ConsentInformation.instance.canRequestAds();
    final status = await ConsentInformation.instance.getConsentStatus();
    if (status == ConsentStatus.notRequired) return ConsentResult.notRequired;
    // Le SDK applique lui-même les choix TCF (pubs non personnalisées si besoin).
    return _canRequestAds ? ConsentResult.personalized : ConsentResult.refused;
  }

  @override
  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
    await MobileAds.instance.initialize();
    await MobileAds.instance.updateRequestConfiguration(
      // Contenu publicitaire « Teen » (MONETISATION_SPEC §4).
      RequestConfiguration(maxAdContentRating: MaxAdContentRating.t),
    );
  }

  @override
  Future<TrackingResult> requestTrackingAuthorization() async {
    if (_platform != TargetPlatform.iOS) return TrackingResult.notApplicable;
    var status = await AppTrackingTransparency.trackingAuthorizationStatus;
    if (status == TrackingStatus.notDetermined) {
      status = await AppTrackingTransparency.requestTrackingAuthorization();
    }
    return switch (status) {
      TrackingStatus.authorized => TrackingResult.authorized,
      TrackingStatus.notSupported => TrackingResult.notApplicable,
      _ => TrackingResult.denied,
    };
  }

  @override
  Future<void> showPrivacyOptions() async {
    final done = Completer<void>();
    await ConsentForm.showPrivacyOptionsForm((_) => done.complete());
    await done.future;
    _canRequestAds = await ConsentInformation.instance.canRequestAds();
  }

  @override
  Future<void> preload() async {
    if (!_canRequestAds) return;
    await Future.wait([
      if (_interstitial == null) _loadInterstitial().then((ad) => _interstitial ??= ad),
      if (_rewarded == null) _loadRewarded().then((ad) => _rewarded ??= ad),
    ]);
  }

  Future<InterstitialAd?> _loadInterstitial() {
    final c = Completer<InterstitialAd?>();
    InterstitialAd.load(
      adUnitId: AdUnitIds.forPlacement(AdPlacement.intPostGame, _platform),
      request: const AdRequest(),
      adLoadCallback: InterstitialAdLoadCallback(
        onAdLoaded: c.complete,
        onAdFailedToLoad: (_) => c.complete(null),
      ),
    );
    return c.future;
  }

  Future<RewardedAd?> _loadRewarded() {
    final c = Completer<RewardedAd?>();
    RewardedAd.load(
      adUnitId: AdUnitIds.forPlacement(AdPlacement.rwFreeShards, _platform),
      request: const AdRequest(),
      rewardedAdLoadCallback: RewardedAdLoadCallback(
        onAdLoaded: c.complete,
        onAdFailedToLoad: (_) => c.complete(null),
      ),
    );
    return c.future;
  }

  @override
  Future<bool> showInterstitial(AdPlacement placement) async {
    if (!_canRequestAds) return false;
    final ad = _interstitial ??
        await _loadInterstitial().timeout(_interstitialLoadTimeout, onTimeout: () => null);
    _interstitial = null;
    if (ad == null) return false;
    final closed = Completer<bool>();
    ad.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        if (!closed.isCompleted) closed.complete(true);
      },
      onAdFailedToShowFullScreenContent: (ad, _) {
        ad.dispose();
        if (!closed.isCompleted) closed.complete(false);
      },
    );
    await ad.show();
    final shown = await closed.future;
    unawaited(preload());
    return shown;
  }

  @override
  Future<RewardedOutcome> showRewarded(AdPlacement placement) async {
    if (!_canRequestAds) return RewardedOutcome.unavailable;
    final ad = _rewarded ?? await _loadRewarded().timeout(_rewardedLoadTimeout, onTimeout: () => null);
    _rewarded = null;
    if (ad == null) return RewardedOutcome.unavailable;
    var earned = false;
    final closed = Completer<void>();
    ad.fullScreenContentCallback = FullScreenContentCallback(
      onAdDismissedFullScreenContent: (ad) {
        ad.dispose();
        if (!closed.isCompleted) closed.complete();
      },
      onAdFailedToShowFullScreenContent: (ad, _) {
        ad.dispose();
        if (!closed.isCompleted) closed.complete();
      },
    );
    // TODO(serveur, spec §5.3) : passer `ServerSideVerificationOptions(userId:
    // players.id, customData: nonce)` obtenu via POST /api/me/ad-offers, puis
    // réclamer la récompense par POST /api/me/ad-rewards/claim.
    await ad.show(onUserEarnedReward: (_, _) => earned = true);
    await closed.future;
    unawaited(preload());
    return earned ? RewardedOutcome.earned : RewardedOutcome.dismissed;
  }

  @override
  Widget buildBanner(AdPlacement placement) =>
      _AdaptiveBanner(adUnitId: AdUnitIds.forPlacement(placement, _platform), enabled: _canRequestAds);
}

class _AdaptiveBanner extends StatefulWidget {
  const _AdaptiveBanner({required this.adUnitId, required this.enabled});
  final String adUnitId;
  final bool enabled;

  @override
  State<_AdaptiveBanner> createState() => _AdaptiveBannerState();
}

class _AdaptiveBannerState extends State<_AdaptiveBanner> {
  BannerAd? _ad;
  bool _loaded = false;
  bool _requested = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_requested || !widget.enabled) return;
    _requested = true;
    _load(MediaQuery.sizeOf(context).width.truncate());
  }

  Future<void> _load(int width) async {
    final size = await AdSize.getLargeAnchoredAdaptiveBannerAdSize(width);
    if (!mounted || size == null) return;
    final ad = BannerAd(
      adUnitId: widget.adUnitId,
      size: size,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (_) {
          if (mounted) setState(() => _loaded = true);
        },
        onAdFailedToLoad: (ad, _) => ad.dispose(),
      ),
    );
    _ad = ad;
    await ad.load();
  }

  @override
  void dispose() {
    _ad?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ad = _ad;
    if (!_loaded || ad == null) return const SizedBox.shrink();
    return SafeArea(
      top: false,
      child: SizedBox(width: ad.size.width.toDouble(), height: ad.size.height.toDouble(), child: AdWidget(ad: ad)),
    );
  }
}
