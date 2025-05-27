import React from 'react';
import './App.css';
import SimpleGame from './SimpleGame';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Quarantine Life Simulator</h1>
      </header>
      <main style={{ height: 'calc(100vh - 60px)' }}>
        <SimpleGame />
      </main>
    </div>
  );
}

export default App;
