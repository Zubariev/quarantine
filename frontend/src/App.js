import { useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GameRoom from "./components/GameRoom";
import useGameStore from "./utils/gameStore";

const Game = () => {
  const { initializeGame, startGame, advanceTime, isGameRunning, isGameOver, gameOverReason } = useGameStore();

  useEffect(() => {
    // Initialize the game when component mounts
    initializeGame();
    startGame();

    // Set up time advancement
    const interval = setInterval(() => {
      if (isGameRunning && !isGameOver) {
        advanceTime();
      }
    }, 3000); // Advance time every 3 seconds

    return () => clearInterval(interval);
  }, [initializeGame, startGame, advanceTime, isGameRunning, isGameOver]);

  return (
    <div className="w-full h-screen">
      {isGameOver ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
          <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md">
            <h2 className="text-3xl font-bold mb-4 text-red-600">Game Over</h2>
            <p className="text-xl mb-6">{gameOverReason}</p>
            <button
              onClick={() => useGameStore.getState().resetGame()}
              className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors"
            >
              Start Again
            </button>
          </div>
        </div>
      ) : (
        <GameRoom />
      )}
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Game />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
