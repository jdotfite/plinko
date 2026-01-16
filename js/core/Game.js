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
        this.score = 0;
        this.aimX = null;
        
        // Entities
        this.board = new Board();
        this.pegs = createPegs();
        this.slots = createSlots();
        this.slotDividers = createSlotDividers(this.slots);
        this.balls = [];
        this.aimBall = null; // preview ball while aiming
        this.nextSoundVariant = 0; // cycles through sound variants per spawned ball
        // Round/competition tracking
        this.currentRound = 1;
        this.maxRounds = 2;
        this.maxDropsPerRound = 5;
        this.dropsThisRound = 0;
        this.landedThisRound = 0;
        this.perSlotTotals = this.slots.map(() => 0);
        this.allowDropping = false; // controlled by round modal
        
        // Physics timing
        this.lastTime = 0;
        this.accumulator = 0;
        
        // Bind input callbacks
        this.inputHandler.onAimStart = (x, y) => this.startAiming(x);
        this.inputHandler.onAimMove = (x, y) => this.updateAim(x);
        this.inputHandler.onDrop = (x) => this.dropBall(x);
        
        // Initial render of static elements
        this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);
    }

    /**
     * Replace the current slots with a new count and re-render static elements.
     */
    setSlotCount(count) {
        if (!count || typeof count !== 'number') return;
        const n = Math.max(2, Math.min(24, Math.floor(count)));
        if (typeof createSlotsWithCount === 'function') {
            this.slots = createSlotsWithCount(n);
            this.slotDividers = createSlotDividers(this.slots);

            // Reset any previous winners
            for (const s of this.slots) s.reset();

            // Reset per-slot aggregate totals to match new slot count
            this.perSlotTotals = this.slots.map(() => 0);

            this.renderer.staticDirty = true;
            this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);
        } else {
            console.warn('createSlotsWithCount not available');
        }
    }

    /**
     * Apply array of labels to current slots (will set slot.label and re-render static canvas)
     */
    setSlotLabels(labels) {
        if (!Array.isArray(labels) || !this.slots) return;
        for (let i = 0; i < this.slots.length; i++) {
            this.slots[i].label = labels[i] || '';
        }
        this.renderer.staticDirty = true;
        this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);
        // Force an immediate dynamic redraw so labels appear right away
        if (typeof this.renderer.render === 'function') {
            this.renderer.render(this);
        }
    }
    
    /**
     * Start the game loop
     */
    start() {
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    /**
     * Main game loop
     */
    gameLoop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Fixed timestep physics
        this.accumulator += deltaTime;
        const fixedDT = CONFIG.PHYSICS.fixedTimeStep;
        
        while (this.accumulator >= fixedDT) {
            this.update(fixedDT);
            this.accumulator -= fixedDT;
        }
        
        // Render
        this.renderer.render(this);
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    /**
     * Update game state
     */
    update(dt) {
        if (this.state === CONFIG.STATES.DROPPING && this.balls.length > 0) {
            // Update each active ball
            for (const ball of this.balls) {
                if (!ball.active || ball.landed) continue;

                // Update physics
                ball.update(dt);

                // Check peg collisions
                for (const peg of this.pegs) {
                    const collision = Collision.ballToPeg(ball, peg);
                    if (collision) {
                        Collision.resolveBallPeg(ball, collision);
                    }
                }

                // Walls and dividers
                Collision.ballToWalls(ball, this.board, this.slotDividers);

                // Slot landing
                const landedSlot = Collision.ballToSlots(ball, this.slots);
                if (landedSlot) {
                    this._handleBallLanding(ball, landedSlot);
                }
            }
        }
        
        // Auto-reset after scoring
        // If we're dropping but there are no active balls remaining, return to idle
        if (this.state === CONFIG.STATES.DROPPING) {
            const anyActive = this.balls.some(b => b.active && !b.landed);
            if (!anyActive && !this.aimBall) {
                this.state = CONFIG.STATES.IDLE;
            }
        }
    }
    
    /**
     * Start aiming (touch/click in drop zone)
     */
    startAiming(x) {
        if (this.state !== CONFIG.STATES.IDLE) return;
        
        this.state = CONFIG.STATES.AIMING;
        this.aimX = x;
        
        // Create a preview ball for aiming
        this.aimBall = new Ball(x, CONFIG.BALL.dropZoneMaxY);
    }
    
    /**
     * Update aim position
     */
    updateAim(x) {
        if (this.state !== CONFIG.STATES.AIMING) return;
        
        this.aimX = x;
        if (this.aimBall) {
            this.aimBall.x = x;
        }
    }
    
    /**
     * Drop the ball
     */
    dropBall(x) {
        // Allow dropping only when a round is active and under the per-round drop limit
        if (!this.allowDropping) return;
        if (this.dropsThisRound >= this.maxDropsPerRound) return;

        this.state = CONFIG.STATES.DROPPING;
        this.aimX = null;

        // Remove preview if present
        if (this.aimBall) this.aimBall = null;

        // Spawn a single ball for this click
        const b = new Ball(x, CONFIG.BALL.dropZoneMaxY);
        b.x = x;
        b.y = CONFIG.BALL.dropZoneMaxY;
        try {
            const maxVariants = (window.audioManager && typeof window.audioManager === 'object' && typeof window.audioManager.playPegHit === 'function') ? 4 : 1;
            b.soundVariant = this.nextSoundVariant % maxVariants;
            this.nextSoundVariant = (this.nextSoundVariant + 1) % maxVariants;
        } catch (e) { b.soundVariant = 0; }

        b.drop();
        this.balls.push(b);
        this.dropsThisRound++;
        // update round counter UI
        try { if (typeof window.updateRoundCounter === 'function') window.updateRoundCounter(this.currentRound, this.dropsThisRound, this.maxDropsPerRound, this.landedThisRound); } catch(e){}
    }
    
    /**
     * Handle ball landing in slot
     */
    handleWin(slot) {
        // Deprecated; use per-ball landing handler
    }

    _handleBallLanding(ball, slot) {
        // Update score and mark ball as landed
        this.score += slot.value;
        ball.land(slot);

        // Trigger slot animation and mark static dirty so highlight renders
        slot.triggerWin();
        // Track landed counts
        slot.landedCount = (slot.landedCount || 0) + 1;
        this.landedThisRound = (this.landedThisRound || 0) + 1;
        this.perSlotTotals[slot.index] = (this.perSlotTotals[slot.index] || 0) + 1;

        // Spawn confetti at slot center
        try {
            if (typeof window.spawnConfetti === 'function') {
                const rect = this.canvas.getBoundingClientRect();
                const cx = rect.left + (slot.x + slot.width / 2) * this.renderer.scale;
                const cy = rect.top + (slot.y + slot.height / 2) * this.renderer.scale;
                // tiny bucket chime
                try { if (window.audioManager && typeof window.audioManager.playBucketHit === 'function') window.audioManager.playBucketHit(); } catch(e){}
                window.spawnConfetti(cx, cy, 18);
                // small pulse
                if (typeof window.spawnPulse === 'function') window.spawnPulse(cx, cy);
            }
        } catch (e) {}

        this.renderer.staticDirty = true;
        this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);

        // Play short hit sound
        try { if (window.audioManager && typeof window.audioManager.playPegHit === 'function') window.audioManager.playPegHit(); } catch (e) {}

        // update counter UI
        try { if (typeof window.updateRoundCounter === 'function') window.updateRoundCounter(this.currentRound, this.dropsThisRound, this.maxDropsPerRound, this.landedThisRound); } catch(e){}

        // Check round completion
        if (this.landedThisRound >= this.maxDropsPerRound) {
            // stop dropping
            this.allowDropping = false;
            // celebration sound
            try { if (window.audioManager && typeof window.audioManager.playCelebration === 'function') window.audioManager.playCelebration(); } catch (e) {}
            // show modal and advance rounds / announce final winner
            try {
                const modal = document.getElementById('round-modal');
                const textEl = document.getElementById('round-modal-text');
                const ok = document.getElementById('round-modal-ok');
                if (modal && textEl && ok) {
                    if (this.currentRound < this.maxRounds) {
                        textEl.textContent = `Round ${this.currentRound} complete — press OK to start round ${this.currentRound + 1}`;
                    } else {
                        // compute winner across all rounds
                        let winnerIndex = 0;
                        for (let i = 1; i < this.perSlotTotals.length; i++) {
                            if (this.perSlotTotals[i] > this.perSlotTotals[winnerIndex]) winnerIndex = i;
                        }
                        const winnerLabel = (this.slots[winnerIndex] && this.slots[winnerIndex].label) ? this.slots[winnerIndex].label : `$${this.slots[winnerIndex].value}`;
                        textEl.textContent = `Game over! Winner: ${winnerLabel}`;
                    }
                    modal.classList.remove('hidden');
                    ok.onclick = () => {
                        modal.classList.add('hidden');
                        if (this.currentRound < this.maxRounds) {
                            this.currentRound++;
                            this.dropsThisRound = 0;
                            this.landedThisRound = 0;
                            // allow dropping for next round
                            this.allowDropping = true;
                            try { if (typeof window.updateRoundCounter === 'function') window.updateRoundCounter(this.currentRound, this.dropsThisRound, this.maxDropsPerRound, this.landedThisRound); } catch(e){}
                        } else {
                            // game fully complete: reset game state so user can play again
                            this.allowDropping = false;
                            try { if (typeof window.updateRoundCounter === 'function') window.updateRoundCounter(this.currentRound, this.dropsThisRound, this.maxDropsPerRound, this.landedThisRound); } catch(e){}

                            // Reset score, per-slot totals, rounds and visual state
                            this.score = 0;
                            this.currentRound = 1;
                            this.dropsThisRound = 0;
                            this.landedThisRound = 0;
                            this.perSlotTotals = this.slots.map(() => 0);
                            // Clear any active balls and reset slot visuals
                            try { this.resetRound(); } catch(e){}

                            // Ensure UI counter reflects fresh state
                            try { if (typeof window.updateRoundCounter === 'function') window.updateRoundCounter(this.currentRound, this.dropsThisRound, this.maxDropsPerRound, this.landedThisRound); } catch(e){}
                        }
                    };
                }
            } catch (e) { console.warn('Failed to show round modal', e); }
        }
    }
    
    /**
     * Reset for next round
     */
    resetRound() {
        this.state = CONFIG.STATES.IDLE;
        this.balls = [];
        this.aimBall = null;
        this.aimX = null;

        // Reset slots
        for (const slot of this.slots) {
            slot.reset();
        }

        // Re-render static elements
        this.renderer.staticDirty = true;
        this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);
    }
}
