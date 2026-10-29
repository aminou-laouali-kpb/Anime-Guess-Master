import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/monetization_controller.dart';
import '../../application/providers.dart';
import '../../data/monetization/purchases_service.dart';
import '../../domain/monetization/ad_policy.dart';
import '../../domain/monetization/products.dart';
import '../../l10n/app_localizations.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Boutique (§3) : Sans pub, pack de démarrage, packs d'Éclats, Éclats
/// gratuits (vidéo), Restaurer les achats. Aucune publicité sur cet écran.
class ShopScreen extends ConsumerStatefulWidget {
  const ShopScreen({super.key, this.source = 'home'});
  final String source;

  @override
  ConsumerState<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends ConsumerState<ShopScreen> {
  String? _busyProduct;
  bool _freeUnavailable = false;

  @override
  void initState() {
    super.initState();
    final controller = ref.read(monetizationControllerProvider.notifier);
    controller.logShopView(widget.source);
    controller.loadPrices();
    if (controller.rewardedDecision(AdPlacement.rwFreeShards, AdScreen.home).allowed) {
      controller.logRewardedOffer(AdPlacement.rwFreeShards);
    }
  }

  Future<void> _buy(ShopProduct product) async {
    final l = AppLocalizations.of(context);
    setState(() => _busyProduct = product.id);
    final outcome = await ref.read(monetizationControllerProvider.notifier).buy(product);
    if (!mounted) return;
    setState(() => _busyProduct = null);
    final message = switch (outcome.status) {
      PurchaseStatus.success => l.purchaseSuccess,
      PurchaseStatus.pending => l.purchasePending,
      PurchaseStatus.cancelled => null,
      PurchaseStatus.failed => l.purchaseFailed,
      PurchaseStatus.unavailable => l.purchaseUnavailable,
    };
    if (message != null) showToast(context, message);
  }

  Future<void> _restore() async {
    final l = AppLocalizations.of(context);
    setState(() => _busyProduct = 'restore');
    final outcome = await ref.read(monetizationControllerProvider.notifier).restore();
    if (!mounted) return;
    setState(() => _busyProduct = null);
    showToast(context, outcome.success ? l.restoreDone : l.restoreFailed);
  }

  Future<void> _freeShards() async {
    final l = AppLocalizations.of(context);
    setState(() => _busyProduct = 'free');
    final reward = await ref.read(monetizationControllerProvider.notifier).watchFreeShards();
    if (!mounted) return;
    setState(() {
      _busyProduct = null;
      _freeUnavailable = reward == null;
    });
    if (reward != null) showToast(context, l.shardsCredited(reward));
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final m = ref.watch(monetizationControllerProvider);
    final controller = ref.read(monetizationControllerProvider.notifier);
    final demo = ref.watch(purchasesServiceProvider) is FakePurchasesService;
    final freeDecision = controller.rewardedDecision(AdPlacement.rwFreeShards, AdScreen.home);
    final freeAmount = ref.watch(adConfigProvider).rwFreeShardsAmount;

    Widget buyButton(ShopProduct p, {bool owned = false}) => FilledButton(
          style: FilledButton.styleFrom(minimumSize: const Size(110, 44)),
          onPressed: owned || _busyProduct != null ? null : () => _buy(p),
          child: _busyProduct == p.id
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : Text(owned ? l.owned : controller.priceOf(p)),
        );

    return Scaffold(
      appBar: AppBar(
        title: Text(l.shopTitle),
        actions: const [Padding(padding: EdgeInsets.only(right: 12), child: Center(child: ShardsBadge()))],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (demo)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(l.shopDemoNotice,
                  textAlign: TextAlign.center, style: const TextStyle(color: AppColors.warning, fontWeight: FontWeight.w700)),
            ),
          _ShopTile(
            icon: Icons.block,
            color: AppColors.primary,
            title: l.noAdsTitle,
            body: m.hasNoAds ? l.noAdsOwned : l.noAdsBody,
            trailing: buyButton(Products.noAds, owned: m.hasNoAds),
          ),
          if (controller.starterPackVisible)
            _ShopTile(
              icon: Icons.rocket_launch_outlined,
              color: AppColors.secondary,
              title: l.starterPackTitle,
              body: l.starterPackBody,
              trailing: buyButton(Products.starterPack),
            ),
          _ShopTile(
            icon: Icons.play_circle_outline,
            color: AppColors.success,
            title: l.freeShardsTitle,
            body: l.freeShardsBody(freeAmount),
            trailing: OutlinedButton(
              onPressed: !freeDecision.allowed || _freeUnavailable || _busyProduct != null ? null : _freeShards,
              child: Text(_freeUnavailable || !freeDecision.allowed ? l.noVideo : l.watchVideo),
            ),
          ),
          const SizedBox(height: 8),
          SectionLabel(l.shardPacksTitle),
          const SizedBox(height: 8),
          for (final p in Products.shardPacks)
            _ShopTile(
              icon: Icons.diamond_outlined,
              color: AppColors.accent,
              title: l.shardPackBonus(p.shards),
              body: null,
              trailing: buyButton(p),
            ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _busyProduct != null ? null : _restore,
            icon: const Icon(Icons.restore),
            label: Text(l.restorePurchases),
          ),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: controller.showPrivacyOptions,
            icon: const Icon(Icons.privacy_tip_outlined),
            label: Text(l.privacyOptions),
          ),
          const SizedBox(height: 12),
          Text(l.shopFooter, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
        ],
      ),
    );
  }
}

class _ShopTile extends StatelessWidget {
  const _ShopTile({required this.icon, required this.color, required this.title, required this.body, required this.trailing});
  final IconData icon;
  final Color color;
  final String title;
  final String? body;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(children: [
            Icon(icon, color: color, size: 30),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                if (body != null)
                  Text(body!, style: const TextStyle(fontSize: 13, color: AppColors.mutedForeground)),
              ]),
            ),
            const SizedBox(width: 8),
            trailing,
          ]),
        ),
      ),
    );
  }
}
