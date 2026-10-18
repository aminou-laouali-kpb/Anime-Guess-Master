import { Suspense, lazy } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/sonner';
import { GameProvider, useGame } from '@/context/GameContext';
import { FloatingReactions } from '@/components/Reactions';
import { ConnectionStatus } from '@/components/ConnectionStatus';

// Pages
import { Home } from '@/pages/Home';
import { QueueLobby } from '@/pages/QueueLobby';
import { Selection } from '@/pages/Selection';
import { Playing } from '@/pages/Playing';

// Only needed once a game ends: loaded on demand to keep the first load small.
const Ended = lazy(() => import('@/pages/Ended').then((m) => ({ default: m.Ended })));

function MainGame() {
  const { phase } = useGame();

  switch (phase) {
    case "home":
      return <Home />;
    case "queue":
    case "lobby":
      return <QueueLobby />;
    case "selection":
      return <Selection />;
    case "playing":
      return <Playing />;
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
