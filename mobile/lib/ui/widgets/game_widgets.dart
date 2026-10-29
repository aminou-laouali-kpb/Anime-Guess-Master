import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/game_controller.dart';
import '../../application/monetization_controller.dart';
import '../../domain/game/client_events.dart';
import '../../domain/game/game_state.dart';
import '../../domain/models/character.dart';
import '../../domain/models/protocol_models.dart';
import '../../l10n/app_localizations.dart';
import '../../l10n/trait_labels.dart';
import '../theme.dart';
import 'common.dart';

String reactionLabel(AppLocalizations l, String emoji) => switch (emoji) {
      '👍' => l.reactionThumbsUp,
      '😂' => l.reactionLaugh,
      '😮' => l.reactionSurprised,
      '😅' => l.reactionAwkward,
      '🤔' => l.reactionThinking,
      '😱' => l.reactionShocked,
      '🔥' => l.reactionFire,
      '👏' => l.reactionClap,
      _ => emoji,
    };

/// Rangée d'émojis + bouton pour masquer les réactions de l'adversaire.
class ReactionRow extends ConsumerWidget {
  const ReactionRow({super.key, this.onSent, this.showMute = true});
  final VoidCallback? onSent;
  final bool showMute;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final muted = ref.watch(gameControllerProvider.select((s) => s.reactionsMuted));
    final controller = ref.read(gameControllerProvider.notifier);
    return Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        for (final emoji in kReactions)
          Semantics(
            button: true,
            label: reactionLabel(l, emoji),
            excludeSemantics: true,
            child: InkResponse(
              onTap: () {
                controller.sendReaction(emoji);
                onSent?.call();
              },
              radius: 22,
              child: Padding(padding: const EdgeInsets.all(6), child: Text(emoji, style: const TextStyle(fontSize: 26))),
            ),
          ),
        if (showMute)
          IconButton(
            tooltip: muted ? l.unmuteReactions : l.muteReactions,
            onPressed: () => controller.setReactionsMuted(!muted),
            icon: Icon(muted ? Icons.volume_off : Icons.volume_up, color: AppColors.mutedForeground),
          ),
      ],
    );
  }
}

/// Bouton compact du HUD qui ouvre la rangée d'émojis.
class ReactionPickerButton extends StatelessWidget {
  const ReactionPickerButton({super.key});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return IconButton(
      tooltip: l.sendReaction,
      icon: const Icon(Icons.add_reaction_outlined),
      onPressed: () => showModalBottomSheet<void>(
        context: context,
        backgroundColor: AppColors.card,
        builder: (ctx) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: ReactionRow(onSent: () => Navigator.pop(ctx)),
          ),
        ),
      ),
    );
  }
}

/// Émojis flottants : les miens montent du bas, ceux de l'adversaire
/// descendent du haut.
class FloatingReactions extends ConsumerWidget {
  const FloatingReactions({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reactions = ref.watch(gameControllerProvider.select((s) => s.reactions));
    final myId = ref.watch(gameControllerProvider.select((s) => s.myPlayerId));
    final hasOpponent = ref.watch(gameControllerProvider.select((s) => s.players.length >= 2));
    if (!hasOpponent || reactions.isEmpty) return const SizedBox.shrink();
    return IgnorePointer(
      child: Stack(
        children: [
          for (final r in reactions) _FloatingEmoji(key: ValueKey(r.id), reaction: r, mine: r.playerId == myId),
        ],
      ),
    );
  }
}

class _FloatingEmoji extends StatelessWidget {
  const _FloatingEmoji({super.key, required this.reaction, required this.mine});
  final LiveReaction reaction;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    final dx = (((reaction.id * 37) % 60) - 30).toDouble();
    final size = MediaQuery.sizeOf(context);
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: kReactionLifetime,
      builder: (context, t, child) {
        final travel = 140 * t;
        final opacity = t < 0.15 ? t / 0.15 : (t > 0.75 ? (1 - t) / 0.25 : 1.0);
        return Positioned(
          left: size.width / 2 - 28 + dx,
          top: mine ? null : 110 + travel,
          bottom: mine ? 170 + travel : null,
          child: Opacity(opacity: opacity.clamp(0, 1), child: Transform.scale(scale: 0.8 + 0.4 * t, child: child)),
        );
      },
      child: Text(reaction.emoji, style: const TextStyle(fontSize: 48)),
    );
  }
}

/// Une ligne du journal de partie (et du récapitulatif de fin).
class LogEntryView extends StatelessWidget {
  const LogEntryView({
    super.key,
    required this.entry,
    required this.myPlayerId,
    required this.opponentName,
    required this.characters,
  });

  final GameLogEntry entry;
  final String? myPlayerId;
  final String? opponentName;
  final List<Character> characters;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final labels = TraitLabels.of(Localizations.localeOf(context).languageCode);
    final opponent = opponentName ?? l.opponentDefault;
    String who(String id) => id == myPlayerId ? l.you : opponent;

