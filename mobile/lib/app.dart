import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'application/game_controller.dart';
import 'application/monetization_controller.dart';
import 'domain/game/game_reducer.dart';
import 'domain/game/game_state.dart';
import 'l10n/app_localizations.dart';
import 'ui/screens/ended_screen.dart';
import 'ui/screens/home_screen.dart';
import 'ui/screens/playing_screen.dart';
import 'ui/screens/queue_lobby_screen.dart';
import 'ui/screens/selection_screen.dart';
import 'ui/theme.dart';
import 'ui/widgets/game_widgets.dart';

final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

class AnimeWhoApp extends StatelessWidget {
  const AnimeWhoApp({super.key, this.startMonetization = true});

  /// false dans les tests de widgets (pas de consentement / SDK au démarrage).
  final bool startMonetization;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      onGenerateTitle: (context) => AppLocalizations.of(context).appTitle,
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      themeMode: ThemeMode.dark,
      scaffoldMessengerKey: scaffoldMessengerKey,
      // Français seulement pour l'instant ; l'anglais = un fichier app_en.arb.
      locale: const Locale('fr'),
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: GameShell(startMonetization: startMonetization),
    );
  }
}

/// Affiche l'écran de la phase en cours (comme `MainGame` du web), plus les
/// couches globales : réactions flottantes, état de la connexion, toasts.
class GameShell extends ConsumerStatefulWidget {
  const GameShell({super.key, this.startMonetization = true});
  final bool startMonetization;

  @override
  ConsumerState<GameShell> createState() => _GameShellState();
}

class _GameShellState extends ConsumerState<GameShell> with WidgetsBindingObserver {
  StreamSubscription<GameNotice>? _notices;
  DateTime? _pausedAt;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _notices = ref.read(gameControllerProvider.notifier).notices.listen(_showNotice);
    if (widget.startMonetization) {
      // Après la première image : le formulaire de consentement peut s'afficher.
      WidgetsBinding.instance.addPostFrameCallback(
        (_) => ref.read(monetizationControllerProvider.notifier).startup(),
      );
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _notices?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
        _pausedAt ??= DateTime.now();
      case AppLifecycleState.resumed:
        final away = _pausedAt == null ? Duration.zero : DateTime.now().difference(_pausedAt!);
        _pausedAt = null;
        ref.read(gameControllerProvider.notifier).onAppResumed(away: away);
      default:
        break;
    }
  }

  void _showNotice(GameNotice n) {
    final context = scaffoldMessengerKey.currentContext;
    if (context == null) return;
    final l = AppLocalizations.of(context);
    final text = switch (n.kind) {
      NoticeKind.gameNotRecovered => l.noticeGameNotRecovered,
      NoticeKind.characterAssigned => l.noticeCharacterAssigned(n.text ?? '?'),
      NoticeKind.myTimeoutAnswering => l.noticeMyTimeoutAnswering,
      NoticeKind.myTimeoutPlaying => l.noticeMyTimeoutPlaying,
      NoticeKind.opponentTimedOut => l.noticeOpponentTimedOut,
      NoticeKind.tooManyConnections => l.noticeTooManyConnections,
      NoticeKind.serverFull => l.noticeServerFull,
      NoticeKind.myWrongGuess => l.noticeMyWrongGuess,
      NoticeKind.opponentWrongGuess => l.noticeOpponentWrongGuess,
      NoticeKind.opponentDisconnected => l.noticeOpponentDisconnected(n.number ?? 45),
      NoticeKind.opponentReconnected => l.noticeOpponentReconnected,
      NoticeKind.opponentLeftGame => l.noticeOpponentLeftGame,
      NoticeKind.opponentLeftRoom => l.noticeOpponentLeftRoom,
      NoticeKind.opponentWantsRematch => l.noticeOpponentWantsRematch,
      NoticeKind.serverMessage => n.text ?? '',
      NoticeKind.reportSent => l.noticeReportSent,
      NoticeKind.reportLimit => l.noticeReportLimit,
      NoticeKind.playerBlocked => l.noticePlayerBlocked(n.text ?? ''),
    };
    final color = switch (n.severity) {
      NoticeSeverity.info => AppColors.card,
      NoticeSeverity.success => const Color(0xFF14532D),
      NoticeSeverity.warning => const Color(0xFF78350F),
      NoticeSeverity.error => const Color(0xFF7F1D1D),
    };
    scaffoldMessengerKey.currentState
      ?..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        content: Text(text, style: const TextStyle(fontWeight: FontWeight.w700, color: Colors.white)),
        backgroundColor: color,
        duration: Duration(seconds: n.kind == NoticeKind.characterAssigned ? 6 : 4),
      ));
  }

  @override
  Widget build(BuildContext context) {
    final phase = ref.watch(gameControllerProvider.select((s) => s.phase));
    final screen = switch (phase) {
      GamePhase.home => const HomeScreen(),
      GamePhase.queue || GamePhase.lobby => const QueueLobbyScreen(),
      GamePhase.selection => const SelectionScreen(),
      GamePhase.playing => const PlayingScreen(),
      GamePhase.ended => const EndedScreen(),
    };
    return Stack(
      children: [
        Positioned.fill(
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 220),
            child: KeyedSubtree(key: ValueKey(phase == GamePhase.lobby ? GamePhase.queue : phase), child: screen),
          ),
        ),
        const Positioned.fill(child: FloatingReactions()),
        const ConnectionStatusOverlay(),
      ],
    );
  }
}
