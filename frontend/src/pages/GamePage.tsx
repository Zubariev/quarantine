
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from 'utils/authStore';
import useGameStore from 'utils/gameStore'; // Import game store
import { toast } from 'sonner';
import StatsHud from 'components/StatsHud';
import GameRoom from 'components/GameRoom'; // Character display
import TimelineSidebar from 'components/TimelineSidebar'; // Schedule
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button"; // For Restart
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // For Game Over

// Placeholder data for stats
const placeholderStats = {
  hunger: 75,
  stress: 30,
  tone: 80,
  health: 90,
  money: 150,
};

export default function GamePage() {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuthStore((state) => ({
    session: state.session,
    loading: state.loading,
  }));
  const initializeGame = useGameStore((state) => state.initializeGame);
  const gameIsLoading = useGameStore((state) => state.isLoading);
  const gameIsRunning = useGameStore((state) => state.isGameRunning);
  const { isGameOver, gameOverReason } = useGameStore((state) => ({
      isGameOver: state.isGameOver,
      gameOverReason: state.gameOverReason,
  }));
  const resetGame = useGameStore((state) => state.resetGame);

  // --- Authentication Check Effect ---
  useEffect(() => {
    // Redirect to login if auth is loading or user is not logged in
    if (!authLoading && !session) {
      console.log('GamePage: User not logged in, redirecting to login.');
      toast.info("Please log in to play the game.");
      navigate('/login');
    }
  }, [session, authLoading, navigate]);

  // --- Game Initialization Effect ---
  useEffect(() => {
    // Only initialize if auth is loaded, user exists, and game isn't already running/loading
    if (!authLoading && session && !gameIsLoading && !gameIsRunning) {
      console.log("GamePage: Triggering game initialization");
      initializeGame(session.user.id);
    }
    // Want this to run when auth state is ready or game state resets
  }, [authLoading, session, gameIsLoading, gameIsRunning, initializeGame]);

  if (authLoading || gameIsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading Game...
      </div>
    );
  }

  // Only render game content if logged in (or auth check passed)
  if (!session) {
     // This ideally shouldn't be reached due to the redirect, but acts as a safeguard
     return null;
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-stone-50 to-purple-50 overflow-hidden">
      {/* Stats HUD at the top */}
      <StatsHud stats={placeholderStats} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Game Room (Character) - takes most space */}
        <main className="flex-1 flex items-center justify-center p-4 overflow-auto">
          <GameRoom />
        </main>

        {/* Vertical Separator */}
        <Separator orientation="vertical" className="h-auto" />

        {/* Timeline Sidebar (Schedule) */}
        <aside className="w-72 flex-shrink-0 overflow-y-auto">
          <TimelineSidebar />
        </aside>
      </div>

      {/* Game Over Dialog */}
      <AlertDialog open={isGameOver}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Game Over</AlertDialogTitle>
            <AlertDialogDescription>
              {gameOverReason || "Your character couldn't handle the quarantine."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* <AlertDialogCancel>Cancel</AlertDialogCancel> // Optional */}
            <AlertDialogAction onClick={() => { 
              resetGame(); 
              // Optionally re-initialize after reset?
              if (session) {
                initializeGame(session.user.id);
              }
            }}>
              Restart Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
