import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/game_controller.dart';
import '../../application/monetization_controller.dart';
import '../../application/providers.dart';
import '../../domain/game/game_state.dart';
import '../../domain/models/character.dart';
import '../../domain/models/protocol_models.dart';
import '../../domain/monetization/ad_policy.dart';
import '../../l10n/app_localizations.dart';
import '../theme.dart';
import 'character_card.dart';

/// Compte à rebours : seul ce petit widget se redessine 4 fois par seconde,
/// pas tout l'écran (comme `Countdown` du web).
class Countdown extends StatefulWidget {
  const Countdown({super.key, required this.deadline, required this.builder});
  final DateTime? deadline;
  final Widget Function(BuildContext context, int seconds, bool urgent) builder;

  @override
  State<Countdown> createState() => _CountdownState();
}

class _CountdownState extends State<Countdown> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _restart();
  }

  @override
  void didUpdateWidget(Countdown old) {
    super.didUpdateWidget(old);
    if (old.deadline != widget.deadline) _restart();
  }

  void _restart() {
    _timer?.cancel();
    if (widget.deadline == null) return;
    _timer = Timer.periodic(const Duration(milliseconds: 250), (_) {
      if (mounted) setState(() {});
      if (DateTime.now().isAfter(widget.deadline!)) _timer?.cancel();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final deadline = widget.deadline;
    if (deadline == null) return const SizedBox.shrink();
    final seconds = TurnTimer(actingPlayerId: null, deadline: deadline).secondsLeft(DateTime.now());
    return widget.builder(context, seconds, seconds <= 10);
  }
}

/// Cœurs de vies.
class LivesRow extends StatelessWidget {
  const LivesRow({super.key, required this.lives, required this.color, required this.semanticsName});
  final int lives;
  final Color color;
  final String semanticsName;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Semantics(
      label: l.livesSemantics(semanticsName, lives),
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (var i = 0; i < kMaxLives; i++)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 1),
              child: Icon(
                i < lives ? Icons.favorite : Icons.favorite_border,
                size: 20,
                color: i < lives ? color : AppColors.mutedForeground.withValues(alpha: 0.35),
              ),
            ),
        ],
      ),
    );
  }
}

/// Bouton d'abandon avec confirmation. En partie (hors ordinateur) le serveur
/// le compte comme une défaite.
class LeaveGameButton extends ConsumerWidget {
  const LeaveGameButton({super.key, required this.countsAsLoss});
  final bool countsAsLoss;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    return IconButton(
      tooltip: l.leaveTooltip,
      icon: const Icon(Icons.flag_outlined, color: AppColors.mutedForeground),
      onPressed: () async {
        final ok = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(l.leaveTitle),
            content: Text(countsAsLoss ? l.leaveBodyLoss : l.leaveBodyNoLoss),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.keepPlaying)),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: AppColors.guessRed, minimumSize: const Size(0, 44)),
                onPressed: () => Navigator.pop(ctx, true),
                child: Text(l.abandon),
              ),
            ],
          ),
        );
        if (ok == true) ref.read(gameControllerProvider.notifier).leaveGame();
      },
    );
  }
}

/// Petit rappel de mon personnage secret ; touché : sa fiche complète.
class MyCharacterChip extends StatelessWidget {
  const MyCharacterChip({super.key, required this.character});
  final Character? character;

  @override
  Widget build(BuildContext context) {
    final c = character;
    if (c == null) return const SizedBox.shrink();
    final l = AppLocalizations.of(context);
    return Semantics(
      button: true,
      label: l.mySecretTitle,
      child: GestureDetector(
        onTap: () => showDialog<void>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(l.mySecretTitle),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(l.mySecretBody, style: const TextStyle(color: AppColors.mutedForeground)),
                const SizedBox(height: 12),
                SizedBox(width: 200, child: CharacterCard(character: c, compact: false)),
              ],
            ),
            actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.close))],
          ),
        ),
        child: Container(
          width: 40,
          height: 52,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: AppColors.primary, width: 2),
          ),
          clipBehavior: Clip.antiAlias,
          child: Portrait(character: c),
        ),
      ),
    );
  }
}

/// Emplacement de bannière : n'affiche rien si la règle l'interdit
/// (écran, `no_ads`, coupe-circuit).
class AdBannerSlot extends ConsumerWidget {
  const AdBannerSlot({super.key, required this.placement, required this.screen});
  final AdPlacement placement;
  final AdScreen screen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final hasNoAds = ref.watch(monetizationControllerProvider.select((s) => s.hasNoAds));
    final allowed = ref.watch(adPolicyProvider).bannerAllowed(placement, screen: screen, hasNoAds: hasNoAds);
    if (!allowed) return const SizedBox.shrink();
    return ref.watch(adsServiceProvider).buildBanner(placement);
  }
}

/// Solde d'Éclats (pastille).
class ShardsBadge extends ConsumerWidget {
  const ShardsBadge({super.key, this.onTap});
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final balance = ref.watch(monetizationControllerProvider.select((s) => s.wallet.balance));
    final l = AppLocalizations.of(context);
    return Material(
      color: AppColors.card,
      shape: StadiumBorder(side: BorderSide(color: AppColors.accent.withValues(alpha: 0.6))),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.diamond_outlined, size: 18, color: AppColors.accent),
            const SizedBox(width: 6),
            Text(l.shardsBalance(balance), style: const TextStyle(fontWeight: FontWeight.w800)),
          ]),
        ),
      ),
    );
  }
}

/// Titre de section en petites capitales grises.
class SectionLabel extends StatelessWidget {
  const SectionLabel(this.text, {super.key, this.textAlign});
  final String text;
  final TextAlign? textAlign;

  @override
  Widget build(BuildContext context) => Text(
        text.toUpperCase(),
        textAlign: textAlign,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.2,
          color: AppColors.mutedForeground,
        ),
      );
}

/// Affiche un message court (toast).
void showToast(BuildContext context, String message, {Color? color, SnackBarAction? action, Duration? duration}) {
  final messenger = ScaffoldMessenger.maybeOf(context);
  if (messenger == null) return;
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(
      content: Text(message, style: const TextStyle(fontWeight: FontWeight.w700)),
      backgroundColor: color,
      action: action,
      duration: duration ?? const Duration(seconds: 4),
    ));
}