    Widget box({required Color color, required Widget child}) => Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.10),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: color.withValues(alpha: 0.35)),
          ),
          child: child,
        );

    switch (entry) {
      case QnaEntry e:
        final text = e.verified && e.attribute != null && e.value != null
            ? labels.question(l, e.attribute!, e.value!)
            : (e.question ?? '');
        final yes = e.answer == Answer.yes;
        return box(
          color: AppColors.mutedForeground,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(
                child: Text(l.logAsker(who(e.askerId)),
                    style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.primary)),
              ),
              Icon(e.verified ? Icons.verified_user_outlined : Icons.help_outline,
                  size: 14, color: e.verified ? AppColors.success : AppColors.mutedForeground),
              const SizedBox(width: 4),
              Text(
                (e.verified ? l.logVerified : l.logUnverified).toUpperCase(),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: e.verified ? AppColors.success : AppColors.mutedForeground,
                ),
              ),
            ]),
            const SizedBox(height: 4),
            Text('« $text »', style: const TextStyle(fontStyle: FontStyle.italic)),
            const SizedBox(height: 6),
            Row(children: [
              Text(l.logAnswer.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.w900)),
              const SizedBox(width: 6),
              Text(
                (yes ? l.answerYesLower : l.answerNoLower).toUpperCase(),
                style: TextStyle(fontWeight: FontWeight.w900, color: yes ? AppColors.success : AppColors.destructive),
              ),
            ]),
          ]),
        );
      case GuessEntry e:
        final guessed = characters.where((c) => c.id == e.guessedCharacterId).firstOrNull;
        return box(
          color: AppColors.destructive,
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(l.logGuessed(who(e.guesserId)),
                style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.destructive)),
            Text(guessed?.name ?? '?', style: const TextStyle(fontWeight: FontWeight.w800)),
            Text(l.logMissed.toUpperCase(),
                style: const TextStyle(fontWeight: FontWeight.w900, color: AppColors.destructive)),
          ]),
        );
      case TimeoutEntry e:
        return box(
          color: AppColors.warning,
          child: Text(l.logTimeout(who(e.playerId)),
              style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.warning)),
        );
    }
  }
}

/// Bandeau « reconnexion en cours » et dialogue « connexion remplacée ».
class ConnectionStatusOverlay extends ConsumerWidget {
  const ConnectionStatusOverlay({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final replaced = ref.watch(gameControllerProvider.select((s) => s.connectionReplaced));
    final connected = ref.watch(gameControllerProvider.select((s) => s.isConnected));
    final once = ref.watch(gameControllerProvider.select((s) => s.hasConnectedOnce));

    final outdated = ref.watch(gameControllerProvider.select((s) => s.appOutdatedMessage));
    if (outdated != null) {
      // TODO(publication) : bouton vers la fiche du store (url_launcher).
      return Positioned.fill(
        child: ColoredBox(
          color: AppColors.background,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.system_update, size: 40, color: AppColors.primary),
                    const SizedBox(height: 12),
                    Text(l.appOutdatedTitle, style: Theme.of(context).textTheme.headlineSmall),
                    const SizedBox(height: 8),
                    Text(outdated.isEmpty ? l.appOutdatedFallback : outdated,
                        key: const Key('app-outdated'), textAlign: TextAlign.center),
                  ]),
                ),
              ),
            ),
          ),
        ),
      );
    }

    if (replaced) {
      return Positioned.fill(
        child: ColoredBox(
          color: AppColors.background.withValues(alpha: 0.95),
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.wifi_off, size: 40, color: AppColors.mutedForeground),
                    const SizedBox(height: 12),
                    Text(l.connectionReplacedTitle, style: Theme.of(context).textTheme.headlineSmall),
                    const SizedBox(height: 8),
                    Text(l.connectionReplacedBody,
                        textAlign: TextAlign.center, style: const TextStyle(color: AppColors.mutedForeground)),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: FilledButton(
                        onPressed: () => ref.read(gameControllerProvider.notifier).resumeHere(),
                        child: Text(l.resumeHere),
                      ),
                    ),
                  ]),
                ),
              ),
            ),
          ),
        ),
      );
    }

    if (connected || !once) return const SizedBox.shrink();
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: Material(
        color: const Color(0xFFFEF3C7),
        child: SafeArea(
          bottom: false,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              const SizedBox(
                width: 14,
                height: 14,
                child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF78350F)),
              ),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  l.connectionLost,
                  style: const TextStyle(color: Color(0xFF451A03), fontWeight: FontWeight.w800, fontSize: 13),
                ),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

String reportReasonLabel(AppLocalizations l, ReportReason r) => switch (r) {
      ReportReason.insult => l.reasonInsult,
      ReportReason.sexual => l.reasonSexual,
      ReportReason.hate => l.reasonHate,
      ReportReason.spam => l.reasonSpam,
      ReportReason.cheating => l.reasonCheating,
      ReportReason.other => l.reasonOther,
    };

