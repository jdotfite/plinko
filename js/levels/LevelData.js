/**
 * Level Definitions
 * Each level has fixed peg layout, power-up assignments, and star thresholds
 *
 * Power-up Progression:
 * - Level 1: Introduces Multiball
 * - Level 2: Introduces Fireball (keeps Multiball)
 * - Level 3: Introduces Splitter (keeps previous)
 */

const LEVEL_DATA = {
    // Level 1 - Introduction (Multiball only)
    level_1: {
        id: 'level_1',
        name: 'Level 1',
        subtitle: 'First Steps',

        // Star thresholds (score needed for 1, 2, 3 stars)
        starThresholds: [4000, 5000, 6000],

        // Orange peg indices (25 total, spread across board)
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
            81, 84          // Row 10
        ],

        // Green pegs with their assigned power-ups
        // Each entry: { index: pegIndex, powerUp: 'powerUpId' }
        greenPegs: [
            { index: 35, powerUp: 'multiball' },
            { index: 70, powerUp: 'multiball' }
        ],

        // Mouth speed for this level
        mouthSpeed: 2.5,

        // Balls per player
        ballCount: 10,

        // Level unlocked by default?
        unlocked: true
    },

    // Level 2 - Introduces Fireball
    level_2: {
        id: 'level_2',
        name: 'Level 2',
        subtitle: 'Feel the Heat',

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

        // Mix of Multiball (from L1) and new Fireball
        greenPegs: [
            { index: 30, powerUp: 'multiball' },
            { index: 48, powerUp: 'fireball' },
            { index: 65, powerUp: 'fireball' }
        ],

        mouthSpeed: 2.8,
        ballCount: 10,
        unlocked: false
    },

    // Level 3 - Introduces Splitter
    level_3: {
        id: 'level_3',
        name: 'Level 3',
        subtitle: 'Split Decision',

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

        // Mix of all three power-ups
        greenPegs: [
            { index: 25, powerUp: 'multiball' },
            { index: 45, powerUp: 'fireball' },
            { index: 60, powerUp: 'splitter' }
        ],

        mouthSpeed: 3.0,
        ballCount: 10,
        unlocked: false
    }
};

// Track unlocked levels and stars earned (persisted to localStorage)
const LEVEL_PROGRESS = {
    _data: null,

    load() {
        try {
            const saved = localStorage.getItem('plinko_level_progress');
            if (saved) {
                this._data = JSON.parse(saved);
            }
        } catch (e) {}

        if (!this._data) {
            this._data = {
                unlockedLevels: ['level_1'],
                starsEarned: {}  // { level_1: 2, level_2: 3, ... }
            };
        }
        return this._data;
    },

    save() {
        try {
            localStorage.setItem('plinko_level_progress', JSON.stringify(this._data));
        } catch (e) {}
    },

    isUnlocked(levelId) {
        this.load();
        return this._data.unlockedLevels.includes(levelId);
    },

    unlock(levelId) {
        this.load();
        if (!this._data.unlockedLevels.includes(levelId)) {
            this._data.unlockedLevels.push(levelId);
            this.save();
        }
    },

    getStars(levelId) {
        this.load();
        return this._data.starsEarned[levelId] || 0;
    },

    setStars(levelId, stars) {
        this.load();
        const current = this._data.starsEarned[levelId] || 0;
        if (stars > current) {
            this._data.starsEarned[levelId] = stars;
            this.save();
        }
    },

    getTotalStars() {
        this.load();
        return Object.values(this._data.starsEarned).reduce((a, b) => a + b, 0);
    },

    reset() {
        this._data = {
            unlockedLevels: ['level_1'],
            starsEarned: {}
        };
        this.save();
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

/**
 * Get all level IDs
 */
function getAllLevelIds() {
    return Object.keys(LEVEL_DATA);
}

// Export for use
window.LEVEL_DATA = LEVEL_DATA;
window.LEVEL_PROGRESS = LEVEL_PROGRESS;
window.getLevelData = getLevelData;
window.getLevelCount = getLevelCount;
window.getAllLevelIds = getAllLevelIds;
