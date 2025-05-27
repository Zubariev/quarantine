/**
 * Debug Tools for Quarantine Game
 * 
 * This script provides helper functions to modify game state for testing purposes.
 * Paste these functions into your browser console while running the game.
 */

// Helper to get the current game state
function getGameState() {
  return window.__DEBUG_GAME_STATE = JSON.parse(localStorage.getItem('quarantine_stats') || '{}');
}

// Helper to save modified game state
function saveGameState(state) {
  localStorage.setItem('quarantine_stats', JSON.stringify(state));
  console.log('Game state saved. Refresh page to apply changes.');
}

// Set a specific stat to a value
function setStat(statName, value) {
  const state = getGameState();
  if (!state) {
    console.error('No game state found. Start the game first.');
    return;
  }
  
  if (!(statName in state)) {
    console.error(`Invalid stat name: ${statName}. Valid stats: ${Object.keys(state).join(', ')}`);
    return;
  }
  
  state[statName] = value;
  saveGameState(state);
  console.log(`Set ${statName} to ${value}`);
}

// Set health, hunger, stress, etc. to specific values for testing
function setLowHealth() {
  const state = getGameState();
  state.health = 15;
  saveGameState(state);
  console.log('Set health to critical level (15%)');
}

function setHighStress() {
  const state = getGameState();
  state.stress = 85;
  saveGameState(state);
  console.log('Set stress to critical level (85%)');
}

function setLowHunger() {
  const state = getGameState();
  state.hunger = 10;
  saveGameState(state);
  console.log('Set hunger to critical level (10%)');
}

function setLowEnergy() {
  const state = getGameState();
  state.tone = 15;
  saveGameState(state);
  console.log('Set energy/tone to critical level (15%)');
}

function setCriticalStats() {
  const state = getGameState();
  state.hunger = 15;
  state.stress = 85;
  state.tone = 20;
  state.health = 25;
  saveGameState(state);
  console.log('Set all stats to critical levels for notification testing');
}

function setMaxMoney() {
  const state = getGameState();
  state.money = 999;
  saveGameState(state);
  console.log('Set money to maximum (999)');
}

// Reset all stats to default values
function resetStats() {
  const state = {
    hunger: 75,
    stress: 30,
    tone: 70,
    health: 80,
    money: 150
  };
  saveGameState(state);
  console.log('Reset all stats to default values');
}

// Trigger a random event manually (only works when the component is mounted)
function triggerRandomEvent() {
  try {
    // Try to access the trigger function that should be exposed by EventManager
    const eventManager = document.querySelector('[data-testid="event-manager"]');
    if (eventManager && eventManager.__triggerEvent) {
      eventManager.__triggerEvent();
      console.log('Event triggered successfully');
    } else {
      console.error('EventManager not found or trigger function not exposed');
    }
  } catch (e) {
    console.error('Failed to trigger event:', e);
  }
}

console.log(`
Debug tools loaded! Available commands:
- setStat(statName, value) - Set a specific stat
- setLowHealth() - Set health to critical level
- setHighStress() - Set stress to critical level
- setLowHunger() - Set hunger to critical level
- setLowEnergy() - Set energy to critical level
- setCriticalStats() - Set all stats to critical levels
- setMaxMoney() - Set money to maximum
- resetStats() - Reset all stats to default values
- triggerRandomEvent() - Manually trigger a random event
`);

// Expose functions globally for easier access in console
window.setStat = setStat;
window.setLowHealth = setLowHealth;
window.setHighStress = setHighStress;
window.setLowHunger = setLowHunger;
window.setLowEnergy = setLowEnergy;
window.setCriticalStats = setCriticalStats;
window.setMaxMoney = setMaxMoney;
window.resetStats = resetStats;
window.triggerRandomEvent = triggerRandomEvent;
window.getGameState = getGameState; 