/// Menu « Signaler / Bloquer » sur l'adversaire humain (Apple 1.2, spec §6).
class OpponentMenuButton extends ConsumerWidget {
  const OpponentMenuButton({super.key, required this.opponentName});
  final String opponentName;

  Future<void> _report(BuildContext context, WidgetRef ref) async {
    final l = AppLocalizations.of(context);
    final reason = await showDialog<ReportReason>(
      context: context,
      builder: (ctx) {
        var selected = ReportReason.insult;
        return StatefulBuilder(
          builder: (ctx, setState) => AlertDialog(
            title: Text(l.reportTitle(opponentName)),
            content: SingleChildScrollView(
              child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(l.reportBody, style: const TextStyle(color: AppColors.mutedForeground)),
                const SizedBox(height: 8),
                RadioGroup<ReportReason>(
                  groupValue: selected,
                  onChanged: (v) => setState(() => selected = v ?? selected),
                  child: Column(children: [
                    for (final r in ReportReason.values)
                      RadioListTile<ReportReason>(
                        value: r,
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Text(reportReasonLabel(l, r)),
                      ),
                  ]),
                ),
              ]),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l.cancel)),
              FilledButton(onPressed: () => Navigator.pop(ctx, selected), child: Text(l.reportSend)),
            ],
          ),
        );
      },
    );
    if (reason != null) ref.read(gameControllerProvider.notifier).reportOpponent(reason);
  }

  Future<void> _block(BuildContext context, WidgetRef ref) async {
    final l = AppLocalizations.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.blockTitle(opponentName)),
        content: Text(l.blockBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.guessRed, minimumSize: const Size(0, 44)),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l.blockPlayer),
          ),
        ],
      ),
    );
    if (ok == true) ref.read(gameControllerProvider.notifier).blockOpponent();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    return PopupMenuButton<String>(
      key: const Key('opponent-menu'),
      tooltip: l.playerOptions,
      icon: const Icon(Icons.more_vert, color: AppColors.mutedForeground),
      onSelected: (v) => v == 'report' ? _report(context, ref) : _block(context, ref),
      itemBuilder: (_) => [
        PopupMenuItem(value: 'report', child: ListTile(leading: const Icon(Icons.outlined_flag), title: Text(l.reportPlayer))),
        PopupMenuItem(value: 'block', child: ListTile(leading: const Icon(Icons.block), title: Text(l.blockPlayer))),
      ],
    );
  }
}

/// Réglages : questions vérifiées uniquement, joueurs bloqués, confidentialité.
Future<void> showSettingsSheet(BuildContext context) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      builder: (_) => const FractionallySizedBox(heightFactor: 0.7, child: _SettingsSheet()),
    );

class _SettingsSheet extends ConsumerWidget {
  const _SettingsSheet();

  /// Suppression du compte (Apple 5.1.1(v)) : prévient que les achats ne sont
  /// pas remboursés.
  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final l = AppLocalizations.of(context);
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.deleteAccountTitle),
        content: Text(l.deleteAccountBody),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.cancel)),
          FilledButton(
            key: const Key('confirm-delete-account'),
            style: FilledButton.styleFrom(backgroundColor: AppColors.guessRed, minimumSize: const Size(0, 44)),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l.deleteAccountConfirm),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final deleted = await ref.read(monetizationControllerProvider.notifier).deleteAccount();
    if (deleted) ref.read(gameControllerProvider.notifier).onAccountDeleted();
    if (context.mounted) showToast(context, deleted ? l.accountDeleted : l.accountDeleteFailed);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final game = ref.watch(gameControllerProvider);
    final controller = ref.read(gameControllerProvider.notifier);
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(l.settingsTitle, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          SwitchListTile(
            key: const Key('verified-only'),
            contentPadding: EdgeInsets.zero,
            value: game.verifiedOnly,
            onChanged: controller.setVerifiedOnly,
            title: Text(l.verifiedOnlyTitle),
            subtitle: Text(l.verifiedOnlyBody),
          ),
          const Divider(),
          SectionLabel(l.blockedPlayersTitle),
          if (game.blockedPlayers.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(l.noBlockedPlayers, style: const TextStyle(color: AppColors.mutedForeground)),
            ),
          for (final b in game.blockedPlayers)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(b.name.isEmpty ? l.opponentDefault : b.name),
              trailing: TextButton(onPressed: () => controller.unblock(b.key), child: Text(l.unblock)),
            ),
          const Divider(),
          TextButton.icon(
            onPressed: () => ref.read(monetizationControllerProvider.notifier).showPrivacyOptions(),
            icon: const Icon(Icons.privacy_tip_outlined),
            label: Text(l.privacyOptions),
          ),
          const Divider(),
          TextButton.icon(
            key: const Key('delete-account'),
            style: TextButton.styleFrom(foregroundColor: AppColors.destructive),
            onPressed: () => _confirmDelete(context, ref),
            icon: const Icon(Icons.delete_forever_outlined),
            label: Text(l.deleteAccount),
          ),
        ],
      ),
    );
  }
}
