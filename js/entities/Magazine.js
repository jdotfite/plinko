/**
 * Magazine - Skeeball-style ball slot display
 * Shows remaining shots as balls visible through a recessed vertical slot
 */

class Magazine {
    constructor(x, y, playerId) {
        this.x = x;
        this.y = y;
        this.playerId = playerId;
        this.total = 10;
        this.remaining = 10;

        // Ball return animation (when ball goes into goal mouth)
        this.returnBall = null;       // { y, targetY, startTime }

        // Startup animation phases:
        // 1. 'dropping' - balls drop into magazine with clacking sounds
        // 2. 'settling' - short pause after balls settle
        // 3. 'cannon_loading' - bottom ball feeds into cannon
        // 4. null - animation complete
        this.loadingAnimation = null;
        this.ballOffsets = [];        // Y offset for each ball during animation
        this.ballsDropped = 0;        // How many balls have dropped in
        this.cannonBallOffset = 0;    // Y offset for ball loading into cannon
        this.initialized = false;     // True once loading animation has started
        this.cannonReady = false;     // True once ball is loaded in cannon
    }

    setTotal(count) {
        this.total = Math.max(1, Math.floor(count));
        this.remaining = Math.min(this.remaining, this.total);
    }

    setRemaining(count) {
        const newRemaining = Math.max(0, Math.min(this.total, Math.floor(count)));
        const decreased = newRemaining < this.remaining;
        this.remaining = newRemaining;

        // Trigger cannon reload animation when a ball is used
        if (decreased && this.initialized && this.remaining > 0) {
            this.startReloadAnimation();
        }
    }

    /**
     * Start cannon reload animation - balls slide up, top ball loads into cannon
     */
    startReloadAnimation() {
        this.cannonReady = false;  // Cannon empty until animation completes
        this.reloadAnimation = {
            startTime: performance.now(),
            duration: 250  // ms
        };
        // Initialize offsets - all balls start at current position (will slide up)
        this.ballOffsets = [];
        for (let i = 0; i < this.remaining; i++) {
            this.ballOffsets[i] = 0;
        }
        this.cannonBallOffset = 0;
    }

    useShot() {
        // Just return if we have remaining shots - no animation here
        return this.remaining > 0;
    }

    /**
     * Animate a ball returning from the bottom (free ball reward)
     */
    returnBallAnimation() {
        const cfg = CONFIG.MAGAZINE;
        // Target is one slot below current remaining (since remaining will be incremented)
        const targetY = this.y + this.remaining * cfg.spacing;
        this.returnBall = {
            y: this.y + this.total * cfg.spacing + 60, // Start below magazine
            targetY: targetY,
            startTime: performance.now()
        };
    }

    /**
     * Called when ball return animation completes
     */
    completeReturn() {
        // Don't modify remaining - that's handled by setRemaining based on shotsTaken
        this.returnBall = null;
    }

    reset() {
        this.remaining = this.total;
        this.returnBall = null;
        this.loadingAnimation = null;
        this.reloadAnimation = null;
        this.ballOffsets = [];
        this.ballsDropped = 0;
        this.cannonBallOffset = 0;
        this.initialized = false;
        this.cannonReady = false;
    }

    /**
     * Start the loading animation (three phases: rise, settle, cannon load)
     */
    startLoadingAnimation() {
        this.initialized = true;
        this.cannonReady = false;
        this.ballsDropped = 0;
        this.cannonBallOffset = 0;
        this.loadingAnimation = {
            startTime: performance.now(),
            phase: 'rising',
            lastDropTime: 0,
            lastRiseIndex: -1
        };
        // Initialize offsets - each ball starts at entry point (below magazine)
        // Ball 0 (top slot) has longest travel, ball total-1 (bottom) has shortest
        this.ballOffsets = [];
        const cfg = CONFIG.MAGAZINE;
        for (let i = 0; i < this.total; i++) {
            // Entry offset: distance from slot i to bottom entry point
            const entryOffset = (this.total - 1 - i) * cfg.spacing + 50;
            this.ballOffsets.push(entryOffset);
        }
    }

