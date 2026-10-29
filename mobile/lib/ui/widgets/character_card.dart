import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../domain/models/character.dart';
import '../../l10n/app_localizations.dart';
import '../../l10n/trait_labels.dart';
import '../theme.dart';

/// Teinte stable par personnage pour le portrait de secours (comme le web).
int hueFor(String id) {
  var hash = 0;
  for (final unit in id.codeUnits) {
    hash = (hash * 31 + unit) % 360;
  }
  return hash;
}

String initialsOf(String name) {
  final words = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty);
  final letters = words.map((w) => String.fromCharCode(w.runes.first)).join();
  final cut = letters.runes.take(2).map(String.fromCharCode).join();
  return cut.toUpperCase();
}

/// Portrait du personnage. Les images viennent du serveur (`imageUrl`) et sont
/// mises en cache ; pendant le chargement ou sans image : initiales sur un
/// dégradé propre au personnage.
class Portrait extends StatelessWidget {
  const Portrait({super.key, required this.character, this.compact = true});
  final Character character;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final fallback = _InitialsPortrait(character: character, compact: compact);
    final url = character.imageUrl;
    if (url == null) return fallback;
    return CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      alignment: Alignment.topCenter,
      fadeInDuration: const Duration(milliseconds: 150),
      placeholder: (_, _) => fallback,
      errorWidget: (_, _, _) => fallback,
    );
  }
}

class _InitialsPortrait extends StatelessWidget {
  const _InitialsPortrait({required this.character, required this.compact});
  final Character character;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final hue = hueFor(character.id).toDouble();
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            HSLColor.fromAHSL(1, hue, 0.7, 0.55).toColor(),
            HSLColor.fromAHSL(1, (hue + 50) % 360, 0.7, 0.35).toColor(),
          ],
        ),
      ),
      child: Align(
        alignment: const Alignment(0, -0.3),
        child: Text(
          initialsOf(character.name),
          style: TextStyle(
            fontSize: compact ? 26 : 44,
            fontWeight: FontWeight.w900,
            color: Colors.white.withValues(alpha: 0.9),
          ),
        ),
      ),
    );
  }
}

/// Carte de personnage : portrait, nom et univers en surimpression ; en mode
/// détaillé, les traits. Touchée : sélection ou élimination selon l'écran.
class CharacterCard extends StatelessWidget {
  const CharacterCard({
    super.key,
    required this.character,
    this.compact = true,
    this.selected = false,
    this.eliminated = false,
    this.onTap,
    this.selectedColor = AppColors.primary,
  });

  final Character character;
  final bool compact;
  final bool selected;
  final bool eliminated;
  final VoidCallback? onTap;
  final Color selectedColor;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final labels = TraitLabels.of(Localizations.localeOf(context).languageCode);
    final borderColor = selected ? selectedColor : AppColors.cardBorder;

