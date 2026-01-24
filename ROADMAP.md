# Plinko Game - Roadmap

## Current State

A polished Peggle-style game with **12 power-ups**, **6 levels**, a **visual level editor**, and comprehensive audio/visual feedback. Built entirely in vanilla JavaScript with Canvas 2D and Web Audio.

### What's Complete

| Feature | Status |
|---------|--------|
| Orange/Blue/Green peg system | Done |
| Extreme Fever (slow-mo, zoom, fanfare) | Done |
| Combo system with multipliers | Done |
| Score popups and style bonuses | Done |
| Moving goal mouth (free ball) | Done |
| Ball magazines with animations | Done |
| 12 Power-ups via green pegs | Done |
| 6 Hand-crafted levels | Done |
| Level select with star ratings | Done |
| Visual level editor | Done |
| Per-level physics (gravity, bucket speed) | Done |
| Power-up assignment in editor | Done |
| Screen shake, particles, trails | Done |
| Full Web Audio synthesis | Done |

---

## Power-Ups (12 Implemented)

All power-ups trigger when hitting a **green peg**.

| Power-Up | Effect |
|----------|--------|
| **Multiball** | Spawns 2 extra balls from current position |
| **Fireball** | Burns through pegs without bouncing (8 pegs max) |
| **Spooky Ball** | Returns to top if ball falls out |
| **Power Ball** | Turns 3 nearby pegs into power-up pegs |
| **Lightning** | Chains to 5 nearby pegs |
| **Magnet** | Ball curves toward orange pegs |
| **Space Blast** | Explodes nearby pegs on hit (3 explosions) |
| **Splitter** | Splits into additional balls on peg hits |
| **Firework** | Rockets up and explodes at peak |
| **Anti-Gravity** | Ball floats upward for a duration |
| **Bouncy Ball** | Gains 15% energy per bounce (caps at 2.5x) |
| **Black Hole** | Creates gravity well that pulls in pegs |

---

## Level Editor Features

The level editor (`E` key or via admin panel) includes:

- **Peg placement**: Click to place, right-click to remove
- **Peg types**: Blue (1), Orange (2), Green (3), Erase (X), Move (M)
- **Eraser brush**: Click-and-drag to erase multiple pegs
- **Power-up assignment**: Click green pegs to assign specific power-ups
- **Per-level physics**: Gravity and bucket speed settings
- **Star thresholds**: Customize 1/2/3 star score targets
- **Test play**: Test levels instantly with unlimited balls
- **Save/Load**: Levels saved to localStorage
- **Export/Import**: JSON format for sharing

---

## What's Next

### Polish & Bug Fixes
- [ ] Purple peg (bonus points, moves each shot)
- [ ] Fever score slots during Extreme Fever (10K, 50K, 100K, 50K, 10K)
- [ ] Hit flash/pulse on pegs before fade
- [ ] Guard peg collision when distance is zero (NaN velocities)

### More Content
- [ ] Levels 7-10 (complete first "world")
- [ ] Level difficulty curve
- [ ] Unique peg patterns/art per level

### Game Modes
- [ ] Adventure mode (single player progression)
- [ ] Challenge mode (limited balls, time attack)
- [ ] Endless/Zen mode (infinite balls, no win/lose)

### Competitive Duel (Unique Angle)
The 2-player duel mode could be expanded:
- [ ] Player-specific peg colors (P1 orange, P2 purple)
- [ ] Sabotage: hitting opponent's pegs blocks paths
- [ ] Tournament mode: best of 3/5

### Platform Features
- [ ] PWA manifest for "Add to Home Screen"
- [ ] Offline support via service worker
- [ ] Cloud save (Vercel Postgres backend)
- [ ] Community level sharing

---

## Tech Stack

- **100% Vanilla JavaScript** - No frameworks
- **Canvas 2D** - All rendering
- **Web Audio API** - Synthesized sounds
- **LocalStorage** - Settings & level progress
- **6 Levels** with star ratings
- **12 Power-ups** with unique visuals

---

## File Structure

```
plinko/
├── index.html
├── css/style.css
├── js/
│   ├── main.js           # Entry point
│   ├── config.js         # Game constants
│   ├── sound.js          # Web Audio synthesis
│   ├── core/
│   │   ├── Game.js       # Main orchestrator
│   │   ├── Renderer.js   # Canvas rendering
│   │   └── InputHandler.js
│   ├── entities/
│   │   ├── Ball.js       # Physics & trails
│   │   ├── Peg.js        # Collision entities
│   │   ├── Magazine.js   # Ball slot display
│   │   └── GoalMouth.js  # Moving bucket
│   ├── levels/
│   │   └── LevelData.js  # Level definitions
│   ├── editor/
│   │   └── LevelEditor.js
│   └── physics/
│       └── Collision.js
```

---

## Design Principles

1. **Simple core loop** - One decision: "Where do I aim?"
2. **Skill + luck balance** - Predictable first bounce, chaotic subsequent bounces
3. **Constant rewards** - Every action feels rewarding through audio/visual feedback
4. **The "Extreme Fever" moment** - Slow-mo zoom with fanfare on last orange peg
5. **Clear objectives** - Hit all orange pegs, visible progress

---

## Resources

- [Why Peggle Works - Game Analysis](https://kalebnek.medium.com/why-peggle-works-a-game-analysis-7899d1716bdf)
- [Peggle Wiki - Game Mechanics](https://peggle.fandom.com/wiki/Game_Mechanics)
