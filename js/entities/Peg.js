/**
 * Peg entity - crisp dark circles, lighter for bottom guide row
 */

class Peg {
    constructor(x, y, radius, isGuideRow = false) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.isGuideRow = isGuideRow; // Bottom row is lighter
        this.lastHitTime = 0;
    }
    
    /**
     * Render the peg - clean, crisp circles
     */
    render(ctx, scale) {
        const x = this.x * scale;
        const y = this.y * scale;
        const r = this.radius * scale;
        
        // Check if recently hit for subtle feedback
        const timeSinceHit = performance.now() - this.lastHitTime;
        const isGlowing = timeSinceHit < 100;
        
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        
        if (isGlowing) {
            // Subtle glow effect when hit
            const glowIntensity = 1 - (timeSinceHit / 100);
            ctx.fillStyle = `rgba(80, 80, 80, ${1 - glowIntensity * 0.3})`;
        } else {
            // Dark charcoal for all pegs
            ctx.fillStyle = CONFIG.COLORS.peg;
        }
        
        ctx.fill();
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
            
            pegs.push(new Peg(x, y, config.radius, isGuideRow));
        }
    }
    
    return pegs;
}
