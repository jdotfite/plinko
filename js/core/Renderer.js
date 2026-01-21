/**
 * Renderer - handles all canvas drawing
 */

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = 1;

        // Offscreen canvas for static elements
        this.staticCanvas = document.createElement('canvas');
        this.staticCtx = this.staticCanvas.getContext('2d');
        this.staticDirty = true;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Handle canvas resize
     */
    resize() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate scale to fit 9:16 aspect ratio
        const targetAspect = CONFIG.TARGET_WIDTH / CONFIG.TARGET_HEIGHT;
        const containerAspect = containerWidth / containerHeight;

        let canvasWidth, canvasHeight;

        if (containerAspect > targetAspect) {
            // Container is wider - fit to height
            canvasHeight = containerHeight;
            canvasWidth = canvasHeight * targetAspect;
        } else {
            // Container is taller - fit to width
            canvasWidth = containerWidth;
            canvasHeight = canvasWidth / targetAspect;
        }

        // Set canvas size
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        this.canvas.style.width = `${canvasWidth}px`;
        this.canvas.style.height = `${canvasHeight}px`;

        // Calculate scale
        this.scale = canvasWidth / CONFIG.TARGET_WIDTH;

        // Resize static canvas
        this.staticCanvas.width = canvasWidth;
        this.staticCanvas.height = canvasHeight;
        this.staticDirty = true;

        // Reposition HUD elements
        if (typeof window.positionHUD === 'function') {
            setTimeout(window.positionHUD, 0);
        }
    }

    /**
     * Render static elements (board, pegs, slots, dividers) to offscreen canvas
     */
    renderStatic(board, pegs, slots, slotDividers) {
        if (!this.staticDirty) return;

        const ctx = this.staticCtx;
        const scale = this.scale;

        // Clear
        ctx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

        // Background - pure white
        ctx.fillStyle = CONFIG.COLORS.background;
        ctx.fillRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

        // Board playfield (inner area) - FIRST
        board.renderPlayfield(ctx, scale);

        // Slots - COMMENTED OUT for Peggle-style gameplay
        // for (const slot of slots) {
        //     slot.render(ctx, scale);
        // }

        // Pegs are now rendered dynamically (not on static canvas)
        // so they can fade out when hit

        // Board outer frame
        board.renderFrame(ctx, scale);

        // Slot dividers - COMMENTED OUT for Peggle-style gameplay
        // if (slotDividers) {
        //     for (const divider of slotDividers) {
        //         divider.render(ctx, scale);
        //     }
        // }

        this.staticDirty = false;
    }

    /**
     * Clear the main canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Render a frame
     */
    render(game) {
        const ctx = this.ctx;
        const scale = this.scale;

        // Re-render static elements if needed (e.g., theme change)
        if (this.staticDirty) {
            this.renderStatic(game.board, game.pegs, game.slots, game.slotDividers);
        }

        ctx.save();

        // Apply screen shake offset
        if (game.shakeOffsetX || game.shakeOffsetY) {
            ctx.translate(game.shakeOffsetX * scale, game.shakeOffsetY * scale);
        }

        // Extreme Fever camera effect (zoom towards last orange peg)
        if (game.extremeFever && game.extremeFeverTarget) {
            const elapsed = performance.now() - game.extremeFeverStart;
            const progress = Math.min(1, elapsed / CONFIG.PEGGLE.feverDuration);
            // Smooth ease-in-out zoom using sine curve
            const zoomProgress = Math.sin(progress * Math.PI);
            const zoom = 1 + (CONFIG.PEGGLE.feverZoom - 1) * zoomProgress;

            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            const targetX = game.extremeFeverTarget.x * scale;
            const targetY = game.extremeFeverTarget.y * scale;

            // Zoom towards target
            ctx.translate(centerX, centerY);
            ctx.scale(zoom, zoom);
            ctx.translate(-centerX - (targetX - centerX) * zoomProgress * 0.3, -centerY - (targetY - centerY) * zoomProgress * 0.3);
        }

        // Draw static elements from offscreen canvas
        ctx.drawImage(this.staticCanvas, 0, 0);

        // Winning slot highlight - COMMENTED OUT for Peggle-style gameplay
        // for (const slot of game.slots) {
        //     if (slot.isWinner) {
        //         slot.render(ctx, scale);
        //     }
        // }

        // Render pegs on top to ensure visibility (including fade animation)
        for (const peg of game.pegs) {
            peg.render(ctx, scale);
        }

        // Render trajectory preview when aiming/charging
        if (game.state === CONFIG.STATES.AIMING || game.state === CONFIG.STATES.CHARGING) {
            this.renderTrajectory(game, scale);
        }

        // Update and render particle system (flakes/sparks) behind balls so particles sit under tokens
        try {
            if (window.particleSystem && typeof window.particleSystem.update === 'function') {
                window.particleSystem.update();
            }
            if (window.particleSystem && typeof window.particleSystem.render === 'function') {
                window.particleSystem.render(ctx, scale);
            }
        } catch (e) {}

        // Render moving goal mouth OR fever slots during Extreme Fever
        if (game.extremeFever && game.feverSlots && game.feverSlots.active) {
            game.feverSlots.render(ctx, scale);
        } else if (game.goalMouth) {
            game.goalMouth.render(ctx, scale);
        }

        // Render all active/landed balls
        if (game.balls && game.balls.length > 0) {
            for (const b of game.balls) {
                b.render(ctx, scale);
            }
        }

        // Render score popups
        this.renderScorePopups(game, scale);

        // Render cannon on top
        this.renderCannon(game, scale);

        ctx.restore();

        // Render magazines OUTSIDE the fever zoom effect (fixed UI position)
        this.renderMagazines(game, scale);
    }

    renderCannon(game, scale) {
        if (!game.cannon) return;
        const ctx = this.ctx;
        const cfg = CONFIG.CANNON;
        const x = game.cannon.x * scale;
        const y = game.cannon.y * scale;
        const angle = game.aimAngle || (Math.PI / 2);

        const ringOuter = cfg.ringOuterRadius * scale;
        const ringInner = cfg.ringInnerRadius * scale;
        const barrelLength = cfg.barrelLength * scale;
        const barrelBase = cfg.barrelWidthBase * scale;
        const barrelTip = cfg.barrelWidthTip * scale;

        ctx.save();
        ctx.translate(x, y);

        // === BARREL (rotating, drawn first so ring covers pivot) ===
        ctx.save();
        ctx.rotate(angle - Math.PI / 2); // PI/2 = pointing down

        // === LOADED BALL (drawn first, behind barrel) ===
        const canShoot = game.state === CONFIG.STATES.IDLE ||
                         game.state === CONFIG.STATES.AIMING ||
                         game.state === CONFIG.STATES.CHARGING;
        const currentMag = game.magazines && game.magazines[game.currentPlayerIndex];
        const hasShots = currentMag && currentMag.remaining > 0;
        // Only show loaded ball after cannon_loading animation completes
        const cannonReady = currentMag && currentMag.cannonReady;

        if (canShoot && hasShots && cannonReady && !game.matchOver) {
            const ballRadius = CONFIG.BALL.radius * scale * 0.85;
            const ballY = barrelLength - 6 * scale; // Inside barrel, barely visible

            // Ball shadow
            ctx.shadowColor = 'rgba(0,0,0,0.15)';
            ctx.shadowBlur = 6 * scale;
            ctx.shadowOffsetY = 3 * scale;

            // Ball border
            ctx.beginPath();
            ctx.arc(0, ballY, ballRadius + 2 * scale, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.COLORS.ballBorder;
            ctx.fill();

            // Ball fill
            ctx.shadowColor = 'transparent';
            ctx.beginPath();
            ctx.arc(0, ballY, ballRadius, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.COLORS.ballFill;
            ctx.fill();

            // Subtle highlight
            ctx.beginPath();
            ctx.arc(-ballRadius * 0.3, ballY - ballRadius * 0.3, ballRadius * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fill();
        }

        // Barrel shadow
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 10 * scale;
        ctx.shadowOffsetY = 5 * scale;

        // Barrel gradient (cylinder shading)
        const barrelGrad = ctx.createLinearGradient(-barrelBase / 2, 0, barrelBase / 2, 0);
        barrelGrad.addColorStop(0, '#d4d4d4');
        barrelGrad.addColorStop(0.2, '#f4f4f4');
        barrelGrad.addColorStop(0.45, '#ffffff');
        barrelGrad.addColorStop(0.55, '#ffffff');
        barrelGrad.addColorStop(0.8, '#f4f4f4');
        barrelGrad.addColorStop(1, '#d4d4d4');

        ctx.fillStyle = barrelGrad;

        // Draw tapered barrel - starts from behind ring center, extends outward
        ctx.beginPath();
        ctx.moveTo(-barrelBase / 2, -ringInner * 0.5); // Start behind ring
        ctx.lineTo(-barrelBase / 2, barrelLength * 0.3); // Straight section
        ctx.quadraticCurveTo(
            -barrelBase / 2, barrelLength * 0.7,
            -barrelTip / 2, barrelLength
        ); // Taper to tip
        ctx.lineTo(barrelTip / 2, barrelLength); // Flat tip
        ctx.quadraticCurveTo(
            barrelBase / 2, barrelLength * 0.7,
            barrelBase / 2, barrelLength * 0.3
        ); // Taper from tip
        ctx.lineTo(barrelBase / 2, -ringInner * 0.5); // Straight section
        ctx.closePath();
        ctx.fill();

        // Clear shadow for details
        ctx.shadowColor = 'transparent';

        // Barrel left highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(-barrelBase / 2 + 3 * scale, ringInner * 0.5);
        ctx.lineTo(-barrelBase / 2 + 3 * scale, barrelLength * 0.3);
        ctx.quadraticCurveTo(
            -barrelBase / 2 + 3 * scale, barrelLength * 0.7,
            -barrelTip / 2 + 3 * scale, barrelLength - 2 * scale
        );
        ctx.stroke();

        // Barrel right shadow edge
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.moveTo(barrelBase / 2 - 2 * scale, ringInner * 0.5);
        ctx.lineTo(barrelBase / 2 - 2 * scale, barrelLength * 0.3);
        ctx.quadraticCurveTo(
            barrelBase / 2 - 2 * scale, barrelLength * 0.7,
            barrelTip / 2 - 2 * scale, barrelLength - 2 * scale
        );
        ctx.stroke();

        // Muzzle end - slight rim
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.moveTo(-barrelTip / 2, barrelLength);
        ctx.lineTo(barrelTip / 2, barrelLength);
        ctx.stroke();

        // Muzzle highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.moveTo(-barrelTip / 2 + 2 * scale, barrelLength - 1 * scale);
        ctx.lineTo(barrelTip / 2 - 2 * scale, barrelLength - 1 * scale);
        ctx.stroke();

        ctx.restore();

        // === RING (stationary, on top) ===
        // Ring shadow
        ctx.shadowColor = 'rgba(0,0,0,0.22)';
        ctx.shadowBlur = 12 * scale;
        ctx.shadowOffsetY = 6 * scale;

        // Ring body (donut shape)
        const ringGrad = ctx.createRadialGradient(0, 0, ringInner, 0, 0, ringOuter);
        ringGrad.addColorStop(0, '#e8e8e8');
        ringGrad.addColorStop(0.3, '#ffffff');
        ringGrad.addColorStop(0.7, '#ffffff');
        ringGrad.addColorStop(1, '#e0e0e0');

        ctx.fillStyle = ringGrad;
        ctx.beginPath();
        ctx.arc(0, 0, ringOuter, 0, Math.PI * 2); // Outer circle
        ctx.arc(0, 0, ringInner, 0, Math.PI * 2, true); // Inner hole (counter-clockwise)
        ctx.closePath();
        ctx.fill();

        // Clear shadow for details
        ctx.shadowColor = 'transparent';

        // Inner hole - dark to show depth
        const holeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, ringInner);
        holeGrad.addColorStop(0, '#2a2a2a');
        holeGrad.addColorStop(0.7, '#1a1a1a');
        holeGrad.addColorStop(1, '#333333');
        ctx.fillStyle = holeGrad;
        ctx.beginPath();
        ctx.arc(0, 0, ringInner - 1 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Ring outer highlight (top-left)
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2.5 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, ringOuter - 2 * scale, Math.PI * 0.8, Math.PI * 1.4);
        ctx.stroke();

        // Ring outer shadow (bottom-right)
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, ringOuter - 2 * scale, Math.PI * 0.0, Math.PI * 0.4);
        ctx.stroke();

        // Inner hole highlight (shows rim depth)
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, ringInner + 2 * scale, Math.PI * 0.8, Math.PI * 1.4);
        ctx.stroke();

        // Outer edge definition
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.arc(0, 0, ringOuter, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    renderScorePopups(game, scale) {
        if (!game.scorePopups || game.scorePopups.length === 0) return;
        const ctx = this.ctx;
        const now = performance.now();

        for (const p of game.scorePopups) {
            const age = now - p.birth;

            // Lightning effect
            if (p.isLightning) {
                if (age > 300) continue;
                const alpha = 1 - age / 300;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 3 * scale;
                ctx.shadowColor = '#00FFFF';
                ctx.shadowBlur = 15 * scale;
                ctx.beginPath();
                ctx.moveTo(p.fromX * scale, p.fromY * scale);
                // Jagged lightning path
                const dx = p.x - p.fromX;
                const dy = p.y - p.fromY;
                for (let i = 1; i <= 4; i++) {
                    const t = i / 5;
                    const jx = p.fromX + dx * t + (Math.random() - 0.5) * 30;
                    const jy = p.fromY + dy * t + (Math.random() - 0.5) * 30;
                    ctx.lineTo(jx * scale, jy * scale);
                }
                ctx.lineTo(p.x * scale, p.y * scale);
                ctx.stroke();
                ctx.restore();
                continue;
            }

            // Explosion effect
            if (p.isExplosion) {
                if (age > 400) continue;
                const progress = age / 400;
                const radius = p.radius * progress * scale;
                const alpha = 1 - progress;
                ctx.save();
                ctx.globalAlpha = alpha;
                // Expanding ring
                ctx.strokeStyle = '#FF5722';
                ctx.lineWidth = (8 - progress * 6) * scale;
                ctx.shadowColor = '#FF5722';
                ctx.shadowBlur = 20 * scale;
                ctx.beginPath();
                ctx.arc(p.x * scale, p.y * scale, radius, 0, Math.PI * 2);
                ctx.stroke();
                // Inner flash
                if (progress < 0.3) {
                    ctx.fillStyle = `rgba(255, 200, 100, ${(0.3 - progress) * 2})`;
                    ctx.beginPath();
                    ctx.arc(p.x * scale, p.y * scale, radius * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
                continue;
            }

            // Spooky respawn effect
            if (p.isSpookyRespawn) {
                if (age > 500) continue;
                const progress = age / 500;
                const alpha = 1 - progress;
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#9B59B6';
                ctx.shadowColor = '#9B59B6';
                ctx.shadowBlur = 25 * scale;
                // Swirling particles
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2 + progress * Math.PI;
                    const dist = 30 * progress * scale;
                    const px = p.x * scale + Math.cos(angle) * dist;
                    const py = p.y * scale + Math.sin(angle) * dist;
                    ctx.beginPath();
                    ctx.arc(px, py, 4 * scale * (1 - progress), 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
                continue;
            }

            // Free Ball popup
            if (p.isFreeBall) {
                const duration = 1200;
                if (age > duration) continue;
                const progress = age / duration;
                const floatDist = 60;
                const y = p.y - floatDist * progress;
                const alpha = 1 - progress * 0.7;
                const bounceScale = 1 + Math.sin(progress * Math.PI * 2) * 0.1 * (1 - progress);

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.font = `bold ${18 * scale * bounceScale}px system-ui, -apple-system, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = '#00AA44';
                ctx.shadowBlur = 12 * scale;
                ctx.strokeStyle = '#005522';
                ctx.lineWidth = 4 * scale;
                ctx.strokeText('FREE BALL!', p.x * scale, y * scale);
                ctx.fillStyle = '#00FF66';
                ctx.fillText('FREE BALL!', p.x * scale, y * scale);
                // Also show bonus points below
                ctx.font = `bold ${14 * scale}px system-ui`;
                ctx.strokeText(`+${p.value}`, p.x * scale, (y + 20) * scale);
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText(`+${p.value}`, p.x * scale, (y + 20) * scale);
                ctx.restore();
                continue;
            }

            const duration = p.isPowerUp ? 1400 : (p.isStyleBonus ? 1200 : (p.isFeverBonus ? 1500 : 800));
            if (age > duration) continue;

            const progress = age / duration;
            const floatDist = p.isPowerUp ? 70 : (p.isStyleBonus ? 60 : (p.isFeverBonus ? 80 : 40));
            const y = p.y - (floatDist * progress); // Float upward
            const alpha = 1 - progress;

            ctx.save();
            ctx.globalAlpha = alpha;

            if (p.isPowerUp) {
                // Power-up popup - green glow, dramatic
                const bounceScale = 1 + Math.sin(progress * Math.PI * 3) * 0.12 * (1 - progress);
                const pulse = Math.sin(now * 0.01) * 0.1 + 1;

                // Power-up name (e.g., "MULTIBALL", "FIREBALL")
                ctx.font = `bold ${18 * scale * bounceScale}px system-ui, -apple-system, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowColor = '#00FF55';
                ctx.shadowBlur = 15 * scale * pulse;
                ctx.strokeStyle = '#005500';
                ctx.lineWidth = 4 * scale;
                ctx.strokeText(p.powerUpName, p.x * scale, (y - 15) * scale);
                ctx.fillStyle = '#00FF55';
                ctx.fillText(p.powerUpName, p.x * scale, (y - 15) * scale);

                // Points value
                ctx.font = `bold ${22 * scale * bounceScale}px system-ui, -apple-system, sans-serif`;
                ctx.shadowBlur = 10 * scale;
                ctx.strokeStyle = '#005500';
                ctx.lineWidth = 4 * scale;
                ctx.strokeText(`+${p.value}`, p.x * scale, (y + 10) * scale);
                ctx.fillStyle = '#00FF55';
                ctx.fillText(`+${p.value}`, p.x * scale, (y + 10) * scale);
            } else if (p.isFeverBonus) {
                // Fever bonus popup - huge, rainbow/gold, dramatic
                const bounceScale = 1 + Math.sin(progress * Math.PI * 4) * 0.15 * (1 - progress);
                const hue = (now * 0.2) % 360;

                // "FEVER BONUS" label
                ctx.font = `bold ${16 * scale * bounceScale}px system-ui, -apple-system, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 4 * scale;
                ctx.strokeText('FEVER BONUS', p.x * scale, (y - 18) * scale);
                ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
                ctx.fillText('FEVER BONUS', p.x * scale, (y - 18) * scale);

                // Points value - large and bold
                const valueStr = p.value >= 1000 ? `+${Math.round(p.value / 1000)}K` : `+${p.value}`;
                ctx.font = `bold ${32 * scale * bounceScale}px system-ui, -apple-system, sans-serif`;
                ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                ctx.shadowBlur = 20 * scale;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 5 * scale;
                ctx.strokeText(valueStr, p.x * scale, (y + 12) * scale);
                ctx.fillStyle = '#FFD700';
                ctx.fillText(valueStr, p.x * scale, (y + 12) * scale);
            } else if (p.isStyleBonus) {
                // Style bonus popup - larger, golden, with name
                const bounceScale = 1 + Math.sin(progress * Math.PI * 3) * 0.1 * (1 - progress);

                // Bonus name (e.g., "LONG SHOT")
                ctx.font = `bold ${14 * scale * bounceScale}px system-ui, -apple-system, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.strokeStyle = '#8B6914';
                ctx.lineWidth = 3 * scale;
                ctx.strokeText(p.bonusName, p.x * scale, (y - 12) * scale);
                ctx.fillStyle = '#FFD700';
                ctx.fillText(p.bonusName, p.x * scale, (y - 12) * scale);

                // Points value
                ctx.font = `bold ${22 * scale * bounceScale}px system-ui, -apple-system, sans-serif`;
                ctx.strokeStyle = '#8B6914';
                ctx.lineWidth = 4 * scale;
                ctx.strokeText(`+${p.value}`, p.x * scale, (y + 8) * scale);
                ctx.fillStyle = '#FFD700';
                ctx.fillText(`+${p.value}`, p.x * scale, (y + 8) * scale);
            } else {
                // Regular score popup
                ctx.font = `bold ${18 * scale}px system-ui, -apple-system, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Orange pegs get orange text
                const textColor = p.isOrange ? '#FF6B00' : '#fff';
                const strokeColor = p.isOrange ? '#8B3800' : '#000';

                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 3 * scale;
                ctx.strokeText(`+${p.value}`, p.x * scale, y * scale);
                ctx.fillStyle = textColor;
                ctx.fillText(`+${p.value}`, p.x * scale, y * scale);
            }
            ctx.restore();
        }
    }

    renderMagazines(game, scale) {
        if (!game.magazines) return;
        const ctx = this.ctx;

        // Determine if cannon has a loaded ball (for current player only)
        const canShoot = game.state === CONFIG.STATES.IDLE ||
                         game.state === CONFIG.STATES.AIMING ||
                         game.state === CONFIG.STATES.CHARGING;

        for (let i = 0; i < game.magazines.length; i++) {
            // Hide P2 magazine in single player mode
            if (i === 1 && !game.twoPlayerMode) continue;

            const mag = game.magazines[i];
            const isCurrentPlayer = i === game.currentPlayerIndex;

            // Current player's magazine reserves bottom slot for cannon ball
            const cannonLoaded = isCurrentPlayer && canShoot && mag.cannonReady &&
                                 mag.remaining > 0 && !game.matchOver;

            mag.render(ctx, scale, cannonLoaded);
        }
    }

    renderTrajectory(game, scale) {
        if (!game || typeof game.getTrajectoryPoints !== 'function') return;
        const pts = game.getTrajectoryPoints();
        if (!pts || pts.length === 0) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            ctx.beginPath();
            ctx.arc(p.x * scale, p.y * scale, 2 * scale, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /**
     * Get canvas-relative coordinates from event
     */
    getEventPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;

        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }

        // Convert to game coordinates
        return {
            x: (clientX - rect.left) / this.scale,
            y: (clientY - rect.top) / this.scale
        };
    }
}
