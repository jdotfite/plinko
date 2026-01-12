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
            boardShadow: 'rgba(0, 0, 0, 0.08)',
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
            innerGlow: 'rgba(0, 0, 0, 0.05)',
            chevronBevel: 'rgba(0, 0, 0, 0.06)',
            frameHighlight: 'rgba(255, 255, 255, 0.7)',
            playfield: '#FFFFFF',
            playfieldGradientTop: '#FFFFFF',
            playfieldGradientMid: '#FEFEFE',
            playfieldGradientBottom: '#FBFBFB',
            lateralShade: 'rgba(0, 0, 0, 0.025)',
            bottomShadow: 'rgba(0, 0, 0, 0.15)',
            transparent: 'rgba(0, 0, 0, 0)',
            frameShadowLight: 'rgba(0, 0, 0, 0.05)',
            frameShadowMedium: 'rgba(0, 0, 0, 0.07)',
            frameShadowFaint: 'rgba(0, 0, 0, 0.04)',
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
            innerGlow: 'rgba(0, 0, 0, 0.05)',
            chevronBevel: 'rgba(0, 0, 0, 0.06)',
            frameHighlight: 'rgba(255, 255, 255, 0.7)',
            playfield: '#000000',
            playfieldGradientTop: '#000000',
            playfieldGradientMid: '#010101',
            playfieldGradientBottom: '#040404',
            lateralShade: 'rgba(0, 0, 0, 0.025)',
            bottomShadow: 'rgba(0, 0, 0, 0.15)',
            transparent: 'rgba(0, 0, 0, 0)',
            frameShadowLight: 'rgba(0, 0, 0, 0.05)',
            frameShadowMedium: 'rgba(0, 0, 0, 0.07)',
            frameShadowFaint: 'rgba(0, 0, 0, 0.04)',
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
        innerBottomPadding: 85 // Space reserved for buckets/dividers - slightly more than sides for anchor feel
    },
    
    // Peg configuration - offset grid
    PEGS: {
        startY: 250,
        horizontalGap: 140,   // Wider spacing to fill playfield width
        verticalGap: 130,
        radius: 14,           // Larger pegs for better visibility
        rows: 11,
        pegsPerRowOdd: 6,
        pegsPerRowEven: 5
    },
    
    // Ball/Token - light gray with white border
    BALL: {
        radius: 32,
        dropZoneMinY: 60,
        dropZoneMaxY: 180
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
