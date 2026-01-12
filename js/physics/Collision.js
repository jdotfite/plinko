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
        const minDist = ball.radius + peg.radius;
        
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
        
        // Mark peg as recently hit for visual feedback
        collision.peg.lastHitTime = performance.now();
    },
    
    /**
     * Check and resolve wall collisions
     * Returns true if collision occurred
     */
    ballToWalls(ball, board, slotDividers) {
        const physics = CONFIG.PHYSICS;
        let collided = false;
        
        // Left wall
        if (ball.x - ball.radius < board.innerLeft) {
            ball.x = board.innerLeft + ball.radius;
            ball.vx = Math.abs(ball.vx) * physics.wallRestitution;
            collided = true;
        }
        
        // Right wall
        if (ball.x + ball.radius > board.innerRight) {
            ball.x = board.innerRight - ball.radius;
            ball.vx = -Math.abs(ball.vx) * physics.wallRestitution;
            collided = true;
        }

        // Chevron bump-outs
        if (board.chevronSegments &&
            ball.y + ball.radius > board.innerTop &&
            ball.y - ball.radius < board.innerBottom) {
            for (const segment of board.chevronSegments) {
                if (this.ballToChevronSegment(ball, segment)) {
                    collided = true;
                }
            }
        }
        
        // Slot dividers - these create the funnel effect
        if (slotDividers && ball.y + ball.radius > CONFIG.SLOTS.funnelStartY) {
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
        const radiusSq = ball.radius * ball.radius;
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
        const penetration = ball.radius - dist;
        ball.x += nx * penetration;
        ball.y += ny * penetration;

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
        if (ball.y + ball.radius < divider.y || ball.y - ball.radius > divider.y + divider.height) {
            return false;
        }
        
        const dividerLeft = divider.x - divider.width / 2;
        const dividerRight = divider.x + divider.width / 2;
        
        // Check left side of divider
        if (ball.x + ball.radius > dividerLeft && ball.x < divider.x) {
            const penetration = ball.x + ball.radius - dividerLeft;
            if (penetration > 0 && penetration < ball.radius) {
                ball.x = dividerLeft - ball.radius;
                ball.vx = -Math.abs(ball.vx) * physics.wallRestitution;
                // Add slight randomness
                ball.vx += Utils.randomVariance(0, 0.3);
                return true;
            }
        }
        
        // Check right side of divider
        if (ball.x - ball.radius < dividerRight && ball.x > divider.x) {
            const penetration = dividerRight - (ball.x - ball.radius);
            if (penetration > 0 && penetration < ball.radius) {
                ball.x = dividerRight + ball.radius;
                ball.vx = Math.abs(ball.vx) * physics.wallRestitution;
                // Add slight randomness
                ball.vx += Utils.randomVariance(0, 0.3);
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
        if (ball.y + ball.radius > slotBottom) {
            ball.y = slotBottom - ball.radius;
            
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
        const isSettled = ball.y + ball.radius >= slotBottom - 2 && 
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
