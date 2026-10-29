import 'package:flutter/foundation.dart';

/// Noms d'événements de MONETISATION_SPEC §7.2 (snake_case, aucune donnée
/// personnelle : ni pseudo, ni IP).
class AnalyticsEvents {
  const AnalyticsEvents._();
  static const appOpen = 'app_open';
  static const consentResult = 'consent_result';
  static const queueJoin = 'queue_join';
  static const queueMatched = 'queue_matched';
  static const queueLeft = 'queue_left';
  static const roomCreate = 'room_create';
  static const roomJoin = 'room_join';
  static const inviteShare = 'invite_share';
  static const gameStart = 'game_start';
  static const questionAsk = 'question_ask';
  static const gameEnd = 'game_end';
  static const rematch = 'rematch';
  static const reconnect = 'reconnect';
  static const reportPlayer = 'report_player';
  static const blockPlayer = 'block_player';
  static const dailyChestOpen = 'daily_chest_open';
  static const adRewardedOffer = 'ad_rewarded_offer';
  static const adRewardedStart = 'ad_rewarded_start';
  static const adRewardedComplete = 'ad_rewarded_complete';
  static const adRewardedFail = 'ad_rewarded_fail';
  static const adRewardGranted = 'ad_reward_granted';
  static const adInterstitialEligible = 'ad_interstitial_eligible';
  static const adInterstitialShow = 'ad_interstitial_show';
  static const adInterstitialSkip = 'ad_interstitial_skip';
  static const adBannerImpression = 'ad_banner_impression';
  static const shopView = 'shop_view';
  static const iapView = 'iap_view';
  static const iapStart = 'iap_start';
  static const iapSuccess = 'iap_success';
  static const iapFail = 'iap_fail';
  static const iapCancel = 'iap_cancel';
  static const restorePurchases = 'restore_purchases';
  static const itemPurchase = 'item_purchase';
  static const itemEquip = 'item_equip';
  static const accountDelete = 'account_delete';
  static const upsellNoAdsShow = 'upsell_noads_show';
  static const upsellNoAdsClick = 'upsell_noads_click';
}

/// Propriétés utilisateur (§7.1).
class AnalyticsUserProps {
  const AnalyticsUserProps._();
  static const hasNoAds = 'has_no_ads';
  static const adConsent = 'ad_consent';
  static const appLang = 'app_lang';
}

/// Analytics derrière une interface : Firebase Analytics plus tard
/// (TODO : `FirebaseAnalyticsService` avec Consent Mode).
abstract class AnalyticsService {
  void logEvent(String name, [Map<String, Object?> params = const {}]);
  void setUserProperty(String name, String? value);
}

/// Ne fait rien (release tant que Firebase n'est pas branché).
class NoopAnalyticsService implements AnalyticsService {
  const NoopAnalyticsService();
  @override
  void logEvent(String name, [Map<String, Object?> params = const {}]) {}
  @override
  void setUserProperty(String name, String? value) {}
}

/// Écrit les événements dans la console (debug).
class LogAnalyticsService implements AnalyticsService {
  const LogAnalyticsService();
  @override
  void logEvent(String name, [Map<String, Object?> params = const {}]) =>
      debugPrint('[analytics] $name ${params.isEmpty ? '' : params}');
  @override
  void setUserProperty(String name, String? value) => debugPrint('[analytics] user.$name = $value');
}

/// Garde les événements en mémoire (tests).
class RecordingAnalyticsService implements AnalyticsService {
  final List<MapEntry<String, Map<String, Object?>>> events = [];
  final Map<String, String?> userProperties = {};

  Iterable<String> get names => events.map((e) => e.key);

  @override
  void logEvent(String name, [Map<String, Object?> params = const {}]) => events.add(MapEntry(name, params));
  @override
  void setUserProperty(String name, String? value) => userProperties[name] = value;
}
