# Backrooms Game

A 3D first-person exploration game inspired by Kane Parsons' Backrooms.

## Features
- Procedurally generated maze-like corridors and rooms
- Dynamic lighting with flickering fluorescent lights
- Entity AI that patrols and chases the player when seen
- Sanity system: lose sanity when near the entity or in darkness
- Flashlight toggle (F key)
- Positional audio: ambient hum, footsteps, entity growl
- Simple controls: WASD to move, mouse to look, space to jump, F for flashlight

## How to Play
1. Open `index.html` in a modern web browser (Chrome, Firefox, Edge).
2. Click the screen to lock the pointer and start the game.
3. Use WASD to move, mouse to look around.
4. Press F to toggle the flashlight.
5. Avoid the entity; if it sees you, your sanity will decrease.
6. Game ends when sanity reaches zero.

## Implementation
- Built with Three.js for rendering
- PointerLockControls for first-person movement
- Custom audio synthesis using Web Audio API
- Simple entity AI with line-of-sight detection
- Procedural maze generation with random turns and rooms

## Files
- `index.html` – main HTML page
- `main.js` – game logic and rendering
- (Assets are generated procedurally or via audio synthesis)

Enjoy exploring the Backrooms!