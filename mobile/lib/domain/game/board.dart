import '../models/character.dart';
import '../models/protocol_models.dart';

/// Logique pure de la grille : éliminations, déductions, recherche.
class Board {
  const Board._();

  /// Écarte le personnage ou le remet sur la grille.
  static Set<String> toggle(Set<String> eliminated, String id) {
    final next = {...eliminated};
    if (!next.remove(id)) next.add(id);
    return next;
  }

  /// Après une de MES questions vérifiées, les personnages encore en jeu que
  /// la réponse exclut (la réponse est garantie vraie : on peut les écarter).
  static List<String> ruledOut({
    required List<Character> characters,
    required Set<String> eliminated,
    required VerifiableAttribute attribute,
    required String value,
    required Answer answer,
  }) {
    final keep = answer == Answer.yes;
    return [
      for (final c in characters)
        if (!eliminated.contains(c.id) && c.hasTrait(attribute, value) != keep) c.id,
    ];
  }

  /// Personnages qu'on peut encore deviner (non écartés).
  static List<Character> guessable(List<Character> characters, Set<String> eliminated) =>
      [for (final c in characters) if (!eliminated.contains(c.id)) c];

  /// Filtre par nom, insensible à la casse.
  static List<Character> search(List<Character> characters, String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return characters;
    return [for (final c in characters) if (c.name.toLowerCase().contains(q)) c];
  }

  /// Valeurs présentes sur cette grille pour un trait, pour ne proposer que des
  /// questions utiles. Triées selon leur libellé affiché.
  static List<String> valuesOnBoard(
    List<Character> characters,
    VerifiableAttribute attribute, {
    String Function(String value)? labelOf,
  }) {
    final values = {for (final c in characters) c.trait(attribute)}.where((v) => v.isNotEmpty).toList();
    final label = labelOf ?? (String v) => v;
    values.sort((a, b) => _fold(label(a)).compareTo(_fold(label(b))));
    return values;
  }

  /// Tri à la française approximatif : sans accents ni majuscules.
  static String _fold(String s) {
    const from = 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ';
    const to = 'aaaaaaceeeeiiiinooooouuuuyyoa';
    final lower = s.toLowerCase();
    final buffer = StringBuffer();
    for (final rune in lower.runes) {
      final ch = String.fromCharCode(rune);
      final i = from.indexOf(ch);
      buffer.write(i >= 0 ? to[i] : ch);
    }
    return buffer.toString();
  }
}
