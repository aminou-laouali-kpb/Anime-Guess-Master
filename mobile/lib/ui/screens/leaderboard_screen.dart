import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/game_controller.dart';
import '../../application/providers.dart';
import '../../domain/models/protocol_models.dart';
import '../../domain/monetization/ad_policy.dart';
import '../../l10n/app_localizations.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Classement Elo (`GET /api/leaderboard`) + mes statistiques (`my_stats`).
final leaderboardProvider = FutureProvider.autoDispose<Leaderboard>(
  (ref) => ref.watch(apiClientProvider).leaderboard(),
);

class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen> {
  @override
  void initState() {
    super.initState();
    ref.read(gameControllerProvider.notifier).refreshMyStats();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final myStats = ref.watch(gameControllerProvider.select((s) => s.myStats));
    final board = ref.watch(leaderboardProvider);
    final stats = myStats?.stats;
    final minGames = myStats?.minRankedGames ?? board.value?.minRankedGames ?? 5;

    Widget stat(String label, String value) => Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(color: AppColors.muted.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(10)),
          child: Column(children: [
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            Text(label.toUpperCase(),
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: AppColors.mutedForeground)),
          ]),
        );

    return Scaffold(
      appBar: AppBar(title: Text(l.homeLeaderboard)),
      body: Column(children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async {
              ref.read(gameControllerProvider.notifier).refreshMyStats();
              ref.invalidate(leaderboardProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(l.leaderboardBody, style: const TextStyle(color: AppColors.mutedForeground)),
                const SizedBox(height: 16),
                SectionLabel(l.myStatsTitle),
                const SizedBox(height: 8),
                if (myStats != null && !myStats.enabled)
                  Text(l.statsDisabled)
                else if (stats == null)
                  Text(l.statsEmpty, style: const TextStyle(color: AppColors.mutedForeground))
                else ...[
                  GridView.count(
                    crossAxisCount: 3,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 8,
                    crossAxisSpacing: 8,
                    childAspectRatio: 1.4,
                    children: [
                      stat(l.statScore, '${stats.rating}'),
                      stat(l.statRank, stats.rank == null ? '—' : '#${stats.rank}'),
                      stat(l.statWinRate, '${stats.winRatePercent} %'),
                      stat(l.statGames, '${stats.gamesPlayed}'),
                      stat(l.statWins, '${stats.wins}'),
                      stat(l.statBestStreak, '${stats.bestStreak}'),
                    ],
                  ),
                  if (stats.currentStreak >= 2)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text('🔥 ${l.streakLine(stats.currentStreak)}',
                          style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.warning)),
                    ),
                  if (stats.rank == null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(l.gamesToRank((minGames - stats.rankedGames).clamp(0, 999)),
                          style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                    ),
                ],
                const SizedBox(height: 20),
                SectionLabel(l.topPlayers),
                const SizedBox(height: 8),
                board.when(
                  loading: () => const Padding(
                    padding: EdgeInsets.all(24),
                    child: Center(child: CircularProgressIndicator()),
                  ),
                  error: (_, _) => Text(l.leaderboardUnavailable),
                  data: (data) => data.entries.isEmpty
                      ? Text(l.leaderboardEmpty(minGames))
                      : Card(
                          child: Column(children: [
                            for (final e in data.entries)
                              ListTile(
                                dense: true,
                                tileColor: e.id == stats?.id ? AppColors.primary.withValues(alpha: 0.12) : null,
                                leading: SizedBox(
                                  width: 32,
                                  child: Center(
                                    child: Text(
                                      e.rank >= 1 && e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : '${e.rank}',
                                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                                    ),
                                  ),
                                ),
                                title: Text(e.id == stats?.id ? l.meSuffix(e.name) : e.name,
                                    maxLines: 1, overflow: TextOverflow.ellipsis),
                                subtitle: Text(l.rankedGames(e.rankedGames)),
                                trailing: Text('${e.rating}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                              ),
                          ]),
                        ),
                ),
              ],
            ),
          ),
        ),
        const AdBannerSlot(placement: AdPlacement.banLeaderboard, screen: AdScreen.leaderboard),
      ]),
    );
  }
}
