
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "utils/authStore"; // Import the auth store

export default function App() {
  const navigate = useNavigate();
  const { session, loading } = useAuthStore((state) => ({ 
    session: state.session, 
    loading: state.loading 
  })); // Get session and loading state

  const handleStartGame = () => {
    if (loading) {
      console.log("Auth state still loading...");
      return; // Or show a loading indicator
    }

    if (session) {
      console.log("User is logged in, navigating to character creation...");
      navigate("/character-creation"); // Placeholder path for MYA-3
    } else {
      console.log("User is not logged in, navigating to login...");
      navigate("/login");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-orange-50 to-rose-100 p-4">
      <Card className="w-full max-w-2xl shadow-lg rounded-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-stone-800">
            Quarantine
          </CardTitle>
          <CardDescription className="text-lg text-stone-600 pt-2">
            A Tamagotchi-style browser game where you guide a quarantined
            freelancer through daily routines to balance well-being and
            productivity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-stone-700 mb-3">
              Key Features:
            </h3>
            <ul className="list-none space-y-1 text-stone-600">
              <li>📅 Manage your daily schedule</li>
              <li>📊 Balance vital stats: Hunger, Stress, Tone, Health, Money</li>
              <li>🧘 Monitor your character's well-being</li>
              <li>🛋️ Unlock upgrades & customize your room</li>
            </ul>
          </div>
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleStartGame}
              className="px-8 py-3 text-lg font-semibold bg-orange-400 hover:bg-orange-500 text-white rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50"
              disabled={loading} // Disable button while auth state is loading
            >
              {loading ? "Loading..." : "Start Game"}
            </Button>
          </div>
          {/* Logout Button - Only shown when logged in */}
          {session && !loading && (
             <div className="text-center mt-4">
               <Button
                 onClick={() => useAuthStore.getState().signOut()}
                 variant="outline"
                 size="sm"
                 className="text-stone-600 border-stone-300 hover:bg-stone-100"
               >
                 Logout
               </Button>
             </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
