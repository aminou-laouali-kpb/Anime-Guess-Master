import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/game_controller.dart';
import '../../application/monetization_controller.dart';
import '../../domain/models/protocol_models.dart';
import '../../domain/monetization/ad_policy.dart';
import '../../domain/monetization/products.dart';
import '../../l10n/app_localizations.dart';
import '../theme.dart';
import '../widgets/common.dart';
import '../widgets/game_widgets.dart';
import 'daily_chest_dialog.dart';
import 'leaderboard_screen.dart';
import 'shop_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _nameDialogOpen = false;
  bool _consentDialogOpen = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (ref.read(gameControllerProvider).myName.isEmpty) _editName(required: true);
      _maybeShowMonetizationPrompts(ref.read(monetizationControllerProvider));
    });
  }

  Future<void> _editName({bool required = false}) async {
    if (_nameDialogOpen) return;
    _nameDialogOpen = true;
    final current = ref.read(gameControllerProvider).myName;
    final name = await showDialog<String>(
      context: context,
      barrierDismissible: !required,
      builder: (_) => _NameDialog(initial: current, required: required),
    );
    _nameDialogOpen = false;
    if (name != null && name.trim().isNotEmpty) {
      ref.read(gameControllerProvider.notifier).setMyName(name);
    }
  }

  /// Le nom est demandé d'office tant qu'il manque : en pratique il est
  /// toujours connu quand un bouton est utilisé.
  void _withName(VoidCallback action) {
    if (ref.read(gameControllerProvider).myName.isEmpty) {
      _editName(required: true);
    } else {
      action();
    }
  }

  /// Écran explicatif ATT (après la 2e partie) et proposition « Sans pub ».
  Future<void> _maybeShowMonetizationPrompts(MonetizationState m) async {
    if (!mounted || _consentDialogOpen || _nameDialogOpen) return;
    final l = AppLocalizations.of(context);
    final controller = ref.read(monetizationControllerProvider.notifier);
    if (m.trackingPromptPending) {
      _consentDialogOpen = true;
      final go = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          title: Text(l.trackingTitle),
          content: Text(l.trackingBody),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.notNow)),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l.continueLabel)),
          ],
        ),
      );
      _consentDialogOpen = false;
      if (go == true) {
        await controller.requestTracking();
      } else {
        controller.skipTrackingPrompt();
      }
      return;
    }
    if (m.noAdsUpsellPending) {
      _consentDialogOpen = true;
      controller.onNoAdsUpsellShown();
      final open = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(l.upsellTitle),
          content: Text(l.upsellBody(controller.priceOf(Products.noAds))),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l.notNow)),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: Text(l.upsellCta)),
          ],
        ),
      );
      _consentDialogOpen = false;
      if (open == true && mounted) {
        controller.onNoAdsUpsellClicked();
        _openShop('upsell');
      }
    }
  }

  void _openShop(String source) {
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ShopScreen(source: source)));
  }

  Future<void> _joinWithCode() async {
    final code = await showDialog<String>(context: context, builder: (_) => const _JoinCodeDialog());
    if (code != null && code.isNotEmpty) ref.read(gameControllerProvider.notifier).joinRoom(code);
  }

  Future<void> _chooseBotLevel() async {
    final l = AppLocalizations.of(context);
    final level = await showDialog<BotLevel>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.botDialogTitle),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(l.botDialogBody, style: const TextStyle(color: AppColors.mutedForeground)),
              const SizedBox(height: 12),
              for (final (level, label, hint) in [
                (BotLevel.easy, l.botEasy, l.botEasyHint),
                (BotLevel.normal, l.botNormal, l.botNormalHint),
                (BotLevel.hard, l.botHard, l.botHardHint),
              ])
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      alignment: Alignment.centerLeft,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                    onPressed: () => Navigator.pop(ctx, level),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(label, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
                      Text(hint,
                          style: const TextStyle(
                              fontSize: 12, fontWeight: FontWeight.w400, color: AppColors.mutedForeground)),
                    ]),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
    if (level != null) ref.read(gameControllerProvider.notifier).playVsBot(level);
  }

  void _howToPlay() {
    final l = AppLocalizations.of(context);
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l.howToTitle),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final p in [l.howTo1, l.howTo2, l.howTo3, l.howTo4])
                Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(p, style: const TextStyle(height: 1.4))),
            ],
          ),
        ),
        actions: [FilledButton(onPressed: () => Navigator.pop(ctx), child: Text(l.understood))],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final game = ref.watch(gameControllerProvider);
    final controller = ref.read(gameControllerProvider.notifier);
    final statsEnabled = game.myStats?.enabled ?? false;
    ref.listen<MonetizationState>(monetizationControllerProvider, (prev, next) {
      if ((next.trackingPromptPending && !(prev?.trackingPromptPending ?? false)) ||
          (next.noAdsUpsellPending && !(prev?.noAdsUpsellPending ?? false))) {
        _maybeShowMonetizationPrompts(next);
      }
    });

    return Scaffold(
      body: Stack(
        children: [
          const _GlowBackground(),
          SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: Row(
                    children: [
                      ShardsBadge(onTap: () => _openShop('home')),
                      const Spacer(),
                      IconButton(
                        tooltip: l.homeDailyChest,
                        onPressed: () => showDailyChestDialog(context),
                        icon: const Icon(Icons.card_giftcard, color: AppColors.secondary),
                      ),
                      IconButton(
                        tooltip: l.settingsTitle,
                        onPressed: () => showSettingsSheet(context),
                        icon: const Icon(Icons.settings_outlined),
                      ),
                      IconButton(
                        tooltip: l.homeShop,
                        onPressed: () => _openShop('home'),
                        icon: const Icon(Icons.storefront_outlined),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Center(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 440),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const _Logo(),
                            const SizedBox(height: 8),
                            Text(
                              l.homeTagline.toUpperCase(),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: AppColors.mutedForeground,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 2,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 28),
                            if (game.myName.isNotEmpty) ...[
                              _NameCard(name: game.myName, onEdit: _editName),
                              const SizedBox(height: 20),
                            ],
                            FilledButton.icon(
                              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(64)),
                              onPressed: () => _withName(controller.joinQueue),
                              icon: const Icon(Icons.sports_esports, size: 26),
                              label: Text(l.homeQuickPlay, style: const TextStyle(fontSize: 18)),
                            ),
                            const SizedBox(height: 12),
                            FilledButton.icon(
                              style: FilledButton.styleFrom(
                                backgroundColor: AppColors.secondary,
                                minimumSize: const Size.fromHeight(56),
                              ),
                              onPressed: () => _withName(controller.createPrivateRoom),
                              icon: const Icon(Icons.group),
                              label: Text(l.homeCreatePrivate),
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(56)),
                              onPressed: () => _withName(_joinWithCode),
                              icon: const Icon(Icons.group_add_outlined),
                              label: Text(l.homeJoinWithCode),
                            ),
                            const SizedBox(height: 12),
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(56)),
                              onPressed: () => _withName(_chooseBotLevel),
                              icon: const Icon(Icons.smart_toy_outlined),
                              label: Text(l.homeVsComputer),
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                if (statsEnabled)
                                  Expanded(
                                    child: TextButton.icon(
                                      onPressed: () => Navigator.of(context).push(
                                        MaterialPageRoute<void>(builder: (_) => const LeaderboardScreen()),
                                      ),
                                      icon: const Icon(Icons.emoji_events_outlined),
                                      label: Text(l.homeLeaderboard),
                                    ),
                                  ),
                                Expanded(
                                  child: TextButton.icon(
                                    onPressed: _howToPlay,
                                    icon: const Icon(Icons.help_outline),
                                    label: Text(l.homeHowToPlay),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                const AdBannerSlot(placement: AdPlacement.banHome, screen: AdScreen.home),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GlowBackground extends StatelessWidget {
  const _GlowBackground();

  @override
  Widget build(BuildContext context) {
    Widget blob(Color c) => Container(
          width: 320,
          height: 320,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(colors: [c.withValues(alpha: 0.22), c.withValues(alpha: 0)]),
          ),
        );
    return Positioned.fill(
      child: IgnorePointer(
        child: Stack(children: [
          Positioned(top: -90, left: -90, child: blob(AppColors.primary)),
          Positioned(bottom: -90, right: -90, child: blob(AppColors.secondary)),
        ]),
      ),
    );
  }
}

class _Logo extends StatelessWidget {
  const _Logo();

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Semantics(
      header: true,
      label: l.appTitle,
      excludeSemantics: true,
      child: Transform(
        alignment: Alignment.center,
        transform: Matrix4.skewX(-math.pi / 30),
        child: ShaderMask(
          shaderCallback: (rect) => kTitleGradient.createShader(rect),
          child: const Text(
            'ANIME\nWHO',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 64,
              height: 0.95,
              fontWeight: FontWeight.w900,
              fontStyle: FontStyle.italic,
              letterSpacing: -2,
              color: Colors.white,
            ),
          ),
        ),
      ),
    );
  }
}

class _NameCard extends StatelessWidget {
  const _NameCard({required this.name, required this.onEdit});
  final String name;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              SectionLabel(l.homeNicknameLabel),
              Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            ]),
          ),
          TextButton(onPressed: onEdit, child: Text(l.homeEdit)),
        ]),
      ),
    );
  }
}

