# Plinko Game - Complete Development Plan

## Project Overview

**Target:** Modern, minimal black & white Plinko game  
**Aspect Ratio:** 9:16 (portrait)  
**Primary Display:** 1080x1920 large touchscreen  
**Secondary:** Mobile responsive (phones/tablets)  
**Tech Stack:** Vanilla HTML5 Canvas + JavaScript (custom physics inspired by Matter.js)

---

## 🎨 Design Specifications (Based on Reference Image)

### Color Palette
| Element | Color | Hex Code |
|---------|-------|----------|
| Background | Off-white / Light gray | `#F5F5F5` |
| Board | Pure white | `#FFFFFF` |
| Board shadow | Soft gray | `rgba(0,0,0,0.1)` |
| Pegs | Solid black | `#000000` |
| Token/Ball | Silver/Gray | `#9E9E9E` |
| Prize slots | White with shadow | `#FFFFFF` |
| Text | Black | `#000000` |

### Board Dimensions (Relative Units - % of canvas width)
```
Canvas: 1080w x 1920h (9:16)

Board Layout:
├── Top margin: 15% (288px) - Drop zone area
├── Board frame: 75% height (1440px)
│   ├── Inner padding: 5%
│   ├── Peg area: ~65%
│   └── Prize slots: 10%
└── Bottom margin: 10% (192px) - Score/UI area
```

### Peg Configuration
- **Grid Pattern:** Offset rows (not triangular)
- **Row Count:** 8 rows
- **Pegs per row:** Alternating 7 and 6 (offset by half spacing)
- **Peg radius:** 8-10px (at 1080p)
- **Horizontal spacing:** ~120px
- **Vertical spacing:** ~140px

### Side Walls
- **Chevron/Zig-zag pattern:** 6 notches per side
- **Purpose:** Guide ball back toward center, add visual interest
- **Style:** White with subtle inner shadow

### Prize Slots
```
Slot Layout (left to right):
┌──────┬──────┬──────┬──────┬──────┐
│  $5  │ $10  │ $100 │ $25  │ $10  │
│PRIZE │PRIZE │PRIZE │PRIZE │PRIZE │
└──────┴──────┴──────┴──────┴──────┘

Probability Distribution (center = highest value)
```

