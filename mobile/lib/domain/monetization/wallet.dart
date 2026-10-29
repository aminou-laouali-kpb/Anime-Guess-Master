import '../models/protocol_models.dart';
import 'ad_policy.dart' show AdHistory, dayKey;
import 'products.dart';

/// Solde d'Éclats, droits et coffre quotidien du joueur.
///
/// IMPORTANT : la spec (§0.4 et §5) fait du SERVEUR la seule source de vérité
/// pour le solde et les droits. Cet état est aujourd'hui tenu localement par
/// `LocalWalletRepository` en attendant `GET /api/me/entitlements`.
class WalletState {
  const WalletState({
    this.balance = 0,
    this.entitlements = const {},
    this.ownedProducts = const {},
    this.chestStreak = 0,
    this.lastChestDay,
    this.bonusChestDay,
    this.botGamesRewardedDay,
    this.botGamesRewardedToday = 0,
  });

  final int balance;
  final Set<String> entitlements;

  /// Produits non consommables possédés (pack de démarrage…).
  final Set<String> ownedProducts;

  /// Jour de la série du coffre quotidien (1 à 7) du dernier coffre ouvert.
  final int chestStreak;
  final String? lastChestDay;
  final String? bonusChestDay;
  final String? botGamesRewardedDay;
  final int botGamesRewardedToday;

  WalletState copyWith({
    int? balance,
    Set<String>? entitlements,
    Set<String>? ownedProducts,
    int? chestStreak,
    String? lastChestDay,
    String? bonusChestDay,
    String? botGamesRewardedDay,
    int? botGamesRewardedToday,
  }) =>
      WalletState(
        balance: balance ?? this.balance,
        entitlements: entitlements ?? this.entitlements,
        ownedProducts: ownedProducts ?? this.ownedProducts,
        chestStreak: chestStreak ?? this.chestStreak,
        lastChestDay: lastChestDay ?? this.lastChestDay,
        bonusChestDay: bonusChestDay ?? this.bonusChestDay,
        botGamesRewardedDay: botGamesRewardedDay ?? this.botGamesRewardedDay,
        botGamesRewardedToday: botGamesRewardedToday ?? this.botGamesRewardedToday,
      );

  Map<String, dynamic> toJson() => {
        'balance': balance,
        'entitlements': entitlements.toList(),
        'ownedProducts': ownedProducts.toList(),
        'chestStreak': chestStreak,
        'lastChestDay': lastChestDay,
        'bonusChestDay': bonusChestDay,
        'botGamesRewardedDay': botGamesRewardedDay,
        'botGamesRewardedToday': botGamesRewardedToday,
      };

  factory WalletState.fromJson(Map<String, dynamic> json) => WalletState(
        balance: (json['balance'] as num?)?.toInt() ?? 0,
        entitlements: {...?(json['entitlements'] as List?)?.whereType<String>()},
        ownedProducts: {...?(json['ownedProducts'] as List?)?.whereType<String>()},
        chestStreak: (json['chestStreak'] as num?)?.toInt() ?? 0,
        lastChestDay: json['lastChestDay'] as String?,
        bonusChestDay: json['bonusChestDay'] as String?,
        botGamesRewardedDay: json['botGamesRewardedDay'] as String?,
        botGamesRewardedToday: (json['botGamesRewardedToday'] as num?)?.toInt() ?? 0,
      );
}

/// Barème des gains (§2.1, clés Remote Config `shards_*`).
class ShardRewards {
  const ShardRewards({this.pvpWin = 20, this.pvpLoss = 10, this.botGame = 5, this.botDailyCap = 10});
  final int pvpWin;
  final int pvpLoss;
  final int botGame;
  final int botDailyCap;

  /// Éclats gagnés pour une partie terminée. Contre l'ordinateur, plafonné à
  /// [botDailyCap] parties récompensées par jour.
  int forGame({required RoomMode? mode, required bool won, required int botGamesRewardedToday}) {
    if (mode == RoomMode.bot) return botGamesRewardedToday < botDailyCap ? botGame : 0;
    return won ? pvpWin : pvpLoss;
  }
}

/// Coffre quotidien : 1 par jour ; série de 7 jours (jour 7 : 100 Éclats) ;
/// un jour manqué remet la série à 1.
class DailyChest {
  const DailyChest._();

  /// Gains par jour de série (« 20 à 50, jour 7 : 100 », §2.1).
  static const List<int> rewardsByDay = [20, 25, 30, 35, 40, 50, 100];

  static bool canClaim(WalletState w, DateTime now) => w.lastChestDay != dayKey(now);

  /// Jour de série qui serait obtenu en ouvrant le coffre maintenant.
  static int nextStreakDay(WalletState w, DateTime now) {
    final yesterday = dayKey(DateTime(now.year, now.month, now.day - 1));
    if (w.lastChestDay == yesterday) return w.chestStreak >= 7 ? 1 : w.chestStreak + 1;
    if (w.lastChestDay == dayKey(now)) return w.chestStreak;
    return 1;
  }

  static int rewardFor(int streakDay) => rewardsByDay[(streakDay.clamp(1, 7)) - 1];

  /// Coffre bonus (vidéo récompensée `rw_daily_chest`) : après le coffre gratuit,
  /// une fois par jour. Montant fixe déterministe dans la fourchette 20-50.
  static bool canClaimBonus(WalletState w, DateTime now) =>
      w.lastChestDay == dayKey(now) && w.bonusChestDay != dayKey(now);

  static const int bonusReward = 30;
}

/// Pack de démarrage (§3.1) : visible de la 3e partie terminée jusqu'à 7 jours
/// après l'installation (`starter_pack_window_days`), achetable une fois.
class StarterPackRule {
  const StarterPackRule._();
  static const minGames = 3;
  static const windowDays = 7;

  static bool visible(AdHistory history, WalletState wallet, DateTime now) =>
      !wallet.ownedProducts.contains(Products.starterPack.id) &&
      history.gamesCompleted >= minGames &&
      now.difference(history.installedAt) <= const Duration(days: windowDays);
}
