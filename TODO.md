# Plinko → Peggle Game TODO

## Current State (Completed)
- [x] Orange/Blue peg system with visual distinction
- [x] Orange peg counter in HUD
- [x] Extreme Fever (slow-mo, zoom, fanfare on last orange)
- [x] Cannon with aim + charge + trajectory preview
- [x] Moving goal mouth with rim collision (ball must fall into hole)
- [x] Combo meter tracking
- [x] 2-player alternating turn system
- [x] Ball magazines (skeeball-style) with count badges
- [x] Ball return on goal mouth catch
- [x] Score popups at hit locations
- [x] Celebratory kerplunk sound
- [x] Victory confetti
- [x] Recessed UI panels inside playfield

---

## Phase 1: Core Loop Polish (Next Up)

### Audio Juice
- [x] **Pitch scaling on peg hits** - Higher pitch as combo grows
- [x] Peg hit sound varies slightly each hit (already has some randomness)

### Visual Juice
- [x] **Peg "pop" animation** - Scale up briefly then vanish
- [x] **Ball trail particles** - 15 unique Rocket League-style trails with unlock system
- [x] **Screen shake on big combos** - Shake at 5, 10, 15, 20+ hits + Extreme Fever
- [ ] Hit flash/pulse on pegs before fade

### Scoring Polish
- [x] Style bonuses with popup text:
  - "Long Shot" - ball travels 500+ pixels before first hit (+250 pts)
  - "Lucky Bounce" - ball bounces 10+ times off walls (+300 pts)
  - "Off the Wall" - hits wall then peg within 500ms (+200 pts)
- [ ] Fever score slots (10K, 50K, 100K, 50K, 10K) during Extreme Fever

---

## Phase 2: Strategic Depth (Power-Ups)

### Green Peg System
- [ ] 2 green pegs per level (randomized)
- [ ] Hitting green activates current power-up
- [ ] Bright green glow, distinct visual

### Power-Up Abilities (pick 2-3 to start)
- [ ] **Multiball** - Splits into 3 balls
- [ ] **Spooky Ball** - Reappears at top when falling out
- [ ] **Fireball** - Burns through pegs (no bounce) for 3s
- [ ] **Zen Ball** - Shows extended trajectory

### Purple Peg
- [ ] 1 purple peg per turn (changes position each shot)
- [ ] Worth 500 points (bonus target)

---

## Phase 3: Progression

### Level System
- [ ] Level data format (JSON)
- [ ] 10 hand-crafted levels
- [ ] Level select screen
- [ ] Star rating (1-3 stars based on score)

### Unlockables
- [ ] New power-ups unlock at milestones
- [ ] Ball skins (cosmetic)

---

## Bug Fixes / Tech Debt
- [ ] Guard peg collision when distance is zero (avoid NaN velocities)
- [ ] Fix icon encoding in index.html (mojibake)

---

## Competitive Duel Enhancements (Unique Angle)
- [ ] Player-specific peg colors (P1 orange, P2 purple)
- [ ] Sabotage: hitting opponent's pegs blocks paths
- [ ] Shared power-ups: race to grab green peg
- [ ] Comeback mechanic: trailing player gets slight aim assist
- [ ] Tournament mode: best of 3/5

---

## Recommended Next Focus

**Quick Wins (High Impact, Low Effort):**
1. Pitch scaling on peg hits
2. Peg pop animation
3. Ball trail particles

**Medium Effort:**
4. Screen shake on combos
5. Style bonuses

Pick one and go!