class _NameDialog extends StatefulWidget {
  const _NameDialog({required this.initial, required this.required});
  final String initial;
  final bool required;

  @override
  State<_NameDialog> createState() => _NameDialogState();
}

class _NameDialogState extends State<_NameDialog> {
  late final _controller = TextEditingController(text: widget.initial);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final v = _controller.text.trim();
    if (v.isNotEmpty) Navigator.pop(context, v);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return PopScope(
      canPop: !widget.required,
      child: AlertDialog(
        title: Text(l.nameDialogTitle),
        content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(l.nameDialogBody, style: const TextStyle(color: AppColors.mutedForeground)),
          const SizedBox(height: 16),
          TextField(
            key: const Key('name-field'),
            controller: _controller,
            autofocus: true,
            maxLength: 20,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
            onChanged: (_) => setState(() {}),
            decoration: InputDecoration(labelText: l.homeNicknameLabel, hintText: l.nameHint),
          ),
        ]),
        actions: [
          FilledButton(
            key: const Key('name-submit'),
            onPressed: _controller.text.trim().isEmpty ? null : _submit,
            child: Text(l.saveAndContinue),
          ),
        ],
      ),
    );
  }
}

class _JoinCodeDialog extends StatefulWidget {
  const _JoinCodeDialog();

  @override
  State<_JoinCodeDialog> createState() => _JoinCodeDialogState();
}

