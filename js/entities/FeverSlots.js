/**
 * FeverSlots - Score multiplier slots that appear during Extreme Fever
 * Replaces the goal mouth with 5 scoring zones: 10K, 50K, 100K, 50K, 10K
 */

class FeverSlots {
    constructor(board, opts = {}) {
        this.board = board;
        this.y = opts.y || (board.innerBottom - 150);
        this.active = false;

        // Slot configuration (values in points)
        this.slotValues = [10000, 50000, 100000, 50000, 10000];
        this.slotLabels = ['10K', '50K', '100K', '50K', '10K'];
        this.slotColors = ['#4a9eff', '#9b59b6', '#f1c40f', '#9b59b6', '#4a9eff'];

        // Calculate slot dimensions based on playfield width
        const innerWidth = board.innerRight - board.innerLeft;
        this.totalWidth = innerWidth * 0.85;
        this.slotWidth = this.totalWidth / 5;
        this.slotHeight = 70;
        this.startX = board.innerLeft + (innerWidth - this.totalWidth) / 2;

        // Animation
        this.appearTime = 0;
        this.pulsePhase = 0;
    }

    activate() {
        this.active = true;
        this.appearTime = performance.now();
    }

    deactivate() {
        this.active = false;
    }

    update(dt) {
        if (!this.active) return;
        this.pulsePhase += dt * 3;
    }

    /**
     * Check which slot a ball falls into
     * Returns { slotIndex, value, label } or null if missed
     */
    checkBallLanding(ball) {
        if (!this.active) return null;

        const bRadius = ball.radius || CONFIG.BALL.radius;
        const ballCenterX = ball.x;
        const ballBottom = ball.y + bRadius;

        // Check if ball is at slot level
        if (ballBottom < this.y || ball.y > this.y + this.slotHeight) {
            return null;
        }

        // Find which slot the ball center is in
        for (let i = 0; i < 5; i++) {
            const slotLeft = this.startX + i * this.slotWidth;
            const slotRight = slotLeft + this.slotWidth;

            if (ballCenterX >= slotLeft && ballCenterX <= slotRight) {
                return {
                    slotIndex: i,
                    value: this.slotValues[i],
                    label: this.slotLabels[i]
                };
            }
        }

        return null;
    }

    render(ctx, scale) {
        if (!this.active) return;

        const now = performance.now();
        const appearProgress = Math.min(1, (now - this.appearTime) / 500);
        const easeOut = 1 - Math.pow(1 - appearProgress, 3);

        ctx.save();

        // Animate slots sliding up
        const yOffset = (1 - easeOut) * 100;
        const y = (this.y + yOffset) * scale;

        for (let i = 0; i < 5; i++) {
            const slotX = (this.startX + i * this.slotWidth) * scale;
            const slotW = this.slotWidth * scale;
            const slotH = this.slotHeight * scale;

            // Pulse effect for center slot (100K)
            const pulse = i === 2 ? Math.sin(this.pulsePhase) * 0.1 + 1 : 1;
            const adjustedW = slotW * pulse;
            const adjustedX = slotX - (adjustedW - slotW) / 2;

            // Slot background with gradient
            const grad = ctx.createLinearGradient(adjustedX, y, adjustedX, y + slotH);
            const baseColor = this.slotColors[i];
            grad.addColorStop(0, this._lighten(baseColor, 30));
            grad.addColorStop(0.5, baseColor);
            grad.addColorStop(1, this._darken(baseColor, 20));

            // Glow effect
            ctx.shadowColor = baseColor;
            ctx.shadowBlur = (i === 2 ? 25 : 15) * scale * pulse;

            // Draw slot
            ctx.fillStyle = grad;
            ctx.beginPath();
            const radius = 12 * scale;
            ctx.roundRect(adjustedX + 2 * scale, y, adjustedW - 4 * scale, slotH, [radius, radius, 0, 0]);
            ctx.fill();

            // Inner highlight
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath();
            ctx.roundRect(adjustedX + 6 * scale, y + 4 * scale, adjustedW - 12 * scale, slotH * 0.4, [radius - 4, radius - 4, 0, 0]);
            ctx.fill();

            // Slot divider lines
            if (i < 4) {
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 2 * scale;
                ctx.beginPath();
                ctx.moveTo(slotX + slotW, y);
                ctx.lineTo(slotX + slotW, y + slotH);
                ctx.stroke();
            }

            // Value label
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${(i === 2 ? 22 : 18) * scale * pulse}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 4 * scale;
            ctx.fillText(this.slotLabels[i], adjustedX + adjustedW / 2, y + slotH * 0.45);

            // "FEVER" label on center slot
            if (i === 2 && easeOut > 0.8) {
                ctx.font = `bold ${10 * scale}px system-ui`;
                ctx.fillStyle = '#fff';
                ctx.fillText('FEVER', adjustedX + adjustedW / 2, y + slotH * 0.75);
            }
        }

        ctx.restore();
    }

    _lighten(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
        const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
        const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
        return `rgb(${r},${g},${b})`;
    }

    _darken(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
        const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
        const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
        return `rgb(${r},${g},${b})`;
    }
}
