/**
 * Level Definitions
 * Each level has fixed peg layout, fixed power-up, and star thresholds
 */

const LEVEL_DATA = {
    // Level 1 - Introduction
    level_1: {
        id: 'level_1',
        name: 'Level 1',
        subtitle: 'First Steps',

        // Single power-up for this level (green pegs give this)
        powerUp: 'multiball',

        // Star thresholds (score needed for 1, 2, 3 stars)
        starThresholds: [4000, 5000, 6000],

        // Orange peg indices (which pegs in the grid are orange)
        // Spread across the board for good coverage
        orangePegIndices: [
            3, 7,           // Row 0
            10, 13,         // Row 1
            17, 20, 23,     // Row 2
            26, 29,         // Row 3
            33, 36, 39,     // Row 4
            42, 45,         // Row 5
            49, 52, 55,     // Row 6
            58, 61,         // Row 7
            65, 68, 71,     // Row 8
            74, 77,         // Row 9
            81, 84,         // Row 10
            88, 91          // Row 11
            // Total: 25 orange pegs
        ],

        // Green peg indices (power-up pegs) - strategic positions
        greenPegIndices: [35, 70],  // Middle-ish positions

        // Mouth speed for this level
        mouthSpeed: 2.5,

        // Balls per player
        ballCount: 10
    },

    // Level 2 - Tighter Layout
    level_2: {
        id: 'level_2',
        name: 'Level 2',
        subtitle: 'Getting Harder',
        powerUp: 'fireball',
        starThresholds: [4500, 5500, 6500],
        orangePegIndices: [
            1, 4, 6,
            9, 12,
            16, 19, 22,
            25, 28, 31,
            34, 37, 40,
            43, 46,
            50, 53,
            57, 60, 63,
            66, 69,
            73, 76
        ],
        greenPegIndices: [38, 55],
        mouthSpeed: 2.8,
        ballCount: 10
    },

    // Level 3 - Sparse Challenge
    level_3: {
        id: 'level_3',
        name: 'Level 3',
        subtitle: 'Wide Open',
        powerUp: 'splitter',
        starThresholds: [5000, 6000, 7000],
        orangePegIndices: [
            2, 5,
            8, 11, 14,
            18, 21,
            24, 27, 30,
            32, 35, 38,
            41, 44,
            48, 51, 54,
            56, 59, 62,
            64, 67, 70,
            72
        ],
        greenPegIndices: [27, 51],
        mouthSpeed: 3.0,
        ballCount: 10
    }
};

/**
 * Get level data by ID or index
 */
function getLevelData(levelIdOrIndex) {
    if (typeof levelIdOrIndex === 'number') {
        const keys = Object.keys(LEVEL_DATA);
        return LEVEL_DATA[keys[levelIdOrIndex]] || LEVEL_DATA.level_1;
    }
    return LEVEL_DATA[levelIdOrIndex] || LEVEL_DATA.level_1;
}

/**
 * Get total number of levels
 */
function getLevelCount() {
    return Object.keys(LEVEL_DATA).length;
}

// Export for use
window.LEVEL_DATA = LEVEL_DATA;
window.getLevelData = getLevelData;
window.getLevelCount = getLevelCount;