class _JoinCodeDialogState extends State<_JoinCodeDialog> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final v = _controller.text.trim().toUpperCase();
    if (v.isNotEmpty) Navigator.pop(context, v);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return AlertDialog(
      title: Text(l.joinDialogTitle),
      content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(l.joinDialogBody, style: const TextStyle(color: AppColors.mutedForeground)),
        const SizedBox(height: 16),
        TextField(
          controller: _controller,
          autofocus: true,
          maxLength: 6,
          textAlign: TextAlign.center,
          textCapitalization: TextCapitalization.characters,
          inputFormatters: [
            FilteringTextInputFormatter.allow(RegExp('[A-Za-z0-9]')),
            TextInputFormatter.withFunction((_, v) => v.copyWith(text: v.text.toUpperCase())),
          ],
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => _submit(),
          style: const TextStyle(fontSize: 26, letterSpacing: 10, fontWeight: FontWeight.w800, fontFamily: 'monospace'),
          decoration: InputDecoration(labelText: l.joinCodeLabel, hintText: 'ABCDEF', counterText: ''),
        ),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: Text(l.cancel)),
        FilledButton.icon(
          onPressed: _controller.text.trim().isEmpty ? null : _submit,
          icon: const Icon(Icons.arrow_forward),
          label: Text(l.joinSubmit),
        ),
      ],
    );
  }
}
