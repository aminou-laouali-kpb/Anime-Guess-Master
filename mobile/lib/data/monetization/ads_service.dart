import 'package:flutter/material.dart';

import '../../domain/monetization/ad_policy.dart';

/// Résultat du consentement RGPD (Google UMP, IAB TCF v2.2).
enum ConsentResult { personalized, nonPersonalized, refused, notRequired, error }

/// App Tracking Transparency (iOS uniquement).
enum TrackingResult { authorized, denied, notApplicable }

enum RewardedOutcome {
  /// Vidéo regardée jusqu'au bout : la récompense est due.
  earned,

  /// Fermée avant la fin.
  dismissed,

  /// Pas de vidéo disponible (no fill, hors ligne, consentement refusé…).
  unavailable,
}

/// Régie publicitaire derrière une interface : AdMob en vrai, factice par
/// défaut, en tests et sur le web.
///
/// Ordre d'appel : [gatherConsent] (UMP, avant toute requête) → [initialize]
/// → [preload] (à l'accueil seulement, jamais en partie).
abstract class AdsService {
  Future<ConsentResult> gatherConsent({bool underAgeOfConsent = false});
  Future<void> initialize();

  /// Faux tant que le consentement n'autorise pas de requête publicitaire.
  bool get canRequestAds;

  /// ATT (iOS). À n'appeler qu'après l'écran explicatif.
  Future<TrackingResult> requestTrackingAuthorization();

  /// Ouvre le formulaire de confidentialité UMP (Réglages).
  Future<void> showPrivacyOptions();

  /// Précharge un interstitiel et une vidéo récompensée.
  Future<void> preload();

  /// true si l'interstitiel a réellement été montré. N'attend jamais plus de
  /// 2 s un chargement (on ne bloque pas le jeu pour une pub).
  Future<bool> showInterstitial(AdPlacement placement);

  /// [ssvUserId] / [ssvCustomData] : options de vérification côté serveur
  /// (SSV AdMob) reçues de `POST /api/me/ad-offers`.
  Future<RewardedOutcome> showRewarded(AdPlacement placement, {String? ssvUserId, String? ssvCustomData});

  /// Bannière adaptative ancrée. Les règles (écran, `no_ads`) sont appliquées
  /// par l'appelant via [AdPolicy.bannerAllowed].
  Widget buildBanner(AdPlacement placement);
}

/// Régie factice : aucune requête réseau, résultats configurables.
class FakeAdsService implements AdsService {
  FakeAdsService({
    this.consent = ConsentResult.notRequired,
    this.rewardedOutcome = RewardedOutcome.earned,
    this.interstitialAvailable = true,
    this.showBannerPlaceholder = true,
  });

  ConsentResult consent;
  RewardedOutcome rewardedOutcome;
  bool interstitialAvailable;
  bool showBannerPlaceholder;

  final List<AdPlacement> interstitialsShown = [];
  final List<AdPlacement> rewardedShown = [];
  final List<String?> ssvCustomData = [];
  int trackingRequests = 0;
  bool initialized = false;

  @override
  Future<ConsentResult> gatherConsent({bool underAgeOfConsent = false}) async => consent;

  @override
  Future<void> initialize() async => initialized = true;

  @override
  bool get canRequestAds => consent != ConsentResult.refused && consent != ConsentResult.error;

  @override
  Future<TrackingResult> requestTrackingAuthorization() async {
    trackingRequests++;
    return TrackingResult.notApplicable;
  }

  @override
  Future<void> showPrivacyOptions() async {}

  @override
  Future<void> preload() async {}

  @override
  Future<bool> showInterstitial(AdPlacement placement) async {
    if (!interstitialAvailable) return false;
    interstitialsShown.add(placement);
    return true;
  }

  @override
  Future<RewardedOutcome> showRewarded(AdPlacement placement, {String? ssvUserId, String? ssvCustomData}) async {
    if (rewardedOutcome != RewardedOutcome.unavailable) {
      rewardedShown.add(placement);
      this.ssvCustomData.add(ssvCustomData);
    }
    return rewardedOutcome;
  }

  @override
  Widget buildBanner(AdPlacement placement) {
    if (!showBannerPlaceholder) return const SizedBox.shrink();
    return Container(
      key: ValueKey('fake-banner-${placement.id}'),
      height: 50,
      alignment: Alignment.center,
      color: const Color(0xFF1B1B32),
      child: Text(
        'Espace publicitaire (factice) · ${placement.id}',
        style: const TextStyle(fontSize: 11, color: Color(0xFFA3A3C2)),
      ),
    );
  }
}
