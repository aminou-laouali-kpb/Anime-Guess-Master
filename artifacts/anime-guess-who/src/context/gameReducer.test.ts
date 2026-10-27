import { describe, expect, it } from 'vitest';
import type { Character } from '@workspace/api-client-react';
import type { PlayerState, QnaPayload, RoomSnapshot } from '../lib/socket';
import { gameReducer, initialGameState, toTurnTimer, type GameAction, type GameState } from './gameReducer';

const ME = 'me';
const OPP = 'opp';

const players = (myLives = 3, oppLives = 3): PlayerState[] => [
  { id: ME, name: 'Moi', lives: myLives },
  { id: OPP, name: 'Rival', lives: oppLives },
];

const char = (id: string, extra: Partial<Character> = {}): Character =>
  ({
    id,
    name: `Perso ${id}`,
    anime: 'Naruto',
    gender: 'male',
    hairColor: 'black',
    eyeColor: 'blue',
    ageRange: 'teen',
    species: 'human',
    powers: [],
    alignment: 'hero',
    role: 'protagonist',
    imageUrl: null,
    ...extra,
  }) as Character;

const board = [char('a'), char('b'), char('c')];

const run = (actions: GameAction[], from: GameState = initialGameState) => actions.reduce(gameReducer, from);

// Connected, with a session, sitting at home.
const atHome = run([{ type: 'connected' }, { type: 'session', playerId: ME }]);

const joined: GameAction = { type: 'room_joined', code: 'ABC123', mode: 'quick', players: players(), characters: board };

// Both players picked: the game is on and it's my turn.
const playing = run([joined, { type: 'select_character', characterId: 'a' }, { type: 'opponent_ready' }, {
  type: 'game_start',
  currentTurnPlayerId: ME,
  players: players(),
}], atHome);

const qna = (over: Partial<QnaPayload> = {}): QnaPayload => ({
  type: 'qna',
  answer: 'yes',
  askerId: ME,
  question: null,
  verified: true,
  attribute: 'hairColor',
  value: 'black',
  ...over,
});

const snapshot = (over: Partial<RoomSnapshot> = {}): RoomSnapshot => ({
  code: 'XYZ789',
  phase: 'playing',
  players: players(2, 3),
  characters: board,
  myCharacterId: 'b',
  myEliminatedIds: ['c'],
  opponentReady: true,
  opponentConnected: true,
  mode: 'private',
  currentTurnPlayerId: OPP,
  pendingQuestion: null,
  awaitingAnswerFor: null,
  log: [qna(), { type: 'guess', guesserId: OPP, guessedCharacterId: 'a' }],
  winnerId: null,
  gameOverReason: null,
  opponentCharacterId: null,
  rematchRequestedBy: null,
  lastChanceFor: null,
  timer: { actingPlayerId: OPP, msLeft: 30_000 },
  ...over,
});

describe('connection', () => {
  it('tracks connect / disconnect and remembers the first connection', () => {
    const s = run([{ type: 'connected' }, { type: 'disconnected', replaced: false }]);
    expect(s).toMatchObject({ isConnected: false, hasConnectedOnce: true, connectionReplaced: false });
  });

  it('flags a connection replaced by the server until the next connect', () => {
    let s = run([{ type: 'connected' }, { type: 'disconnected', replaced: true }]);
    expect(s.connectionReplaced).toBe(true);
    // A later ordinary drop doesn't clear the flag…
    s = gameReducer(s, { type: 'disconnected', replaced: false });
    expect(s.connectionReplaced).toBe(true);
    // …reconnecting does.
    s = gameReducer(s, { type: 'connected' });
    expect(s).toMatchObject({ isConnected: true, connectionReplaced: false });
  });

  it('stores the player id, stats and rating update', () => {
    const stats = { enabled: true, minRankedGames: 5, stats: null };
    const update = { ranked: true, rating: 1016, delta: 16 };
    const s = run([
      { type: 'session', playerId: ME },
      { type: 'my_stats', stats },
      { type: 'rating_update', update },
    ]);
    expect(s).toMatchObject({ myPlayerId: ME, myStats: stats, ratingUpdate: update });
  });
});

