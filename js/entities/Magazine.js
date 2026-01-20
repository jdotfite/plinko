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
    }

    setTotal(count) {
        this.total = Math.max(1, Math.floor(count));
        this.remaining = Math.min(this.remaining, this.total);
    }

    setRemaining(count) {
        this.remaining = Math.max(0, Math.min(this.total, Math.floor(count)));
    }

    useShot() {
        if (this.remaining > 0) {
            this.remaining--;
            return true;
        }
        return false;
    }

    reset() {
        this.remaining = this.total;
    }

    render(ctx, scale) {
        const cfg = CONFIG.MAGAZINE;
        const ballRadius = cfg.ballRadius * scale;
        const spacing = cfg.spacing * scale;
        const x = this.x * scale;
        const startY = this.y * scale;

        // Slot dimensions
        const slotWidth = ballRadius * 2.6;
        const slotHeight = (this.total - 1) * spacing + ballRadius * 2 + 10 * scale;
        const slotRadius = slotWidth / 2; // Rounded ends (stadium shape)
        const slotX = x - slotWidth / 2;
        const slotY = startY - ballRadius - 5 * scale;

        ctx.save();

        // === SLOT WELL (light background) ===
        ctx.fillStyle = CONFIG.COLORS.playfield || '#ffffff';
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, slotRadius);
        ctx.fill();

        // === COINS/BALLS FIRST (matching the game ball style) ===
        // Balls removed from bottom, so remaining balls fill from top down
        for (let i = 0; i < this.total; i++) {
            const isRemaining = i < this.remaining;
            const yPos = startY + i * spacing;

            if (isRemaining) {
                // Match the Ball entity render style exactly
                // Shadow
                ctx.shadowColor = 'rgba(0,0,0,0.12)';
                ctx.shadowBlur = 6 * scale;
                ctx.shadowOffsetY = 4 * scale;

                // Outer ring (border) - matches CONFIG.COLORS.ballBorder
                ctx.beginPath();
                ctx.arc(x, yPos, ballRadius + 2 * scale, 0, Math.PI * 2);
                ctx.fillStyle = CONFIG.COLORS.ballBorder;
                ctx.fill();

                // Clear shadow for inner ball
                ctx.shadowColor = 'transparent';

                // Inner ball - matches CONFIG.COLORS.ballFill
                ctx.beginPath();
                ctx.arc(x, yPos, ballRadius, 0, Math.PI * 2);
                ctx.fillStyle = CONFIG.COLORS.ballFill;
                ctx.fill();
            }
        }

        // === SHADOW OVERLAY ON TOP OF COINS ===
        // Left edge shadow
        const leftShadow = ctx.createLinearGradient(slotX, slotY, slotX + slotWidth * 0.4, slotY);
        leftShadow.addColorStop(0, 'rgba(0,0,0,0.15)');
        leftShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = leftShadow;
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, slotRadius);
        ctx.fill();

        // Right edge shadow
        const rightShadow = ctx.createLinearGradient(slotX + slotWidth, slotY, slotX + slotWidth * 0.6, slotY);
        rightShadow.addColorStop(0, 'rgba(0,0,0,0.15)');
        rightShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rightShadow;
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, slotRadius);
        ctx.fill();

        // Top inner shadow (depth at top)
        const topShadow = ctx.createLinearGradient(slotX, slotY, slotX, slotY + 30 * scale);
        topShadow.addColorStop(0, 'rgba(0,0,0,0.12)');
        topShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = topShadow;
        ctx.beginPath();
        ctx.roundRect(slotX, slotY, slotWidth, slotHeight, slotRadius);
        ctx.fill();

        // Bottom inner shadow
        const bottomShadow = ctx.createLinearGradient(slotX, slotY + slotHeight, slotX, slotY + slotHeight - 25 * scale);
        bottomShadow.addColorStop(0, 'rgba(0,0,0,0.1)');
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

        // === COIN COUNT BADGE ===
        const countY = slotY + slotHeight + 12 * scale;
        const countText = String(this.remaining);

        // Badge background (small recessed pill)
        const badgeWidth = 32 * scale;
        const badgeHeight = 20 * scale;
        const badgeX = x - badgeWidth / 2;
        const badgeY = countY - badgeHeight / 2;

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
        ctx.fill();

        // Inner shadow for recessed look
        const badgeShadow = ctx.createLinearGradient(badgeX, badgeY, badgeX, badgeY + badgeHeight * 0.5);
        badgeShadow.addColorStop(0, 'rgba(0,0,0,0.06)');
        badgeShadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = badgeShadow;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = 'rgba(0,0,0,0.06)';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
        ctx.stroke();

        // Count text
        ctx.fillStyle = '#333';
        ctx.font = `bold ${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(countText, x, countY);

        ctx.restore();
    }
}
