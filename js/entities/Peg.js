/**
 * Peg entity - crisp dark circles, with orange/blue Peggle-style types
 */

class Peg {
    constructor(x, y, radius, isGuideRow = false, pegType = 'blue') {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.isGuideRow = isGuideRow; // Bottom row is lighter
        this.pegType = pegType;       // 'blue', 'orange', or 'green'
        this.isHit = false;           // Whether peg has been hit this round
        this.hitTime = 0;             // When the peg was hit (for fade animation)
        this.lastHitTime = 0;
    }
    
    /**
     * Render the peg - clean, crisp circles with orange/blue types
     * Pop animation: scale up + flash, then shrink away
     */
    render(ctx, scale) {
        const x = this.x * scale;
        const y = this.y * scale;
        const baseR = this.radius * scale;
        const now = performance.now();

        let r = baseR;
        let alpha = 1;
        let flashIntensity = 0;

        // Handle burning animation (fireball effect)
        if (this.isBurning && this.burnStartTime) {
            const burnDuration = 400;
            const burnAge = now - this.burnStartTime;
            const burnProgress = Math.min(1, burnAge / burnDuration);

            ctx.save();

            // Peg shrinks as it burns
            const shrinkFactor = 1 - burnProgress * 0.5;
            r = baseR * shrinkFactor;

            // Flickering flame effect
            const flicker = Math.sin(now * 0.03 + this.x * 0.1) * 0.3 + 0.7;

            // Outer flame glow
            ctx.shadowColor = '#FF4500';
            ctx.shadowBlur = (25 + flicker * 15) * scale;

            // Draw flame circles around the peg
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + now * 0.01;
                const dist = r * 0.7;
                const flameX = x + Math.cos(angle) * dist;
                const flameY = y + Math.sin(angle) * dist - 8 * scale * flicker;
                const flameSize = (8 + flicker * 4) * scale * (1 - burnProgress * 0.3);

                ctx.globalAlpha = 0.8 * (1 - burnProgress * 0.5);
                ctx.fillStyle = i % 2 === 0 ? '#FF4500' : '#FFD700';
                ctx.beginPath();
                ctx.arc(flameX, flameY, flameSize, 0, Math.PI * 2);
                ctx.fill();
            }

            // Rising smoke
            ctx.globalAlpha = 0.4 * (1 - burnProgress);
            ctx.fillStyle = '#666';
            for (let i = 0; i < 3; i++) {
                const smokeY = y - r - (burnProgress * 30 + i * 10) * scale;
                const smokeX = x + Math.sin(now * 0.005 + i) * 8 * scale;
                ctx.beginPath();
                ctx.arc(smokeX, smokeY, (5 + i * 2) * scale, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

            // Draw the charring peg
            const charLevel = burnProgress * 0.8;
            const baseColor = this.pegType === 'orange' ? [255, 107, 0] : [60, 60, 60];
            const charR = Math.round(baseColor[0] * (1 - charLevel));
            const charG = Math.round(baseColor[1] * (1 - charLevel));
            const charB = Math.round(baseColor[2] * (1 - charLevel));

            ctx.beginPath();
            ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
            ctx.fillStyle = `rgb(${charR}, ${charG}, ${charB})`;
            ctx.fill();

            ctx.restore();
            return; // Don't render normal peg
        }

        // Handle pop animation for hit pegs
        if (this.isHit) {
            const elapsed = now - this.hitTime;
            const popDuration = 80;   // Scale up phase
            const shrinkDuration = 200; // Shrink away phase
            const totalDuration = popDuration + shrinkDuration;

            if (elapsed >= totalDuration) return; // Animation complete, don't render

            ctx.save();

            if (elapsed < popDuration) {
                // Phase 1: Pop up + flash
                const popProgress = elapsed / popDuration;
                // Ease out for snappy feel
                const eased = 1 - Math.pow(1 - popProgress, 2);
                r = baseR * (1 + 0.5 * eased); // Scale up to 1.5x
                flashIntensity = 1 - popProgress; // Bright flash that fades
                alpha = 1;
            } else {
                // Phase 2: Shrink away + fade
                const shrinkProgress = (elapsed - popDuration) / shrinkDuration;
                // Ease in for smooth vanish
                const eased = shrinkProgress * shrinkProgress;
                r = baseR * 1.5 * (1 - eased); // Shrink from 1.5x to 0
                alpha = 1 - eased;
                flashIntensity = 0;
            }

            ctx.globalAlpha = alpha;
        }

        // Determine base color based on peg type
        let fillColor;
        let glowColor = null;
        if (this.pegType === 'orange') {
            fillColor = '#FF6B00';
        } else if (this.pegType === 'green') {
            fillColor = '#00DD44';
            glowColor = '#00FF55';
        } else {
            fillColor = CONFIG.COLORS.peg;
        }

        // Green peg glow effect (pulsing)
        if (glowColor && !this.isHit) {
            const pulse = Math.sin(now * 0.004) * 0.3 + 0.7; // Gentle pulse
            ctx.save();
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = (12 + pulse * 6) * (scale || 1);
            ctx.beginPath();
            ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
            ctx.fillStyle = fillColor;
            ctx.fill();
            ctx.restore();
        } else {
            // Draw the peg
            ctx.beginPath();
            ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);

            // Apply flash effect (blend toward white/bright)
            if (flashIntensity > 0 && this.isHit) {
                if (this.pegType === 'orange') {
                    // Flash to bright yellow-orange
                    const flashR = Math.round(255);
                    const flashG = Math.round(200 + 55 * flashIntensity);
                    const flashB = Math.round(100 * flashIntensity);
                    ctx.fillStyle = `rgb(${flashR}, ${flashG}, ${flashB})`;
                } else if (this.pegType === 'green') {
                    // Flash to bright cyan-green
                    const flashR = Math.round(100 * flashIntensity);
                    const flashG = Math.round(255);
                    const flashB = Math.round(150 + 100 * flashIntensity);
                    ctx.fillStyle = `rgb(${flashR}, ${flashG}, ${flashB})`;
                } else {
                    // Flash to light gray/white
                    const gray = Math.round(150 + 105 * flashIntensity);
                    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
                }
            } else {
                ctx.fillStyle = fillColor;
            }

            ctx.fill();
        }

        // Orange peg border (only when not hit)
        if (this.pegType === 'orange' && !this.isHit) {
            ctx.strokeStyle = '#FF8C00';
            ctx.lineWidth = 1.5 * scale;
            ctx.stroke();
        }

        // Green peg border (only when not hit)
        if (this.pegType === 'green' && !this.isHit) {
            ctx.strokeStyle = '#00FF66';
            ctx.lineWidth = 1.5 * scale;
            ctx.stroke();
        }

        if (this.isHit) {
            ctx.restore();
        }
    }
}