describe('lobby', () => {
  it('enters the queue with a position', () => {
    expect(gameReducer(atHome, { type: 'in_queue', position: 2 })).toMatchObject({ phase: 'queue', queuePosition: 2 });
  });

  it('shows the private room code in the lobby', () => {
    expect(gameReducer(atHome, { type: 'room_created', code: 'ABC123' })).toMatchObject({
      phase: 'lobby',
      roomCode: 'ABC123',
    });
  });

  it('starts character selection on room_joined', () => {
    const s = gameReducer(atHome, joined);
    expect(s).toMatchObject({
      phase: 'selection',
      roomCode: 'ABC123',
      roomMode: 'quick',
      players: players(),
      characters: board,
      myCharacterId: null,
      opponentReady: false,
      opponentConnected: true,
      opponentLeft: false,
      gameLog: [],
    });
  });

  it('records my pick, the opponent being ready, and a random assignment', () => {
    let s = run([joined, { type: 'select_character', characterId: 'b' }, { type: 'opponent_ready' }], atHome);
    expect(s).toMatchObject({ myCharacterId: 'b', opponentReady: true });
    s = gameReducer(s, { type: 'character_assigned', characterId: 'c' });
    expect(s.myCharacterId).toBe('c');
  });

  it('starts the game on game_start', () => {
    expect(playing).toMatchObject({ phase: 'playing', currentTurnId: ME, myCharacterId: 'a' });
  });

  it('sends a player in the queue or lobby back home on a server error, nobody else', () => {
    expect(gameReducer(gameReducer(atHome, { type: 'in_queue', position: 1 }), { type: 'server_error' }).phase).toBe(
      'home',
    );
    expect(gameReducer(gameReducer(atHome, { type: 'room_created', code: 'X' }), { type: 'server_error' }).phase).toBe(
      'home',
    );
    expect(gameReducer(playing, { type: 'server_error' })).toBe(playing);
  });
});

describe('timer', () => {
  it('converts the server countdown to a local deadline', () => {
    const s = gameReducer(playing, { type: 'timer', timer: { actingPlayerId: ME, msLeft: 60_000 }, now: 1_000 });
    expect(s.timer).toEqual({ actingPlayerId: ME, deadline: 61_000 });
  });

  it('clears the timer when the server sends none', () => {
    const s = run(
      [
        { type: 'timer', timer: { actingPlayerId: ME, msLeft: 60_000 }, now: 0 },
        { type: 'timer', timer: { actingPlayerId: null, msLeft: null }, now: 5 },
      ],
      playing,
    );
    expect(s.timer).toBeNull();
    expect(toTurnTimer({ actingPlayerId: null, msLeft: 0 }, 7)).toEqual({ actingPlayerId: null, deadline: 7 });
  });
});

describe('questions and answers', () => {
  it('keeps the question I must answer, and the one I wait an answer for', () => {
    expect(gameReducer(playing, { type: 'question_asked', question: 'Épée ?' }).pendingQuestion).toBe('Épée ?');
    expect(gameReducer(playing, { type: 'awaiting_answer', question: 'Chauve ?' }).awaitingAnswerFor).toBe('Chauve ?');
  });

  it('logs the answer, clears both prompts and passes the turn', () => {
    const s = run(
      [
        { type: 'awaiting_answer', question: 'Cheveux noirs ?' },
        { type: 'question_answered', entry: qna(), currentTurnPlayerId: OPP, logId: 'log-1' },
      ],
      playing,
    );
    expect(s).toMatchObject({ pendingQuestion: null, awaitingAnswerFor: null, currentTurnId: OPP });
    expect(s.gameLog).toEqual([{ ...qna(), id: 'log-1' }]);
  });

  it('appends log entries in order without touching the previous ones', () => {
    const first = gameReducer(playing, { type: 'question_answered', entry: qna(), currentTurnPlayerId: OPP, logId: '1' });
    const second = gameReducer(first, {
      type: 'question_answered',
      entry: qna({ askerId: OPP, answer: 'no', verified: false, question: 'Épée ?', attribute: null, value: null }),
      currentTurnPlayerId: ME,
      logId: '2',
    });
    expect(second.gameLog.map((e) => e.id)).toEqual(['1', '2']);
    expect(second.gameLog[0]).toBe(first.gameLog[0]);
    expect(first.gameLog).toHaveLength(1);
  });
});

