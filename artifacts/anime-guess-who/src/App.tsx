import { Suspense, lazy, useEffect } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/sonner';
import { GameProvider, useGame } from '@/context/GameContext';
import { FloatingReactions } from '@/components/Reactions';
import { ConnectionStatus } from '@/components/ConnectionStatus';

// Pages
import { Home } from '@/pages/Home';
import { QueueLobby } from '@/pages/QueueLobby';

// The game screens are loaded on demand to keep the first load small, and
// fetched ahead of time (see prefetchGameScreens) so they're ready when a
// match starts. import() is cached: calling it again costs nothing.
const loadSelection = () => import('@/pages/Selection');
const loadPlaying = () => import('@/pages/Playing');
const Selection = lazy(() => loadSelection().then((m) => ({ default: m.Selection })));
const Playing = lazy(() => loadPlaying().then((m) => ({ default: m.Playing })));
// Only needed once a game ends.
const Ended = lazy(() => import('@/pages/Ended').then((m) => ({ default: m.Ended })));

function prefetchGameScreens() {
  void loadSelection().catch(() => {});
  void loadPlaying().catch(() => {});
}

// Fetch the game screens while the player waits for an opponent, or, on the
// home page, once the browser is idle (a game against the computer starts
// straight from there).
function usePrefetchGameScreens(phase: string) {
  useEffect(() => {
    if (phase === 'queue' || phase === 'lobby') {
      prefetchGameScreens();
      return;
    }
    if (phase !== 'home') return;
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(prefetchGameScreens, { timeout: 5000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(prefetchGameScreens, 3000);
    return () => window.clearTimeout(id);
  }, [phase]);
}

// Shown for the instant a game screen takes to load if it wasn't prefetched.
const ScreenFallback = () => <div className="min-h-[100dvh] w-full bg-background" aria-busy="true" />;

function MainGame() {
  const { phase } = useGame();
  usePrefetchGameScreens(phase);

  switch (phase) {
    case "home":
      return <Home />;
    case "queue":
    case "lobby":
      return <QueueLobby />;
    case "selection":
      return (
        <Suspense fallback={<ScreenFallback />}>
          <Selection />
        </Suspense>
      );
    case "playing":
      return (
        <Suspense fallback={<ScreenFallback />}>
          <Playing />
        </Suspense>
      );
    case "ended":
      return (
        <Suspense fallback={null}>
          <Ended />
        </Suspense>
      );
    default:
      return <Home />;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <MainGame />
        <FloatingReactions />
        <ConnectionStatus />
      </GameProvider>
      <Toaster position="top-center" theme="light" richColors />
    </ErrorBoundary>
  );
}

export default App;
