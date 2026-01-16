/**
 * Prize Slot entity - modern bucket with inner shadow depth
 */

class Slot {
    constructor(x, y, width, height, value, index, isCenter = false, extraHeight = 0, totalSlots = 5) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.value = value;
        this.index = index;
        this.isCenter = isCenter; // Center bucket ($100) is emphasized
        this.extraHeight = extraHeight;
        this.totalSlots = totalSlots;
        this.isWinner = false;
        this.winAnimationStart = 0;
        this.label = '';
        this.landedCount = 0;
    }
    
    /**
     * Trigger win animation
     */
    triggerWin() {
        // Mark slot as winner and keep it highlighted permanently until reset()
        this.isWinner = true;
        this.winAnimationStart = 0;
    }
    
    /**
     * Reset slot state
     */
    reset() {
        this.isWinner = false;
        this.winAnimationStart = 0;
        this.landedCount = 0;
    }
    
    /**
     * Render the slot - simple rectangular card with subtle inner shadow depth
     */
    render(ctx, scale) {
        const slotConfig = CONFIG.SLOTS;
        const x = this.x * scale;
        const y = this.y * scale;
        const w = this.width * scale;
        const totalHeight = this.height * scale;
        const r = slotConfig.cornerRadius * scale;
        const shadowBlur = slotConfig.cardShadowBlur * scale;
        const shadowOffset = slotConfig.cardShadowOffset * scale;
        
        ctx.save();
        
        // If this slot is a winner, render a stable green highlight with no animation
        let isAnimating = false;
        let glowIntensity = 0;
        if (this.isWinner) {
            // Stable highlight: reduce shadow to a subtle outline
            ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
            ctx.shadowBlur = shadowBlur * 0.8;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = shadowOffset * 0.6;
        } else {
            // Normal shadow
            ctx.shadowColor = 'rgba(0, 0, 0, 0.18)';
            ctx.shadowBlur = shadowBlur * 1.3;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = shadowOffset * 1.2;
        }

        // Determine which corners should be rounded
        const isFirstSlot = this.index === 0;
        const isLastSlot = this.index === this.totalSlots - 1;
        const topLeftRadius = isFirstSlot ? r : 0;
        const topRightRadius = isLastSlot ? r : 0;

        // Rectangle with selective top corner rounding, square bottom corners
        ctx.beginPath();
        if (topLeftRadius > 0) {
            ctx.moveTo(x + topLeftRadius, y);
        } else {
            ctx.moveTo(x, y);
        }
        if (topRightRadius > 0) {
            ctx.lineTo(x + w - topRightRadius, y);
            ctx.arcTo(x + w, y, x + w, y + topRightRadius, topRightRadius);
            ctx.lineTo(x + w, y + totalHeight);
        } else {
            ctx.lineTo(x + w, y);
            ctx.lineTo(x + w, y + totalHeight);
        }
        ctx.lineTo(x, y + totalHeight);
        if (topLeftRadius > 0) {
            ctx.lineTo(x, y + topLeftRadius);
            ctx.arcTo(x, y, x + topLeftRadius, y, topLeftRadius);
        } else {
            ctx.lineTo(x, y);
        }
        ctx.closePath();

        if (this.isWinner) {
            // Lighter green background for winning slot (no flash)
            ctx.fillStyle = 'rgba(230, 255, 230, 0.92)';
        } else {
            ctx.fillStyle = CONFIG.COLORS.slotBackground;
        }
        ctx.fill();
        ctx.shadowColor = 'transparent';

        // Subtle tight inner shadow at bottom to separate from frame
        const bottomShadowHeight = 8 * scale;
        const bottomInnerShadow = ctx.createLinearGradient(x, y + totalHeight - bottomShadowHeight, x, y + totalHeight);
        bottomInnerShadow.addColorStop(0, 'rgba(0, 0, 0, 0)');
        bottomInnerShadow.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
        ctx.fillStyle = bottomInnerShadow;
        ctx.fillRect(x, y + totalHeight - bottomShadowHeight, w, bottomShadowHeight);

        // Subtle border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        if (topLeftRadius > 0) {
            ctx.moveTo(x + topLeftRadius, y);
        } else {
            ctx.moveTo(x, y);
        }
        if (topRightRadius > 0) {
            ctx.lineTo(x + w - topRightRadius, y);
            ctx.arcTo(x + w, y, x + w, y + topRightRadius, topRightRadius);
            ctx.lineTo(x + w, y + totalHeight);
        } else {
            ctx.lineTo(x + w, y);
            ctx.lineTo(x + w, y + totalHeight);
        }
        ctx.lineTo(x, y + totalHeight);
        if (topLeftRadius > 0) {
            ctx.lineTo(x, y + topLeftRadius);
            ctx.arcTo(x, y, x + topLeftRadius, y, topLeftRadius);
        } else {
            ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Value text - centered
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textCenterY = y + totalHeight / 2;
        
            // Large center text: show custom label if provided, otherwise show dollar amount
            ctx.fillStyle = CONFIG.COLORS.slotText;
            // Base font size for big label (center slots slightly bigger)
            let fontSize = this.isCenter ? 42 : 36;
            // Text to render in the large area
            const largeText = (this.label && this.label.length > 0) ? this.label : `$${this.value}`;
            // Fit text within slot width by decreasing font size if necessary
            ctx.font = `bold ${fontSize * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            const maxTextWidth = w - (20 * scale);
            let measured = ctx.measureText(largeText).width;
            while (measured > maxTextWidth && fontSize > 12) {
                fontSize -= 2;
                ctx.font = `bold ${fontSize * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
                measured = ctx.measureText(largeText).width;
            }
            ctx.fillText(largeText, x + w / 2, textCenterY - 8 * scale);

            // Secondary small text: if a custom label exists, show the dollar amount below; otherwise show 'PRIZE'
            ctx.fillStyle = CONFIG.COLORS.slotLabel;
            ctx.font = `500 ${11 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
            const smallText = (this.label && this.label.length > 0) ? `$${this.value}` : 'PRIZE';
            ctx.fillText(smallText, x + w / 2, textCenterY + 20 * scale);
        
        ctx.restore();
    }
}

/**
 * Create all prize slots
 */
function createSlots() {
    const slots = [];
    const config = CONFIG.SLOTS;
    const boardConfig = CONFIG.BOARD;
    
    // Calculate inner playfield boundaries (same as Board class)
    const innerLeft = boardConfig.marginX + boardConfig.innerInset;
    const innerRight = boardConfig.marginX + boardConfig.width - boardConfig.innerInset;
    const innerWidth = innerRight - innerLeft;
    
    const centerIndex = Math.floor(config.values.length / 2);
    
    // Calculate available width: full inner width minus gaps between slots
    const totalGapWidth = (config.values.length - 1) * config.gap;
    const availableWidth = innerWidth - totalGapWidth;
    
    // Scale slot widths proportionally to fit available space
    const baseWidths = config.values.map((_, index) =>
        config.width + (index === centerIndex ? config.centerWidthBoost : 0)
    );
    const totalBaseWidth = baseWidths.reduce((sum, w) => sum + w, 0);
    const scaleFactor = availableWidth / totalBaseWidth;
    const widths = baseWidths.map(w => w * scaleFactor);
    
    // Start at left edge of playfield
    let cursorX = innerLeft;

    for (let i = 0; i < config.values.length; i++) {
        const isCenter = i === centerIndex;
        const extraHeight = isCenter ? config.centerHeightBoost : 0;
        const width = widths[i];
        const height = config.height + extraHeight;
        const y = config.y - extraHeight;
        slots.push(new Slot(cursorX, y, width, height, config.values[i], i, isCenter, extraHeight, config.values.length));
        cursorX += width + config.gap;
    }
    
    return slots;
}

/**
 * Create slots with a dynamic count. Values are generated symmetrically with a center emphasis.
 */
function createSlotsWithCount(count) {
    const slots = [];
    const config = CONFIG.SLOTS;
    const boardConfig = CONFIG.BOARD;

    // Clamp count
    count = Math.max(2, Math.min(24, Math.floor(count)));

    // Generate smooth symmetric values with center emphasis (5..100 scaled)
    const values = [];
    const center = (count - 1) / 2;
    for (let i = 0; i < count; i++) {
        const d = Math.abs(i - center) / (center || 1);
        // value ranges from ~100 at center to ~5 at edges
        const v = Math.round((5 + (95 * (1 - d))) / 5) * 5; // round to nearest 5
        values.push(Math.max(5, v));
    }

    // Calculate inner playfield boundaries
    const innerLeft = boardConfig.marginX + boardConfig.innerInset;
    const innerRight = boardConfig.marginX + boardConfig.width - boardConfig.innerInset;
    const innerWidth = innerRight - innerLeft;

    const centerIndex = Math.floor(values.length / 2);

    // Calculate available width: full inner width minus gaps between slots
    const totalGapWidth = (values.length - 1) * config.gap;
    const availableWidth = innerWidth - totalGapWidth;

    // Scale slot widths proportionally to fit available space
    const baseWidths = values.map((_, index) =>
        config.width + (index === centerIndex ? config.centerWidthBoost : 0)
    );
    const totalBaseWidth = baseWidths.reduce((sum, w) => sum + w, 0);
    const scaleFactor = availableWidth / totalBaseWidth;
    const widths = baseWidths.map(w => w * scaleFactor);

    // Start at left edge of playfield
    let cursorX = innerLeft;

    for (let i = 0; i < values.length; i++) {
        const isCenter = i === centerIndex;
        const extraHeight = isCenter ? config.centerHeightBoost : 0;
        const width = widths[i];
        const height = config.height + extraHeight;
        const y = config.y - extraHeight;
        slots.push(new Slot(cursorX, y, width, height, values[i], i, isCenter, extraHeight, values.length));
        cursorX += width + config.gap;
    }

    return slots;
}

/**
 * Slot Divider - vertical walls between slots (clean modern style)
 */
class SlotDivider {
    constructor(x, y, width, height) {
        this.x = x;         // Center X of divider
        this.y = y;         // Top of divider
        this.width = width;
        this.height = height;
    }
    
    render(ctx, scale) {
        const x = (this.x - this.width / 2) * scale;
        const y = this.y * scale;
        const w = this.width * scale;
        const boardConfig = CONFIG.BOARD;
        const frameBottom = (boardConfig.marginTop + boardConfig.height) * scale;
        const extendedHeight = frameBottom - y;
        
        ctx.save();
        
        // White divider extending to frame bottom
        ctx.fillStyle = CONFIG.COLORS.board; // Same as frame color
        ctx.fillRect(x, y, w, extendedHeight);
        
        ctx.restore();
    }
}

/**
 * Create dividers between slots
 */
function createSlotDividers(slots) {
    const dividers = [];
    const config = CONFIG.SLOTS;
    const boardConfig = CONFIG.BOARD;
    
    // Create dividers only between slots (not on edges)
    for (let i = 1; i < slots.length; i++) {
        const x = slots[i].x - config.gap / 2;
        
        // Use the taller of the two adjacent slots to determine divider height
        const leftSlot = slots[i - 1];
        const rightSlot = slots[i];
        const maxSlotY = Math.min(leftSlot.y, rightSlot.y); // Lower y = higher up
        
        // Divider starts at the top of the taller bucket and extends to frame bottom
        const dividerHeight = (boardConfig.marginTop + boardConfig.height) - maxSlotY;
        
        dividers.push(new SlotDivider(
            x,
            maxSlotY,
            config.dividerWidth,
            dividerHeight
        ));
    }
    
    return dividers;
}
