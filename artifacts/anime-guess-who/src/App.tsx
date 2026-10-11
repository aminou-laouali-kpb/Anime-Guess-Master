import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/sonner'; // Using sonner instead of toast since I used sonner in GameContext
import { TooltipProvider } from '@/components/ui/tooltip';
import { GameProvider, useGame } from '@/context/GameContext';
import { FloatingReactions } from '@/components/Reactions';

// Pages
import { Home } from '@/pages/Home';
import { QueueLobby } from '@/pages/QueueLobby';
import { Selection } from '@/pages/Selection';
import { Playing } from '@/pages/Playing';
import { Ended } from '@/pages/Ended';

const queryClient = new QueryClient();

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
      return <Ended />;
    default:
      return <Home />;
  }
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <GameProvider>
            <MainGame />
            <FloatingReactions />
          </GameProvider>
        </ErrorBoundary>
        <Toaster position="top-center" theme="system" richColors />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
