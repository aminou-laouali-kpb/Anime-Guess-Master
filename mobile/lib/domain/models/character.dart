/// Les 8 traits que le serveur sait vérifier lui-même (liste blanche
/// `VERIFIABLE_ATTRIBUTES` de game-engine.ts). Le nom sur le fil est [wire].
enum VerifiableAttribute {
  hairColor('hairColor'),
  eyeColor('eyeColor'),
  gender('gender'),
  ageRange('ageRange'),
  species('species'),
  alignment('alignment'),
  role('role'),
  // Sur le fil : « anime ». Avec le casting original (BUSINESS_PLAN §6.3) ce
  // trait devient l'« univers » du personnage : l'app l'affiche ainsi.
  universe('anime');

  const VerifiableAttribute(this.wire);
  final String wire;

  static VerifiableAttribute? fromWire(Object? raw) {
    for (final a in values) {
      if (a.wire == raw) return a;
    }
    return null;
  }
}

/// Un personnage tel que l'envoie le serveur (`GET /api/characters`,
/// `room_joined`, `state_sync`…). L'app ne connaît aucun personnage en dur :
/// tout le casting vient du serveur.
class Character {
  const Character({
    required this.id,
    required this.name,
    required this.universe,
    required this.gender,
    required this.hairColor,
    required this.eyeColor,
    required this.ageRange,
    required this.species,
    required this.alignment,
    required this.role,
    this.powers = const [],
    this.imageUrl,
  });

  final String id;
  final String name;

  /// Champ `anime` du serveur : l'œuvre (aujourd'hui) ou l'univers original (demain).
  final String universe;
  final String gender;
  final String hairColor;
  final String eyeColor;
  final String ageRange;
  final String species;
  final String alignment;
  final String role;
  final List<String> powers;
  final String? imageUrl;

  factory Character.fromJson(Map<String, dynamic> json) {
    String s(String key) => json[key] is String ? json[key] as String : '';
    final powers = json['powers'];
    final image = json['imageUrl'];
    return Character(
      id: s('id'),
      name: s('name'),
      universe: s('anime'),
      gender: s('gender'),
      hairColor: s('hairColor'),
      eyeColor: s('eyeColor'),
      ageRange: s('ageRange'),
      species: s('species'),
      alignment: s('alignment'),
      role: s('role'),
      powers: powers is List ? powers.whereType<String>().toList(growable: false) : const [],
      imageUrl: image is String && image.isNotEmpty ? image : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'anime': universe,
        'gender': gender,
        'hairColor': hairColor,
        'eyeColor': eyeColor,
        'ageRange': ageRange,
        'species': species,
        'powers': powers,
        'alignment': alignment,
        'role': role,
        'imageUrl': imageUrl,
      };

  String trait(VerifiableAttribute attribute) => switch (attribute) {
        VerifiableAttribute.hairColor => hairColor,
        VerifiableAttribute.eyeColor => eyeColor,
        VerifiableAttribute.gender => gender,
        VerifiableAttribute.ageRange => ageRange,
        VerifiableAttribute.species => species,
        VerifiableAttribute.alignment => alignment,
        VerifiableAttribute.role => role,
        VerifiableAttribute.universe => universe,
      };

  /// Même comparaison que le serveur (insensible à la casse).
  bool hasTrait(VerifiableAttribute attribute, String value) =>
      trait(attribute).toLowerCase() == value.toLowerCase();
}
