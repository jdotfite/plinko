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
        this.freeBallEarned = false;

        // Level system
        this.currentLevelIndex = 0;
        this.currentLevelData = null;
        this.levelCompleted = false;  // True only if all oranges cleared

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

        // Load level data and apply fixed peg positions
        this._applyLevelData(this.currentLevelIndex);

        // Power-up state
        this.currentPowerUp = null;       // Active power-up type
        this.powerUpPending = false;      // Power-up ready to trigger next shot

        // Power-up settings (which ones are enabled)
        this.enabledPowerUps = ['multiball', 'fireball', 'spooky', 'powerball', 'lightning', 'magnet', 'bomb', 'splitter', 'firework', 'antigravity', 'bouncy', 'blackhole'];

        // Black holes active in the game
        this.blackHoles = [];

        // Game mode settings
        this.twoPlayerMode = false;       // Default to single player
        this.greenPegCount = 6;           // More green pegs for testing

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
        // Loading animation will start when modal is dismissed

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
            mouthSpeed: 3.0,
            mouthWidth: 200,
            mouthBonus: 120
        };
        this.currentLevelIndex = 0;
        this.levels = (window.LEVELS && Array.isArray(window.LEVELS)) ? window.LEVELS : [];
        this.timeScale = 1;
        this.slowMoUntil = 0;
        this.applyLevel(this.currentLevelIndex);

        // Goal mouth - positioned above the bottom UI panel (UI now scales with canvas)
        this.goalMouth = new GoalMouth(this.board, {
            width: 200,   // Wider mouth
            height: 60,   // Taller tube
            speed: 3.0,   // Faster movement
            y: this.board.innerBottom - 95  // Moved up 20px
        });

        // Fever slots - score multiplier slots during Extreme Fever
        this.feverSlots = new FeverSlots(this.board, {
            y: this.board.innerBottom
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
        this.paused = false;
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Pause the game loop
     */
    pause() {
        this.paused = true;
    }

    /**
     * Resume the game loop
     */
    resume() {
        if (this.paused) {
            this.paused = false;
            this.lastTime = performance.now();
            requestAnimationFrame((time) => this.gameLoop(time));
        }
    }

    /**
     * Start the magazine loading animation (called when modal is dismissed)
     */
    startMagazineAnimation() {
        if (this.magazines) {
            for (const mag of this.magazines) {
                mag.startLoadingAnimation();
            }
        }
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

    /**
     * Enable or disable a power-up
     */
    setPowerUpEnabled(powerUp, enabled) {
        if (!powerUp) return;
        const idx = this.enabledPowerUps.indexOf(powerUp);
        if (enabled && idx === -1) {
            this.enabledPowerUps.push(powerUp);
        } else if (!enabled && idx !== -1) {
            this.enabledPowerUps.splice(idx, 1);
        }
    }

    /**
     * Check if a power-up is enabled
     */
    isPowerUpEnabled(powerUp) {
        return this.enabledPowerUps.includes(powerUp);
    }

    /**
     * Set 2-player mode
     */
    setTwoPlayerMode(enabled) {
        this.twoPlayerMode = enabled;
        if (!enabled) {
            // In single player, only use P1
            this.currentPlayerIndex = 0;
        }
        this.resetMatch();
    }

    /**
     * Set number of green pegs (for testing)
     */
    setGreenPegCount(count) {
        this.greenPegCount = Math.max(0, Math.min(20, Math.floor(count)));
        this.resetMatch();
    }

    setLayout(layout) {
        if (!layout || typeof layout.buildPegs !== 'function') return;
        this.layout = layout;
        this.pegs = layout.buildPegs(this.board);
        if (!this.pegs || this.pegs.length === 0) {
            this.pegs = createPegs();
        }
        // Assign orange pegs and green pegs to the new layout
        Layout.assignOrangePegs(this.pegs, CONFIG.PEGGLE.orangePegCount);
        Layout.assignGreenPegs(this.pegs, this.greenPegCount);
        this.orangePegsRemaining = CONFIG.PEGGLE.orangePegCount;

        this.slots = (typeof layout.buildSlots === 'function') ? layout.buildSlots(this.board) : createSlots();
        this.slotDividers = createSlotDividers(this.slots);
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
    }

    advanceLevel() {
        // Use new level data system
        const levelCount = window.getLevelCount ? window.getLevelCount() : 3;
        const next = (this.currentLevelIndex + 1) % levelCount;
        this.currentLevelIndex = next;
        // Level data will be applied in resetMatch via _applyLevelData
    }

    gameLoop(currentTime) {
        // Don't run if paused
        if (this.paused) return;

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
                // Deactivate fever slots when fever ends
                if (this.feverSlots) {
                    this.feverSlots.deactivate();
                }
            } else {
                activeScale = this.timeScale || 0.3;
            }
        }

        // Update fever slots
        if (this.feverSlots) {
            this.feverSlots.update(deltaTime * activeScale);
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

        // Process exploding pegs from bomb power-up
        this._processExplodingPegs();

        // Update black holes
        this._updateBlackHoles();

        // Process burning pegs (fireball effect)
        this._processBurningPegs();


        if (this.state === CONFIG.STATES.DROPPING && this.balls.length > 0) {
            for (const ball of this.balls) {
                if (!ball.active || ball.landed) continue;

                // Apply magnet effect before physics
                this._applyMagnetEffect(ball);

                // Update physics
                ball.update(dt, this.tuning);

                // Check lightning timeout
                if (ball.isLightning && performance.now() > ball.lightningUntil) {
                    ball.isLightning = false;
                }

                // Check peg collisions
                for (const peg of this.pegs) {
                    // Skip already hit pegs for collision
                    if (peg.isHit) continue;

                    const collision = Collision.ballToPeg(ball, peg);
                    if (collision) {
                        // Handle different power-up collision behaviors
                        let shouldBounce = true;
                        let shouldHitPeg = true;

                        // Fireball burns through ALL pegs - stays on fire
                        if (ball.isFireball) {
                            shouldBounce = false;
                            shouldHitPeg = false; // Don't hit immediately - let it burn

                            // Start burning animation on peg
                            if (!peg.isBurning && !peg.isHit) {
                                peg.isBurning = true;
                                peg.burnStartTime = performance.now();
                                // Play burn sound
                                AudioHelper.play('PegHit', { pitch: 1.5 });
                            }
                        }

                        // Power Ball converts pegs to green power-up pegs
                        if (ball.isPowerBall && ball.powerBallConversions > 0 && peg.pegType !== 'green') {
                            // If converting an orange peg, count it as cleared
                            if (peg.pegType === 'orange') {
                                this.orangePegsRemaining = Math.max(0, this.orangePegsRemaining - 1);

                                // Check for win (all orange cleared)
                                if (this.orangePegsRemaining === 0) {
                                    this.triggerExtremeFever(peg);
                                }
                            }

                            // Convert the peg to green (will give random power-up when hit)
                            peg.pegType = 'green';
                            ball.powerBallConversions--;
                            shouldHitPeg = false; // Don't remove the peg

                            // Visual/audio feedback
                            this.scorePopups.push({
                                x: peg.x,
                                y: peg.y,
                                isPowerBallConversion: true,
                                birth: performance.now()
                            });
                            AudioHelper.play('PowerUp');

                            // Mark static layer as dirty to re-render converted peg
                            this.renderer.staticDirty = true;

                            // Deactivate Power Ball when conversions run out
                            if (ball.powerBallConversions <= 0) {
                                ball.isPowerBall = false;
                            }
                        }

                        // Ghost phases through pegs
                        if (ball.isGhost && ball.ghostHits < ball.maxGhostHits) {
                            ball.ghostHits++;
                            shouldBounce = false;
                            if (ball.ghostHits >= ball.maxGhostHits) {
                                ball.isGhost = false;
                            }
                        }

                        // Bouncy ball gains energy on peg hits
                        if (ball.isBouncy) {
                            this._handleBouncyBounce(ball);
                        }

                        // Resolve collision if needed
                        if (shouldBounce) {
                            Collision.resolveBallPeg(ball, collision);
                        }

                        // Handle peg hit (scoring, effects)
                        if (shouldHitPeg) {
                            this._handlePegHit(peg, ball);
                        }

                        // Splitter splits on peg hit (max 4 balls total)
                        if (ball.isSplitter && ball.canSplit && (this.splitterBallCount || 1) < 4) {
                            this._handleSplitterSplit(ball);
                        }

                        // Bomb ball causes explosions
                        if (ball.isBomb && ball.bombHitsRemaining > 0) {
                            ball.bombHitsRemaining--;
                            this._powerUpBomb(ball, peg);
                        }
                    }
                }

                // Walls and dividers
                const wallHit = Collision.ballToWalls(ball, this.board, this.slotDividers);
                if (wallHit) {
                    this.combo = 0;
                    // Bouncy ball gains energy on wall bounces too
                    if (ball.isBouncy) {
                        this._handleBouncyBounce(ball);
                    }
                }

                // During Extreme Fever, use fever slots instead of goal mouth
                if (this.extremeFever && this.feverSlots && this.feverSlots.active) {
                    const slotResult = this.feverSlots.checkBallLanding(ball);
                    if (slotResult) {
                        this._handleFeverSlotCatch(ball, slotResult);
                        continue;
                    }
                } else {
                    // Goal mouth rim collision (bounces ball off the sides)
                    Collision.ballToGoalMouthRim(ball, this.goalMouth);

                    // Goal mouth catch (only if ball falls into the inner hole)
                    if (Collision.ballToGoalMouth(ball, this.goalMouth)) {
                        this._handleGoalCatch(ball);
                        continue;
                    }
                }

                // Ball fell out of bounds (missed the goal mouth/fever slots)
                if (ball.y > this.board.innerBottom + 100) {
                    // Firework ball rockets back up!
                    if (ball.isFirework && !ball.fireworkUsed) {
                        if (this._handleFireworkLaunch(ball)) {
                            continue; // Ball is now rocketing up
                        }
                    }

                    // Spooky ball gets a second chance
                    if (ball.isSpooky && !ball.spookyUsed) {
                        if (this._handleSpookyRespawn(ball)) {
                            continue; // Ball respawned, don't land it
                        }
                    }
                    this._handleBallLanding(ball, null);
                }

                // Firework at peak - explode when velocity reverses or near first peg row
                if (ball.isFirework && ball.fireworkPhase === 'launching') {
                    // Explode when ball starts falling again or reaches first peg row
                    const maxHeight = CONFIG.PEGS.startY - 20;
                    if (ball.vy > 0 || ball.y < maxHeight) {
                        this._handleFireworkExplosion(ball);
                        continue;
                    }
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
        if (anyActive) return false;
        // Wait for magazine animation to complete and cannon to be loaded
        const currentMag = this.magazines && this.magazines[this.currentPlayerIndex];
        if (currentMag && !currentMag.cannonReady) return false;
        return true;
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

        // Ball leaving magazine (don't change cannonReady - magazine still reserves slot for ball in flight)
        const mag = this.magazines[this.currentPlayerIndex];
        if (mag) {
            mag.useShot();
        }

        // Trigger cannon fire animation (recoil + spring back)
        this.cannonFireAnim = {
            startTime: performance.now(),
            duration: 250  // ms
        };

        const b = new Ball(this.cannon.x, this.cannon.y);
        b.hiddenUntilExit = true;
        b.cannonOrigin = { x: this.cannon.x, y: this.cannon.y };
        b.muzzleDist = this.cannon.barrelLength * 0.95;
        b.launch(angle, power);
        this.balls.push(b);
        AudioHelper.play('Cannon');

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

        // Screen shake at combo milestones (less frequent)
        if (this.combo === 10) {
            this.triggerShake(5, 150);
        } else if (this.combo === 20) {
            this.triggerShake(7, 200);
        } else if (this.combo >= 30 && this.combo % 10 === 0) {
            this.triggerShake(9, 250);
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

            // Score popup at peg location (ensure value is always a number)
            this.scorePopups.push({
                x: peg.x,
                y: peg.y,
                value: points || 0,
                birth: performance.now(),
                isOrange: peg.pegType === 'orange'
            });

            // Calculate pitch scaling based on combo (logarithmic curve)
            // Rises quickly at first, then flattens - never gets shrill
            // Combo 0→1.0, 5→1.35, 10→1.48, 20→1.58 (caps ~1.6x)
            const pitchFactor = 1 + Math.log10(1 + this.combo * 0.5) * 0.5;
            const panValue = ((peg.x - this.board.innerLeft) / this.board.innerWidth) * 2 - 1;

            // Track orange pegs
            if (peg.pegType === 'orange') {
                this.orangePegsRemaining = Math.max(0, this.orangePegsRemaining - 1);
                AudioHelper.play('OrangePegHit', { pitch: pitchFactor, pan: panValue * 0.3 });

                // Trigger Extreme Fever on last orange peg
                if (this.orangePegsRemaining === 0) {
                    this.triggerExtremeFever(peg);
                }
            } else if (peg.pegType === 'green') {
                // Green peg hit - award power-up!
                this._handleGreenPegHit(peg, ball);
                AudioHelper.play('PowerUp');
            } else {
                // Regular blue peg sound with pitch scaling
                AudioHelper.play('PegHit', { pitch: pitchFactor, pan: panValue * 0.3 });
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

        // Activate fever slots (score multiplier zones)
        if (this.feverSlots) {
            this.feverSlots.activate();
        }

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

        AudioHelper.play('Fanfare');
    }

    /**
     * Handle green peg hit - awards a power-up
     */
    _handleGreenPegHit(peg, ball) {
        if (!peg || peg.pegType !== 'green') return;

        // Award points
        this.players[this.currentPlayerIndex].score += CONFIG.PEGGLE.greenPoints;

        // Use peg's assigned power-up if available, otherwise fallback
        let powerUp;
        if (peg.assignedPowerUp) {
            // This peg has a specific power-up assigned from level data
            powerUp = peg.assignedPowerUp;
        } else if (this.currentLevelData && this.currentLevelData.powerUp) {
            // Fallback to level's default power-up (old format)
            powerUp = this.currentLevelData.powerUp;
        } else {
            // Fallback to random from enabled list
            if (!this.enabledPowerUps || this.enabledPowerUps.length === 0) return;
            powerUp = this.enabledPowerUps[Math.floor(Math.random() * this.enabledPowerUps.length)];
        }

        // Activate power-up immediately based on type
        this._activatePowerUp(powerUp, ball, peg);

        // Get power-up display name
        const powerUpConfig = CONFIG.POWERUPS[powerUp];
        const displayName = powerUpConfig ? powerUpConfig.name : powerUp.toUpperCase();

        // Score popup with power-up name
        this.scorePopups.push({
            x: peg.x,
            y: peg.y - 20,
            value: CONFIG.PEGGLE.greenPoints,
            birth: performance.now(),
            isPowerUp: true,
            powerUpName: displayName,
            powerUpType: powerUp
        });

        // Celebratory shake
        this.triggerShake(6, 200);
    }

    /**
     * Clear all power-up effects from a ball (called when getting a new power-up)
     */
    _clearBallPowerUps(ball) {
        if (!ball) return;

        // Clear all power-up flags
        ball.isFireball = false;
        ball.isSpooky = false;
        ball.spookyUsed = false;
        ball.isPowerBall = false;
        ball.powerBallConversions = 0;
        ball.isLightning = false;
        ball.lightningUntil = 0;
        ball.isMagnet = false;
        ball.magnetStrength = 0;
        ball.isBomb = false;
        ball.bombHitsRemaining = 0;
        ball.isSplitter = false;
        ball.isRainbow = false;
        ball.canSplit = false;
        ball.isFirework = false;
        ball.fireworkUsed = false;
        ball.fireworkPhase = null;
        ball.isAntiGravity = false;
        ball.antiGravityStartTime = 0;
        ball.isBouncy = false;
        ball.bouncyEnergy = 0;
        ball.isBlackHoleMaster = false;
        ball.isGhost = false;
        ball.ghostHits = 0;
    }

    /**
     * Activate a power-up
     */
    _activatePowerUp(type, ball, peg) {
        this.currentPowerUp = type;

        // Clear previous power-up effects before applying new one
        this._clearBallPowerUps(ball);

        switch (type) {
            case 'multiball':
                this._powerUpMultiball(ball);
                break;
            case 'fireball':
                this._powerUpFireball(ball);
                break;
            case 'spooky':
                this._powerUpSpooky(ball);
                break;
            case 'powerball':
                this._powerUpPowerBall(ball);
                break;
            case 'lightning':
                this._powerUpLightning(ball, peg);
                break;
            case 'magnet':
                this._powerUpMagnet(ball);
                break;
            case 'bomb':
                this._powerUpBomb(ball, peg);
                break;
            case 'splitter':
                this._powerUpSplitter(ball);
                break;
            case 'firework':
                this._powerUpFirework(ball);
                break;
            case 'antigravity':
                this._powerUpAntiGravity(ball);
                break;
            case 'bouncy':
                this._powerUpBouncy(ball);
                break;
            case 'blackhole':
                this._powerUpBlackHole(ball, peg);
                break;
        }
    }

    // =============================================
    // Power-Up Implementations
    // =============================================

    /**
     * Multiball - Spawns 2 extra balls
     */
    _powerUpMultiball(sourceBall) {
        if (!sourceBall) return;
        const baseSpeed = Math.hypot(sourceBall.vx, sourceBall.vy) || 12;

        for (let i = 0; i < 2; i++) {
            const b = new Ball(sourceBall.x, sourceBall.y);
            const angleOffset = (i === 0 ? -0.4 : 0.4);
            const baseAngle = Math.atan2(sourceBall.vy, sourceBall.vx);
            b.launch(baseAngle + angleOffset, baseSpeed * 0.95);
            this.balls.push(b);
        }
    }

    /**
     * Fireball - Burns through pegs without bouncing
     */
    _powerUpFireball(ball) {
        if (!ball) return;
        ball.isFireball = true;
        // Fireball stays on fire indefinitely - burns through all pegs it touches
    }

    /**
     * Spooky Ball - Returns to top if falls out of bounds
     */
    _powerUpSpooky(ball) {
        if (!ball) return;
        ball.isSpooky = true;
        ball.spookyUsed = false;
    }

    /**
     * Power Ball - Turns first 3 pegs it touches into green power-up pegs
     */
    _powerUpPowerBall(ball) {
        if (!ball) return;
        ball.isPowerBall = true;
        ball.powerBallConversions = 3; // Can convert 3 pegs
    }

    /**
     * Lightning - Chains to nearby pegs with electric bolts
     */
    _powerUpLightning(ball, peg) {
        if (!peg) return;

        // Brief slow-mo so player can see the lightning chain
        this.slowMoUntil = performance.now() + 600;

        // Screen shake for dramatic effect
        this.triggerShake(8, 300);

        // Find nearby pegs and hit them with lightning
        const lightningRadius = 150;
        const maxChain = 5;
        let chainCount = 0;
        const now = performance.now();

        for (const p of this.pegs) {
            if (p.isHit || chainCount >= maxChain) continue;
            const dx = p.x - peg.x;
            const dy = p.y - peg.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 0 && dist < lightningRadius) {
                // Add lightning bolt effect with staggered timing
                this.scorePopups.push({
                    x: p.x, y: p.y,
                    isLightning: true,
                    fromX: peg.x, fromY: peg.y,
                    birth: now + chainCount * 80  // Stagger the bolts
                });

                // Hit the peg
                this._handlePegHit(p, ball);
                chainCount++;
            }
        }

        // Give ball brief electric visual (fades back after initial shock)
        if (ball) {
            ball.isLightning = true;
            ball.lightningUntil = performance.now() + 500; // Short duration - fades back quickly
        }
    }

    /**
     * Ghost - Phases through pegs (still scores but no bounce)
     */
    /**
     * Magnet - Ball curves toward nearest orange peg
     */
    _powerUpMagnet(ball) {
        if (!ball) return;
        ball.isMagnet = true;
        ball.magnetStrength = 0.15;
    }

    /**
     * Space Blast (Bomb) - Explodes nearby pegs on each hit
     */
    _powerUpBomb(ball, peg) {
        if (!peg) return;

        const blastRadius = 120;
        let blastCount = 0;

        // Find all pegs in blast radius
        for (const p of this.pegs) {
            if (p.isHit || p === peg) continue;
            const dx = p.x - peg.x;
            const dy = p.y - peg.y;
            const dist = Math.hypot(dx, dy);

            if (dist < blastRadius) {
                // Mark for explosion
                p.isExploding = true;
                p.explodeTime = performance.now() + (dist / blastRadius) * 200;
                blastCount++;
            }
        }

        // Add explosion visual
        this.scorePopups.push({
            x: peg.x, y: peg.y,
            isExplosion: true,
            radius: blastRadius,
            birth: performance.now()
        });

        // Big shake for explosion
        this.triggerShake(10, 300);

        // Give ball bomb visual
        if (ball) {
            ball.isBomb = true;
            ball.bombHitsRemaining = 3; // 3 more explosions
        }
    }

    /**
     * Splitter - Ball splits into 2 on peg hit, each can split once more (max 4 balls)
     * All splitter balls are rainbow colored
     */
    _powerUpSplitter(ball) {
        if (!ball) return;
        ball.isSplitter = true;
        ball.isRainbow = true;
        ball.canSplit = true; // This ball can still split
        this.splitterBallCount = 1; // Track total splitter balls
    }

    /**
     * Process exploding pegs (called from update)
     */
    _processExplodingPegs() {
        const now = performance.now();
        for (const peg of this.pegs) {
            if (peg.isExploding && !peg.isHit && now >= peg.explodeTime) {
                peg.isExploding = false;
                this._handlePegHit(peg, null);
            }
        }
    }

    /**
     * Process burning pegs from fireball (burn animation before disappearing)
     */
    _processBurningPegs() {
        const now = performance.now();
        const pegsToRemove = [];

        for (const peg of this.pegs) {
            if (peg.isBurning && !peg.isHit) {
                const burnDuration = 400; // Burn for 400ms then disappear
                const burnAge = now - peg.burnStartTime;

                if (burnAge >= burnDuration) {
                    // Done burning - score it and mark for removal
                    peg.isBurning = false;
                    this._handlePegHit(peg, null);
                    pegsToRemove.push(peg);

                    // Add smoke puff effect
                    this.scorePopups.push({
                        x: peg.x,
                        y: peg.y,
                        isSmokePuff: true,
                        birth: now
                    });
                }
            }
        }

        // Remove burned pegs immediately
        if (pegsToRemove.length > 0) {
            this.pegs = this.pegs.filter(p => !pegsToRemove.includes(p));
            this.renderer.staticDirty = true;
        }
    }

    /**
     * Apply magnet effect to ball (called from update)
     */
    _applyMagnetEffect(ball) {
        if (!ball || !ball.isMagnet || !ball.active) return;

        // Find nearest orange peg
        let nearest = null;
        let nearestDist = Infinity;

        for (const peg of this.pegs) {
            if (peg.isHit || peg.pegType !== 'orange') continue;
            const dx = peg.x - ball.x;
            const dy = peg.y - ball.y;
            const dist = Math.hypot(dx, dy);
            if (dist < nearestDist && dist < 300) {
                nearestDist = dist;
                nearest = peg;
            }
        }

        if (nearest) {
            const dx = nearest.x - ball.x;
            const dy = nearest.y - ball.y;
            const dist = Math.hypot(dx, dy) || 1;
            // Apply attraction force (stronger when closer)
            const force = ball.magnetStrength * (1 - dist / 300);
            ball.vx += (dx / dist) * force;
            ball.vy += (dy / dist) * force;
        }
    }

    /**
     * Handle spooky ball respawn
     */
    _handleSpookyRespawn(ball) {
        if (!ball || !ball.isSpooky || ball.spookyUsed) return false;

        // Ball fell out - respawn at top
        ball.spookyUsed = true;
        ball.x = this.cannon.x + (Math.random() - 0.5) * 200;
        ball.y = this.board.innerTop + 100;
        ball.vy = Math.abs(ball.vy) * 0.5 || 5; // Fall down
        ball.vx = ball.vx * 0.5;
        ball.landed = false;
        ball.active = true;

        // Visual effect
        this.scorePopups.push({
            x: ball.x, y: ball.y,
            isSpookyRespawn: true,
            birth: performance.now()
        });

        return true; // Respawned
    }

    /**
     * Handle splitter ball split - creates a new rainbow ball
     * Each ball can only split once, max 4 balls total
     */
    _handleSplitterSplit(ball) {
        if (!ball || !ball.isSplitter || !ball.canSplit) return;
        if ((this.splitterBallCount || 1) >= 4) return;

        // This ball can no longer split
        ball.canSplit = false;

        const baseSpeed = Math.hypot(ball.vx, ball.vy) || 8;
        const baseAngle = Math.atan2(ball.vy, ball.vx);

        // Create new rainbow splitter ball at diverging angle
        const newBall = new Ball(ball.x, ball.y);
        newBall.isSplitter = true;
        newBall.isRainbow = true;
        newBall.canSplit = true; // New ball can also split once

        // Split at opposite angle
        const splitAngle = baseAngle + (Math.random() > 0.5 ? 0.7 : -0.7);
        newBall.launch(splitAngle, baseSpeed * 0.9);
        newBall.active = true;

        this.balls.push(newBall);
        this.splitterBallCount = (this.splitterBallCount || 1) + 1;

        // Visual effect
        this.scorePopups.push({
            x: ball.x,
            y: ball.y,
            isSplitterSplit: true,
            birth: performance.now()
        });

        AudioHelper.play('PowerUp');
    }

    // =============================================
    // NEW POWER-UPS (Worms-inspired)
    // =============================================

    /**
     * Firework - Ball rockets back up when it exits bottom, explodes at peak
     */
    _powerUpFirework(ball) {
        if (!ball) return;
        ball.isFirework = true;
        ball.fireworkUsed = false;
        ball.fireworkPhase = 'falling'; // 'falling', 'launching', 'exploding'
    }

    /**
     * Handle firework launch when ball exits bottom
     */
    _handleFireworkLaunch(ball) {
        if (!ball || !ball.isFirework || ball.fireworkUsed) return false;

        ball.fireworkUsed = true;
        ball.fireworkPhase = 'launching';
        ball.fireworkLaunchTime = performance.now();
        ball.fireworkStartY = ball.y;

        // Reset position to just inside play area and rocket upward
        ball.y = this.board.innerBottom - 20; // Bring back into play area
        ball.vx = (Math.random() - 0.5) * 4; // Slight wobble
        ball.vy = -14 - Math.random() * 8; // Random velocity between -14 and -22
        ball.landed = false;
        ball.active = true;

        // Visual launch effect
        this.scorePopups.push({
            x: ball.x,
            y: this.board.innerBottom,
            isFireworkLaunch: true,
            birth: performance.now()
        });

        AudioHelper.play('PowerUp');

        // Screen shake for launch
        this.triggerShake(6, 200);

        return true;
    }

    /**
     * Handle firework explosion at peak
     */
    _handleFireworkExplosion(ball) {
        if (!ball || ball.fireworkPhase !== 'launching') return;

        ball.fireworkPhase = 'exploding';
        const explosionRadius = 200;
        let hitCount = 0;

        // Find all pegs in explosion radius
        for (const peg of this.pegs) {
            if (peg.isHit) continue;
            const dx = peg.x - ball.x;
            const dy = peg.y - ball.y;
            const dist = Math.hypot(dx, dy);

            if (dist < explosionRadius) {
                // Delay based on distance for cascading effect
                peg.isExploding = true;
                peg.explodeTime = performance.now() + (dist / explosionRadius) * 300;
                hitCount++;
            }
        }

        // Add dramatic explosion visual
        this.scorePopups.push({
            x: ball.x, y: ball.y,
            isFireworkExplosion: true,
            radius: explosionRadius,
            birth: performance.now(),
            sparkColors: ['#FF1493', '#FFD700', '#00FF00', '#00BFFF', '#FF4500', '#9400D3']
        });

        // Big shake
        this.triggerShake(12, 400);
        AudioHelper.play('Fanfare');

        // Ball is now done
        ball.land(null);
        this._maybeFinishShot();
    }

    /**
     * Anti-Gravity - Ball falls upward for a duration
     */
    _powerUpAntiGravity(ball) {
        if (!ball) return;
        ball.isAntiGravity = true;
        ball.antiGravityStartTime = performance.now();
        ball.antiGravityFlipTime = 0; // Track when gravity flips back

        // Visual indicator
        this.scorePopups.push({
            x: ball.x, y: ball.y,
            isAntiGravityActivation: true,
            birth: performance.now()
        });
    }

    /**
     * Bouncy Ball - Gains energy with each bounce, crazy high restitution
     */
    _powerUpBouncy(ball) {
        if (!ball) return;
        ball.isBouncy = true;
        ball.bounceCount = 0;
        ball.bouncyEnergy = 1.0; // Starts at normal, increases
        ball.maxBouncyEnergy = 2.5; // Cap the craziness
    }

    /**
     * Handle bouncy ball energy gain on bounce
     */
    _handleBouncyBounce(ball) {
        if (!ball || !ball.isBouncy) return;

        ball.bounceCount++;
        // Gain 15% energy per bounce, up to max
        ball.bouncyEnergy = Math.min(ball.maxBouncyEnergy, ball.bouncyEnergy + 0.15);

        // Apply energy boost to velocity
        const boost = 1 + (ball.bouncyEnergy - 1) * 0.3;
        ball.vx *= boost;
        ball.vy *= boost;

        // Visual feedback
        this.scorePopups.push({
            x: ball.x, y: ball.y,
            isBouncyPulse: true,
            energy: ball.bouncyEnergy,
            birth: performance.now()
        });

        // Screen shake at high energy
        if (ball.bouncyEnergy > 1.8) {
            this.triggerShake(ball.bouncyEnergy * 2, 100);
        }
    }

    /**
     * Black Hole - Creates a gravity well that sucks in nearby pegs
     */
    _powerUpBlackHole(ball, peg) {
        if (!peg) return;

        const blackHole = {
            x: peg.x,
            y: peg.y,
            radius: 180,
            strength: 0.8,
            birth: performance.now(),
            duration: 2500, // 2.5 seconds
            phase: 'forming', // 'forming', 'active', 'collapsing'
            absorbedPegs: []
        };

        this.blackHoles.push(blackHole);

        // Visual indicator
        this.scorePopups.push({
            x: peg.x, y: peg.y,
            isBlackHoleForm: true,
            birth: performance.now()
        });

        // Ominous shake
        this.triggerShake(8, 300);

        // Give ball dark aura
        if (ball) {
            ball.isBlackHoleMaster = true;
        }
    }

    /**
     * Update black holes (called from main update)
     */
    _updateBlackHoles() {
        const now = performance.now();

        for (let i = this.blackHoles.length - 1; i >= 0; i--) {
            const bh = this.blackHoles[i];
            const age = now - bh.birth;

            // Phase transitions
            if (age < 300) {
                bh.phase = 'forming';
            } else if (age < bh.duration - 500) {
                bh.phase = 'active';
            } else if (age < bh.duration) {
                bh.phase = 'collapsing';
            } else {
                // Remove expired black hole
                this.blackHoles.splice(i, 1);
                continue;
            }

            // Active phase: pull in nearby pegs
            if (bh.phase === 'active') {
                for (const peg of this.pegs) {
                    if (peg.isHit || bh.absorbedPegs.includes(peg)) continue;

                    const dx = bh.x - peg.x;
                    const dy = bh.y - peg.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist < bh.radius && dist > 20) {
                        // Pull peg toward center
                        const force = bh.strength * (1 - dist / bh.radius);
                        peg.x += (dx / dist) * force * 2;
                        peg.y += (dy / dist) * force * 2;

                        // Mark peg as dirty for re-render
                        this.renderer.staticDirty = true;

                        // Absorb peg if close enough
                        if (dist < 30) {
                            bh.absorbedPegs.push(peg);
                            this._handlePegHit(peg, null);
                        }
                    }
                }

                // Also affect balls
                for (const ball of this.balls) {
                    if (!ball.active || ball.landed || ball.isBlackHoleMaster) continue;

                    const dx = bh.x - ball.x;
                    const dy = bh.y - ball.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist < bh.radius * 1.5) {
                        // Gentle pull on balls
                        const force = bh.strength * 0.3 * (1 - dist / (bh.radius * 1.5));
                        ball.vx += (dx / dist) * force;
                        ball.vy += (dy / dist) * force;
                    }
                }
            }

            // Collapsing phase: final explosion
            if (bh.phase === 'collapsing' && !bh.exploded) {
                bh.exploded = true;

                // Hit any remaining nearby pegs
                for (const peg of this.pegs) {
                    if (peg.isHit) continue;
                    const dx = bh.x - peg.x;
                    const dy = bh.y - peg.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist < bh.radius * 0.5) {
                        peg.isExploding = true;
                        peg.explodeTime = now + dist * 2;
                    }
                }

                // Collapse visual
                this.scorePopups.push({
                    x: bh.x, y: bh.y,
                    isBlackHoleCollapse: true,
                    birth: now
                });

                this.triggerShake(10, 250);
            }
        }
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

        // Animate ball returning to magazine (free ball!)
        const mag = this.magazines[this.currentPlayerIndex];
        if (mag) {
            mag.returnBallAnimation();
        }

        // Show "FREE BALL" popup
        this.scorePopups.push({
            x: this.goalMouth.x + this.goalMouth.width / 2,
            y: this.goalMouth.y - 30,
            value: bonus,
            birth: performance.now(),
            isFreeBall: true
        });

        // Mark that we earned a free ball - _finishShot will NOT increment shotsTaken
        this.freeBallEarned = true;

        AudioHelper.play('Kerplunk');

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

    /**
     * Handle ball landing in fever slot during Extreme Fever
     */
    _handleFeverSlotCatch(ball, slotResult) {
        ball.land(null);

        // Award the fever slot bonus
        const bonus = slotResult.value;
        this.players[this.currentPlayerIndex].score += bonus;

        // Show big score popup
        this.scorePopups.push({
            x: ball.x,
            y: ball.y - 20,
            value: bonus,
            birth: performance.now(),
            isOrange: false,
            isFeverBonus: true
        });

        // Track for stats
        if (this.persistentStats) {
            this.persistentStats.goalCatches += 1;
            this._savePersistentStats();
        }

        // Extra shake and celebration for 100K slot (center)
        if (slotResult.slotIndex === 2) {
            this.triggerShake(15, 300);
            // Spawn extra confetti
            try {
                if (typeof window.spawnConfetti === 'function') {
                    const rect = this.canvas.getBoundingClientRect();
                    const cx = rect.left + ball.x * this.renderer.scale;
                    const cy = rect.top + ball.y * this.renderer.scale;
                    window.spawnConfetti(cx, cy, 30);
                }
            } catch (e) {}
        } else {
            this.triggerShake(8, 150);
            try {
                if (typeof window.spawnConfetti === 'function') {
                    const rect = this.canvas.getBoundingClientRect();
                    const cx = rect.left + ball.x * this.renderer.scale;
                    const cy = rect.top + ball.y * this.renderer.scale;
                    window.spawnConfetti(cx, cy, 15);
                }
            } catch (e) {}
        }

        AudioHelper.play('Kerplunk');

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
        this.combo = 0;
        this.splitterBallCount = 0; // Reset splitter ball counter

        // Only increment shotsTaken if we didn't earn a free ball
        if (!this.freeBallEarned) {
            this.shotsTaken[this.currentPlayerIndex] += 1;
        }
        this.freeBallEarned = false; // Reset flag

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

        // Single player mode - only check P1
        if (!this.twoPlayerMode) {
            const p0Done = this.shotsTaken[0] >= this.shotsPerPlayer;
            if (p0Done) {
                this.matchOver = true;
                this.state = CONFIG.STATES.IDLE;
                this._notifyHud();
                this._showMatchResult();
                return;
            }
            // Stay as player 0
            this.state = CONFIG.STATES.IDLE;
            this._notifyHud();
            return;
        }

        // Two player mode
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
        const okBtn = document.getElementById('round-modal-ok');
        const retryBtn = document.getElementById('round-modal-retry');
        if (!modal || !okBtn) return;

        let score = this.players[0].score;
        const remainingBalls = this.shotsPerPlayer - this.shotsTaken[0];
        const ballBonusPerBall = 1000; // Points per remaining ball
        this.levelCompleted = orangeCleared;

        // Track persistent stats for trail unlocks
        if (this.persistentStats) {
            this.persistentStats.gamesPlayed += 1;
            this.persistentStats.totalScore += score;
            if (orangeCleared) {
                this.persistentStats.wins += 1;
            }
            this._savePersistentStats();
            this._checkTrailUnlocks();
        }

        // Determine result message
        let title;
        if (orangeCleared) {
            title = 'Level Complete!';
        } else {
            title = 'Level Failed!';
            // Play fail sound
            if (window.audioManager && typeof window.audioManager.playLevelFail === 'function') {
                window.audioManager.playLevelFail();
            }
        }

        // Update modal level display
        const levelName = this.currentLevelData ? this.currentLevelData.name : `Level ${this.currentLevelIndex + 1}`;
        const levelEl = document.getElementById('modal-level');
        if (levelEl) levelEl.textContent = levelName;

        // Update title
        const titleEl = document.getElementById('round-modal-text');
        if (titleEl) titleEl.textContent = title;

        // Update score display (initial, before bonus)
        const scoreEl = document.getElementById('modal-score');
        if (scoreEl) scoreEl.textContent = score.toLocaleString();

        // Update targets remaining - show CLEARED! if 0
        const targetsEl = document.getElementById('modal-targets');
        if (targetsEl) {
            if (this.orangePegsRemaining === 0) {
                targetsEl.textContent = 'CLEARED!';
                targetsEl.classList.add('cleared');
            } else {
                targetsEl.textContent = this.orangePegsRemaining;
                targetsEl.classList.remove('cleared');
            }
        }

        // Update balls display
        const ballsEl = document.getElementById('modal-balls');
        if (ballsEl) {
            ballsEl.textContent = remainingBalls;
        }

        // Initially hide stars (will animate in after bonus counting)
        const starEls = modal.querySelectorAll('.neu-star');
        starEls.forEach(star => star.classList.remove('earned'));

        // Show both buttons - RETRY always visible
        if (retryBtn) {
            retryBtn.classList.remove('hidden');
        }

        okBtn.querySelector('span').textContent = 'LEVELS';

        modal.classList.remove('hidden');

        // If level completed and has remaining balls, animate bonus counting
        if (orangeCleared && remainingBalls > 0) {
            this._animateBallBonus(remainingBalls, ballBonusPerBall, score, scoreEl, ballsEl, starEls);
        } else {
            // No bonus, just show final stars
            const finalStars = this.getStarRating(score);
            this._animateStars(starEls, finalStars, orangeCleared);
            this._saveProgress(score, orangeCleared);
        }

        // Retry button - replay current level
        if (retryBtn) {
            retryBtn.onclick = () => {
                modal.classList.add('hidden');
                this.resetMatch();
                this.startMagazineAnimation();
            };
        }

        // Main button - show level select
        okBtn.onclick = () => {
            modal.classList.add('hidden');
            this.showLevelSelect();
        };
    }

    /**
     * Animate ball bonus counting with visual balls and score popups
     */
    _animateBallBonus(ballsRemaining, bonusPerBall, startScore, scoreEl, ballsEl, starEls) {
        const bonusArea = document.getElementById('ball-bonus-area');
        const ballsDisplay = document.getElementById('bonus-balls-display');
        const popupEl = document.getElementById('bonus-score-popup');

        // Show bonus area and create ball elements
        if (bonusArea && ballsDisplay) {
            bonusArea.classList.remove('hidden');
            ballsDisplay.innerHTML = '';

            // Create visual balls
            for (let i = 0; i < ballsRemaining; i++) {
                const ball = document.createElement('div');
                ball.className = 'bonus-ball';
                ball.id = `bonus-ball-${i}`;
                ballsDisplay.appendChild(ball);
            }
        }

        let currentBallIndex = 0;
        let currentScore = startScore;
        const totalBalls = ballsRemaining;
        const interval = 250; // ms between each ball count

        const countNext = () => {
            if (currentBallIndex >= totalBalls) {
                // All balls counted, update player score and show stars
                this.players[0].score = currentScore;
                const finalStars = this.getStarRating(currentScore);

                // Hide bonus area after a delay
                setTimeout(() => {
                    if (bonusArea) bonusArea.classList.add('hidden');
                }, 300);

                this._animateStars(starEls, finalStars, true);
                this._saveProgress(currentScore, true);
                return;
            }

            // Get current ball element
            const ballEl = document.getElementById(`bonus-ball-${currentBallIndex}`);

            // Highlight current ball
            if (ballEl) {
                ballEl.classList.add('counting');
            }

            // Add bonus to score
            currentScore += bonusPerBall;

            // Update displays
            const remaining = totalBalls - currentBallIndex - 1;
            if (ballsEl) ballsEl.textContent = remaining;
            if (scoreEl) scoreEl.textContent = currentScore.toLocaleString();

            // Play sound with ascending pitch
            const pitchFactor = 0.9 + (currentBallIndex / totalBalls) * 0.4;
            if (window.audioManager && typeof window.audioManager.playBallBonus === 'function') {
                window.audioManager.playBallBonus({ pitch: pitchFactor });
            }

            // Show score popup near the ball
            if (popupEl && ballEl) {
                const rect = ballEl.getBoundingClientRect();
                const containerRect = ballsDisplay.getBoundingClientRect();
                popupEl.textContent = `+${bonusPerBall.toLocaleString()}`;
                popupEl.style.left = `${rect.left - containerRect.left + 12}px`;
                popupEl.style.top = `${rect.top - containerRect.top - 10}px`;
                popupEl.classList.remove('show');
                void popupEl.offsetWidth; // Trigger reflow
                popupEl.classList.add('show');
            }

            // Flash score for emphasis
            if (scoreEl) {
                scoreEl.style.transform = 'scale(1.1)';
                scoreEl.style.color = '#00CC33';
                setTimeout(() => {
                    scoreEl.style.transform = 'scale(1)';
                    scoreEl.style.color = '';
                }, 100);
            }

            // After a short delay, mark ball as counted
            setTimeout(() => {
                if (ballEl) {
                    ballEl.classList.remove('counting');
                    ballEl.classList.add('counted');
                }
            }, 150);

            currentBallIndex++;

            // Schedule next
            setTimeout(countNext, interval);
        };

        // Start counting after a short delay
        setTimeout(countNext, 500);
    }

    /**
     * Animate stars appearing one by one
     */
    _animateStars(starEls, starsEarned, levelCleared) {
        const delay = 200; // ms between each star
        starEls.forEach((star, idx) => {
            setTimeout(() => {
                if (idx < starsEarned && levelCleared) {
                    star.classList.add('earned');
                    // Play a small chime for each star
                    if (window.audioManager && typeof window.audioManager.playBallBonus === 'function') {
                        window.audioManager.playBallBonus({ pitch: 1.2 + idx * 0.15 });
                    }
                }
            }, delay * (idx + 1));
        });
    }

    /**
     * Save progress to localStorage
     */
    _saveProgress(finalScore, orangeCleared) {
        if (!orangeCleared || !window.LEVEL_PROGRESS) return;

        const stars = this.getStarRating(finalScore);
        const levelId = this.currentLevelData ? this.currentLevelData.id : `level_${this.currentLevelIndex + 1}`;

        // Save stars (only updates if better than previous)
        window.LEVEL_PROGRESS.setStars(levelId, stars);

        // Unlock next level
        const levelCount = window.getLevelCount ? window.getLevelCount() : 3;
        if (this.currentLevelIndex + 1 < levelCount) {
            const nextLevelId = `level_${this.currentLevelIndex + 2}`;
            window.LEVEL_PROGRESS.unlock(nextLevelId);
        }
    }

    /**
     * Show the level select grid
     */
    showLevelSelect() {
        const levelSelect = document.getElementById('level-select-modal');
        if (!levelSelect) return;

        // Populate the grid
        this._populateLevelGrid();

        // Update total stars display
        if (typeof window.updateTotalStars === 'function') {
            window.updateTotalStars();
        }

        levelSelect.classList.remove('hidden');
    }

    /**
     * Hide level select and start a level
     */
    startLevel(levelIndex) {
        const levelSelect = document.getElementById('level-select-modal');
        if (levelSelect) levelSelect.classList.add('hidden');

        this.currentLevelIndex = levelIndex;
        this.resetMatch();
        this.startMagazineAnimation();
    }

    /**
     * Populate the level select grid
     */
    _populateLevelGrid() {
        const grid = document.getElementById('level-grid');
        if (!grid) return;

        grid.innerHTML = '';

        const levelIds = window.getAllLevelIds ? window.getAllLevelIds() : ['level_1', 'level_2', 'level_3'];

        // SVG star path for fun stars
        const starSvg = `<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

        levelIds.forEach((levelId, idx) => {
            const levelData = window.getLevelData ? window.getLevelData(idx) : null;
            const isUnlocked = window.LEVEL_PROGRESS ? window.LEVEL_PROGRESS.isUnlocked(levelId) : idx === 0;
            const starsEarned = window.LEVEL_PROGRESS ? window.LEVEL_PROGRESS.getStars(levelId) : 0;

            const card = document.createElement('div');
            card.className = 'level-card' + (isUnlocked ? '' : ' locked');

            const name = levelData ? levelData.name : `Level ${idx + 1}`;
            const subtitle = levelData ? levelData.subtitle : '';

            // Get star thresholds for display
            const thresholds = levelData && levelData.starThresholds
                ? levelData.starThresholds
                : [4000, 5000, 6000];

            card.innerHTML = `
                <div class="level-card-preview">
                    <div class="level-number">${idx + 1}</div>
                    ${!isUnlocked ? '<div class="lock-icon">🔒</div>' : ''}
                </div>
                <div class="level-card-info">
                    <div class="level-card-name">${name}</div>
                    <div class="level-card-subtitle">${subtitle}</div>
                    <div class="level-card-stars-row">
                        ${[0, 1, 2].map(s => `
                            <div class="star-with-threshold">
                                <div class="fun-star small ${s < starsEarned ? 'earned' : ''}">${starSvg}</div>
                                <div class="threshold-value">${(thresholds[s] / 1000).toFixed(0)}k</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            if (isUnlocked) {
                card.onclick = () => this.startLevel(idx);
            }

            grid.appendChild(card);
        });
    }

    resetMatch() {
        this.players = [{ score: 0 }, { score: 0 }];
        this.currentPlayerIndex = 0;
        this.shotsTaken = [0, 0];
        this.matchOver = false;
        this.combo = 0;
        this.freeBallEarned = false;
        this.slowMoUntil = 0;
        this.state = CONFIG.STATES.IDLE;
        this.balls = [];
        this.scorePopups = [];
        this.extremeFever = false;
        this.extremeFeverStart = 0;
        this.extremeFeverTarget = null;
        this.timeScale = 1;

        // Deactivate fever slots
        if (this.feverSlots) {
            this.feverSlots.deactivate();
        }

        // Rebuild pegs and apply level data
        this.pegs = this.layout.buildPegs(this.board);
        if (!this.pegs || this.pegs.length === 0) {
            this.pegs = createPegs();
        }
        this._applyLevelData(this.currentLevelIndex);

        // Reset power-up state
        this.currentPowerUp = null;
        this.zenMode = false;
        this.powerUpPending = false;
        this.blackHoles = [];

        // Reset magazines (loading animation starts when modal is dismissed)
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
        const steps = 40;
        const leftWall = this.board.innerLeft;
        const rightWall = this.board.innerRight;
        const segments = this.board.chevronSegments || [];
        const pegs = this.pegs || [];
        // Use actual ball radius for accurate collision preview
        const bRadius = CONFIG.BALL.radius;
        const restitution = CONFIG.PHYSICS.wallRestitution;
        const pegRestitution = CONFIG.PHYSICS.pegRestitution;
        // Use actual tuning values for gravity and friction
        const gravity = this.tuning.gravity;
        const friction = this.tuning.friction;

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
            // Apply physics in same order as Ball.update() for accuracy
            vy += gravity;
            vx *= friction;
            vy *= friction;
            x += vx;
            y += vy;
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

        AudioHelper.play('StyleBonus');

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

    /**
     * Apply level data - sets fixed peg positions and level settings
     */
    _applyLevelData(levelIndex) {
        // Get level data (falls back to level_1 if not found)
        const levelData = window.getLevelData ? window.getLevelData(levelIndex) : null;

        if (levelData) {
            this.currentLevelData = levelData;
            this.currentLevelIndex = levelIndex;

            // Apply fixed peg positions from level data
            Layout.applyLevelData(this.pegs, levelData);

            // Count orange pegs
            this.orangePegsRemaining = levelData.orangePegIndices ? levelData.orangePegIndices.length : CONFIG.PEGGLE.orangePegCount;

            // Apply level settings
            if (levelData.mouthSpeed && this.goalMouth) {
                this.goalMouth.setSpeed(levelData.mouthSpeed);
            }
            if (levelData.ballCount) {
                this.shotsPerPlayer = levelData.ballCount;
            }
        } else {
            // Fallback to random assignment if no level data
            this.currentLevelData = null;
            Layout.assignOrangePegs(this.pegs, CONFIG.PEGGLE.orangePegCount);
            Layout.assignGreenPegs(this.pegs, this.greenPegCount);
            this.orangePegsRemaining = CONFIG.PEGGLE.orangePegCount;
        }

        this.levelCompleted = false;
    }

    /**
     * Get the star rating for the current score
     * Returns 0, 1, 2, or 3 based on thresholds
     */
    getStarRating(score) {
        if (!this.currentLevelData || !this.currentLevelData.starThresholds) {
            // Default thresholds
            if (score >= 6000) return 3;
            if (score >= 5000) return 2;
            if (score >= 4000) return 1;
            return 0;
        }

        const thresholds = this.currentLevelData.starThresholds;
        if (score >= thresholds[2]) return 3;
        if (score >= thresholds[1]) return 2;
        if (score >= thresholds[0]) return 1;
        return 0;
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
