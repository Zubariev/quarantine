# UX & Polish QA Test Plan

## Objective
Verify all new user experience enhancements work correctly and provide a polished gaming experience.

## Setup
1. Run `./setup-ux-polish.sh` to install required packages
2. Start the game with `cd frontend && npm run dev`
3. Log in to the game and navigate to the GamePage

## Test Categories

### 1. Event Pop-Ups

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Event appearance | Wait for random event or trigger with debug tool | Event popup should slide in with animation | |
| Event options | Click on different options in an event | Stat changes should be applied and shown | |
| Event dismissal | Click X or outside the event popup | Popup should animate out and close | |
| Event stat impact | Select an option that changes stats | Stats bar should animate to new values | |
| Multiple events | Trigger multiple events in succession | Events should queue and not overlap | |

### 2. Notifications

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Low stat notification | Reduce hunger below 20% | Warning notification should appear | |
| Critical notification | Increase stress above 80% | Critical notification with screen shake | |
| Notification dismiss | Click X on notification | Should animate out and disappear | |
| Multiple notifications | Trigger multiple low stats | Notifications stack without overlapping | |
| Notification timing | Let notifications time out | Should auto-dismiss after timeout period | |

### 3. Audio System

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Background music | Load game at different hours | Music should match time of day | |
| Music transitions | Change game hour | Music should fade between tracks | |
| Sound effects | Click UI elements | Click sound should play | |
| Mute button | Click volume icon | All audio should mute | |
| Volume slider | Adjust BGM slider | Music volume should change in real-time | |
| SFX volume | Adjust SFX slider | Effect sounds should change volume | |
| Audio persistence | Refresh page | Audio settings should persist | |

### 4. Animation & Transitions

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Stat bar animations | Change stats | Bars should animate smoothly | |
| Menu transitions | Open/close settings | Menu should slide in/out | |
| Button hover effects | Hover over buttons | Should show subtle animations | |
| Screen transitions | Navigate between pages | Pages should have transition effects | |
| Responsive layout | Resize browser window | UI should adapt smoothly | |

### 5. Edge Cases & Performance

| Test Case | Steps | Expected Result | Status |
|-----------|-------|-----------------|--------|
| Zero stats | Reduce any stat to 0 | Should handle visually and with notification | |
| Maximum stats | Increase any stat to 100 | Should handle visually and with notification | |
| Fast interactions | Click UI elements rapidly | Should handle without glitches | |
| Low-end device | Test on slower device | Animations should remain smooth | |
| Mobile view | View on mobile or narrow browser | Should be responsive and usable | |

## Notes
- Document any unexpected behaviors or visual glitches
- Check for console errors during animations and transitions
- Verify audio files are loading correctly
- Test with and without browser sound permissions

## Requirements to Pass QA
- All animations must be smooth with no visible stuttering
- Notifications must be readable and properly timed
- Audio must play at appropriate times and volumes
- No console errors related to the new UX features
- Mobile and desktop experience should both be polished 