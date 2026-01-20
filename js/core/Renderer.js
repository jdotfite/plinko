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

        // Render moving goal mouth (clipped to playfield so bottom appears behind frame)
        if (game.goalMouth) {
            ctx.save();
            // Clip to playfield area - goal mouth bottom will be hidden behind frame
            ctx.beginPath();
            ctx.rect(
                game.board.innerLeft * scale,
                game.board.innerTop * scale,
                game.board.innerWidth * scale,
                game.board.innerHeight * scale
            );
            ctx.clip();
            game.goalMouth.render(ctx, scale);
            ctx.restore();
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
            const duration = p.isStyleBonus ? 1200 : 800;
            if (age > duration) continue;

            const progress = age / duration;
            const floatDist = p.isStyleBonus ? 60 : 40;
            const y = p.y - (floatDist * progress); // Float upward
            const alpha = 1 - progress;

            ctx.save();
            ctx.globalAlpha = alpha;

            if (p.isStyleBonus) {
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
        for (const mag of game.magazines) {
            mag.render(ctx, scale);
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
