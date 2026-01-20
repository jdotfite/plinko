# Plinko → Peggle-Style Game Roadmap

## What Makes Peggle Work

Peggle's success comes from a few key design principles:

1. **Simple core loop** - One decision: "Where do I aim?" Easy to learn, hard to master.
2. **Skill + luck balance** - Predictable first bounce, chaotic subsequent bounces create gambling-like thrill.
3. **Constant rewards** - Every action feels rewarding through audio, visuals, and scoring feedback.
4. **The "Extreme Fever" moment** - Slow-mo zoom, Ode to Joy, particle explosions on final peg. Makes every win feel epic.
5. **Clear objectives** - Hit all 25 orange pegs. Simple, visible progress.
6. **Depth through power-ups** - Peggle Masters add strategic variety without complicating core mechanics.

---

## Current State vs Peggle

| Feature | Your Game | Peggle | Gap |
|---------|-----------|--------|-----|
| Core mechanic | Aim + charge cannon | Aim cannon | ✅ Similar |
| Peg collision | ✅ Working | Static pegs | ✅ Done |
| Objective | Land in slots for points | Clear all orange pegs | ❌ Different model |
| Peg types | Single type | Orange/Blue/Green/Purple | ❌ Missing |
| Power-ups | Power pegs (basic) | 10+ Peggle Masters | ❌ Limited |
| Free ball bucket | Goal mouth (bonus) | Moving bucket | ✅ Similar |
| Fever/finale | None | Extreme Fever zoom + music | ❌ Missing |
| Scoring feedback | Basic | Massive celebration | ❌ Weak |
| Progression | 3 levels | 55+ adventure levels | ❌ Limited |
| Game modes | 2-player duel | Adventure, Duel, Challenge | ⚠️ Partial |

---

## Phase 1: Core Loop Polish (Foundation)

**Goal:** Make every shot feel satisfying before adding complexity.

### 1.1 Peg Type System
- [ ] **Orange pegs** (25 per level) - Primary objective, must clear all to win
- [ ] **Blue pegs** - Filler pegs, lower score value
- [ ] Visual distinction (color, glow intensity)
- [ ] Track orange pegs remaining in HUD

### 1.2 Scoring Overhaul
- [ ] Base points: Orange = 100, Blue = 10
- [ ] Combo multiplier: 1x → 2x → 3x → 5x → 10x (consecutive hits)
- [ ] Style bonuses: "Long Shot", "Lucky Bounce", "Off the Wall"
- [ ] Floating score popups at hit location

### 1.3 The "Extreme Fever" Moment
This is Peggle's secret weapon. When the last orange peg is hit:
- [ ] Slow motion (0.3x speed)
- [ ] Camera zoom toward ball
- [ ] Epic music swell (synthesize triumphant fanfare)
- [ ] Particle explosion burst
- [ ] Score multiplier holes replace bucket (5 slots: 10K, 50K, 100K, 50K, 10K)

### 1.4 Audio-Visual Juice
- [ ] Pitch scaling on peg hits (higher pitch as combo grows)
- [ ] Screen shake on big combos
- [ ] Peg "pop" animation (scale up then disappear)
- [ ] Trail particles on ball
- [ ] Victory confetti burst

---

## Phase 2: Strategic Depth (Power-Ups)

**Goal:** Add replayability through varied abilities.

### 2.1 Green Peg System
- [ ] 2 green pegs per level (randomized position)
- [ ] Hitting green peg activates current power-up
- [ ] Visual: bright green glow, distinct shape

### 2.2 Power-Up Abilities (Start with 3-4)

| Power-Up | Effect | Peggle Equivalent |
|----------|--------|-------------------|
| **Multiball** | Splits into 3 balls | Bjorn's Super Guide |
| **Fireball** | Ball burns through pegs (no bounce) for 3 seconds | Tula's Flower Power |
| **Spooky Ball** | Ball reappears at top when falling out | Kat's Shadow |
| **Zen Ball** | Shows optimal trajectory for next 3 bounces | Warren's Lucky Spin |
| **Space Blast** | All nearby pegs explode on hit | Jimmy's Pyramid |

### 2.3 Purple Peg (Bonus Points)
- [ ] 1 purple peg per turn (changes position each shot)
- [ ] Worth 500 points (50x blue)
- [ ] Creates risk/reward decisions

---

## Phase 3: Progression System

**Goal:** Give players a reason to keep playing.

### 3.1 Level Structure
- [ ] 10 levels per "world" (5 worlds = 50 levels)
- [ ] Each level: unique peg arrangement as pixel art or pattern
- [ ] Difficulty curve: more pegs, tighter spacing, obstacles

### 3.2 Star Rating
- [ ] 1 star: Clear all orange pegs
- [ ] 2 stars: Score threshold (e.g., 50,000)
- [ ] 3 stars: High score threshold (e.g., 100,000)
- [ ] Track stars per level, show on level select

### 3.3 Level Editor (Optional but High Value)
- [ ] Drag-and-drop peg placement
- [ ] Test play from editor
- [ ] Export/import level JSON
- [ ] Community sharing (future: server backend)

