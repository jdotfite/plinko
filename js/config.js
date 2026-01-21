/**
 * Plinko Game Configuration
 * All constants and settings in one place
 */

const CONFIG = {
    // Target dimensions (9:16 portrait)
    TARGET_WIDTH: 1080,
    TARGET_HEIGHT: 1920,
    
    // Color themes
    THEMES: {
        light: {
            background: '#FFFFFF',
            board: '#F8F8F8',
            boardShadow: 'rgba(0, 0, 0, 0.084)',
            peg: '#1A1A1A',
            pegLower: '#888888',
            ballFill: '#B8B8B8',
            ballBorder: '#FFFFFF',
            ballGlow: 'rgba(0, 0, 0, 0.15)',
            slotBackground: '#FFFFFF',
            slotInnerShadow: 'rgba(0, 0, 0, 0.06)',
            slotText: '#111111',
            slotLabel: '#888888',
            divider: '#E8E8E8',
            innerGlow: 'rgba(0, 0, 0, 0.0525)',
            chevronBevel: 'rgba(0, 0, 0, 0.063)',
            frameHighlight: 'rgba(255, 255, 255, 0.7)',
            playfield: '#FFFFFF',
            playfieldGradientTop: '#FFFFFF',
            playfieldGradientMid: '#FEFEFE',
            playfieldGradientBottom: '#FBFBFB',
            lateralShade: 'rgba(0, 0, 0, 0.02625)',
            bottomShadow: 'rgba(0, 0, 0, 0.1575)',
            transparent: 'rgba(0, 0, 0, 0)',
            frameShadowLight: 'rgba(0, 0, 0, 0.0525)',
            frameShadowMedium: 'rgba(0, 0, 0, 0.0735)',
            frameShadowFaint: 'rgba(0, 0, 0, 0.042)',
            scoreText: '#111111'
        },
        dark: {
            background: '#000000',
            board: '#F8F8F8',
            boardShadow: 'rgba(0, 0, 0, 0.08)',
            peg: '#E5E5E5',
            pegLower: '#777777',
            ballFill: '#474747',
            ballBorder: '#000000',
            ballGlow: 'rgba(255, 255, 255, 0.15)',
            slotBackground: '#000000',
            slotInnerShadow: 'rgba(255, 255, 255, 0.06)',
            slotText: '#EEEEEE',
            slotLabel: '#777777',
            divider: '#1A1A1A',
            innerGlow: 'rgba(0, 0, 0, 0.0525)',
            chevronBevel: 'rgba(0, 0, 0, 0.063)',
            frameHighlight: 'rgba(255, 255, 255, 0.7)',
            playfield: '#000000',
            playfieldGradientTop: '#000000',
            playfieldGradientMid: '#010101',
            playfieldGradientBottom: '#040404',
            lateralShade: 'rgba(0, 0, 0, 0.02625)',
            bottomShadow: 'rgba(0, 0, 0, 0.1575)',
            transparent: 'rgba(0, 0, 0, 0)',
            frameShadowLight: 'rgba(0, 0, 0, 0.0525)',
            frameShadowMedium: 'rgba(0, 0, 0, 0.0735)',
            frameShadowFaint: 'rgba(0, 0, 0, 0.042)',
            scoreText: '#EEEEEE'
        }
    },
    
    // Board dimensions - tall rounded rectangle
    BOARD: {
        marginX: 0,          // No margin - fill screen width
        marginTop: 0,       // No margin - fill screen height
        width: 1080,
        height: 1920,         // Full screen height
        borderRadius: 40,     // Modern device-like corner radius
        chevronDepth: 70,     // Depth of angled bump cuts - wider to prevent straight falls
        chevronCount: 3,      // 3 bumps per side (6 total)
        innerInset: 70,       // Gap between outer frame and straight walls
        innerTopPadding: 20,  // Minimal space for drop zone - reduced to fill screen
        innerBottomPadding: 85 // Space reserved for goal mouth area
    },
    
    // Peg configuration - offset grid (Peggle-style dense layout)
    PEGS: {
        startY: 300,          // Adjusted for cannon space (moved down 100px)
        horizontalGap: 95,    // Tighter (was 140)
        verticalGap: 90,      // Tighter (was 130)
        radius: 12,           // Slightly smaller (was 14)
        rows: 14,             // More rows (was 11)
        pegsPerRowOdd: 8,     // More pegs (was 6)
        pegsPerRowEven: 7     // More pegs (was 5)
    },

    // Cannon design (Peggle-style ring + barrel)
    CANNON: {
        ringOuterRadius: 44,  // Outer radius of the ring
        ringInnerRadius: 26,  // Inner radius (hole where barrel pivots)
        barrelLength: 80,     // Barrel length from center
        barrelWidthBase: 48,  // Width at base
        barrelWidthTip: 36    // Width at muzzle
    },

    // Peg types
    PEG_TYPES: {
        BLUE: 'blue',
        ORANGE: 'orange',
        GREEN: 'green'
    },

    // Peggle-style mechanics
    PEGGLE: {
        orangePegCount: 25,
        orangePoints: 100,
        bluePoints: 10,
        greenPegCount: 2,     // 2 green pegs per level (power-ups)
        greenPoints: 50,      // Points for hitting green peg
        feverDuration: 2500,  // Slow-mo duration in ms
        feverZoom: 1.4        // Camera zoom level
    },

    // Power-up definitions
    POWERUPS: {
        multiball: { name: 'Multiball', desc: 'Spawns 2 extra balls', color: '#00FF55' },
        fireball: { name: 'Fireball', desc: 'Burns through all pegs', color: '#FF4500' },
        spooky: { name: 'Spooky Ball', desc: 'Returns to top if falls out', color: '#9B59B6' },
        zen: { name: 'Zen Ball', desc: 'Extended trajectory guide', color: '#3498DB' },
        lightning: { name: 'Lightning', desc: 'Chains to nearby pegs', color: '#00FFFF' },
        ghost: { name: 'Ghost', desc: 'Phases through pegs, still scores', color: '#BDC3C7' },
        magnet: { name: 'Magnet', desc: 'Curves toward orange pegs', color: '#E91E63' },
        bomb: { name: 'Space Blast', desc: 'Explodes nearby pegs on hit', color: '#FF5722' },
        splitter: { name: 'Splitter', desc: 'Splits into 2, then 4 rainbow balls', color: '#8E44AD' },
        firework: { name: 'Firework', desc: 'Rockets up and explodes in the sky', color: '#FF1493' },
        antigravity: { name: 'Anti-Gravity', desc: 'Ball floats upward like a rocket', color: '#7B68EE' },
        bouncy: { name: 'Bouncy Ball', desc: 'Gains energy with each bounce', color: '#32CD32' },
        blackhole: { name: 'Black Hole', desc: 'Creates a gravity well', color: '#191970' }
    },

    // Magazine (skeeball-style ball slot)
    MAGAZINE: {
        ballRadius: 14,       // Larger balls
        spacing: 32,          // Space between ball centers
        p1X: 37,              // Left slot X center
        p2X: 1043,            // Right slot X center
        y: 95                 // Start Y (top of first ball) - moved up
    },
    
    // Ball/Token - light gray with white border
    BALL: {
        radius: 20,           // Reduced from 32 for Peggle-style
        dropZoneMinY: 60,
        dropZoneMaxY: 180,
        // Burst drop settings (number of tokens dropped per user drop and delay between them)
        // Default to a single coin per click
        burstCount: 1,
        burstDelayMs: 0
    },
    
    // Prize slots / buckets
    SLOTS: {
        y: 1685,
        width: 140,
        height: 150,          // Base card height before center boost
        gap: 20,
        values: [5, 10, 100, 25, 10],
        cornerRadius: 22,
        dividerWidth: 14,
        funnelStartY: 1665,   // Where dividers begin
        cardShadowBlur: 28,
        cardShadowOffset: 14,
        cardTopLip: 26,
        centerWidthBoost: 26,
        centerHeightBoost: 18
    },
    
    // Physics
    PHYSICS: {
        gravity: 0.45,
        friction: 0.9985,
        restitution: 0.6,
        pegRestitution: 0.75,
        wallRestitution: 0.55,
        maxVelocity: 16,
        randomness: 0.06,
        fixedTimeStep: 1 / 60
    },
    
    // Game states
    STATES: {
        IDLE: 'idle',
        AIMING: 'aiming',
        CHARGING: 'charging',
        DROPPING: 'dropping',
        SCORING: 'scoring'
    }
};

// Separate mutable state object for theme
const THEME_STATE = {
    current: 'light'
};

// Add COLORS getter that uses the mutable state
Object.defineProperty(CONFIG, 'COLORS', {
    get() {
        return CONFIG.THEMES[THEME_STATE.current];
    },
    enumerable: true
});

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.BOARD);
Object.freeze(CONFIG.PEGS);
Object.freeze(CONFIG.BALL);
Object.freeze(CONFIG.SLOTS);
Object.freeze(CONFIG.PHYSICS);
Object.freeze(CONFIG.STATES);
Object.freeze(CONFIG.CANNON);
Object.freeze(CONFIG.PEG_TYPES);
Object.freeze(CONFIG.PEGGLE);
Object.freeze(CONFIG.POWERUPS);
Object.freeze(CONFIG.MAGAZINE);