    update() {
        // Update loading animation (three phases)
        if (this.loadingAnimation) {
            const now = performance.now();
            const elapsed = now - this.loadingAnimation.startTime;
            const phase = this.loadingAnimation.phase;

            if (phase === 'rising') {
                // Phase 1: Balls roll into magazine one by one from the bottom
                // Ball 0 (top slot) enters first, then ball 1, etc.
                // Each ball enters from below and rolls up to its slot
                const riseInterval = 60; // ms between each ball starting (SAME timing)
                const riseDuration = 200; // ms for each ball to rise into place

                // Determine how many balls should have started rising
                const ballsToStart = Math.min(this.total, Math.floor(elapsed / riseInterval) + 1);
                const cfg = CONFIG.MAGAZINE;

                let allRisen = true;
                for (let i = 0; i < this.total; i++) {
                    // Normal order: top ball (index 0) rises first, then index 1, etc.
                    const riseOrder = i;

                    // Entry offset: distance from slot i to bottom entry point
                    const entryOffset = (this.total - 1 - i) * cfg.spacing + 50;

                    if (riseOrder < ballsToStart) {
                        // This ball has started rising
                        const ballStartTime = riseOrder * riseInterval;
                        const ballElapsed = elapsed - ballStartTime;
                        const progress = Math.min(1, ballElapsed / riseDuration);

                        // Ease out for smooth deceleration
                        const eased = 1 - Math.pow(1 - progress, 2);
                        // Small bounce at the end (upward overshoot)
                        const bounce = progress >= 0.8 ? Math.sin((progress - 0.8) * Math.PI * 5) * -3 * (1 - progress) : 0;

                        // Animate from entry point to slot position
                        this.ballOffsets[i] = entryOffset * (1 - eased) + bounce;

                        // Play clack sound when ball settles (SAME timing as before)
                        // Pitch ASCENDS as magazine fills (low → high) for "building up" feel
                        if (progress >= 0.85 && this.loadingAnimation.lastRiseIndex < riseOrder) {
                            this.loadingAnimation.lastRiseIndex = riseOrder;
                            this._playClackSound(riseOrder);
                        }

                        if (progress < 1) allRisen = false;
                    } else {
                        // Ball hasn't started yet - keep at entry position
                        this.ballOffsets[i] = entryOffset;
                        allRisen = false;
                    }
                }

                // Move to settling phase when all balls have risen
                if (allRisen) {
                    this.loadingAnimation = {
                        startTime: now,
                        phase: 'settling'
                    };
                    this._playSettleSound();
                }
            } else if (phase === 'settling') {
                // Phase 2: Short pause while balls settle
                const settleDuration = 200; // ms

                // Clear any remaining offsets
                for (let i = 0; i < this.ballOffsets.length; i++) {
                    this.ballOffsets[i] = 0;
                }

                if (elapsed >= settleDuration) {
                    // Move to cannon loading phase
                    this.loadingAnimation = {
                        startTime: now,
                        phase: 'cannon_loading'
                    };
                }
            } else if (phase === 'cannon_loading') {
                // Phase 3: All balls slide up one slot, bottom slot becomes empty
                const loadDuration = 300; // ms
                const progress = Math.min(1, elapsed / loadDuration);

                // Ease out for smooth deceleration
                const eased = 1 - Math.pow(1 - progress, 2);

                // All balls shift up by one slot spacing
                const cfg = CONFIG.MAGAZINE;
                const shiftAmount = -cfg.spacing * eased; // Negative = upward

                for (let i = 0; i < this.ballOffsets.length; i++) {
                    this.ballOffsets[i] = shiftAmount;
                }

                // Store progress for render (used to know we're in this phase)
                this.cannonBallOffset = progress;

                // Play cannon load sound at start
                if (elapsed < 20) {
                    this._playCannonLoadSound();
                }

                if (progress >= 1) {
                    // Animation complete
                    this.loadingAnimation = null;
                    this.ballOffsets = [];
                    this.cannonBallOffset = 0;
                    this.cannonReady = true;
                }
            }
        }

        // Update return ball animation (ball rising from bottom)
        if (this.returnBall) {
            const elapsed = performance.now() - this.returnBall.startTime;
            const duration = 500; // ms for full animation
            const progress = Math.min(1, elapsed / duration);

            // Ease out back (slight overshoot for bounce effect)
            const c1 = 1.70158;
            const c3 = c1 + 1;
            const eased = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);

            // Interpolate from start to target
            const startY = this.y + this.total * CONFIG.MAGAZINE.spacing + 60;
            this.returnBall.y = startY + (this.returnBall.targetY - startY) * eased;

            // Complete when done
            if (progress >= 1) {
                this.completeReturn();
            }
        }