### Token/Ball Design
- **Shape:** Circle with subtle gradient (3D look)
- **Color:** Silver/gray (#9E9E9E to #757575 gradient)
- **Size:** 40-50px diameter
- **Effect:** Subtle drop shadow while falling

---

## ⚙️ Physics System (Custom, Matter.js-Inspired)

### Core Physics Constants
```javascript
const PHYSICS = {
    gravity: 0.5,           // Pixels per frame²
    friction: 0.99,         // Air resistance
    restitution: 0.7,       // Bounciness (0-1)
    pegRestitution: 0.5,    // Bounce off pegs
    maxVelocity: 15,        // Terminal velocity cap
    deltaTime: 1/60         // 60 FPS target
};
```

### Collision Detection
```
Ball-to-Peg Collision:
1. Calculate distance: d = √((ball.x - peg.x)² + (ball.y - peg.y)²)
2. If d < (ball.radius + peg.radius):
   a. Calculate collision normal
   b. Reflect velocity vector
   c. Apply restitution
   d. Add slight randomness (±5%) for natural feel
   e. Separate overlapping bodies
```

### Velocity Reflection Formula
```
v' = v - 2(v · n)n * restitution

Where:
- v = incoming velocity vector
- n = collision normal (unit vector from peg to ball)
- v' = reflected velocity
```

### Wall Collision
- Side walls: Reflect X velocity, apply friction
- Chevron walls: Angled reflection based on notch geometry
- Bottom: Detect which slot ball lands in

### Physics Loop
```javascript
function physicsUpdate(dt) {
    // 1. Apply gravity
    ball.vy += PHYSICS.gravity * dt;
    
    // 2. Apply air friction
    ball.vx *= PHYSICS.friction;
    ball.vy *= PHYSICS.friction;
    
    // 3. Cap velocity
    ball.vy = Math.min(ball.vy, PHYSICS.maxVelocity);
    
    // 4. Update position
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    
    // 5. Check collisions
    checkPegCollisions();
    checkWallCollisions();
    checkSlotCollision();
}
```

---

## 📱 Responsive Design Strategy

### Breakpoints
```css
/* Large touchscreen (primary) */
@media (min-height: 1920px) {
    --scale: 1;
}

/* Tablet */
@media (max-height: 1400px) {
    --scale: 0.73;
}

/* Phone */
@media (max-height: 900px) {
    --scale: 0.47;
}
```

### Scaling Approach
```javascript
function calculateScale() {
    const targetWidth = 1080;
    const targetHeight = 1920;
    
    const scaleX = window.innerWidth / targetWidth;
    const scaleY = window.innerHeight / targetHeight;
    
    // Use smaller scale to fit, maintain aspect ratio
    return Math.min(scaleX, scaleY);
}
```

### Touch Handling
```javascript
// Touch events for mobile
canvas.addEventListener('touchstart', handleTouchStart);
canvas.addEventListener('touchmove', handleTouchMove);
canvas.addEventListener('touchend', handleTouchEnd);

// Mouse events for desktop
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
```

---

## 🎮 Game Flow

### States
```
┌─────────────┐
│    IDLE     │ ← Waiting for player input
└──────┬──────┘
       │ Touch/Click in drop zone
       ▼
┌─────────────┐
│  AIMING     │ ← Player dragging to position ball
└──────┬──────┘
       │ Release
       ▼
┌─────────────┐
│  DROPPING   │ ← Ball falling through pegs
└──────┬──────┘
       │ Ball reaches slot
       ▼
┌─────────────┐
│  SCORING    │ ← Show prize animation
└──────┬──────┘
       │ After delay
       ▼
┌─────────────┐
│    IDLE     │ ← Ready for next drop
└─────────────┘
```

### Drop Mechanics
1. Player touches/clicks above board
2. Ball appears at touch X position (constrained to valid drop zone)
3. Visual indicator shows drop position
4. Release to drop ball
5. Ball falls with physics simulation
6. Collides with pegs, bouncing naturally
7. Lands in prize slot
8. Prize animation plays
9. Score updates

---

## 🏗️ File Structure

```
plinko/
├── index.html              # Main HTML container
├── GAME_PLAN.md           # This document
│
├── css/
│   └── style.css          # Responsive styles, fonts
│
├── js/
│   ├── main.js            # Entry point, game loop
│   ├── config.js          # All game constants
│   ├── utils.js           # Helper functions
│   │
│   ├── core/
│   │   ├── Game.js        # Main game class
│   │   ├── InputHandler.js # Touch/mouse input
│   │   └── Renderer.js    # Canvas drawing
│   │
│   ├── physics/
│   │   ├── Physics.js     # Physics engine
│   │   ├── Vector.js      # 2D vector math
│   │   └── Collision.js   # Collision detection
│   │
│   ├── entities/
│   │   ├── Ball.js        # Ball/token class
│   │   ├── Peg.js         # Peg class
│   │   ├── Board.js       # Board + walls
│   │   └── Slot.js        # Prize slots
│   │
│   └── effects/
│       ├── Particles.js   # Win particles
│       └── Sound.js       # Sound manager
│
└── assets/
    ├── fonts/             # Custom fonts (optional)
    └── sounds/
        ├── bounce.mp3     # Peg hit sound
        ├── wall.mp3       # Wall bounce
        └── win.mp3        # Prize won
```

---

## 📋 Implementation Phases

### Phase 1: Foundation (Day 1)
- [ ] Set up HTML/CSS structure
- [ ] Create responsive canvas
- [ ] Implement basic game loop (requestAnimationFrame)
- [ ] Add configuration constants
- [ ] Vector math utilities

### Phase 2: Static Elements (Day 1-2)
- [ ] Render board background with shadow
- [ ] Draw chevron side walls
- [ ] Create peg grid (8 rows, alternating 7/6)
- [ ] Render prize slots with values
- [ ] Style everything to match reference

### Phase 3: Physics Engine (Day 2-3)
- [ ] Implement gravity and velocity
- [ ] Ball-to-peg collision detection
- [ ] Collision response (reflection + restitution)
- [ ] Wall collision with chevron geometry
- [ ] Slot detection

### Phase 4: Input & Gameplay (Day 3)
- [ ] Touch/mouse input handling
- [ ] Drop zone positioning
- [ ] Ball spawning at touch position
- [ ] Game state management
- [ ] Score tracking

### Phase 5: Polish (Day 4)
- [ ] Smooth animations
- [ ] Prize celebration effects
- [ ] Sound effects (optional)
- [ ] Performance optimization
- [ ] Mobile testing

### Phase 6: Testing & Refinement (Day 5)
- [ ] Test on large touchscreen
- [ ] Test on various phones
- [ ] Tune physics feel
- [ ] Bug fixes
- [ ] Final polish

---

## 🔧 Technical Considerations

### Performance Targets
- **Frame Rate:** 60 FPS
- **Physics Updates:** 60 Hz (fixed timestep)
- **Render Updates:** RequestAnimationFrame (variable)

### Canvas Optimization
```javascript
// Use offscreen canvas for static elements
const staticCanvas = document.createElement('canvas');
// Draw board, pegs, slots once
// Composite onto main canvas each frame

// Only redraw what changes (ball position)
```

### Physics Stability
```javascript
// Fixed timestep with accumulator
let accumulator = 0;
const FIXED_DT = 1/60;

function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    accumulator += dt;
    
    while (accumulator >= FIXED_DT) {
        physicsUpdate(FIXED_DT);
        accumulator -= FIXED_DT;
    }
    
    render();
    requestAnimationFrame(gameLoop);
}
```

### Touch Responsiveness
- Immediate visual feedback on touch
- No input delay
- Gesture prevention (no scroll/zoom on canvas)

---

## 🎯 Key Physics Parameters to Tune

| Parameter | Starting Value | Effect |
|-----------|---------------|--------|
| `gravity` | 0.5 | Higher = faster fall |
| `restitution` | 0.6 | Higher = bouncier |
| `friction` | 0.99 | Lower = more air drag |
| `pegRandomness` | 0.05 | Higher = more chaotic |
| `maxVelocity` | 15 | Cap for stability |

---

## 📐 Exact Measurements (1080x1920)

```
Canvas: 1080 x 1920 px

Board Frame:
├── X: 90px from edge (centered)
├── Y: 280px from top
├── Width: 900px
├── Height: 1440px
└── Border Radius: 30px

Peg Grid:
├── Start X: 180px
├── Start Y: 400px
├── Horizontal Gap: 105px
├── Vertical Gap: 140px
├── Peg Radius: 10px
└── Row offset: 52px (half of horizontal gap)

Prize Slots:
├── Y: 1580px
├── Slot Width: 160px
├── Slot Height: 120px
├── Gap: 20px
└── Values: [5, 10, 100, 25, 10]

Token:
├── Radius: 45px
└── Drop Zone Y: 100-250px
```

---

## ✅ Definition of Done

- [ ] Ball drops from touch position
- [ ] Realistic bouncing off pegs
- [ ] Ball lands in slot and scores correctly
- [ ] Smooth 60 FPS on target devices
- [ ] Matches visual reference (minimal B&W style)
- [ ] Works on 1080p touchscreen AND phones
- [ ] Touch input feels responsive

---

## 🚀 Ready to Build!

This document serves as the complete blueprint. Implementation should follow the phases outlined above.

**Next Step:** Start Phase 1 - Create the HTML/CSS foundation and basic canvas setup.