describe('wrong guesses and timeouts', () => {
  it('logs a wrong guess and updates only the guesser’s lives', () => {
    const s = gameReducer(playing, {
      type: 'wrong_guess',
      guesserId: ME,
      guessedCharacterId: 'b',
      lives: 2,
      currentTurnPlayerId: OPP,
      logId: 'g',
    });
    expect(s.players).toEqual(players(2, 3));
    expect(s.currentTurnId).toBe(OPP);
    expect(s.gameLog).toEqual([{ id: 'g', type: 'guess', guesserId: ME, guessedCharacterId: 'b' }]);
  });

  it('on a timeout, logs it, costs a life, clears the prompts and passes the turn', () => {
    const s = run(
      [
        { type: 'question_asked', question: 'Épée ?' },
        { type: 'turn_timeout', playerId: OPP, lives: 1, currentTurnPlayerId: ME, logId: 't' },
      ],
      playing,
    );
    expect(s).toMatchObject({ pendingQuestion: null, awaitingAnswerFor: null, currentTurnId: ME });
    expect(s.players).toEqual(players(3, 1));
    expect(s.gameLog).toEqual([{ id: 't', type: 'timeout', playerId: OPP }]);
  });
});

describe('last chance and game over', () => {
  it('gives the turn to the last-chance player', () => {
    const s = gameReducer(playing, { type: 'last_chance', playerId: OPP });
    expect(s).toMatchObject({ lastChanceFor: OPP, currentTurnId: OPP, phase: 'playing' });
  });

  it('last chance → draw: the second player finds it too', () => {
    const s = run(
      [
        { type: 'last_chance', playerId: ME },
        { type: 'game_over', winnerId: null, opponentCharacterId: 'c', reason: 'draw' },
      ],
      playing,
    );
    expect(s).toMatchObject({
      phase: 'ended',
      winnerId: null,
      gameOverReason: 'draw',
      lastChanceFor: null,
      revealedOpponentCharacterId: 'c',
    });
  });

  it('keeps the turn times that settled a double find, and clears them for the next game', () => {
    const over = run(
      [
        { type: 'last_chance', playerId: ME },
        {
          type: 'game_over',
          winnerId: OPP,
          opponentCharacterId: 'c',
          reason: 'tiebreak_time',
          turnMs: { [ME]: 9000, [OPP]: 4000 },
        },
      ],
      playing,
    );
    expect(over).toMatchObject({
      gameOverReason: 'tiebreak_time',
      winnerId: OPP,
      turnMs: { [ME]: 9000, [OPP]: 4000 },
    });
    expect(run([{ type: 'reset' }], over).turnMs).toBeNull();
  });

  it('has no turn times for an ordinary ending', () => {
    const s = run([{ type: 'game_over', winnerId: ME, opponentCharacterId: 'b', reason: 'correct_guess' }], playing);
    expect(s.turnMs).toBeNull();
  });

  it('last chance missed: the first player’s win is confirmed', () => {
    const s = run(
      [
        { type: 'last_chance', playerId: OPP },
        { type: 'game_over', winnerId: ME, opponentCharacterId: 'b', reason: 'correct_guess' },
      ],
      playing,
    );
    expect(s).toMatchObject({ phase: 'ended', winnerId: ME, gameOverReason: 'correct_guess', lastChanceFor: null });
  });

  it('clears pending prompts and rematch requests at the end, and keeps the log', () => {
    const s = run(
      [
        { type: 'question_answered', entry: qna(), currentTurnPlayerId: OPP, logId: '1' },
        { type: 'question_asked', question: 'Épée ?' },
        { type: 'rematch_requested', byPlayerId: OPP },
        { type: 'game_over', winnerId: OPP, opponentCharacterId: 'b', reason: 'out_of_lives' },
      ],
      playing,
    );
    expect(s).toMatchObject({ pendingQuestion: null, awaitingAnswerFor: null, rematchRequestedBy: null });
    expect(s.gameLog).toHaveLength(1);
  });
});