/**
 * Create all pegs in the offset grid pattern
 */
function createPegs() {
    const pegs = [];
    const config = CONFIG.PEGS;
    const board = CONFIG.BOARD;
        const innerInset = board.innerInset || 0;
        const innerLeft = board.marginX + innerInset;
        const innerRight = innerLeft + (board.width - innerInset * 2);
        const chevronInset = board.chevronDepth * 0.9;
        const barrierLeft = innerLeft + chevronInset;
        const barrierRight = innerRight - chevronInset;
        const effectiveWidth = Math.max(0, barrierRight - barrierLeft);
        const minClearance = CONFIG.BALL.radius + 10; // keep at least one ball+margin from bumpers

        const getRowStart = (pegsInRow) => {
            const arrangementWidth = (pegsInRow - 1) * config.horizontalGap;
            const usableWidth = Math.max(0, effectiveWidth - minClearance * 2);
            const extra = Math.max(0, usableWidth - arrangementWidth);
            return barrierLeft + minClearance + extra / 2;
        };
    
    for (let row = 0; row < config.rows; row++) {
        const isOddRow = row % 2 === 0;
        const pegsInRow = isOddRow ? config.pegsPerRowOdd : config.pegsPerRowEven;
            const rowStart = getRowStart(pegsInRow);
        const isGuideRow = row === config.rows - 1; // Last row is guide row
        
        for (let col = 0; col < pegsInRow; col++) {
            const x = rowStart + col * config.horizontalGap;
            const y = config.startY + row * config.verticalGap;

            pegs.push(new Peg(x, y, config.radius, isGuideRow, 'blue'));
        }
    }

    return pegs;
}
