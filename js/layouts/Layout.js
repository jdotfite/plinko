/**
 * Layout - parametric peg/slot builder for levels
 */

class Layout {
    constructor(options = {}) {
        this.pegConfig = Object.assign({}, CONFIG.PEGS, options.pegs || {});
    }

    buildPegs(board) {
        const pegs = [];
        const config = this.pegConfig;
        const innerInset = board.innerInset || 0;
        // Prefer board inner bounds if available; fallback to calculated values
        const innerLeft = (typeof board.innerLeft === 'number') ? board.innerLeft : (board.x + innerInset);
        const innerRight = (typeof board.innerRight === 'number') ? board.innerRight : (board.x + (board.width || CONFIG.BOARD.width) - innerInset);
        const chevronInset = board.chevronDepth * 0.9;
        const barrierLeft = innerLeft + chevronInset;
        const barrierRight = innerRight - chevronInset;
        const effectiveWidth = Math.max(0, barrierRight - barrierLeft);
        const minClearance = CONFIG.BALL.radius + 10;

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
            const isGuideRow = row === config.rows - 1;

            for (let col = 0; col < pegsInRow; col++) {
                const x = rowStart + col * config.horizontalGap;
                const y = config.startY + row * config.verticalGap;
                pegs.push(new Peg(x, y, config.radius, isGuideRow, 'blue'));
            }
        }

        return pegs;
    }

    buildSlots() {
        return createSlots();
    }

    /**
     * Randomly assign orange pegs from the peg array
     * @param {Array} pegs - Array of Peg objects
     * @param {number} count - Number of orange pegs to assign (default: 25)
     */
    static assignOrangePegs(pegs, count = 25) {
        if (!pegs || !pegs.length) return;

        // Reset all to blue first
        for (const peg of pegs) {
            peg.pegType = 'blue';
            peg.isHit = false;
            peg.hitTime = 0;
        }

        // Filter out guide row pegs (they shouldn't be orange)
        const candidates = pegs.filter(p => !p.isGuideRow);

        // Shuffle using Fisher-Yates
        const shuffled = [...candidates];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Assign orange type to first 'count' pegs
        const assignCount = Math.min(count, shuffled.length);
        for (let i = 0; i < assignCount; i++) {
            shuffled[i].pegType = 'orange';
        }
    }

    /**
     * Reset hit state on all pegs (for new round)
     * @param {Array} pegs - Array of Peg objects
     */
    static resetPegHitState(pegs) {
        if (!pegs) return;
        for (const peg of pegs) {
            peg.isHit = false;
            peg.hitTime = 0;
        }
    }
}
