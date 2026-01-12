/**
 * Utility functions
 */

const Utils = {
    /**
     * Clamp a value between min and max
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    /**
     * Linear interpolation
     */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },
    
    /**
     * Random float between min and max
     */
    randomRange(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    /**
     * Random value with variance (e.g., 1.0 ± 0.1)
     */
    randomVariance(base, variance) {
        return base + (Math.random() - 0.5) * 2 * variance;
    },
    
    /**
     * Distance between two points
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    /**
     * Convert degrees to radians
     */
    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    },
    
    /**
     * Ease out cubic
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    },
    
    /**
     * Ease out bounce
     */
    easeOutBounce(t) {
        const n1 = 7.5625;
        const d1 = 2.75;
        
        if (t < 1 / d1) {
            return n1 * t * t;
        } else if (t < 2 / d1) {
            return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
            return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
            return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }
    }
};

Object.freeze(Utils);
