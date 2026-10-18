import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGetLeaderboard, getGetLeaderboardQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Flame, Loader2 } from "lucide-react";
import { useGame } from "@/context/GameContext";
import { cn } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

// This dialog is the only place that fetches with react-query, so it brings
// its own client and the app loads the library only when it is first opened.
const queryClient = new QueryClient();

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-col items-center bg-muted/40 rounded-lg py-2">
    <span className="font-display font-black text-xl tabular-nums">{value}</span>
    <span className="text-[11px] uppercase font-bold tracking-wider text-muted-foreground">{label}</span>
  </div>
);

interface LeaderboardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LeaderboardDialogContent: React.FC<LeaderboardDialogProps> = ({ open, onOpenChange }) => {
  const { myStats, refreshMyStats } = useGame();
  const leaderboard = useGetLeaderboard({
    query: { queryKey: getGetLeaderboardQueryKey(), enabled: open, staleTime: 15_000 },
  });

  useEffect(() => {
    if (open) refreshMyStats();
  }, [open, refreshMyStats]);

  const stats = myStats?.stats;
  const minGames = myStats?.minRankedGames ?? leaderboard.data?.minRankedGames ?? 5;
  const winRate = stats && stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;
  const entries = leaderboard.data?.entries ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" /> Classement
          </DialogTitle>
          <DialogDescription>
            Score Elo des parties rapides. Les parties privées comptent dans tes statistiques, pas dans le classement.
          </DialogDescription>
        </DialogHeader>

        {/* My stats */}
        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tes statistiques</h3>
          {!stats ? (
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-3">
              Termine une partie pour commencer tes statistiques.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Score" value={stats.rating} />
                <Stat label="Rang" value={stats.rank ? `#${stats.rank}` : "—"} />
                <Stat label="Taux de victoire" value={`${winRate} %`} />
                <Stat label="Parties" value={stats.gamesPlayed} />
                <Stat label="Gagnées" value={stats.wins} />
                <Stat label="Meilleure série" value={stats.bestStreak} />
              </div>
              {stats.currentStreak >= 2 && (
                <p className="text-sm font-bold text-orange-700 flex items-center gap-1">
                  <Flame className="w-4 h-4" /> {stats.currentStreak} victoires d’affilée !
                </p>
              )}
              {!stats.rank && (
                <p className="text-xs text-muted-foreground">
                  Encore {Math.max(0, minGames - stats.rankedGames)} {minGames - stats.rankedGames > 1 ? "parties rapides" : "partie rapide"} pour apparaître au classement.
                </p>
              )}
            </>
          )}
        </section>

        {/* Top players */}
        <section className="space-y-2 mt-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Meilleurs joueurs</h3>
          {leaderboard.isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : leaderboard.isError ? (
            <p className="text-sm text-muted-foreground">Classement indisponible pour le moment.</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Personne n’est encore classé. Joue {minGames} parties rapides pour être le premier nom ici !
            </p>
          ) : (
            <ol className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {entries.map(entry => {
                const isMe = entry.id === stats?.id;
                return (
                  <li
                    key={entry.id}
                    className={cn("flex items-center gap-3 px-3 py-2 text-sm", isMe && "bg-primary/10 font-bold")}
                  >
                    <span className="w-8 text-center font-display font-black tabular-nums">
                      {MEDALS[entry.rank - 1] ?? entry.rank}
                    </span>
                    <span className="flex-1 truncate">{entry.name}{isMe && " (toi)"}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{entry.rankedGames} {entry.rankedGames > 1 ? "parties" : "partie"}</span>
                    <span className="w-12 text-right font-display font-black tabular-nums">{entry.rating}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
};

export const LeaderboardDialog: React.FC<LeaderboardDialogProps> = (props) => (
  <QueryClientProvider client={queryClient}>
    <LeaderboardDialogContent {...props} />
  </QueryClientProvider>
);
