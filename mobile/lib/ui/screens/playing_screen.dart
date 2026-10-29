import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../application/game_controller.dart';
import '../../domain/game/board.dart';
import '../../domain/game/game_state.dart';
import '../../domain/models/character.dart';
import '../../domain/models/protocol_models.dart';
import '../../l10n/app_localizations.dart';
import '../../l10n/trait_labels.dart';
import '../theme.dart';
import '../widgets/character_card.dart';
import '../widgets/common.dart';
import '../widgets/game_widgets.dart';

/// Écran de partie : grille à éliminer, questions, réponses, deviner, vies,
/// chronos, réactions, journal. Aucune publicité ici (spec §4.1).
class PlayingScreen extends ConsumerStatefulWidget {
  const PlayingScreen({super.key});

  @override
  ConsumerState<PlayingScreen> createState() => _PlayingScreenState();
}

class _PlayingScreenState extends ConsumerState<PlayingScreen> {
  late Set<String> _eliminated;

  /// Feuille (question / deviner / journal) ouverte, à refermer si mon tour
  /// se termine (chrono écoulé) : agir donnerait « Ce n'est pas ton tour ».
  NavigatorState? _openSheet;

  @override
  void initState() {
    super.initState();
    // Restauré par le serveur après une reconnexion.
    _eliminated = {...ref.read(gameControllerProvider).myEliminatedIds};
  }

  void _setEliminated(Set<String> next) {
    setState(() => _eliminated = next);
    // Le serveur garde les éliminations pour qu'elles survivent à une reconnexion.
    ref.read(gameControllerProvider.notifier).syncEliminations(next);
  }

  void _closeSheet() {
    final nav = _openSheet;
    _openSheet = null;
    if (nav != null && nav.mounted && nav.canPop()) nav.pop();
  }

  /// Après une de MES questions vérifiées, propose d'écarter d'un coup les
  /// personnages exclus par la réponse (garantie vraie).
  void _offerAutoEliminate(GameLogEntry entry, GameState game) {
    if (entry is! QnaEntry || entry.isRestored || !entry.verified) return;
    if (entry.askerId != game.myPlayerId || entry.attribute == null || entry.value == null) return;
    final ruledOut = Board.ruledOut(
      characters: game.characters,
      eliminated: _eliminated,
      attribute: entry.attribute!,
      value: entry.value!,
      answer: entry.answer,
    );
    if (ruledOut.isEmpty) return;
    final l = AppLocalizations.of(context);
    final answer = entry.answer == Answer.yes ? l.yesUpper : l.noUpper;
    showToast(
      context,
      '${l.answerToast(answer)} — ${l.ruledOutCount(ruledOut.length)}',
      duration: const Duration(seconds: 8),
      action: SnackBarAction(
        label: l.eliminateThem,
        onPressed: () {
          if (mounted) _setEliminated({..._eliminated, ...ruledOut});
        },
      ),
    );
  }

