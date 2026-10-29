import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/game_controller.dart';
import '../../application/monetization_controller.dart';
import '../../domain/models/protocol_models.dart';
import '../../domain/monetization/ad_policy.dart';
import '../../l10n/app_localizations.dart';
import '../theme.dart';
import '../widgets/character_card.dart';
import '../widgets/common.dart';
import '../widgets/game_widgets.dart';

/// Fin de partie : résultat, révélation, Éclats (et « Doubler »), revanche,
/// récapitulatif. L'interstitiel éventuel n'apparaît qu'en quittant l'écran,
/// jamais si une revanche est en jeu.
class EndedScreen extends ConsumerStatefulWidget {
  const EndedScreen({super.key});

  @override
  ConsumerState<EndedScreen> createState() => _EndedScreenState();
}

class _EndedScreenState extends ConsumerState<EndedScreen> {
  bool _doubling = false;
  bool _noVideo = false;
  bool _offerLogged = false;

  Future<void> _backHome() async {
    final game = ref.read(gameControllerProvider);
    final controller = ref.read(gameControllerProvider.notifier);
    final humanWaiting = !game.vsBot && game.rematchRequestedBy != null && !game.opponentLeft;
    final duration = controller.lastGameDuration;
    controller.leaveGame();
    unawaited(ref.read(monetizationControllerProvider.notifier).maybeShowPostGameInterstitial(
          lastGameDuration: duration,
          humanWaiting: humanWaiting,
        ));
  }

