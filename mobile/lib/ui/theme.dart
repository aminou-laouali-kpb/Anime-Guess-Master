import 'package:flutter/material.dart';

/// Palette « Midnight Anime » : conversion des variables `.dark` de
/// `artifacts/anime-guess-who/src/index.css` (HSL → RGB).
class AppColors {
  const AppColors._();
  static const background = Color(0xFF06060E); // 240 40% 4%
  static const foreground = Color(0xFFF9F9FB); // 240 20% 98%
  static const card = Color(0xFF0E0E1A); // 240 30% 8%
  static const cardBorder = Color(0xFF1B1B32); // 240 30% 15%
  static const primary = Color(0xFF4D76FF); // 226 100% 65% — bleu électrique
  static const secondary = Color(0xFFFF33A7); // 326 100% 60% — rose vif
  static const accent = Color(0xFFA64DFF); // 270 100% 65% — violet
  static const muted = Color(0xFF1B1B32); // 240 30% 15%
  static const mutedForeground = Color(0xFFA3A3C2); // 240 20% 70%
  static const destructive = Color(0xFFFF335C); // 348 100% 60%
  static const border = Color(0xFF242442); // 240 30% 20%
  static const success = Color(0xFF22C55E);
  static const warning = Color(0xFFF59E0B);
  static const askBlue = Color(0xFF2563EB);
  static const guessRed = Color(0xFFDC2626);
}

/// Rayon de base (`--radius: 1rem`).
const double kRadius = 16;

ThemeData buildAppTheme() {
  const scheme = ColorScheme(
    brightness: Brightness.dark,
    primary: AppColors.primary,
    onPrimary: Colors.white,
    secondary: AppColors.secondary,
    onSecondary: Colors.white,
    tertiary: AppColors.accent,
    onTertiary: Colors.white,
    error: AppColors.destructive,
    onError: Colors.white,
    surface: AppColors.card,
    onSurface: AppColors.foreground,
    onSurfaceVariant: AppColors.mutedForeground,
    surfaceContainerHighest: AppColors.muted,
    outline: AppColors.border,
    outlineVariant: AppColors.cardBorder,
  );
  final base = ThemeData(useMaterial3: true, colorScheme: scheme, brightness: Brightness.dark);
  final text = base.textTheme.apply(bodyColor: AppColors.foreground, displayColor: AppColors.foreground);
  final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(kRadius - 4));
  return base.copyWith(
    scaffoldBackgroundColor: AppColors.background,
    textTheme: text.copyWith(
      headlineLarge: text.headlineLarge?.copyWith(fontWeight: FontWeight.w900, letterSpacing: -1),
      headlineMedium: text.headlineMedium?.copyWith(fontWeight: FontWeight.w900, letterSpacing: -0.5),
      headlineSmall: text.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
      titleLarge: text.titleLarge?.copyWith(fontWeight: FontWeight.w800),
    ),
    appBarTheme: const AppBarTheme(backgroundColor: AppColors.card, elevation: 0, centerTitle: true),
    cardTheme: CardThemeData(
      color: AppColors.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(kRadius),
        side: const BorderSide(color: AppColors.cardBorder, width: 2),
      ),
      margin: EdgeInsets.zero,
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: AppColors.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(kRadius),
        side: const BorderSide(color: AppColors.cardBorder, width: 2),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(64, 52),
        shape: shape,
        textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(64, 52),
        shape: shape,
        side: const BorderSide(color: AppColors.border, width: 2),
        foregroundColor: AppColors.foreground,
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: AppColors.mutedForeground)),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.background,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(kRadius - 4)),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(kRadius - 4),
        borderSide: const BorderSide(color: AppColors.border),
      ),
    ),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
    chipTheme: base.chipTheme.copyWith(
      backgroundColor: AppColors.background,
      selectedColor: AppColors.primary,
      side: const BorderSide(color: AppColors.border),
    ),
  );
}

/// Dégradé du titre (primary → secondary), comme le logo du web.
const kTitleGradient = LinearGradient(colors: [AppColors.primary, AppColors.secondary]);
