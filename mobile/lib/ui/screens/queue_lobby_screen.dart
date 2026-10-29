import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/game_controller.dart';
import '../../domain/game/game_state.dart';
import '../../domain/models/protocol_models.dart';
import '../../domain/monetization/ad_policy.dart';
import '../../l10n/app_localizations.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Délai avant de proposer l'ordinateur pendant l'attente (comme le web).
const kQueueBotFallback = Duration(seconds: 15);

/// File d'attente (partie rapide) et salle privée en attente d'un adversaire.
class QueueLobbyScreen extends ConsumerStatefulWidget {
  const QueueLobbyScreen({super.key});

  @override
  ConsumerState<QueueLobbyScreen> createState() => _QueueLobbyScreenState();
}

class _QueueLobbyScreenState extends ConsumerState<QueueLobbyScreen> {
  Timer? _ticker;
  int _waited = 0;
  bool _copied = false;

  @override
  void initState() {
    super.initState();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      if (ref.read(gameControllerProvider).phase == GamePhase.queue) {
        setState(() => _waited++);
      }
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _copy(String code) async {
    final l = AppLocalizations.of(context);
    await Clipboard.setData(ClipboardData(text: code));
    ref.read(gameControllerProvider.notifier).logInviteShare('copy');
    if (!mounted) return;
    setState(() => _copied = true);
    showToast(context, l.codeCopied, duration: const Duration(seconds: 2));
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final game = ref.watch(gameControllerProvider);
    final controller = ref.read(gameControllerProvider.notifier);
    final inQueue = game.phase == GamePhase.queue;
    final code = game.roomCode;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) controller.leaveGame();
      },
      child: Scaffold(
        body: SafeArea(
          child: Column(children: [
            Align(
              alignment: Alignment.centerLeft,
              child: IconButton(
                tooltip: l.back,
                onPressed: controller.leaveGame,
                icon: const Icon(Icons.arrow_back),
              ),
            ),
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 440),
                    child: Column(children: [
                      const SizedBox(
                        width: 96,
                        height: 96,
                        child: CircularProgressIndicator(strokeWidth: 6, color: AppColors.primary),
                      ),
                      const SizedBox(height: 32),
                      Text(
                        (inQueue ? l.queueSearching : l.lobbyWaiting).toUpperCase(),
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w900),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        inQueue
                            ? (game.queuePosition == null ? l.queuePositionUnknown : l.queuePosition(game.queuePosition!))
                            : l.lobbySendCode,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: AppColors.mutedForeground, fontWeight: FontWeight.w600),
                      ),
                      if (inQueue && _waited >= kQueueBotFallback.inSeconds) ...[
                        const Divider(height: 48),
                        Text(l.queueNobodyYet, style: const TextStyle(color: AppColors.mutedForeground)),
                        const SizedBox(height: 8),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                          onPressed: () => controller.playVsBot(BotLevel.normal),
                          icon: const Icon(Icons.smart_toy_outlined),
                          label: Text(l.queuePlayBot),
                        ),
                      ],
                      if (!inQueue && code != null) ...[
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppColors.muted,
                            borderRadius: BorderRadius.circular(kRadius - 4),
                            border: Border.all(color: AppColors.border),
                          ),
                          child: Row(children: [
                            const SizedBox(width: 40),
                            Expanded(
                              child: SelectableText(
                                code,
                                key: const Key('room-code'),
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontSize: 30,
                                  letterSpacing: 8,
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),
                            IconButton(
                              tooltip: l.copyCode,
                              onPressed: () => _copy(code),
                              icon: Icon(_copied ? Icons.check_circle : Icons.copy,
                                  color: _copied ? AppColors.success : null),
                            ),
                          ]),
                        ),
                        const SizedBox(height: 8),
                        SectionLabel(l.lobbyCodeLabel),
                      ],
                    ]),
                  ),
                ),
              ),
            ),
            AdBannerSlot(placement: AdPlacement.banQueue, screen: inQueue ? AdScreen.queue : AdScreen.lobby),
          ]),
        ),
      ),
    );
  }
}