describe('reconnect snapshot (state_sync)', () => {
  it('restores a game in progress', () => {
    const s = gameReducer(atHome, { type: 'state_sync', room: snapshot(), now: 10_000 });
    expect(s).toMatchObject({
      phase: 'playing',
      roomCode: 'XYZ789',
      roomMode: 'private',
      queuePosition: null,
      players: players(2, 3),
      characters: board,
      myCharacterId: 'b',
      myEliminatedIds: ['c'],
      opponentReady: true,
      opponentConnected: true,
      opponentLeft: false,
      currentTurnId: OPP,
      timer: { actingPlayerId: OPP, deadline: 40_000 },
    });
    // Connection and identity are not part of the room.
    expect(s).toMatchObject({ myPlayerId: ME, isConnected: true });
  });

  it('marks restored log entries so the board does not offer to cross out again', () => {
    const s = gameReducer(atHome, { type: 'state_sync', room: snapshot(), now: 0 });
    expect(s.gameLog.map((e) => e.id)).toEqual(['restored-0', 'restored-1']);
    expect(s.gameLog[1]).toMatchObject({ type: 'guess', guesserId: OPP, guessedCharacterId: 'a' });
  });

  it('restores a last chance with its timer', () => {
    const room = snapshot({
      lastChanceFor: ME,
      currentTurnPlayerId: ME,
      timer: { actingPlayerId: ME, msLeft: 12_500 },
    });
    const s = gameReducer(initialGameState, { type: 'state_sync', room, now: 500 });
    expect(s).toMatchObject({ lastChanceFor: ME, currentTurnId: ME, timer: { actingPlayerId: ME, deadline: 13_000 } });
  });

  it('restores the prompts, a paused timer and a disconnected opponent', () => {
    const room = snapshot({
      pendingQuestion: 'Épée ?',
      awaitingAnswerFor: null,
      opponentConnected: false,
      timer: { actingPlayerId: null, msLeft: null },
    });
    const s = gameReducer(playing, { type: 'state_sync', room, now: 0 });
    expect(s).toMatchObject({ pendingQuestion: 'Épée ?', opponentConnected: false, timer: null });
  });

  it('maps every room phase to a screen', () => {
    const phase = (p: RoomSnapshot['phase']) =>
      gameReducer(atHome, { type: 'state_sync', room: snapshot({ phase: p }), now: 0 }).phase;
    expect(phase('waiting')).toBe('lobby');
    expect(phase('selection')).toBe('selection');
    expect(phase('playing')).toBe('playing');
    expect(phase('ended')).toBe('ended');
  });

  it('restores a finished game, with the result and the rematch request', () => {
    const room = snapshot({
      phase: 'ended',
      winnerId: OPP,
      gameOverReason: 'correct_guess',
      opponentCharacterId: 'a',
      rematchRequestedBy: OPP,
    });
    const s = gameReducer(atHome, { type: 'state_sync', room, now: 0 });
    expect(s).toMatchObject({
      phase: 'ended',
      winnerId: OPP,
      gameOverReason: 'correct_guess',
      revealedOpponentCharacterId: 'a',
      rematchRequestedBy: OPP,
    });
  });

  it('knows the opponent left when only one player remains (but not while waiting)', () => {
    const alone = [players()[0]];
    const ended = gameReducer(atHome, { type: 'state_sync', room: snapshot({ phase: 'ended', players: alone }), now: 0 });
    expect(ended.opponentLeft).toBe(true);
    const waiting = gameReducer(atHome, {
      type: 'state_sync',
      room: snapshot({ phase: 'waiting', players: alone }),
      now: 0,
    });
    expect(waiting.opponentLeft).toBe(false);
  });

  it('with no room: returns home from a game and clears it', () => {
    const s = gameReducer(playing, { type: 'state_sync', room: null, now: 0 });
    expect(s).toMatchObject({ phase: 'home', roomCode: null, players: [], characters: [], gameLog: [], timer: null });
    expect(s.myPlayerId).toBe(ME);
  });

  it('with no room: leaves the queue and home untouched', () => {
    const queued = gameReducer(atHome, { type: 'in_queue', position: 3 });
    expect(gameReducer(queued, { type: 'state_sync', room: null, now: 0 })).toBe(queued);
    expect(gameReducer(atHome, { type: 'state_sync', room: null, now: 0 })).toBe(atHome);
  });
});

