import '../domain/models/character.dart';
import 'app_localizations.dart';

/// Libellés des valeurs de traits (stockées en anglais dans characters.json).
/// Valeur inconnue : le texte d'origine est affiché tel quel.
///
/// Ces tables ne contiennent que des mots génériques (couleurs, espèces…),
/// aucun nom d'œuvre : la valeur du trait « univers » vient du serveur.
/// Pour ajouter l'anglais : une table `_en` et la sélection dans [TraitLabels.of].
class TraitLabels {
  const TraitLabels._(this._tables, this._agePhrases, this._alignmentPhrases);

  final Map<VerifiableAttribute, Map<String, String>> _tables;
  final Map<String, String> _agePhrases;
  final Map<String, String> _alignmentPhrases;

  static TraitLabels of(String languageCode) => switch (languageCode) {
        _ => fr,
      };

  static const fr = TraitLabels._(
    {
      VerifiableAttribute.hairColor: {
        'black': 'noirs', 'blonde': 'blonds', 'none': 'aucun', 'brown': 'bruns', 'red': 'roux',
        'green': 'verts', 'orange': 'orange', 'pink': 'roses', 'silver': 'argentés',
        'dark blue': 'bleu foncé', 'yellow': 'jaunes', 'white and red': 'blancs et rouges',
        'pale white': 'blanc pâle', 'white': 'blancs', 'dark green': 'vert foncé',
        'blue': 'bleus', 'light green': 'vert clair', 'purple': 'violets',
      },
      VerifiableAttribute.eyeColor: {
        'blue': 'bleus', 'red': 'rouges', 'dark': 'sombres', 'gray': 'gris', 'black': 'noirs',
        'brown': 'marron', 'green': 'verts', 'yellow': 'jaunes', 'violet': 'violets',
        'gold': 'dorés', 'golden': 'dorés', 'amber': 'ambrés', 'pale green': 'vert pâle',
        'white': 'blancs', 'teal': 'bleu-vert', 'dark red': 'rouge foncé', 'pink': 'roses',
        'heterochromia': 'vairons',
      },
      VerifiableAttribute.species: {
        // Espèces génériques seulement : une espèce propre à une œuvre
        // s'affiche telle que le serveur l'envoie.
        'human': 'humain', 'demon': 'démon', 'alien': 'extraterrestre',
        'android': 'androïde', 'immortal': 'immortel',
        'half-elf': 'demi-elfe', 'devil': 'diable', 'ghoul': 'goule', 'elf': 'elfe',
        'yokai': 'yokai', 'spirit': 'esprit', 'robot': 'robot', 'cyborg': 'cyborg',
      },
      VerifiableAttribute.gender: {'male': 'homme', 'female': 'femme'},
      VerifiableAttribute.alignment: {
        'hero': 'héros', 'villain': 'méchant', 'antihero': 'anti-héros', 'neutral': 'neutre',
      },
      VerifiableAttribute.role: {'main': 'principal', 'secondary': 'secondaire'},
      VerifiableAttribute.ageRange: {'child': 'enfant', 'teen': 'ado', 'adult': 'adulte'},
    },
    {'child': 'un enfant', 'teen': 'un ado', 'adult': 'un adulte'},
    {'hero': 'un héros', 'villain': 'un méchant', 'antihero': 'un anti-héros', 'neutral': 'neutre'},
  );

  /// Libellé de la valeur (boutons de réponse, fiche du personnage).
  String value(VerifiableAttribute attribute, String raw) {
    if (attribute == VerifiableAttribute.universe) return raw;
    if (attribute == VerifiableAttribute.hairColor && raw.toLowerCase() == 'none') return 'chauve';
    return _tables[attribute]?[raw.toLowerCase()] ?? raw;
  }

  /// Libellé neutre d'un trait pour la fiche (ex. cheveux « aucun »).
  String raw(VerifiableAttribute attribute, String raw) =>
      _tables[attribute]?[raw.toLowerCase()] ?? raw;

  /// Texte complet d'une question vérifiée.
  String question(AppLocalizations l, VerifiableAttribute attribute, String raw) {
    final v = value(attribute, raw);
    return switch (attribute) {
      VerifiableAttribute.hairColor => raw.toLowerCase() == 'none' ? l.qHairBald : l.qHair(v),
      VerifiableAttribute.eyeColor => l.qEyes(v),
      VerifiableAttribute.gender => raw.toLowerCase() == 'female' ? l.qFemale : l.qMale,
      VerifiableAttribute.ageRange => l.qAge(_agePhrases[raw.toLowerCase()] ?? raw),
      VerifiableAttribute.species => l.qSpecies(v),
      VerifiableAttribute.alignment => l.qAlignment(_alignmentPhrases[raw.toLowerCase()] ?? raw),
      VerifiableAttribute.role => l.qRole(v),
      VerifiableAttribute.universe => l.qUniverse(raw),
    };
  }

  /// Nom du trait (onglets de la question vérifiée).
  static String attributeLabel(AppLocalizations l, VerifiableAttribute a) => switch (a) {
        VerifiableAttribute.hairColor => l.attrHair,
        VerifiableAttribute.eyeColor => l.attrEyes,
        VerifiableAttribute.gender => l.attrGender,
        VerifiableAttribute.ageRange => l.attrAge,
        VerifiableAttribute.species => l.attrSpecies,
        VerifiableAttribute.alignment => l.attrAlignment,
        VerifiableAttribute.role => l.attrRole,
        VerifiableAttribute.universe => l.attrUniverse,
      };

  /// Toutes les valeurs connues (le test vérifie qu'elles sont traduites).
  Map<VerifiableAttribute, Map<String, String>> get tables => _tables;
}