### 3.4 Unlockables
- [ ] New power-ups unlock at world completion
- [ ] Ball skins (cosmetic)
- [ ] Background themes

---

## Phase 4: Game Modes

**Goal:** Different ways to play for different moods.

### 4.1 Adventure Mode (Single Player)
- [ ] Linear progression through worlds
- [ ] Story snippets between worlds (optional)
- [ ] Boss levels with unique mechanics

### 4.2 Duel Mode (Current Focus - Polish)
- [ ] 2-player local hot-seat
- [ ] Same board, alternating shots
- [ ] Win condition: highest score after X shots OR first to clear their color

### 4.3 Challenge Mode
- [ ] Daily challenge: specific level + constraints
- [ ] Time attack: clear board fastest
- [ ] Limited balls: complete with only 5 balls
- [ ] No power-ups: pure skill mode

### 4.4 Endless/Zen Mode
- [ ] Infinite balls, no win/lose
- [ ] Relaxation mode with ambient music
- [ ] Good for mobile "fidget" play

---

## Phase 5: Polish & Platform

**Goal:** Release-ready quality.

### 5.1 Mobile Optimization
- [ ] Touch controls tuned for thumb play
- [ ] Portrait orientation (already done)
- [ ] PWA manifest for "Add to Home Screen"
- [ ] Offline support via service worker

### 5.2 Save System
- [ ] LocalStorage for progress
- [ ] Level completion, stars, high scores
- [ ] Settings persistence (already done)
- [ ] Optional: cloud save via simple backend

### 5.3 Accessibility
- [ ] Colorblind mode (patterns instead of colors)
- [ ] Reduced motion option
- [ ] Screen reader announcements for key events
- [ ] Adjustable game speed

### 5.4 Monetization Options (If Desired)
- [ ] Remove ads (if ads added)
- [ ] Cosmetic ball/peg skins
- [ ] Level packs
- [ ] "Tip jar" for free version

---

## Immediate Next Steps (Recommended Order)

### Week 1-2: Extreme Fever + Peg Types
1. Add orange/blue peg distinction
2. Track "orange pegs remaining"
3. Implement Extreme Fever sequence when last orange hit
4. Add slow-mo + zoom + victory music

### Week 3-4: Scoring & Feedback
1. Floating score popups
2. Combo multiplier display
3. Peg pop animations
4. Audio pitch scaling

### Week 5-6: Green Pegs + First Power-Up
1. Green peg system
2. Implement Multiball power-up
3. Power-up selection UI

### Week 7-8: Level System
1. Level data format (JSON)
2. 10 hand-crafted levels
3. Level select screen
4. Star rating system

---

## Technical Considerations

### Architecture Changes Needed
- **PegManager class** - Handle peg types, tracking, removal
- **PowerUpSystem** - Trigger, duration, effects
- **LevelLoader** - Parse level JSON, instantiate pegs
- **CameraSystem** - Zoom, pan, shake effects
- **ScorePopup entity** - Floating animated text

### Performance Budget
- Current: ~100 pegs per level ✅
- Target: 150+ pegs with effects
- Consider: Object pooling for particles, off-screen culling

### Save Data Schema
```javascript
{
  version: 1,
  levels: {
    "1-1": { completed: true, stars: 3, highScore: 125000 },
    "1-2": { completed: true, stars: 2, highScore: 67000 }
  },
  unlocks: ["multiball", "fireball"],
  settings: { ... }
}
```

---

## What NOT to Do

1. **Don't add complexity before juice** - A simple game that feels amazing beats a complex game that feels flat.
2. **Don't copy Peggle exactly** - Find your own twist (duel mode is a good differentiator).
3. **Don't build 50 levels before testing 5** - Validate the fun first.
4. **Don't add monetization before fun** - Players pay for games they love.

---

## Your Unique Angle: Competitive Duel

Peggle's duel mode was an afterthought. You can make it the **core experience**:

- **Head-to-head tension** - Different colored pegs per player (P1 = orange, P2 = purple)
- **Sabotage mechanics** - Hit opponent's pegs to block their paths
- **Shared power-ups** - Race to grab the green peg
- **Comeback mechanics** - Trailing player gets slight aim assist
- **Tournament mode** - Best of 3/5 with level rotation

This positions your game as "Peggle meets competitive party game" rather than "Peggle clone."

---

## Sources

- [Why Peggle Works - Game Analysis](https://kalebnek.medium.com/why-peggle-works-a-game-analysis-7899d1716bdf)
- [Why Is Peggle So Addictive? - Game Developer](https://www.gamedeveloper.com/design/why-is-peggle-so-addictive-)
- [Anatomy of Fun: Why Peggle is a Masterpiece](https://trippenbach.org/2009/08/11/anatomy-of-fun-why-peggle-is-a-masterpiece/)
- [Peggle Wiki - Game Mechanics](https://peggle.fandom.com/wiki/Game_Mechanics)
- [Peggle - Wikipedia](https://en.wikipedia.org/wiki/Peggle)