        // Update reload animation (balls slide up, top ball loads into cannon)
        if (this.reloadAnimation) {
            const elapsed = performance.now() - this.reloadAnimation.startTime;
            const progress = Math.min(1, elapsed / this.reloadAnimation.duration);

            // Ease out for smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 2);

            // All balls shift up by one slot spacing
            const cfg = CONFIG.MAGAZINE;
            const shiftAmount = -cfg.spacing * eased; // Negative = upward

            for (let i = 0; i < this.ballOffsets.length; i++) {
                this.ballOffsets[i] = shiftAmount;
            }

            // Track progress for top ball fade (loading into cannon)
            this.cannonBallOffset = progress;

            // Play cannon load sound near start
            if (elapsed < 20) {
                this._playCannonLoadSound();
            }

            // Complete when done
            if (progress >= 1) {
                this.reloadAnimation = null;
                this.ballOffsets = [];
                this.cannonBallOffset = 0;
                this.cannonReady = true;
            }
        }
    }

    render(ctx, scale, cannonLoaded = false) {
        // Update animation state
        this.update();

        const cfg = CONFIG.MAGAZINE;
        const ballRadius = cfg.ballRadius * scale;
        const spacing = cfg.spacing * scale;
        const x = this.x * scale;
        const startY = this.y * scale;

        // Slot dimensions - tighter fit around balls
        const slotWidth = ballRadius * 2.3;
        const slotHeight = (this.total - 1) * spacing + ballRadius * 2 + 8 * scale;
        const slotRadius = slotWidth / 2; // Rounded ends (stadium shape)
        const slotX = x - slotWidth / 2;
        const slotY = startY - ballRadius - 4 * scale;

        ctx.save();

        // === SLOT WELL (light background) ===
        ctx.fillStyle = CONFIG.COLORS.playfield || '#ffffff';
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, slotRadius);
        ctx.fill();

        // Clip to slot area so balls don't render outside
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, slotRadius);
        ctx.clip();

        // === REMAINING BALLS ===
        // Don't render balls until animation has been triggered
        if (this.initialized) {
            const isCannonLoading = this.loadingAnimation && this.loadingAnimation.phase === 'cannon_loading';
            const isReloading = !!this.reloadAnimation;
            // Always reserve bottom slot once cannon is ready (ball is either in cannon or in flight)
            // Don't reserve during reload animation (all balls visible, top one fading into cannon)
            const reserveSlot = this.cannonReady && this.remaining > 0 && !isReloading;

            for (let i = 0; i < this.remaining; i++) {
                // Skip bottom slot (that ball is in cannon or in flight)
                if (reserveSlot && i === this.remaining - 1) {
                    continue;
                }

                // Apply animation offset
                const offset = (this.ballOffsets[i] || 0) * scale;
                const yPos = startY + i * spacing + offset;

                // During cannon loading or reload, fade out the top ball as it slides into cannon
                if ((isCannonLoading || isReloading) && i === 0) {
                    ctx.save();
                    ctx.globalAlpha = 1 - this.cannonBallOffset;
                    this._renderBall(ctx, x, yPos, ballRadius, scale);
                    ctx.restore();
                } else {
                    this._renderBall(ctx, x, yPos, ballRadius, scale);
                }
            }
        }

        // === RETURN BALL ANIMATION (rising from bottom) ===
        if (this.returnBall) {
            const returnY = this.returnBall.y * scale;
            this._renderBall(ctx, x, returnY, ballRadius, scale, true);
        }

        ctx.restore();

        // Draw slot overlay effects (outside clip)
        ctx.save();

        // === SHADOW OVERLAY ON TOP OF COINS (tighter inner glow) ===
        // Left edge shadow - narrower
        const leftShadow = ctx.createLinearGradient(slotX, slotY, slotX + slotWidth * 0.25, slotY);
        leftShadow.addColorStop(0, 'rgba(0,0,0,0.12)');
        leftShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leftShadow;
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, slotRadius);
        ctx.fill();

        // Right edge shadow - narrower
        const rightShadow = ctx.createLinearGradient(slotX + slotWidth, slotY, slotX + slotWidth * 0.75, slotY);
        rightShadow.addColorStop(0, 'rgba(0,0,0,0.12)');
        rightShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rightShadow;
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, slotRadius);
        ctx.fill();

        // Top inner shadow (depth at top) - shorter
        const topShadow = ctx.createLinearGradient(slotX, slotY, slotX, slotY + 18 * scale);
        topShadow.addColorStop(0, 'rgba(0,0,0,0.1)');
        topShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topShadow;
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, slotRadius);
        ctx.fill();

        // Bottom inner shadow - shorter
        const bottomShadow = ctx.createLinearGradient(slotX, slotY + slotHeight, slotX, slotY + slotHeight - 15 * scale);
        bottomShadow.addColorStop(0, 'rgba(0,0,0,0.08)');
        bottomShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bottomShadow;
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, slotRadius);
        ctx.fill();

        // Subtle inner border on top
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, slotRadius);
        ctx.stroke();

        // Ball count badge removed - now displayed in bottom UI panel

        ctx.restore();
    }

    /**
     * Play clack sound when ball drops into place
     */
    _playClackSound(index) {
        // Pitch varies slightly for each ball (higher pitch for later balls)
        const pitch = 0.9 + (index / this.total) * 0.3;
        AudioHelper.play('BallClack', { pitch });
    }

    /**
     * Play settle sound when all balls are in magazine
     */
    _playSettleSound() {
        AudioHelper.play('MagazineSettle');
    }

    /**
     * Play sound when ball loads into cannon
     */
    _playCannonLoadSound() {
        AudioHelper.play('CannonLoad');
    }

    /**
     * Helper to render a single ball in the magazine
     */
    _renderBall(ctx, x, y, radius, scale, isReturning = false) {
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.12)';
        ctx.shadowBlur = 6 * scale;
        ctx.shadowOffsetY = 4 * scale;

        // Outer ring (border)
        ctx.beginPath();
        ctx.arc(x, y, radius + 2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLORS.ballBorder;
        ctx.fill();

        // Clear shadow for inner ball
        ctx.shadowColor = 'transparent';

        // Inner ball
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLORS.ballFill;
        ctx.fill();

        // Glow effect for returning ball
        if (isReturning) {
            ctx.shadowColor = '#00FF55';
            ctx.shadowBlur = 15 * scale;
            ctx.beginPath();
            ctx.arc(x, y, radius + 1 * scale, 0, Math.PI * 2);
            ctx.strokeStyle = '#00FF55';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
            ctx.shadowColor = 'transparent';
        }
    }
}