  Future<void> _openAsk(GameState game) async {
    _openSheet = Navigator.of(context);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      builder: (_) => _AskSheet(characters: game.characters, vsBot: game.vsBot),
    );
    _openSheet = null;
  }

  Future<void> _openGuess(GameState game) async {
    _openSheet = Navigator.of(context);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.card,
      builder: (_) => FractionallySizedBox(
        heightFactor: 0.88,
        child: _GuessSheet(candidates: Board.guessable(game.characters, _eliminated)),
      ),
    );
    _openSheet = null;
  }

  void _openLog() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.card,
      isScrollControlled: true,
      builder: (_) => const FractionallySizedBox(heightFactor: 0.5, child: _LogSheet()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final game = ref.watch(gameControllerProvider);
    final me = game.me;
    final opponent = game.opponent;
    final canAct = game.canAct;

    ref.listen(gameControllerProvider.select((s) => s.canAct), (prev, next) {
      if (prev == true && !next) _closeSheet();
    });
    ref.listen(gameControllerProvider.select((s) => s.gameLog), (prev, next) {
      if (next.isNotEmpty && (prev == null || prev.isEmpty || prev.last.id != next.last.id)) {
        _offerAutoEliminate(next.last, ref.read(gameControllerProvider));
      }
    });

    final bannerText = !game.opponentConnected
        ? l.opponentDisconnectedBanner
        : (game.isMyTurn ? l.yourTurn : l.opponentTurn);

    return PopScope(
      canPop: false,
      child: Scaffold(
        body: Stack(children: [
          SafeArea(
            child: Column(children: [
              // ── Adversaire ──
              Container(
                decoration: const BoxDecoration(
                  color: AppColors.card,
                  border: Border(bottom: BorderSide(color: AppColors.cardBorder, width: 3)),
                ),
                padding: const EdgeInsets.fromLTRB(14, 6, 4, 6),
                child: Row(children: [
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      SectionLabel(l.opponentDefault),
                      Text(opponent?.name ?? l.opponentDefault,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.secondary)),
                    ]),
                  ),
                  LivesRow(
                    lives: opponent?.lives ?? 0,
                    color: AppColors.secondary,
                    semanticsName: opponent?.name ?? l.opponentDefault,
                  ),
                  if (!game.vsBot) OpponentMenuButton(opponentName: opponent?.name ?? l.opponentDefault),
                  LeaveGameButton(countsAsLoss: !game.vsBot),
                ]),
              ),
              // ── Bandeau de tour ──
              Container(
                width: double.infinity,
                color: game.isMyTurn ? AppColors.primary : AppColors.muted,
                padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
                child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Flexible(
                    child: Text(
                      bannerText.toUpperCase(),
                      key: const Key('turn-banner'),
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 12,
                        letterSpacing: 1.2,
                        color: game.isMyTurn ? Colors.white : AppColors.mutedForeground,
                      ),
                    ),
                  ),
                  if (game.opponentConnected && game.pendingQuestion == null && game.awaitingAnswerFor == null)
                    Countdown(
                      deadline: game.timer?.deadline,
                      builder: (context, seconds, urgent) => Text(
                        ' · ${l.secondsShort(seconds)}',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          fontSize: 12,
                          color: urgent
                              ? (game.isMyTurn ? const Color(0xFFFEF08A) : AppColors.destructive)
                              : (game.isMyTurn ? Colors.white : AppColors.mutedForeground),
                        ),
                      ),
                    ),
                ]),
              ),
              // ── Grille ──
              Expanded(
                child: CharacterGrid(
                  characters: game.characters,
                  itemBuilder: (context, c) => CharacterCard(
                    key: ValueKey(c.id),
                    character: c,
                    eliminated: _eliminated.contains(c.id),
                    onTap: () => _setEliminated(Board.toggle(_eliminated, c.id)),
                  ),
                ),
              ),
              // ── Moi et actions ──
              Container(
                decoration: const BoxDecoration(
                  color: AppColors.card,
                  border: Border(top: BorderSide(color: AppColors.cardBorder, width: 3)),
                ),
                child: Column(children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(10, 6, 6, 4),
                    child: Row(children: [
                      MyCharacterChip(character: game.myCharacter),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          SectionLabel(game.myCharacter == null ? l.you : l.youWithCharacter(game.myCharacter!.name)),
                          Text(me?.name ?? game.myName,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.primary)),
                        ]),
                      ),
                      const ReactionPickerButton(),
                      IconButton(
                        tooltip: l.logTitle,
                        onPressed: _openLog,
                        icon: Badge(
                          isLabelVisible: game.gameLog.isNotEmpty,
                          smallSize: 8,
                          backgroundColor: AppColors.primary,
                          child: const Icon(Icons.chat_bubble_outline),
                        ),
                      ),
                      LivesRow(lives: me?.lives ?? 0, color: AppColors.primary, semanticsName: l.you),
                    ]),
                  ),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(10, 2, 10, 10),
                    child: Row(children: [
                      Expanded(
                        child: FilledButton.icon(
                          key: const Key('ask-button'),
                          style: FilledButton.styleFrom(backgroundColor: AppColors.askBlue),
                          onPressed: canAct ? () => _openAsk(game) : null,
                          icon: const Icon(Icons.search),
                          label: Text(l.askShort),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: FilledButton.icon(
                          key: const Key('guess-button'),
                          style: FilledButton.styleFrom(backgroundColor: AppColors.guessRed),
                          onPressed: canAct ? () => _openGuess(game) : null,
                          icon: const Icon(Icons.gps_fixed),
                          label: Text(l.guessAction),
                        ),
                      ),
                    ]),
                  ),
                ]),
              ),
            ]),
          ),
          if (game.pendingQuestion != null) _IncomingQuestion(game: game),
          if (game.awaitingAnswerFor != null) _AwaitingAnswer(game: game),
        ]),
      ),
    );
  }
}