    Widget portrait = AspectRatio(
      aspectRatio: 3 / 4,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Portrait(character: character, compact: compact),
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: Container(
              padding: EdgeInsets.fromLTRB(6, compact ? 14 : 22, 6, 4),
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [Color(0xD9000000), Color(0x80000000), Color(0x00000000)],
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    character.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: compact ? 10.5 : 16,
                      height: 1.1,
                      color: Colors.white,
                    ),
                  ),
                  Text(
                    character.universe.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: compact ? 8 : 11,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.6,
                      color: Colors.white.withValues(alpha: 0.75),
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (eliminated)
            Container(
              color: AppColors.destructive.withValues(alpha: 0.25),
              alignment: Alignment.center,
              child: Transform.rotate(
                angle: 0.2,
                child: Text(
                  'X',
                  style: TextStyle(
                    fontSize: compact ? 54 : 80,
                    fontWeight: FontWeight.w900,
                    color: AppColors.destructive.withValues(alpha: 0.85),
                  ),
                ),
              ),
            ),
        ],
      ),
    );

    if (eliminated) {
      portrait = ColorFiltered(
        colorFilter: const ColorFilter.matrix(<double>[
          0.2126, 0.7152, 0.0722, 0, 0, //
          0.2126, 0.7152, 0.0722, 0, 0,
          0.2126, 0.7152, 0.0722, 0, 0,
          0, 0, 0, 1, 0,
        ]),
        child: portrait,
      );
    }

    final card = AnimatedScale(
      scale: eliminated ? 0.95 : 1,
      duration: const Duration(milliseconds: 250),
      child: AnimatedOpacity(
        opacity: eliminated ? 0.55 : 1,
        duration: const Duration(milliseconds: 250),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(compact ? 12 : kRadius),
            border: Border.all(color: borderColor, width: 2),
            boxShadow: selected
                ? [BoxShadow(color: selectedColor.withValues(alpha: 0.35), blurRadius: 10, spreadRadius: 1)]
                : null,
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              portrait,
              if (!compact) _TraitDetails(character: character, labels: labels, l: l),
            ],
          ),
        ),
      ),
    );

    final label = eliminated
        ? l.eliminatedSemantics(character.name)
        : l.characterSemantics(character.name, character.universe);
    if (onTap == null) return Semantics(label: label, child: card);
    return Semantics(
      button: true,
      selected: selected || eliminated,
      label: label,
      excludeSemantics: true,
      child: GestureDetector(onTap: onTap, behavior: HitTestBehavior.opaque, child: card),
    );
  }
}

class _TraitDetails extends StatelessWidget {
  const _TraitDetails({required this.character, required this.labels, required this.l});
  final Character character;
  final TraitLabels labels;
  final AppLocalizations l;

  @override
  Widget build(BuildContext context) {
    Widget cell(String title, String value) => Expanded(
          child: Container(
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(color: AppColors.muted.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(6)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title.toUpperCase(),
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.mutedForeground)),
                Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              ],
            ),
          ),
        );
    final alignment = character.alignment.toLowerCase();
    final alignColor = switch (alignment) {
      'hero' => AppColors.primary,
      'villain' => AppColors.destructive,
      'antihero' => AppColors.accent,
      _ => AppColors.mutedForeground,
    };
    final alignIcon = switch (alignment) {
      'hero' => Icons.shield_outlined,
      'villain' => Icons.dangerous_outlined,
      'antihero' => Icons.star_outline,
      _ => Icons.person_outline,
    };
    return Padding(
      padding: const EdgeInsets.all(8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(children: [
            cell(l.attrHair, labels.raw(VerifiableAttribute.hairColor, character.hairColor)),
            const SizedBox(width: 4),
            cell(l.attrEyes, labels.raw(VerifiableAttribute.eyeColor, character.eyeColor)),
          ]),
          const SizedBox(height: 6),
          Text(
            [
              labels.raw(VerifiableAttribute.species, character.species),
              labels.raw(VerifiableAttribute.gender, character.gender),
              l.roleLine(labels.raw(VerifiableAttribute.role, character.role)),
            ].join(' • '),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.mutedForeground),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 3),
            decoration: BoxDecoration(
              color: alignColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: alignColor.withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(alignIcon, size: 13, color: alignColor),
                const SizedBox(width: 4),
                Text(
                  labels.raw(VerifiableAttribute.alignment, character.alignment).toUpperCase(),
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: alignColor),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Grille de cartes adaptée à la largeur (4 colonnes sur un téléphone).
class CharacterGrid extends StatelessWidget {
  const CharacterGrid({
    super.key,
    required this.characters,
    required this.itemBuilder,
    this.padding = const EdgeInsets.all(10),
    this.shrinkWrap = false,
    this.physics,
  });

  final List<Character> characters;
  final Widget Function(BuildContext, Character) itemBuilder;
  final EdgeInsets padding;
  final bool shrinkWrap;
  final ScrollPhysics? physics;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final width = constraints.maxWidth;
      final columns = width >= 1000 ? 8 : (width >= 600 ? 6 : 4);
      return GridView.builder(
        padding: padding,
        shrinkWrap: shrinkWrap,
        physics: physics,
        itemCount: characters.length,
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: columns,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 3 / 4,
        ),
        itemBuilder: (context, i) => itemBuilder(context, characters[i]),
      );
    });
  }
}
