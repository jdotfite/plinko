/**
 * Collision detection and response
 */

const Collision = {
    /**
     * Check collision between ball and circular peg
     * Returns collision data or null
     */
    ballToPeg(ball, peg) {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const distSq = dx * dx + dy * dy;
        const bRadius = (typeof ball.hitRadius === 'number') ? ball.hitRadius : ball.radius;
        const minDist = bRadius + peg.radius;
        
        if (distSq < minDist * minDist) {
            const dist = Math.sqrt(distSq);
            
            // Collision normal (from peg to ball)
            const normal = new Vector(dx / dist, dy / dist);
            
            // Penetration depth
            const penetration = minDist - dist;
            
            return {
                normal,
                penetration,
                peg
            };
        }
        
        return null;
    },
    
    /**
     * Resolve ball-peg collision
     */
    resolveBallPeg(ball, collision) {
        const { normal, penetration } = collision;
        const physics = CONFIG.PHYSICS;
        
        // Separate ball from peg
        ball.x += normal.x * penetration;
        ball.y += normal.y * penetration;
        
        // Reflect velocity
        const velocity = new Vector(ball.vx, ball.vy);
        velocity.reflect(normal);
        
        // Apply restitution (bounciness)
        velocity.multiply(physics.pegRestitution);
        
        // Add randomness for natural feel
        const randomAngle = Utils.randomVariance(0, physics.randomness);
        const cos = Math.cos(randomAngle);
        const sin = Math.sin(randomAngle);
        const newVx = velocity.x * cos - velocity.y * sin;
        const newVy = velocity.x * sin + velocity.y * cos;
        
        ball.vx = newVx;
        ball.vy = newVy;
        
        // Mark peg as recently hit for visual feedback and debounced audio
        const now = performance.now();
        const lastHit = collision.peg.lastHitTime || 0;
        collision.peg.lastHitTime = now;

        // Play peg hit sound if available — debounce to avoid rapid repeats when
        // a ball is very slow/sticking to a peg. Also prefer to play when ball
        // has meaningful kinetic energy.
        try {
            if (window.audioManager && typeof window.audioManager.playPegHit === 'function') {
                const variant = (typeof ball.soundVariant === 'number') ? ball.soundVariant : 0;
                const cooldownMs = 160; // short debounce window
                const speed = Math.hypot(ball.vx, ball.vy);
                // Only play if last hit was sufficiently long ago OR ball has non-trivial speed
                if ((now - lastHit) > cooldownMs && (speed > 0.4 || (now - lastHit) > 600)) {
                    // Slight pitch/pan variation based on peg position to add realism:
                    // deeper pegs -> slightly lower pitch; lateral position -> pan.
                    try {
                        const pegY = (collision.peg && typeof collision.peg.y === 'number') ? collision.peg.y : 0;
                        const pegX = (collision.peg && typeof collision.peg.x === 'number') ? collision.peg.x : 0;
                        const boardH = (CONFIG.BOARD && CONFIG.BOARD.height) ? CONFIG.BOARD.height : CONFIG.TARGET_HEIGHT;
                        const boardW = (CONFIG.BOARD && CONFIG.BOARD.width) ? CONFIG.BOARD.width : CONFIG.TARGET_WIDTH;
                        const normY = Math.max(0, Math.min(1, pegY / boardH));
                        const normX = ((pegX - boardW * 0.5) / (boardW * 0.5));
                        const pitchFactor = 1 - (normY * 0.18); // up to ~-18% at bottom
                        const pan = Math.max(-0.6, Math.min(0.6, normX * 0.45));
                        window.audioManager.playPegHit({ variant, pitch: pitchFactor, pan });
                    } catch (e) {
                        window.audioManager.playPegHit(variant);
                    }
                }
            }
        } catch (e) {
            // ignore audio errors
        }
    },
    
    /**
     * Check and resolve wall collisions
     * Returns true if collision occurred
     */
    ballToWalls(ball, board, slotDividers) {
        const physics = CONFIG.PHYSICS;
        let collided = false;
        const bRadius = (typeof ball.hitRadius === 'number') ? ball.hitRadius : ball.radius;
        const EPS = 0.5; // small separation to avoid sticking
        
        // Left wall
        if (ball.x - bRadius < board.innerLeft) {
            ball.x = board.innerLeft + bRadius + EPS;
            ball.vx = Math.abs(ball.vx) * physics.wallRestitution;
            collided = true;
            try {
                if (window.audioManager && typeof window.audioManager.playWallHit === 'function') {
                    window.audioManager.playWallHit();
                }
            } catch (e) {}
        }
        
        // Right wall
        if (ball.x + bRadius > board.innerRight) {
            ball.x = board.innerRight - bRadius - EPS;
            ball.vx = -Math.abs(ball.vx) * physics.wallRestitution;
            collided = true;
            try {
                if (window.audioManager && typeof window.audioManager.playWallHit === 'function') {
                    window.audioManager.playWallHit();
                }
            } catch (e) {}
        }

        // Chevron bump-outs
        if (board.chevronSegments &&
            ball.y + bRadius > board.innerTop &&
            ball.y - bRadius < board.innerBottom) {
            for (const segment of board.chevronSegments) {
                if (this.ballToChevronSegment(ball, segment)) {
                    collided = true;
                    try {
                        if (window.audioManager && typeof window.audioManager.playWallHit === 'function') {
                            window.audioManager.playWallHit();
                        }
                    } catch (e) {}
                }
            }
        }
        
        // Slot dividers - these create the funnel effect
        if (slotDividers && ball.y + bRadius > CONFIG.SLOTS.funnelStartY) {
            for (const divider of slotDividers) {
                if (this.ballToDivider(ball, divider)) {
                    collided = true;
                }
            }
        }
        
        return collided;
    },

    ballToChevronSegment(ball, segment) {
        const physics = CONFIG.PHYSICS;
        const ax = segment.a.x;
        const ay = segment.a.y;
        const bx = segment.b.x;
        const by = segment.b.y;
        const abx = bx - ax;
        const aby = by - ay;
        const abLenSq = abx * abx + aby * aby;
        if (abLenSq === 0) {
            return false;
        }
        const apx = ball.x - ax;
        const apy = ball.y - ay;
        let t = (apx * abx + apy * aby) / abLenSq;
        t = Math.max(0, Math.min(1, t));
        const closestX = ax + abx * t;
        const closestY = ay + aby * t;
        let dx = ball.x - closestX;
        let dy = ball.y - closestY;
        let distSq = dx * dx + dy * dy;
        const bRadius = (typeof ball.hitRadius === 'number') ? ball.hitRadius : ball.radius;
        const radiusSq = bRadius * bRadius;
        if (distSq >= radiusSq) {
            return false;
        }
        let dist = Math.sqrt(distSq);
        let nx;
        let ny;
        if (dist === 0) {
            const length = Math.sqrt(abLenSq) || 1;
            nx = -aby / length;
            ny = abx / length;
            dist = 0;
        } else {
            nx = dx / dist;
            ny = dy / dist;
        }
        const penetration = bRadius - dist;
        // push out by penetration plus a tiny epsilon to avoid re-collision
        const OUT_EPS = 0.5;
        ball.x += nx * (penetration + OUT_EPS);
        ball.y += ny * (penetration + OUT_EPS);

        const velocity = new Vector(ball.vx, ball.vy);
        const normalVector = new Vector(nx, ny);
        velocity.reflect(normalVector);
        velocity.multiply(physics.wallRestitution);
        ball.vx = velocity.x + Utils.randomVariance(0, 0.05);
        ball.vy = velocity.y;
        return true;
    },
    
    /**
     * Check and resolve collision with a vertical divider
     */
    ballToDivider(ball, divider) {
        const physics = CONFIG.PHYSICS;
        
        // Check if ball is in the vertical range of the divider
        const bRadius = (typeof ball.hitRadius === 'number') ? ball.hitRadius : ball.radius;
        if (ball.y + bRadius < divider.y || ball.y - bRadius > divider.y + divider.height) {
            return false;
        }
        
        const dividerLeft = divider.x - divider.width / 2;
        const dividerRight = divider.x + divider.width / 2;
        
        // Check left side of divider
        if (ball.x + bRadius > dividerLeft && ball.x < divider.x) {
            const penetration = ball.x + bRadius - dividerLeft;
            if (penetration > 0) {
                // push ball to the left of the divider with small EPS to avoid sticking
                const OUT_EPS = 0.5;
                ball.x = dividerLeft - bRadius - OUT_EPS;
                ball.vx = -Math.abs(ball.vx) * physics.wallRestitution;
                // Add slight randomness
                ball.vx += Utils.randomVariance(0, 0.3);
                try {
                    if (window.audioManager && typeof window.audioManager.playWallHit === 'function') {
                        window.audioManager.playWallHit();
                    }
                } catch (e) {}
                return true;
            }
        }
        
        // Check right side of divider
        if (ball.x - bRadius < dividerRight && ball.x > divider.x) {
            const penetration = dividerRight - (ball.x - bRadius);
            if (penetration > 0) {
                const OUT_EPS = 0.5;
                ball.x = dividerRight + bRadius + OUT_EPS;
                ball.vx = Math.abs(ball.vx) * physics.wallRestitution;
                // Add slight randomness
                ball.vx += Utils.randomVariance(0, 0.3);
                try {
                    if (window.audioManager && typeof window.audioManager.playWallHit === 'function') {
                        window.audioManager.playWallHit();
                    }
                } catch (e) {}
                return true;
            }
        }
        
        return false;
    },
    
    /**
     * Check if ball has fully landed in slot
     */
    ballToSlots(ball, slots) {
        const slotConfig = CONFIG.SLOTS;
        // Ball sits at bottom of slot with top peeking out
        const slotBottom = slotConfig.y + slotConfig.height - 10;
        
        // Keep ball from falling through bottom
        const bRadius = (typeof ball.hitRadius === 'number') ? ball.hitRadius : ball.radius;
        if (ball.y + bRadius > slotBottom) {
            ball.y = slotBottom - bRadius;
            
            // Small bounce if coming in fast, otherwise just stop
            if (Math.abs(ball.vy) > 2) {
                ball.vy = -Math.abs(ball.vy) * 0.25;
            } else {
                ball.vy = 0;
            }
            
            // Dampen horizontal movement
            ball.vx *= 0.7;
        }
        
        // Ball has settled when it's at the bottom and barely moving
        const isSettled = ball.y + bRadius >= slotBottom - 2 && 
                  Math.abs(ball.vy) < 1.5 && 
                  Math.abs(ball.vx) < 1;
        
        if (isSettled) {
            // Find which slot the ball is in
            for (let i = 0; i < slots.length; i++) {
                const slot = slots[i];
                if (ball.x >= slot.x && ball.x <= slot.x + slot.width) {
                    return slot;
                }
            }
        }
        
        return null;
    }
};

Object.freeze(Collision);