/// On me pose une question libre : je dois répondre (bloquant, comme le web).
class _IncomingQuestion extends ConsumerWidget {
  const _IncomingQuestion({required this.game});
  final GameState game;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final c = game.myCharacter;
    final controller = ref.read(gameControllerProvider.notifier);
    return Positioned.fill(
      child: ColoredBox(
        color: Colors.black.withValues(alpha: 0.7),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Text(l.questionReceived.toUpperCase(),
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: AppColors.secondary)),
                  const SizedBox(height: 14),
                  Text('« ${game.pendingQuestion} »',
                      key: const Key('incoming-question'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
                  Countdown(
                    deadline: game.timer?.deadline,
                    builder: (context, seconds, urgent) => Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Text(l.answerWithin(seconds),
                          style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: urgent ? AppColors.destructive : AppColors.mutedForeground)),
                    ),
                  ),
                  if (c != null) ...[
                    const SizedBox(height: 8),
                    Text(l.yourCharacterIs(c.name, c.universe),
                        textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700)),
                  ],
                  const SizedBox(height: 4),
                  Text(l.answerHonestly,
                      textAlign: TextAlign.center, style: const TextStyle(fontSize: 12, color: AppColors.mutedForeground)),
                  const SizedBox(height: 18),
                  Row(children: [
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(backgroundColor: AppColors.success, minimumSize: const Size(0, 56)),
                        onPressed: () => controller.answerQuestion(Answer.yes),
                        icon: const Icon(Icons.check),
                        label: Text(l.yesUpper, style: const TextStyle(fontSize: 20)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(backgroundColor: AppColors.guessRed, minimumSize: const Size(0, 56)),
                        onPressed: () => controller.answerQuestion(Answer.no),
                        icon: const Icon(Icons.close),
                        label: Text(l.noUpper, style: const TextStyle(fontSize: 20)),
                      ),
                    ),
                  ]),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AwaitingAnswer extends StatelessWidget {
  const _AwaitingAnswer({required this.game});
  final GameState game;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Positioned.fill(
      child: ColoredBox(
        color: AppColors.background.withValues(alpha: 0.8),
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(kRadius),
                border: Border.all(color: AppColors.primary, width: 2),
              ),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(l.waitingAnswer.toUpperCase(),
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppColors.primary)),
                const SizedBox(height: 12),
                Text('« ${game.awaitingAnswerFor} »', textAlign: TextAlign.center, style: const TextStyle(fontSize: 17)),
                Countdown(
                  deadline: game.timer?.deadline,
                  builder: (context, seconds, _) => Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(l.opponentHasSeconds(seconds),
                        style: const TextStyle(color: AppColors.mutedForeground, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(height: 16),
                const LinearProgressIndicator(),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

/// Poser une question : vérifiée (trait + valeur) ou libre (pas contre l'ordinateur).
class _AskSheet extends ConsumerStatefulWidget {
  const _AskSheet({required this.characters, required this.vsBot});
  final List<Character> characters;
  final bool vsBot;

  @override
  ConsumerState<_AskSheet> createState() => _AskSheetState();
}

class _AskSheetState extends ConsumerState<_AskSheet> {
  bool _verified = true;
  VerifiableAttribute _attribute = VerifiableAttribute.hairColor;
  String? _value;
  final _free = TextEditingController();

  @override
  void dispose() {
    _free.dispose();
    super.dispose();
  }

  bool get _isVerified => _verified || widget.vsBot;

  void _send() {
    final controller = ref.read(gameControllerProvider.notifier);
    if (_isVerified) {
      if (_value == null) return;
      controller.askVerifiedQuestion(_attribute, _value!);
    } else {
      if (_free.text.trim().isEmpty) return;
      controller.askQuestion(_free.text);
    }
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final labels = TraitLabels.of(Localizations.localeOf(context).languageCode);
    final values = Board.valuesOnBoard(widget.characters, _attribute, labelOf: (v) => labels.value(_attribute, v));
    final canSend = _isVerified ? _value != null : _free.text.trim().isNotEmpty;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: ConstrainedBox(
          constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.85),
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, mainAxisSize: MainAxisSize.min, children: [
              Text(l.askLong, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 4),
              Text(_isVerified ? l.askVerifiedHelp : l.askFreeHelp,
                  style: const TextStyle(color: AppColors.mutedForeground)),
              const SizedBox(height: 12),
              if (!widget.vsBot)
                SegmentedButton<bool>(
                  segments: [
                    ButtonSegment(value: true, label: Text(l.verifiedTab), icon: const Icon(Icons.verified_user_outlined)),
                    ButtonSegment(value: false, label: Text(l.freeTab), icon: const Icon(Icons.edit_outlined)),
                  ],
                  selected: {_verified},
                  onSelectionChanged: (s) => setState(() => _verified = s.first),
                ),
              const SizedBox(height: 12),
              if (_isVerified) ...[
                Wrap(spacing: 6, runSpacing: 6, children: [
                  for (final a in VerifiableAttribute.values)
                    ChoiceChip(
                      label: Text(TraitLabels.attributeLabel(l, a)),
                      selected: _attribute == a,
                      onSelected: (_) => setState(() {
                        _attribute = a;
                        _value = null;
                      }),
                    ),
                ]),
                const Divider(height: 24),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  for (final v in values)
                    ChoiceChip(
                      label: Text(labels.value(_attribute, v)),
                      selected: _value == v,
                      selectedColor: AppColors.secondary,
                      onSelected: (_) => setState(() => _value = v),
                    ),
                ]),
                const SizedBox(height: 14),
                Text(
                  _value == null ? l.pickValueHint : '« ${labels.question(l, _attribute, _value!)} »',
                  key: const Key('question-preview'),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontStyle: FontStyle.italic),
                ),
              ] else
                TextField(
                  controller: _free,
                  autofocus: true,
                  maxLength: 200,
                  onChanged: (_) => setState(() {}),
                  onSubmitted: (_) => _send(),
                  decoration: InputDecoration(hintText: l.freeQuestionHint),
                ),
              const SizedBox(height: 14),
              FilledButton(
                key: const Key('send-question'),
                onPressed: canSend ? _send : null,
                child: Text(l.send),
              ),
            ]),
          ),
        ),
      ),
    );
  }
}

