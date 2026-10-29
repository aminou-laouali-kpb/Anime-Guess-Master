import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/monetization_controller.dart';
import '../../domain/monetization/ad_policy.dart';
import '../../domain/monetization/wallet.dart';
import '../../l10n/app_localizations.dart';
import '../theme.dart';

Future<void> showDailyChestDialog(BuildContext context) =>
    showDialog<void>(context: context, builder: (_) => const DailyChestDialog());

/// Coffre quotidien (§2.1) + coffre bonus par vidéo récompensée (`rw_daily_chest`).
class DailyChestDialog extends ConsumerStatefulWidget {
  const DailyChestDialog({super.key});

  @override
  ConsumerState<DailyChestDialog> createState() => _DailyChestDialogState();
}

class _DailyChestDialogState extends ConsumerState<DailyChestDialog> {
  String? _message;
  bool _busy = false;
  bool _bonusUnavailable = false;

  @override
  void initState() {
    super.initState();
    final controller = ref.read(monetizationControllerProvider.notifier);
    if (controller.canClaimBonusChest) controller.logRewardedOffer(AdPlacement.rwDailyChest);
  }

  Future<void> _open() async {
    setState(() => _busy = true);
    final l = AppLocalizations.of(context);
    final result = await ref.read(monetizationControllerProvider.notifier).claimDailyChest();
    if (!mounted) return;
    setState(() {
      _busy = false;
      _message = result == null ? l.chestAlreadyOpened : l.chestReward(result.reward, result.streakDay);
    });
  }

  Future<void> _bonus() async {
    setState(() => _busy = true);
    final l = AppLocalizations.of(context);
    final reward = await ref.read(monetizationControllerProvider.notifier).openBonusChest();
    if (!mounted) return;
    setState(() {
      _busy = false;
      if (reward == null) {
        _bonusUnavailable = true;
      } else {
        _message = reward == 0 ? l.rewardPending : l.shardsCredited(reward);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final m = ref.watch(monetizationControllerProvider);
    final controller = ref.read(monetizationControllerProvider.notifier);
    final canClaim = controller.canClaimDailyChest;
    final canBonus = controller.canClaimBonusChest;
    final streak = m.wallet.chestStreak;

    return AlertDialog(
      title: Row(children: [
        const Icon(Icons.card_giftcard, color: AppColors.secondary),
        const SizedBox(width: 8),
        Text(l.chestTitle),
      ]),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(l.chestBody, style: const TextStyle(color: AppColors.mutedForeground)),
          const SizedBox(height: 16),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            alignment: WrapAlignment.center,
            children: [
              for (var day = 1; day <= 7; day++)
                Container(
                  width: 52,
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  decoration: BoxDecoration(
                    color: day <= streak && !canClaim ? AppColors.accent.withValues(alpha: 0.25) : AppColors.background,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: day == 7 ? AppColors.secondary : AppColors.border),
                  ),
                  child: Column(children: [
                    Text(l.chestStreakDay(day), style: const TextStyle(fontSize: 10, color: AppColors.mutedForeground)),
                    Text('${DailyChest.rewardFor(day)}', style: const TextStyle(fontWeight: FontWeight.w900)),
                  ]),
                ),
            ],
          ),
          if (_message != null) ...[
            const SizedBox(height: 16),
            Text(_message!, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
          ],
          const SizedBox(height: 16),
          if (canClaim)
            FilledButton(onPressed: _busy ? null : _open, child: Text(l.chestOpen))
          else if (canBonus || _bonusUnavailable)
            OutlinedButton(
              onPressed: _busy || _bonusUnavailable ? null : _bonus,
              child: Text(_bonusUnavailable ? l.noVideo : l.chestBonus),
            )
          else if (_message == null)
            Text(m.capabilities.freeDailyChest ? l.chestAlreadyOpened : l.chestServerSoon, textAlign: TextAlign.center),
        ],
      ),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: Text(l.close))],
    );
  }
}
