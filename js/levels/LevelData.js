/**
 * Level Definitions
 * Each level has fixed peg layout, power-up assignments, and star thresholds
 *
 * Power-up Progression:
 * - Level 1: Introduces Multiball
 * - Level 2: Introduces Firework
 * - Level 3: Introduces Black Hole
 * - Level 4: Introduces Fireball
 * - Level 5: Introduces Lightning
 * - Level 6: Introduces Spooky Ball
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
        greenPegs: [
            { index: 35, powerUp: 'multiball' },
            { index: 70, powerUp: 'multiball' }
        ],

        mouthSpeed: 2.5,
        ballCount: 10,
        unlocked: true
    },

    // Level 2 - Introduces Firework
    level_2: {
        id: 'level_2',
        name: 'Level 2',
        subtitle: 'Sky High',

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

        // Introduce Firework, keep Multiball
        greenPegs: [
            { index: 12, powerUp: 'firework' },  // Near top
            { index: 30, powerUp: 'multiball' },
            { index: 48, powerUp: 'firework' },
            { index: 65, powerUp: 'multiball' }
        ],

        mouthSpeed: 2.8,
        ballCount: 10,
        unlocked: false
    },

    // Level 3 - Introduces Black Hole
    level_3: {
        id: 'level_3',
        name: 'Level 3',
        subtitle: 'Event Horizon',

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

        // Introduce Black Hole, keep previous
        greenPegs: [
            { index: 12, powerUp: 'multiball' },
            { index: 33, powerUp: 'blackhole' },  // New power-up
            { index: 52, powerUp: 'firework' },
            { index: 72, powerUp: 'blackhole' }
        ],

        mouthSpeed: 3.0,
        ballCount: 10,
        unlocked: false
    },

    // Level 4 - Introduces Fireball
    level_4: {
        id: 'level_4',
        name: 'Level 4',
        subtitle: 'Feel the Heat',

        starThresholds: [5500, 6500, 7500],

        orangePegIndices: [
            0, 3, 5, 7,
            9, 11, 14,
            16, 18, 21,
            24, 26, 28,
            31, 34, 37,
            40, 43, 46,
            49, 51, 54,
            57, 60, 63
        ],

        // Introduce Fireball, keep previous
        greenPegs: [
            { index: 15, powerUp: 'fireball' },  // New power-up
            { index: 35, powerUp: 'blackhole' },
            { index: 55, powerUp: 'firework' },
            { index: 70, powerUp: 'fireball' }
        ],

        mouthSpeed: 3.2,
        ballCount: 10,
        unlocked: false
    },

    // Level 5 - Introduces Lightning
    level_5: {
        id: 'level_5',
        name: 'Level 5',
        subtitle: 'Chain Reaction',

        starThresholds: [6000, 7000, 8000],

        orangePegIndices: [
            1, 4, 6,
            8, 10, 13,
            15, 17, 19, 22,
            25, 27, 29,
            32, 35, 38,
            41, 44, 47,
            50, 52, 55,
            58, 61, 64
        ],

        // Introduce Lightning, keep previous
        greenPegs: [
            { index: 18, powerUp: 'lightning' }, // New power-up
            { index: 36, powerUp: 'fireball' },
            { index: 53, powerUp: 'blackhole' },
            { index: 68, powerUp: 'firework' }
        ],

        mouthSpeed: 3.4,
        ballCount: 10,
        unlocked: false
    },

    // Level 6 - Introduces Spooky Ball
    level_6: {
        id: 'level_6',
        name: 'Level 6',
        subtitle: 'Ghost Mode',

        starThresholds: [6500, 7500, 8500],

        orangePegIndices: [
            2, 5, 7,
            9, 12, 14,
            16, 18, 20, 23,
            26, 28, 30,
            33, 36, 39,
            42, 45, 48,
            51, 53, 56,
            59, 62, 65
        ],

        // Introduce Spooky Ball, mix of all power-ups
        greenPegs: [
            { index: 15, powerUp: 'spooky' },    // New power-up
            { index: 32, powerUp: 'lightning' },
            { index: 50, powerUp: 'fireball' },
            { index: 67, powerUp: 'blackhole' }
        ],

        mouthSpeed: 3.5,
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