/// Deviner : choisir puis confirmer (un mauvais choix coûte une vie).
class _GuessSheet extends ConsumerStatefulWidget {
  const _GuessSheet({required this.candidates});
  final List<Character> candidates;

  @override
  ConsumerState<_GuessSheet> createState() => _GuessSheetState();
}

class _GuessSheetState extends ConsumerState<_GuessSheet> {
  String _query = '';
  String? _candidate;

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final results = Board.search(widget.candidates, _query);
    final chosen = widget.candidates.where((c) => c.id == _candidate).firstOrNull;
    return SafeArea(
      child: Column(children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              const Icon(Icons.gps_fixed, color: AppColors.guessRed),
              const SizedBox(width: 8),
              Text(l.guessTitle, style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: AppColors.guessRed)),
            ]),
            const SizedBox(height: 4),
            Text(l.guessBody, style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.mutedForeground)),
            const SizedBox(height: 10),
            TextField(
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: l.searchCharacter, isDense: true),
            ),
          ]),
        ),
        Expanded(
          child: widget.candidates.isEmpty
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(l.noCharacterLeft, textAlign: TextAlign.center)))
              : results.isEmpty
                  ? Center(child: Text(l.noMatch(_query)))
                  : CharacterGrid(
                      characters: results,
                      itemBuilder: (context, c) => CharacterCard(
                        key: ValueKey(c.id),
                        character: c,
                        selected: _candidate == c.id,
                        selectedColor: AppColors.guessRed,
                        onTap: () => setState(() => _candidate = c.id),
                      ),
                    ),
        ),
        Container(
          color: AppColors.card,
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            Expanded(
              child: Text(
                chosen == null ? l.tapToChoose : l.guessConfirmPrompt(chosen.name),
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
            FilledButton(
              key: const Key('confirm-guess'),
              style: FilledButton.styleFrom(backgroundColor: AppColors.guessRed, minimumSize: const Size(110, 46)),
              onPressed: chosen == null
                  ? null
                  : () {
                      ref.read(gameControllerProvider.notifier).makeGuess(chosen.id);
                      Navigator.pop(context);
                    },
              child: Text(l.confirm),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _LogSheet extends ConsumerWidget {
  const _LogSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final game = ref.watch(gameControllerProvider);
    return SafeArea(
      child: Column(children: [
        ListTile(
          title: SectionLabel(l.logTitle),
          trailing: IconButton(
            tooltip: l.closeLog,
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.keyboard_arrow_down),
          ),
        ),
        Expanded(
          child: game.gameLog.isEmpty
              ? Center(child: Text(l.noActionYet, style: const TextStyle(color: AppColors.mutedForeground)))
              : ListView.separated(
                  padding: const EdgeInsets.all(14),
                  reverse: true,
                  itemCount: game.gameLog.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) => LogEntryView(
                    entry: game.gameLog[game.gameLog.length - 1 - i],
                    myPlayerId: game.myPlayerId,
                    opponentName: game.opponent?.name,
                    characters: game.characters,
                  ),
                ),
        ),
      ]),
    );
  }
}
