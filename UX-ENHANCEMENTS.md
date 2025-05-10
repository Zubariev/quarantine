# UX Enhancements for Quarantine Game

This document outlines the UX and polish improvements added to the Quarantine game.

## Features Added

### 1. Random Events System
- **EventPopup.tsx**: Animated popup for game events like friend calls, package deliveries, etc.
- **EventManager.tsx**: Manages random event timing and selection
- Dynamic stat impacts based on player choices
- Framer Motion animations for smooth transitions

### 2. Notification System
- **Notification.tsx**: Speech-bubble style notifications that alert players to important events
- **NotificationManager.tsx**: Manages notification state and display
- Screen shake for critical notifications
- Auto-dismissal with configurable timing
- Different styles for info, warning, and critical alerts

### 3. Audio System
- **AudioManager.tsx**: Manages background music and sound effects
- Time-based background music that changes throughout the in-game day
- Sound effects for UI interactions
- Volume controls and mute toggle
- Smooth transitions between tracks

### 4. Settings Menu
- **SettingsMenu.tsx**: Configurable game settings
- Audio volume controls
- Save/load preferences
- Modal design with animations

### 5. Animated UI Elements
- Animated stat bars using Framer Motion
- Smooth transitions between game states
- Visual feedback for user actions
- Mobile-responsive design

## Implementation Details

### Technologies Used
- **Framer Motion**: For smooth animations and transitions
- **Howler.js**: For cross-browser audio support
- **Tailwind CSS**: For styling and responsive design

### Directory Structure
- `frontend/src/components/`: Core UI components
- `frontend/public/audio/`: Audio assets (BGM and SFX)
- `frontend/public/images/events/`: Event images

## Setup Instructions

1. Run the setup script to install dependencies:
   ```
   ./setup-ux-polish.sh
   ```

2. Replace placeholder audio files in `frontend/public/audio/` with actual audio files:
   - BGM: `morning.mp3`, `afternoon.mp3`, `evening.mp3`, `night.mp3`
   - SFX: `click.mp3`, `success.mp3`, `notification.mp3`, `error.mp3`, `meal.mp3`

3. Replace placeholder event images in `frontend/public/images/events/` with actual images:
   - `friend-call.jpg`, `package.jpg`, `power-outage.jpg`, `food-discount.jpg`, `noise.jpg`

## Testing & QA

Use the `qa-ux-tests.md` document to verify all UX features are working correctly:
- Event popup behavior
- Notification timing and appearance
- Audio playback and transitions
- Animation smoothness
- Responsive layout testing

## Debug Tools

For development and testing, use the debug tools in `debug-tools.js`:
1. Open the browser console
2. Copy/paste the script content
3. Use commands like `setLowHealth()` or `triggerRandomEvent()` to test features

## Known Issues

- Audio may not play on initial load until user interacts with the page (browser security limitation)
- Some animations may run slightly differently across browsers
- Mobile audio controls may require additional testing

## Future Enhancements

- Add more random events
- Implement custom sound effects for different actions
- Add visual themes/skins
- Expand settings with accessibility options 