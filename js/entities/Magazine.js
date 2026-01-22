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

        // Free ball animation queue and state
        this.freeBallQueue = [];      // Queue of pending free ball animations
        this.returnBall = null;       // Current animating ball { y, targetY, startTime, phase, fadeProgress }
                                      // phase: 'rising', 'fading', 'complete'

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
        // But NOT if a free ball animation is in progress (it will trigger reload when done)
        const freeBallAnimating = this.returnBall || this.freeBallQueue.length > 0;
        if (decreased && this.initialized && this.remaining > 0 && !freeBallAnimating) {
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
     * Queue a free ball animation (ball returns from bottom)
     * Multiple calls will queue up and play in sequence
     */
    returnBallAnimation() {
        this.freeBallQueue.push({ queued: true });

        // If no animation running, start the first one
        if (!this.returnBall) {
            this._startNextFreeBall();
        }
    }

    /**
     * Start animating the next free ball from the queue
     */
    _startNextFreeBall() {
        if (this.freeBallQueue.length === 0) {
            this.returnBall = null;
            // All free balls are in - now trigger reload animation
            if (this.initialized && this.remaining > 0) {
                // Small delay before reload to let the last ball fully settle visually
                setTimeout(() => {
                    if (!this.returnBall && !this.reloadAnimation) {
                        this.startReloadAnimation();
                    }
                }, 50);
            }
            return;
        }

        this.freeBallQueue.shift(); // Remove from queue

        const cfg = CONFIG.MAGAZINE;
        // Target is the bottom slot position (slot index = remaining - 1)
        // This is where the ball will appear before the reload animation shifts everything up
        const targetSlot = Math.max(0, this.remaining - 1);
        const targetY = this.y + targetSlot * cfg.spacing;

        this.returnBall = {
            y: this.y + this.total * cfg.spacing + 60, // Start below magazine
            targetY: targetY,
            targetSlot: targetSlot,  // Track which slot we're targeting
            startTime: performance.now(),
            phase: 'rising',        // 'rising' -> 'fading' -> 'complete'
            fadeProgress: 0,        // 0 = green, 1 = gray
            settled: false          // Has the ball reached its slot?
        };
    }

    /**
     * Called when current ball animation phase completes
     */
    _completeCurrentFreeBall() {
        // Mark cannon as not ready so the bottom slot renders as a regular ball
        // (prevents the ball from disappearing during transition to reload)
        this.cannonReady = false;

        this.returnBall = null;

        // Start next free ball if any in queue
        this._startNextFreeBall();
    }

    reset() {
        this.remaining = this.total;
        this.returnBall = null;
        this.freeBallQueue = [];
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

        // Update return ball animation (ball rising from bottom, then fading)
        if (this.returnBall) {
            const now = performance.now();
            const elapsed = now - this.returnBall.startTime;

            if (this.returnBall.phase === 'rising') {
                // Phase 1: Ball rises from bottom to slot position (green)
                const riseDuration = 400; // ms
                const progress = Math.min(1, elapsed / riseDuration);

                // Ease out back (slight overshoot for bounce effect)
                const c1 = 1.70158;
                const c3 = c1 + 1;
                const eased = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);

                // Interpolate from start to target
                const startY = this.y + this.total * CONFIG.MAGAZINE.spacing + 60;
                this.returnBall.y = startY + (this.returnBall.targetY - startY) * eased;

                // Move to fading phase when rise completes
                if (progress >= 1) {
                    this.returnBall.phase = 'fading';
                    this.returnBall.startTime = now;
                    this.returnBall.settled = true;
                    // Play clack sound when ball reaches its slot
                    this._playClackSound(this.returnBall.targetSlot || this.remaining);
                }
            } else if (this.returnBall.phase === 'fading') {
                // Phase 2: Ball fades from green to gray
                const fadeDuration = 300; // ms
                const progress = Math.min(1, elapsed / fadeDuration);

                this.returnBall.fadeProgress = progress;

                // Complete this ball's animation when fade finishes
                if (progress >= 1) {
                    this._completeCurrentFreeBall();
                }
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

        // === RETURN BALL ANIMATION (rising from bottom, fading green to gray) ===
        if (this.returnBall) {
            const returnY = this.returnBall.y * scale;
            // Green amount: 1 while rising, fades to 0 during fading phase
            const greenAmount = this.returnBall.phase === 'rising'
                ? 1
                : 1 - this.returnBall.fadeProgress;
            this._renderBall(ctx, x, returnY, ballRadius, scale, greenAmount);
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
     * @param {number} greenAmount - 0 = normal ball, 1 = fully green (for free ball animation)
     */
    _renderBall(ctx, x, y, radius, scale, greenAmount = 0) {
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.12)';
        ctx.shadowBlur = 6 * scale;
        ctx.shadowOffsetY = 4 * scale;

        let borderColor, fillColor;

        if (greenAmount > 0) {
            // Parse normal ball colors from CONFIG and lerp to green
            // Normal ball uses CONFIG.COLORS.ballBorder and ballFill
            // Green ball: border #00AA22, fill #00DD44
            const normalBorder = this._parseColor(CONFIG.COLORS.ballBorder);
            const normalFill = this._parseColor(CONFIG.COLORS.ballFill);
            const greenBorder = { r: 0, g: 170, b: 34 };       // #00AA22
            const greenFill = { r: 0, g: 221, b: 68 };         // #00DD44

            const lerp = (a, b, t) => Math.round(a + (b - a) * t);

            const borderR = lerp(normalBorder.r, greenBorder.r, greenAmount);
            const borderG = lerp(normalBorder.g, greenBorder.g, greenAmount);
            const borderB = lerp(normalBorder.b, greenBorder.b, greenAmount);

            const fillR = lerp(normalFill.r, greenFill.r, greenAmount);
            const fillG = lerp(normalFill.g, greenFill.g, greenAmount);
            const fillB = lerp(normalFill.b, greenFill.b, greenAmount);

            borderColor = `rgb(${borderR}, ${borderG}, ${borderB})`;
            fillColor = `rgb(${fillR}, ${fillG}, ${fillB})`;
        } else {
            // Normal ball - use CONFIG colors directly
            borderColor = CONFIG.COLORS.ballBorder;
            fillColor = CONFIG.COLORS.ballFill;
        }

        // Outer ring (border)
        ctx.beginPath();
        ctx.arc(x, y, radius + 2 * scale, 0, Math.PI * 2);
        ctx.fillStyle = borderColor;
        ctx.fill();

        // Clear shadow for inner ball
        ctx.shadowColor = 'transparent';

        // Inner ball
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();

        // Glow effect when ball is green
        if (greenAmount > 0.1) {
            ctx.shadowColor = `rgba(0, 255, 85, ${greenAmount * 0.6})`;
            ctx.shadowBlur = 15 * scale * greenAmount;
            ctx.beginPath();
            ctx.arc(x, y, radius + 1 * scale, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 255, 85, ${greenAmount * 0.8})`;
            ctx.lineWidth = 2 * scale;
            ctx.stroke();
            ctx.shadowColor = 'transparent';
        }
    }

    /**
     * Parse a hex color string to RGB object
     */
    _parseColor(hex) {
        // Handle shorthand hex (#FFF)
        if (hex.length === 4) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }
}
