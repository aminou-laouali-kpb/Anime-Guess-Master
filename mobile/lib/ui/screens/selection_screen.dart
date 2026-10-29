import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/game_controller.dart';
import '../../l10n/app_localizations.dart';
import '../theme.dart';
import '../widgets/character_card.dart';
import '../widgets/common.dart';

/// Choix du personnage secret (grille + chrono de 90 s). Aucune publicité.
class SelectionScreen extends ConsumerStatefulWidget {
  const SelectionScreen({super.key});

  @override
  ConsumerState<SelectionScreen> createState() => _SelectionScreenState();
}

class _SelectionScreenState extends ConsumerState<SelectionScreen> {
  /// Choix touché mais pas encore validé.
  String? _local;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final game = ref.watch(gameControllerProvider);
    final controller = ref.read(gameControllerProvider.notifier);
    final lockedIn = game.myCharacterId != null;
    final opponentName = game.opponent?.name ?? l.opponentDefault;
    // Si le chrono a choisi pour moi, oublier la carte touchée sans validation.
    ref.listen(gameControllerProvider.select((s) => s.myCharacterId), (_, next) {
      if (next != null && _local != null) setState(() => _local = null);
    });
    final highlighted = game.myCharacterId ?? _local;

    return PopScope(
      canPop: false,
      child: Scaffold(
        body: SafeArea(
          child: Column(children: [
            Container(
              color: AppColors.card,
              padding: const EdgeInsets.fromLTRB(16, 8, 4, 10),
              child: Row(children: [
                const SizedBox(width: 40),
                Expanded(
                  child: Column(children: [
                    Text(
                      (lockedIn ? l.selectionWaiting : l.selectionTitle).toUpperCase(),
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 4),
                    Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Flexible(
                        child: Text('${game.myName} ${lockedIn ? '✓' : '…'}',
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontWeight: FontWeight.w800,
                                color: lockedIn ? AppColors.primary : AppColors.mutedForeground)),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: Text(l.versus, style: const TextStyle(color: AppColors.border, fontWeight: FontWeight.w900)),
                      ),
                      Flexible(
                        child: Text('$opponentName ${game.opponentReady ? '✓' : '…'}',
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                                fontWeight: FontWeight.w800,
                                color: game.opponentReady ? AppColors.secondary : AppColors.mutedForeground)),
                      ),
                    ]),
                    if (!lockedIn)
                      Countdown(
                        deadline: game.timer?.deadline,
                        builder: (context, seconds, urgent) => Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(
                            l.selectionCountdown(seconds).toUpperCase(),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 1,
                              color: urgent ? AppColors.destructive : AppColors.mutedForeground,
                            ),
                          ),
                        ),
                      ),
                  ]),
                ),
                const LeaveGameButton(countsAsLoss: false),
              ]),
            ),
            Expanded(
              child: CharacterGrid(
                characters: game.characters,
                itemBuilder: (context, c) => CharacterCard(
                  key: ValueKey(c.id),
                  character: c,
                  selected: highlighted == c.id,
                  onTap: lockedIn ? null : () => setState(() => _local = c.id),
                ),
              ),
            ),
            Container(
              color: AppColors.card,
              padding: const EdgeInsets.all(14),
              child: lockedIn
                  ? Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                      if (!game.opponentReady) ...[
                        const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                        const SizedBox(width: 10),
                        Flexible(
                          child: Text(l.waitingOpponent.toUpperCase(),
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.mutedForeground)),
                        ),
                      ],
                    ])
                  : FilledButton(
                      key: const Key('confirm-character'),
                      style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54)),
                      onPressed: _local == null ? null : () => controller.selectCharacter(_local!),
                      child: Text(l.confirmChoice, style: const TextStyle(fontSize: 18)),
                    ),
            ),
          ]),
        ),
      ),
    );
  }
}
