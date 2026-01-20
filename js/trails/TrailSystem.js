/**
 * Trail System - Rocket League-inspired ball trails
 * Each trail is unique and can be unlocked through achievements
 */

const TrailSystem = {
    // Currently selected trail
    current: 'classic',

    // Unlocked trails (stored in localStorage)
    unlocked: ['classic', 'glow'],

    // Trail definitions with unlock conditions
    trails: {
        // === DEFAULT TRAILS (Unlocked from start) ===
        classic: {
            name: 'Classic',
            description: 'Simple and clean',
            unlocked: true,
            rarity: 'common'
        },
        glow: {
            name: 'Glow',
            description: 'Soft ethereal orbs',
            unlocked: true,
            rarity: 'common'
        },

        // === UNCOMMON TRAILS ===
        smoke: {
            name: 'Smoke',
            description: 'Wispy smoke trail',
            unlockCondition: 'Hit 10 pegs in one shot',
            unlockKey: 'combo_10',
            rarity: 'uncommon'
        },
        bubbles: {
            name: 'Bubbles',
            description: 'Floating soap bubbles',
            unlockCondition: 'Catch ball in goal mouth 3 times',
            unlockKey: 'goal_catches_3',
            rarity: 'uncommon'
        },
        pixels: {
            name: 'Pixel',
            description: 'Retro 8-bit style',
            unlockCondition: 'Play 5 games',
            unlockKey: 'games_5',
            rarity: 'uncommon'
        },

        // === RARE TRAILS ===
        fire: {
            name: 'Fire',
            description: 'Blazing hot flames',
            unlockCondition: 'Hit 15 pegs in one shot',
            unlockKey: 'combo_15',
            rarity: 'rare'
        },
        ice: {
            name: 'Ice',
            description: 'Frozen crystal shards',
            unlockCondition: 'Win 3 games',
            unlockKey: 'wins_3',
            rarity: 'rare'
        },
        lightning: {
            name: 'Lightning',
            description: 'Electric energy bolts',
            unlockCondition: 'Score 5000+ in one shot',
            unlockKey: 'shot_score_5000',
            rarity: 'rare'
        },
        hearts: {
            name: 'Hearts',
            description: 'Love is in the air',
            unlockCondition: 'Hit 5 orange pegs in one shot',
            unlockKey: 'orange_5_shot',
            rarity: 'rare'
        },

        // === EPIC TRAILS ===
        rainbow: {
            name: 'Rainbow',
            description: 'Full spectrum magic',
            unlockCondition: 'Hit 20 pegs in one shot',
            unlockKey: 'combo_20',
            rarity: 'epic'
        },
        stars: {
            name: 'Stardust',
            description: 'Twinkling cosmic dust',
            unlockCondition: 'Clear all orange pegs',
            unlockKey: 'clear_orange',
            rarity: 'epic'
        },
        neon: {
            name: 'Neon',
            description: 'Vibrant synthwave glow',
            unlockCondition: 'Score 10000+ total',
            unlockKey: 'total_score_10000',
            rarity: 'epic'
        },

        // === LEGENDARY TRAILS ===
        gold: {
            name: 'Golden',
            description: 'Pure luxury',
            unlockCondition: 'Win 10 games',
            unlockKey: 'wins_10',
            rarity: 'legendary'
        },
        plasma: {
            name: 'Plasma',
            description: 'Unstable energy core',
            unlockCondition: 'Hit 25 pegs in one shot',
            unlockKey: 'combo_25',
            rarity: 'legendary'
        },
        confetti: {
            name: 'Confetti',
            description: 'Party time!',
            unlockCondition: 'Trigger Extreme Fever 5 times',
            unlockKey: 'fever_5',
            rarity: 'legendary'
        }
    },

    // Rarity colors
    rarityColors: {
        common: '#888888',
        uncommon: '#4CAF50',
        rare: '#2196F3',
        epic: '#9C27B0',
        legendary: '#FF9800'
    },

    init() {
        this.loadUnlocks();
        this.loadSelected();
    },

    loadUnlocks() {
        try {
            const saved = localStorage.getItem('plinko_unlocked_trails');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with always-unlocked trails
                this.unlocked = [...new Set(['classic', 'glow', ...parsed])];
            }
        } catch (e) {
            this.unlocked = ['classic', 'glow'];
        }
    },

    saveUnlocks() {
        try {
            localStorage.setItem('plinko_unlocked_trails', JSON.stringify(this.unlocked));
        } catch (e) {}
    },

    loadSelected() {
        try {
            const saved = localStorage.getItem('plinko_selected_trail');
            if (saved && this.unlocked.includes(saved)) {
                this.current = saved;
            }
        } catch (e) {}
        window.currentTrailType = this.current;
    },

    saveSelected() {
        try {
            localStorage.setItem('plinko_selected_trail', this.current);
        } catch (e) {}
    },

    select(trailId) {
        if (this.unlocked.includes(trailId) && this.trails[trailId]) {
            this.current = trailId;
            window.currentTrailType = trailId;
            this.saveSelected();
            return true;
        }
        return false;
    },

    unlock(trailId) {
        if (this.trails[trailId] && !this.unlocked.includes(trailId)) {
            this.unlocked.push(trailId);
            this.saveUnlocks();
            return this.trails[trailId];
        }
        return null;
    },

    checkUnlock(key, value) {
        const newUnlocks = [];
        for (const [id, trail] of Object.entries(this.trails)) {
            if (trail.unlockKey === key && !this.unlocked.includes(id)) {
                this.unlock(id);
                newUnlocks.push(trail);
            }
        }
        return newUnlocks;
    },

    isUnlocked(trailId) {
        return this.unlocked.includes(trailId);
    },

    getTrailInfo(trailId) {
        return this.trails[trailId] || null;
    },

    getAllTrails() {
        return Object.entries(this.trails).map(([id, trail]) => ({
            id,
            ...trail,
            isUnlocked: this.unlocked.includes(id)
        }));
    }
};

// Initialize on load
TrailSystem.init();
window.TrailSystem = TrailSystem;