  Future<void> _double() async {
    final l = AppLocalizations.of(context);
    setState(() => _doubling = true);
    final credited = await ref.read(monetizationControllerProvider.notifier).doubleLastGameReward();
    if (!mounted) return;
    setState(() {
      _doubling = false;
      _noVideo = credited == null;
    });
    if (credited != null) showToast(context, l.shardsDoubled);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final game = ref.watch(gameControllerProvider);
    final reward = ref.watch(monetizationControllerProvider.select((s) => s.lastGameReward));
    final monetization = ref.read(monetizationControllerProvider.notifier);
    final controller = ref.read(gameControllerProvider.notifier);

    final isWinner = game.isWinner;
    final reason = game.gameOverReason;
    final isDisconnect = reason == GameOverReason.opponentLeft;
    final opponentCharacter = game.revealedOpponentCharacter;
    final hasFreeAnswersFromOpponent =
        game.gameLog.whereType<QnaEntry>().any((e) => !e.verified && e.askerId == game.myPlayerId);
    final accent = isWinner ? AppColors.success : AppColors.destructive;

    final canDouble = reward != null &&
        reward.amount > 0 &&
        !reward.doubled &&
        monetization.rewardedDecision(AdPlacement.rwDoubleShards, AdScreen.ended).allowed;
    if (canDouble && !_offerLogged) {
      _offerLogged = true;
      monetization.logRewardedOffer(AdPlacement.rwDoubleShards);
    }

    final subtitle = switch (reason) {
      GameOverReason.outOfLives => isWinner ? l.outOfLivesOpponent : l.outOfLivesMe,
      GameOverReason.correctGuess => isWinner ? l.guessedRight : l.opponentGuessed,
      GameOverReason.opponentLeft => l.opponentQuit,
      null => '',
    };

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _backHome();
      },
      child: Scaffold(
        body: Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [accent.withValues(alpha: 0.14), AppColors.background],
            ),
          ),
          child: SafeArea(
            child: Center(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 480),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    // Signaler / bloquer reste possible tant qu'on est dans la salle.
                    if (!game.vsBot && game.opponent != null)
                      Align(
                        alignment: Alignment.centerRight,
                        child: OpponentMenuButton(opponentName: game.opponent!.name),
                      ),
                    Center(
                      child: Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(shape: BoxShape.circle, color: accent.withValues(alpha: 0.2)),
                        child: Icon(isWinner ? Icons.emoji_events : Icons.sentiment_dissatisfied, size: 56, color: accent),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      (isDisconnect ? l.victoryByForfeit : (isWinner ? l.victory : l.defeat)).toUpperCase(),
                      key: const Key('result-title'),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: isDisconnect ? 34 : 48,
                        fontWeight: FontWeight.w900,
                        fontStyle: isWinner ? FontStyle.italic : FontStyle.normal,
                        color: accent,
                        letterSpacing: -1,
                      ),
                    ),
                    Text(subtitle.toUpperCase(),
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            fontWeight: FontWeight.w800, letterSpacing: 1.5, color: AppColors.mutedForeground)),
                    const SizedBox(height: 16),
                    if (game.ratingUpdate != null)
                      _Pill(
                        child: game.ratingUpdate!.ranked
                            ? Text(
                                l.ratingLine(
                                  game.ratingUpdate!.rating,
                                  '${game.ratingUpdate!.delta >= 0 ? '+' : ''}${game.ratingUpdate!.delta}',
                                ),
                                style: TextStyle(
                                  fontWeight: FontWeight.w800,
                                  color: game.ratingUpdate!.delta >= 0 ? AppColors.success : AppColors.destructive,
                                ),
                              )
                            : Text(l.unranked, style: const TextStyle(color: AppColors.mutedForeground)),
                      ),
                    if (game.vsBot)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text(l.trainingGame,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.mutedForeground)),
                      ),
                    if (reward != null && reward.amount > 0) ...[
                      const SizedBox(height: 12),
                      _Pill(
                        child: Wrap(
                          alignment: WrapAlignment.center,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 6,
                          children: [
                            const Icon(Icons.diamond_outlined, color: AppColors.accent, size: 18),
                            Text(l.shardsEarned(reward.doubled ? reward.amount * 2 : reward.amount),
                                style: const TextStyle(fontWeight: FontWeight.w900)),
                            if (canDouble || _noVideo)
                              TextButton(
                                onPressed: _doubling || _noVideo ? null : _double,
                                child: Text(_noVideo ? l.noVideo : l.doubleShards),
                              ),
                          ],
                        ),
                      ),
                    ],
                    if (!isDisconnect && opponentCharacter != null) ...[
                      const SizedBox(height: 20),
                      SectionLabel(l.theirSecret, textAlign: TextAlign.center),
                      const SizedBox(height: 10),
                      Center(
                        child: SizedBox(
                          width: 220,
                          child: CharacterCard(key: const Key('revealed-card'), character: opponentCharacter, compact: false),
                        ),
                      ),
                    ],
                    if (!game.opponentLeft && !isDisconnect) ...[
                      const SizedBox(height: 16),
                      const ReactionRow(showMute: false),
                    ],
                    const SizedBox(height: 16),
                    if (game.opponentLeft && !isDisconnect)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Text(l.opponentQuit.toUpperCase(),
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.mutedForeground)),
                      ),
                    if (!isDisconnect && !game.opponentLeft) ...[
                      if (game.rematchRequestedBy == game.myPlayerId)
                        FilledButton(onPressed: null, child: Text(l.waitingOpponent))
                      else if (game.rematchRequestedBy != null)
                        FilledButton.icon(
                          key: const Key('accept-rematch'),
                          style: FilledButton.styleFrom(backgroundColor: AppColors.secondary),
                          onPressed: controller.acceptRematch,
                          icon: const Icon(Icons.replay),
                          label: Text(l.acceptRematch),
                        )
                      else
                        FilledButton.icon(
                          key: const Key('rematch'),
                          onPressed: controller.requestRematch,
                          icon: const Icon(Icons.replay),
                          label: Text(l.rematch),
                        ),
                      const SizedBox(height: 10),
                    ],
                    OutlinedButton.icon(
                      key: const Key('back-home'),
                      onPressed: _backHome,
                      icon: const Icon(Icons.home_outlined),
                      label: Text(l.backHome),
                    ),
                    if (game.gameLog.isNotEmpty) ...[
                      const SizedBox(height: 28),
                      SectionLabel(l.recapTitle, textAlign: TextAlign.center),
                      if (hasFreeAnswersFromOpponent && opponentCharacter != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 6),
                          child: Text(l.recapCompare(opponentCharacter.name),
                              textAlign: TextAlign.center,
                              style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                        ),
                      const SizedBox(height: 10),
                      for (final entry in game.gameLog)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: LogEntryView(
                            entry: entry,
                            myPlayerId: game.myPlayerId,
                            opponentName: game.opponent?.name,
                            characters: game.characters,
                          ),
                        ),
                    ],
                  ]),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) => Center(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: AppColors.card.withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: child,
        ),
      );
}
