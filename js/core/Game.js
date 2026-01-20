/**
 * Main Game class - orchestrates everything
 */

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.inputHandler = new InputHandler(canvas, this.renderer);

        // Game state
        this.state = CONFIG.STATES.IDLE;
        this.players = [{ score: 0 }, { score: 0 }];
        this.currentPlayerIndex = 0;
        this.shotsPerPlayer = 10;
        this.shotsTaken = [0, 0];
        this.matchOver = false;
        this.combo = 0;

        // Peggle-style tracking
        this.orangePegsRemaining = CONFIG.PEGGLE.orangePegCount;
        this.scorePopups = [];
        this.extremeFever = false;
        this.extremeFeverStart = 0;
        this.extremeFeverTarget = null;

        // Screen shake state
        this.shakeIntensity = 0;
        this.shakeUntil = 0;
        this.shakeOffsetX = 0;
        this.shakeOffsetY = 0;

        // Trail unlock tracking (per-shot stats)
        this.shotStats = {
            maxCombo: 0,
            orangeHits: 0,
            shotScore: 0
        };
        // Persistent stats (loaded from localStorage)
        this._loadPersistentStats();

        // Entities
        this.board = new Board();
        this.layout = new Layout();
        this.pegs = this.layout.buildPegs(this.board);
        if (!this.pegs || this.pegs.length === 0) {
            this.pegs = createPegs();
        }
        // Assign orange pegs
        Layout.assignOrangePegs(this.pegs, CONFIG.PEGGLE.orangePegCount);

        this.slots = this.layout.buildSlots(this.board);
        this.slotDividers = createSlotDividers(this.slots);
        this.balls = [];

        // Magazines (ball counters in top corners)
        this.magazines = [
            new Magazine(CONFIG.MAGAZINE.p1X, CONFIG.MAGAZINE.y, 0),
            new Magazine(CONFIG.MAGAZINE.p2X, CONFIG.MAGAZINE.y, 1)
        ];
        this.magazines[0].setTotal(this.shotsPerPlayer);
        this.magazines[1].setTotal(this.shotsPerPlayer);

        // Cannon + tuning
        this.cannon = {
            x: this.board.innerLeft + this.board.innerWidth / 2,
            y: this.board.innerTop + 50,
            barrelLength: CONFIG.CANNON.barrelLength
        };
        this.aimAngle = Math.PI / 2;
        this.chargeStart = null;
        this.tuning = {
            gravity: CONFIG.PHYSICS.gravity,
            friction: CONFIG.PHYSICS.friction,
            maxVelocity: CONFIG.PHYSICS.maxVelocity,
            minPower: 10,
            maxPower: 20,
            maxChargeMs: 900,
            pegScore: 10,
            comboStep: 0.1,
            mouthSpeed: 2.1,
            mouthWidth: 160,
            mouthBonus: 120,
            powerPegBonus: 60,
            powerPegEffect: 'multiball'
        };
        this.currentLevelIndex = 0;
        this.levels = (window.LEVELS && Array.isArray(window.LEVELS)) ? window.LEVELS : [];
        this.timeScale = 1;
        this.slowMoUntil = 0;
        this.applyLevel(this.currentLevelIndex);

        // Goal mouth
        this.goalMouth = new GoalMouth(this.board, {
            width: this.tuning.mouthWidth,
            speed: this.tuning.mouthSpeed,
            y: this.board.innerBottom - 36
        });

        // Physics timing
        this.lastTime = 0;
        this.accumulator = 0;

        // Bind input callbacks
        this.inputHandler.onAimStart = (x, y) => this.startCharging(x, y);
        this.inputHandler.onAimMove = (x, y) => this.updateAim(x, y);
        this.inputHandler.onDrop = (x, y) => this.releaseShot(x, y);

        // Initial render of static elements
        this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);
        this._notifyHud();
    }

    /**
     * Start the game loop
     */
    start() {
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    setShotsPerPlayer(count, reset = false) {
        const n = Math.max(1, Math.min(20, Math.floor(count)));
        this.shotsPerPlayer = n;
        // Update magazine totals
        if (this.magazines) {
            for (const mag of this.magazines) {
                mag.setTotal(n);
            }
        }
        if (reset) {
            this.resetMatch();
        }
        this._notifyHud();
    }

    setTuning(key, value) {
        if (!key) return;
        if (typeof value !== 'number' || Number.isNaN(value)) return;
        this.tuning[key] = value;
        if (key === 'mouthSpeed' && this.goalMouth) {
            this.goalMouth.setSpeed(value);
        }
        if (key === 'mouthWidth' && this.goalMouth) {
            this.goalMouth.width = Math.max(60, value);
        }
    }

    setLayout(layout) {
        if (!layout || typeof layout.buildPegs !== 'function') return;
        this.layout = layout;
        this.pegs = layout.buildPegs(this.board);
        if (!this.pegs || this.pegs.length === 0) {
            this.pegs = createPegs();
        }
        // Assign orange pegs to the new layout
        Layout.assignOrangePegs(this.pegs, CONFIG.PEGGLE.orangePegCount);
        this.orangePegsRemaining = CONFIG.PEGGLE.orangePegCount;

        this.slots = (typeof layout.buildSlots === 'function') ? layout.buildSlots(this.board) : createSlots();
        this.slotDividers = createSlotDividers(this.slots);
        this.assignPowerPegs();
        this.renderer.staticDirty = true;
        this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);
        this._notifyHud();
    }

    setLevel(index) {
        const idx = Math.max(0, Math.min(this.levels.length - 1, Math.floor(index)));
        this.currentLevelIndex = idx;
        this.applyLevel(idx);
        this.resetMatch();
    }

    applyLevel(index) {
        if (!this.levels.length) return;
        const level = this.levels[index] || this.levels[0];
        if (!level) return;
        const layoutId = level.id;
        if (window.LAYOUTS && window.LAYOUTS[layoutId]) {
            this.setLayout(window.LAYOUTS[layoutId]);
        }
        if (typeof level.mouthSpeed === 'number') {
            this.tuning.mouthSpeed = level.mouthSpeed;
            if (this.goalMouth) this.goalMouth.setSpeed(level.mouthSpeed);
        }
        if (typeof level.pegBonus === 'number') {
            this.tuning.pegScore = 10 + level.pegBonus;
        }
        if (typeof level.powerPegBonus === 'number') {
            this.tuning.powerPegBonus = level.powerPegBonus;
        }
        if (typeof level.powerPegEffect === 'string') {
            this.tuning.powerPegEffect = level.powerPegEffect;
        }
        if (typeof level.powerPegCount === 'number') {
            this.assignPowerPegs(level.powerPegCount);
        }
    }

    advanceLevel() {
        if (!this.levels.length) return;
        const next = (this.currentLevelIndex + 1) % this.levels.length;
        this.currentLevelIndex = next;
        this.applyLevel(next);
    }

    gameLoop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        const now = performance.now();

        // Handle Extreme Fever slow-mo
        let activeScale = (now < this.slowMoUntil) ? 0.55 : 1;
        if (this.extremeFever) {
            const elapsed = now - this.extremeFeverStart;
            if (elapsed > CONFIG.PEGGLE.feverDuration) {
                this.extremeFever = false;
                this.timeScale = 1;
            } else {
                activeScale = this.timeScale || 0.3;
            }
        }

        // Fixed timestep physics
        this.accumulator += deltaTime * activeScale;
        const fixedDT = CONFIG.PHYSICS.fixedTimeStep;

        while (this.accumulator >= fixedDT) {
            this.update(fixedDT);
            this.accumulator -= fixedDT;
        }

        // Clean old score popups
        this.scorePopups = this.scorePopups.filter(
            p => now - p.birth < 800
        );

        // Update screen shake
        this.updateShake();

        // Render
        this.renderer.render(this);

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Update game state
     */
    update(dt) {
        if (this.goalMouth) {
            this.goalMouth.update(dt, this.board);
        }

        if (this.state === CONFIG.STATES.DROPPING && this.balls.length > 0) {
            for (const ball of this.balls) {
                if (!ball.active || ball.landed) continue;

                // Update physics
                ball.update(dt, this.tuning);

                // Check peg collisions
                for (const peg of this.pegs) {
                    // Skip already hit pegs for collision
                    if (peg.isHit) continue;

                    const collision = Collision.ballToPeg(ball, peg);
                    if (collision) {
                        Collision.resolveBallPeg(ball, collision);
                        this._handlePegHit(peg, ball);
                        this._handlePowerPeg(peg, ball);
                    }
                }

                // Walls and dividers
                const wallHit = Collision.ballToWalls(ball, this.board, this.slotDividers);
                if (wallHit) {
                    this.combo = 0;
                }

                // Goal mouth rim collision (bounces ball off the sides)
                Collision.ballToGoalMouthRim(ball, this.goalMouth);

                // Goal mouth catch (only if ball falls into the inner hole)
                if (Collision.ballToGoalMouth(ball, this.goalMouth)) {
                    this._handleGoalCatch(ball);
                    continue;
                }

                // Slot landing
                const landedSlot = Collision.ballToSlots(ball, this.slots);
                if (landedSlot) {
                    this._handleBallLanding(ball, landedSlot);
                }
            }
        }

        // Return to idle when no active balls remain
        if (this.state === CONFIG.STATES.DROPPING) {
            const anyActive = this.balls.some(b => b.active && !b.landed);
            if (!anyActive) {
                this.state = CONFIG.STATES.IDLE;
            }
        }
    }

    canShoot() {
        if (this.matchOver) return false;
        if (this.state !== CONFIG.STATES.IDLE) return false;
        const anyActive = this.balls.some(b => b.active && !b.landed);
        return !anyActive;
    }

    startCharging(x, y) {
        if (!this.canShoot()) return;
        this.state = CONFIG.STATES.CHARGING;
        this.chargeStart = performance.now();
        this.aimAngle = this._computeAimAngle(x, y);
    }

    updateAim(x, y) {
        if (this.state !== CONFIG.STATES.CHARGING && this.state !== CONFIG.STATES.AIMING) return;
        this.aimAngle = this._computeAimAngle(x, y);
    }

    releaseShot(x, y) {
        if (this.state !== CONFIG.STATES.CHARGING) return;
        this.aimAngle = this._computeAimAngle(x, y);
        const power = this._getChargePower();
        this.fireBall(this.aimAngle, power);
    }

    fireBall(angle, power) {
        if (this.matchOver) return;
        const anyActive = this.balls.some(b => b.active && !b.landed);
        if (anyActive) return;
        this.state = CONFIG.STATES.DROPPING;
        this.combo = 0;

        // Reset per-shot stats for trail unlock tracking
        this._resetShotStats();

        const b = new Ball(this.cannon.x, this.cannon.y);
        b.hiddenUntilExit = true;
        b.cannonOrigin = { x: this.cannon.x, y: this.cannon.y };
        b.muzzleDist = this.cannon.barrelLength * 0.95;
        b.launch(angle, power);
        this.balls.push(b);
        try {
            if (window.audioManager && typeof window.audioManager.playCannon === 'function') {
                window.audioManager.playCannon();
            }
        } catch (e) {}

        this._notifyHud();
    }

    _getChargePower() {
        const now = performance.now();
        const start = this.chargeStart || now;
        const elapsed = Math.max(0, now - start);
        const ratio = Math.min(1, elapsed / this.tuning.maxChargeMs);
        return this.tuning.minPower + ratio * (this.tuning.maxPower - this.tuning.minPower);
    }

    _computeAimAngle(x, y) {
        const left = this.board.innerLeft;
        const right = this.board.innerRight;
        const t = Utils.clamp((x - left) / Math.max(1, right - left), 0, 1);
        // Map full left-to-right sweep across the playfield.
        return Math.PI - (t * Math.PI);
    }

    _handlePegHit(peg, ball) {
        // If peg already hit, skip (shouldn't happen but guard)
        if (peg && peg.isHit) return;

        // Check style bonuses before incrementing combo
        if (ball) {
            this._checkStyleBonuses(peg, ball);
        }

        this.combo += 1;

        // Track max combo for trail unlocks
        if (this.shotStats && this.combo > this.shotStats.maxCombo) {
            this.shotStats.maxCombo = this.combo;
        }

        // Screen shake at combo milestones
        if (this.combo === 5) {
            this.triggerShake(4, 150);
        } else if (this.combo === 10) {
            this.triggerShake(6, 200);
        } else if (this.combo === 15) {
            this.triggerShake(8, 250);
        } else if (this.combo >= 20 && this.combo % 5 === 0) {
            this.triggerShake(10, 300);
        }

        // Peggle-style scoring based on peg type
        let basePoints;
        if (peg && peg.pegType === 'orange') {
            basePoints = CONFIG.PEGGLE.orangePoints;
            // Track orange hits for trail unlocks
            if (this.shotStats) {
                this.shotStats.orangeHits += 1;
            }
        } else {
            basePoints = CONFIG.PEGGLE.bluePoints;
        }

        const multiplier = 1 + (this.combo * this.tuning.comboStep);
        const points = Math.round(basePoints * multiplier);
        this.players[this.currentPlayerIndex].score += points;

        // Track shot score for trail unlocks
        if (this.shotStats) {
            this.shotStats.shotScore += points;
        }

        // Mark peg as hit and record time for fade animation
        if (peg) {
            peg.isHit = true;
            peg.hitTime = performance.now();
            peg.lastHitTime = peg.hitTime;

            // Score popup at peg location
            this.scorePopups.push({
                x: peg.x,
                y: peg.y,
                value: points,
                birth: performance.now(),
                isOrange: peg.pegType === 'orange'
            });

            // Calculate pitch scaling based on combo (each hit raises pitch)
            // Semitone = 2^(1/12) ≈ 1.059, we'll go up ~2 semitones per hit
            const pitchFactor = Math.pow(1.08, Math.min(this.combo, 15));
            const panValue = ((peg.x - this.board.innerLeft) / this.board.innerWidth) * 2 - 1;

            // Track orange pegs
            if (peg.pegType === 'orange') {
                this.orangePegsRemaining = Math.max(0, this.orangePegsRemaining - 1);

                // Play orange peg sound with pitch scaling
                try {
                    if (window.audioManager && typeof window.audioManager.playOrangePegHit === 'function') {
                        window.audioManager.playOrangePegHit({ pitch: pitchFactor, pan: panValue * 0.3 });
                    }
                } catch (e) {}

                // Trigger Extreme Fever on last orange peg
                if (this.orangePegsRemaining === 0) {
                    this.triggerExtremeFever(peg);
                }
            } else {
                // Regular blue peg sound with pitch scaling
                try {
                    if (window.audioManager && typeof window.audioManager.playPegHit === 'function') {
                        window.audioManager.playPegHit({ pitch: pitchFactor, pan: panValue * 0.3 });
                    }
                } catch (e) {}
            }
        }

        this._notifyHud();
    }

    /**
     * Trigger screen shake effect
     * @param {number} intensity - Shake strength (pixels)
     * @param {number} duration - Duration in ms
     */
    triggerShake(intensity, duration = 200) {
        this.shakeIntensity = intensity;
        this.shakeUntil = performance.now() + duration;
    }

    /**
     * Update screen shake (called in game loop)
     */
    updateShake() {
        const now = performance.now();
        if (now < this.shakeUntil && this.shakeIntensity > 0) {
            // Calculate remaining shake with decay
            const remaining = (this.shakeUntil - now) / 200;
            const intensity = this.shakeIntensity * remaining;

            // Random offset within intensity range
            this.shakeOffsetX = (Math.random() - 0.5) * 2 * intensity;
            this.shakeOffsetY = (Math.random() - 0.5) * 2 * intensity;
        } else {
            this.shakeOffsetX = 0;
            this.shakeOffsetY = 0;
            this.shakeIntensity = 0;
        }
    }

    /**
     * Trigger Extreme Fever when all orange pegs are cleared
     */
    triggerExtremeFever(lastPeg) {
        this.extremeFever = true;
        this.extremeFeverStart = performance.now();
        this.extremeFeverTarget = { x: lastPeg.x, y: lastPeg.y };
        this.timeScale = 0.3; // Slow-mo

        // Big celebratory shake
        this.triggerShake(12, 400);

        // Track fever for trail unlocks
        if (this.persistentStats) {
            this.persistentStats.feverCount += 1;
            this._savePersistentStats();
        }

        // Unlock 'clear_orange' trail (Stardust)
        if (window.TrailSystem) {
            const result = window.TrailSystem.checkUnlock('clear_orange');
            for (const trail of result) {
                this._showUnlockNotification(trail);
            }
        }

        // Play fanfare
        try {
            if (window.audioManager && typeof window.audioManager.playFanfare === 'function') {
                window.audioManager.playFanfare();
            }
        } catch (e) {}
    }

    _handlePowerPeg(peg, ball) {
        if (!peg || !peg.isPower || peg.powerUsed) return;
        peg.powerUsed = true;
        this.players[this.currentPlayerIndex].score += this.tuning.powerPegBonus;
        if (this.tuning.powerPegEffect === 'slowmo') {
            this.slowMoUntil = performance.now() + 1800;
        } else if (this.tuning.powerPegEffect === 'bonus') {
            this.players[this.currentPlayerIndex].score += Math.round(this.tuning.powerPegBonus * 1.5);
        } else if (this.tuning.powerPegEffect === 'multiball') {
            this._spawnExtraBalls(ball, 2);
        }
        this._notifyHud();
        this.renderer.staticDirty = true;
        this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);
    }

    _handleGoalCatch(ball) {
        // Check Lucky Bounce before ball is caught
        this._checkLuckyBounce(ball);

        ball.land(null);
        const bonus = this.tuning.mouthBonus;
        this.players[this.currentPlayerIndex].score += bonus;

        // Track goal catches for trail unlocks
        if (this.persistentStats) {
            this.persistentStats.goalCatches += 1;
            this._savePersistentStats();
        }

        // Give ball back - decrement shotsTaken (will be re-incremented in _finishShot)
        // Net effect: this shot doesn't count against the player
        this.shotsTaken[this.currentPlayerIndex] = Math.max(0, this.shotsTaken[this.currentPlayerIndex] - 1);

        // Play satisfying kerplunk sound
        try {
            if (window.audioManager && typeof window.audioManager.playKerplunk === 'function') {
                window.audioManager.playKerplunk();
            }
        } catch (e) {}

        try {
            if (typeof window.spawnConfetti === 'function') {
                const rect = this.canvas.getBoundingClientRect();
                const cx = rect.left + (this.goalMouth.x + this.goalMouth.width / 2) * this.renderer.scale;
                const cy = rect.top + (this.goalMouth.y + this.goalMouth.height / 2) * this.renderer.scale;
                window.spawnConfetti(cx, cy, 16);
            }
        } catch (e) {}
        this._maybeFinishShot();
    }

    _handleBallLanding(ball, slot) {
        // Check Lucky Bounce before ball lands
        this._checkLuckyBounce(ball);

        ball.land(slot);
        if (slot && typeof slot.value === 'number') {
            this.players[this.currentPlayerIndex].score += slot.value;
        }
        this._maybeFinishShot();
    }

    _maybeFinishShot() {
        const anyActive = this.balls.some(b => b.active && !b.landed);
        if (anyActive) {
            this._clearLandedBalls();
            return;
        }
        this._finishShot();
    }

    _finishShot() {
        // Check for trail unlocks before resetting combo
        this._checkTrailUnlocks();

        this.combo = 0;
        this.shotsTaken[this.currentPlayerIndex] += 1;

        // Update magazine for current player
        if (this.magazines[this.currentPlayerIndex]) {
            this.magazines[this.currentPlayerIndex].setRemaining(
                this.shotsPerPlayer - this.shotsTaken[this.currentPlayerIndex]
            );
        }

        this._clearLandedBalls();

        // Remove fully faded (hit) pegs
        this.pegs = this.pegs.filter(p => !p.isHit);

        // Mark static layer as dirty so pegs re-render without hit ones
        this.renderer.staticDirty = true;

        // Check for win condition (all orange pegs cleared)
        if (this.orangePegsRemaining === 0) {
            this.matchOver = true;
            this.state = CONFIG.STATES.IDLE;
            this._notifyHud();
            this._showMatchResult(true); // Win by clearing all orange
            return;
        }

        const p0Done = this.shotsTaken[0] >= this.shotsPerPlayer;
        const p1Done = this.shotsTaken[1] >= this.shotsPerPlayer;
        if (p0Done && p1Done) {
            this.matchOver = true;
            this.state = CONFIG.STATES.IDLE;
            this._notifyHud();
            this._showMatchResult();
            return;
        }

        // Switch player and prepare for next shot
        this.currentPlayerIndex = this.currentPlayerIndex === 0 ? 1 : 0;
        this.state = CONFIG.STATES.IDLE;
        this._notifyHud();
    }

    _clearLandedBalls() {
        this.balls = this.balls.filter(b => b.active && !b.landed);
    }

    _showMatchResult(orangeCleared = false) {
        const modal = document.getElementById('round-modal');
        const textEl = document.getElementById('round-modal-text');
        const ok = document.getElementById('round-modal-ok');
        if (!modal || !textEl || !ok) return;
        const p1 = this.players[0].score;
        const p2 = this.players[1].score;

        // Track persistent stats for trail unlocks
        if (this.persistentStats) {
            this.persistentStats.gamesPlayed += 1;
            this.persistentStats.totalScore += Math.max(p1, p2);
            // Count a win if player cleared orange or has higher score
            if (orangeCleared || p1 !== p2) {
                this.persistentStats.wins += 1;
            }
            this._savePersistentStats();
            this._checkTrailUnlocks();
        }

        let msg;
        if (orangeCleared) {
            // Peggle-style win - all orange pegs cleared
            if (p1 > p2) {
                msg = 'EXTREME FEVER! P1 wins';
            } else if (p2 > p1) {
                msg = 'EXTREME FEVER! P2 wins';
            } else {
                msg = 'EXTREME FEVER! Tie game';
            }
        } else {
            // Regular end - out of balls
            if (p1 > p2) msg = 'Player 1 wins';
            else if (p2 > p1) msg = 'Player 2 wins';
            else msg = 'Tie game';
        }

        textEl.textContent = `${msg} (${p1} - ${p2})`;
        modal.classList.remove('hidden');
        ok.onclick = () => {
            modal.classList.add('hidden');
            this.advanceLevel();
            this.resetMatch();
        };
    }

    resetMatch() {
        this.players = [{ score: 0 }, { score: 0 }];
        this.currentPlayerIndex = 0;
        this.shotsTaken = [0, 0];
        this.matchOver = false;
        this.combo = 0;
        this.slowMoUntil = 0;
        this.state = CONFIG.STATES.IDLE;
        this.balls = [];
        this.scorePopups = [];
        this.extremeFever = false;
        this.extremeFeverStart = 0;
        this.extremeFeverTarget = null;
        this.timeScale = 1;

        // Rebuild pegs and assign new orange pegs
        this.pegs = this.layout.buildPegs(this.board);
        if (!this.pegs || this.pegs.length === 0) {
            this.pegs = createPegs();
        }
        Layout.assignOrangePegs(this.pegs, CONFIG.PEGGLE.orangePegCount);
        this.orangePegsRemaining = CONFIG.PEGGLE.orangePegCount;

        this.resetPowerPegs();

        // Reset magazines
        if (this.magazines) {
            for (const mag of this.magazines) {
                mag.setTotal(this.shotsPerPlayer);
                mag.reset();
            }
        }

        this.renderer.staticDirty = true;
        this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);
        this._notifyHud();
    }

    assignPowerPegs(count) {
        if (!this.pegs || !this.pegs.length) return;
        const total = Math.max(0, Math.min(this.pegs.length, Math.floor(count || 0)));
        for (const peg of this.pegs) {
            peg.isPower = false;
            peg.powerUsed = false;
        }
        const candidates = this.pegs.filter(p => !p.isGuideRow);
        for (let i = 0; i < total && candidates.length; i++) {
            const idx = Math.floor(Math.random() * candidates.length);
            const peg = candidates.splice(idx, 1)[0];
            if (peg) peg.isPower = true;
        }
    }

    resetPowerPegs() {
        if (!this.pegs) return;
        for (const peg of this.pegs) {
            peg.powerUsed = false;
        }
        this.renderer.staticDirty = true;
        this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);
    }

    _spawnExtraBalls(sourceBall, count) {
        if (!sourceBall) return;
        const baseSpeed = Math.hypot(sourceBall.vx, sourceBall.vy) || this.tuning.maxPower;
        for (let i = 0; i < count; i++) {
            const b = new Ball(sourceBall.x, sourceBall.y);
            const jitter = Utils.randomVariance(0, 0.25);
            const angle = Math.atan2(sourceBall.vy, sourceBall.vx) + jitter;
            b.launch(angle, baseSpeed * 0.92);
            this.balls.push(b);
        }
    }

    getTrajectoryPoints() {
        if (this.matchOver || this.state === CONFIG.STATES.DROPPING) return [];
        const points = [];
        const angle = this.aimAngle;
        const power = this._getChargePower();
        let x = this.cannon.x;
        let y = this.cannon.y;
        let vx = Math.cos(angle) * power;
        let vy = Math.sin(angle) * power;
        const steps = 36;
        const leftWall = this.board.innerLeft;
        const rightWall = this.board.innerRight;
        const segments = this.board.chevronSegments || [];
        const pegs = this.pegs || [];
        const bRadius = CONFIG.BALL.radius * 0.7;
        const restitution = CONFIG.PHYSICS.wallRestitution;
        const pegRestitution = CONFIG.PHYSICS.pegRestitution;

        const reflectOnSegment = (ax, ay, bx, by) => {
            const abx = bx - ax;
            const aby = by - ay;
            const abLenSq = abx * abx + aby * aby;
            if (abLenSq === 0) return false;
            const apx = x - ax;
            const apy = y - ay;
            let t = (apx * abx + apy * aby) / abLenSq;
            t = Math.max(0, Math.min(1, t));
            const closestX = ax + abx * t;
            const closestY = ay + aby * t;
            let dx = x - closestX;
            let dy = y - closestY;
            const distSq = dx * dx + dy * dy;
            if (distSq >= bRadius * bRadius) return false;
            const dist = Math.sqrt(distSq) || 1;
            const nx = dx / dist;
            const ny = dy / dist;
            // push out slightly
            x += nx * (bRadius - dist + 0.15);
            y += ny * (bRadius - dist + 0.15);
            // reflect velocity
            const dot = vx * nx + vy * ny;
            vx = (vx - 2 * dot * nx) * restitution;
            vy = (vy - 2 * dot * ny) * restitution;
            return true;
        };
        const reflectOnPeg = (peg) => {
            const pr = peg.radius;
            const dx = x - peg.x;
            const dy = y - peg.y;
            const distSq = dx * dx + dy * dy;
            const minDist = bRadius + pr;
            if (distSq >= minDist * minDist) return false;
            const dist = Math.sqrt(distSq) || 1;
            const nx = dx / dist;
            const ny = dy / dist;
            x += nx * (minDist - dist + 0.15);
            y += ny * (minDist - dist + 0.15);
            const dot = vx * nx + vy * ny;
            vx = (vx - 2 * dot * nx) * pegRestitution;
            vy = (vy - 2 * dot * ny) * pegRestitution;
            return true;
        };
        for (let i = 0; i < steps; i++) {
            x += vx;
            y += vy;
            vy += this.tuning.gravity;
            vx *= this.tuning.friction;
            vy *= this.tuning.friction;
            if (pegs.length) {
                for (let p = 0; p < pegs.length; p++) {
                    if (reflectOnPeg(pegs[p])) break;
                }
            }
            if (segments.length && y + bRadius > this.board.innerTop && y - bRadius < this.board.innerBottom) {
                for (const seg of segments) {
                    if (reflectOnSegment(seg.a.x, seg.a.y, seg.b.x, seg.b.y)) break;
                }
            }
            if (x <= leftWall || x >= rightWall) {
                x = Utils.clamp(x, leftWall, rightWall);
                vx = -vx;
            }
            points.push({ x, y });
            if (y > this.board.innerBottom) break;
        }
        return points;
    }

    _notifyHud() {
        if (typeof window.updateHud !== 'function') return;
        const current = this.currentPlayerIndex + 1;
        window.updateHud({
            p1: this.players[0].score,
            p2: this.players[1].score,
            currentPlayer: current,
            shotsTaken: this.shotsTaken.slice(),
            shotsPerPlayer: this.shotsPerPlayer,
            combo: this.combo,
            levelIndex: this.currentLevelIndex,
            orangePegsRemaining: this.orangePegsRemaining
        });
    }

    // =============================================
    // Style Bonus System
    // =============================================

    _checkStyleBonuses(peg, ball) {
        if (!ball || !peg) return;
        const now = performance.now();

        // Mark first peg hit
        if (!ball.firstPegHit) {
            ball.firstPegHit = true;

            // "Long Shot" - ball traveled far before first hit (500+ pixels)
            if (ball.distanceBeforeFirstHit >= 500 && !ball.awardedBonuses.has('longshot')) {
                ball.awardedBonuses.add('longshot');
                this._awardStyleBonus('LONG SHOT', 250, peg.x, peg.y - 30);
            }
        }

        // "Off the Wall" - hit wall then peg within 500ms
        if (ball.lastWallHitTime > 0 && !ball.awardedBonuses.has('offthewall')) {
            const timeSinceWall = now - ball.lastWallHitTime;
            if (timeSinceWall < 500) {
                ball.awardedBonuses.add('offthewall');
                this._awardStyleBonus('OFF THE WALL', 200, peg.x, peg.y - 30);
            }
        }
    }

    _checkLuckyBounce(ball) {
        if (!ball) return;

        // "Lucky Bounce" - 10+ wall bounces in one shot
        if (ball.wallBounceCount >= 10 && !ball.awardedBonuses.has('luckybounce')) {
            ball.awardedBonuses.add('luckybounce');
            this._awardStyleBonus('LUCKY BOUNCE', 300, ball.x, ball.y - 30);
        }
    }

    _awardStyleBonus(name, points, x, y) {
        // Add points
        this.players[this.currentPlayerIndex].score += points;

        // Create style bonus popup (special styling)
        this.scorePopups.push({
            x: x,
            y: y,
            value: points,
            birth: performance.now(),
            isStyleBonus: true,
            bonusName: name
        });

        // Play bonus sound
        try {
            if (window.audioManager && typeof window.audioManager.playStyleBonus === 'function') {
                window.audioManager.playStyleBonus();
            }
        } catch (e) {}

        // Small celebratory shake
        this.triggerShake(5, 180);
    }

    // =============================================
    // Trail Unlock System - Persistent Stats
    // =============================================

    _loadPersistentStats() {
        try {
            const saved = localStorage.getItem('plinko_persistent_stats');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.persistentStats = {
                    gamesPlayed: parsed.gamesPlayed || 0,
                    wins: parsed.wins || 0,
                    feverCount: parsed.feverCount || 0,
                    goalCatches: parsed.goalCatches || 0,
                    totalScore: parsed.totalScore || 0
                };
            } else {
                this.persistentStats = {
                    gamesPlayed: 0,
                    wins: 0,
                    feverCount: 0,
                    goalCatches: 0,
                    totalScore: 0
                };
            }
        } catch (e) {
            this.persistentStats = {
                gamesPlayed: 0,
                wins: 0,
                feverCount: 0,
                goalCatches: 0,
                totalScore: 0
            };
        }
    }

    _savePersistentStats() {
        try {
            localStorage.setItem('plinko_persistent_stats', JSON.stringify(this.persistentStats));
        } catch (e) {}
    }

    _resetShotStats() {
        this.shotStats = {
            maxCombo: 0,
            orangeHits: 0,
            shotScore: 0
        };
    }

    _checkTrailUnlocks() {
        if (!window.TrailSystem) return;

        const unlocks = [];

        // Combo-based unlocks
        if (this.shotStats.maxCombo >= 10) {
            const result = window.TrailSystem.checkUnlock('combo_10');
            unlocks.push(...result);
        }
        if (this.shotStats.maxCombo >= 15) {
            const result = window.TrailSystem.checkUnlock('combo_15');
            unlocks.push(...result);
        }
        if (this.shotStats.maxCombo >= 20) {
            const result = window.TrailSystem.checkUnlock('combo_20');
            unlocks.push(...result);
        }
        if (this.shotStats.maxCombo >= 25) {
            const result = window.TrailSystem.checkUnlock('combo_25');
            unlocks.push(...result);
        }

        // Orange peg hits in single shot
        if (this.shotStats.orangeHits >= 5) {
            const result = window.TrailSystem.checkUnlock('orange_5_shot');
            unlocks.push(...result);
        }

        // Shot score
        if (this.shotStats.shotScore >= 5000) {
            const result = window.TrailSystem.checkUnlock('shot_score_5000');
            unlocks.push(...result);
        }

        // Goal catches (persistent)
        if (this.persistentStats.goalCatches >= 3) {
            const result = window.TrailSystem.checkUnlock('goal_catches_3');
            unlocks.push(...result);
        }

        // Games played (persistent)
        if (this.persistentStats.gamesPlayed >= 5) {
            const result = window.TrailSystem.checkUnlock('games_5');
            unlocks.push(...result);
        }

        // Wins (persistent)
        if (this.persistentStats.wins >= 3) {
            const result = window.TrailSystem.checkUnlock('wins_3');
            unlocks.push(...result);
        }
        if (this.persistentStats.wins >= 10) {
            const result = window.TrailSystem.checkUnlock('wins_10');
            unlocks.push(...result);
        }

        // Total score (persistent)
        if (this.persistentStats.totalScore >= 10000) {
            const result = window.TrailSystem.checkUnlock('total_score_10000');
            unlocks.push(...result);
        }

        // Fever count (persistent)
        if (this.persistentStats.feverCount >= 5) {
            const result = window.TrailSystem.checkUnlock('fever_5');
            unlocks.push(...result);
        }

        // Orange pegs cleared (happens when triggering fever)
        // This is checked when fever triggers

        // Show unlock notifications
        for (const trail of unlocks) {
            this._showUnlockNotification(trail);
        }
    }

    _showUnlockNotification(trail) {
        if (!trail) return;

        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'trail-unlock-notification';
        notification.innerHTML = `
            <div class="unlock-badge" style="background: ${window.TrailSystem?.rarityColors?.[trail.rarity] || '#888'}">
                NEW TRAIL
            </div>
            <div class="unlock-name">${trail.name}</div>
            <div class="unlock-desc">${trail.description}</div>
        `;

        document.body.appendChild(notification);

        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Remove after delay
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 500);
        }, 3000);
    }
}