describe('opponent', () => {
  it('tracks the opponent connection', () => {
    const away = gameReducer(playing, { type: 'opponent_disconnected' });
    expect(away.opponentConnected).toBe(false);
    expect(gameReducer(away, { type: 'opponent_reconnected' }).opponentConnected).toBe(true);
  });

  it('leaving during the game ends it as my win', () => {
    const s = gameReducer(playing, { type: 'opponent_left' });
    expect(s).toMatchObject({ phase: 'ended', opponentLeft: true, gameOverReason: 'opponent_left', winnerId: ME });
  });

  it('leaving during selection ends it as my win too', () => {
    const s = gameReducer(gameReducer(atHome, joined), { type: 'opponent_left' });
    expect(s).toMatchObject({ phase: 'ended', gameOverReason: 'opponent_left', winnerId: ME });
  });

  it('leaving after the end keeps the result and drops the rematch request', () => {
    const ended = run(
      [
        { type: 'game_over', winnerId: OPP, opponentCharacterId: 'b', reason: 'correct_guess' },
        { type: 'rematch_requested', byPlayerId: OPP },
      ],
      playing,
    );
    const s = gameReducer(ended, { type: 'opponent_left' });
    expect(s).toMatchObject({
      phase: 'ended',
      winnerId: OPP,
      gameOverReason: 'correct_guess',
      opponentLeft: true,
      rematchRequestedBy: null,
    });
  });
});

describe('rematch', () => {
  const ended = run(
    [
      { type: 'question_answered', entry: qna(), currentTurnPlayerId: OPP, logId: '1' },
      { type: 'wrong_guess', guesserId: OPP, guessedCharacterId: 'a', lives: 2, currentTurnPlayerId: ME, logId: '2' },
      { type: 'last_chance', playerId: OPP },
      { type: 'game_over', winnerId: ME, opponentCharacterId: 'c', reason: 'correct_guess' },
      { type: 'rating_update', update: { ranked: true, rating: 1020, delta: 20 } },
      { type: 'rematch_requested', byPlayerId: ME },
    ],
    playing,
  );

  it('records who asked for a rematch', () => {
    expect(ended.rematchRequestedBy).toBe(ME);
  });

  it('resets the round but keeps the room, the identity and the stats', () => {
    const newBoard = [char('x'), char('y')];
    const s = gameReducer(ended, { type: 'rematch_started', mode: 'quick', players: players(), characters: newBoard });
    expect(s).toMatchObject({
      phase: 'selection',
      roomCode: 'ABC123',
      roomMode: 'quick',
      myPlayerId: ME,
      players: players(),
      characters: newBoard,
      myCharacterId: null,
      myEliminatedIds: [],
      opponentReady: false,
      opponentConnected: true,
      opponentLeft: false,
      currentTurnId: null,
      pendingQuestion: null,
      awaitingAnswerFor: null,
      gameLog: [],
      winnerId: null,
      gameOverReason: null,
      lastChanceFor: null,
      revealedOpponentCharacterId: null,
      rematchRequestedBy: null,
      ratingUpdate: null,
    });
  });
});

describe('local reset', () => {
  it('clears the room and moves to the requested screen', () => {
    const stats = { enabled: true, minRankedGames: 5, stats: null };
    const before = gameReducer(playing, { type: 'my_stats', stats });
    const s = gameReducer(before, { type: 'reset', phase: 'home' });
    expect(s).toEqual({ ...initialGameState, myPlayerId: ME, myStats: stats, isConnected: true, hasConnectedOnce: true });
  });

  it('keeps the current screen when none is given', () => {
    expect(gameReducer(atHome, { type: 'reset' }).phase).toBe('home');
    expect(gameReducer(playing, { type: 'reset', phase: 'queue' }).phase).toBe('queue');
  });
});
