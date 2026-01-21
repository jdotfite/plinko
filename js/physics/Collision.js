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
            let normal;
            if (dist === 0) {
                normal = new Vector(1, 0);
            } else {
                normal = new Vector(dx / dist, dy / dist);
            }
            
            // Penetration depth
            const penetration = minDist - (dist || 0);
            
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
        // Note: Audio is now handled in Game._handlePegHit for orange/blue distinction
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
            // Track wall bounce for style bonus
            ball.wallBounceCount = (ball.wallBounceCount || 0) + 1;
            const now = performance.now();
            // Debounce wall sound - minimum 80ms between hits
            if (!ball.lastWallHitTime || now - ball.lastWallHitTime > 80) {
                ball.lastWallHitTime = now;
                try {
                    if (window.audioManager && typeof window.audioManager.playWallHit === 'function') {
                        window.audioManager.playWallHit();
                    }
                } catch (e) {}
            }
        }

        // Right wall
        if (ball.x + bRadius > board.innerRight) {
            ball.x = board.innerRight - bRadius - EPS;
            ball.vx = -Math.abs(ball.vx) * physics.wallRestitution;
            collided = true;
            // Track wall bounce for style bonus
            ball.wallBounceCount = (ball.wallBounceCount || 0) + 1;
            const now = performance.now();
            // Debounce wall sound - minimum 80ms between hits
            if (!ball.lastWallHitTime || now - ball.lastWallHitTime > 80) {
                ball.lastWallHitTime = now;
                try {
                    if (window.audioManager && typeof window.audioManager.playWallHit === 'function') {
                        window.audioManager.playWallHit();
                    }
                } catch (e) {}
            }
        }

        // Chevron bump-outs
        if (board.chevronSegments &&
            ball.y + bRadius > board.innerTop &&
            ball.y - bRadius < board.innerBottom) {
            for (const segment of board.chevronSegments) {
                if (this.ballToChevronSegment(ball, segment)) {
                    collided = true;
                    // Track wall bounce for style bonus
                    ball.wallBounceCount = (ball.wallBounceCount || 0) + 1;
                    const now = performance.now();
                    // Debounce wall sound - minimum 80ms between hits
                    if (!ball.lastWallHitTime || now - ball.lastWallHitTime > 80) {
                        ball.lastWallHitTime = now;
                        try {
                            if (window.audioManager && typeof window.audioManager.playWallHit === 'function') {
                                window.audioManager.playWallHit();
                            }
                        } catch (e) {}
                    }
                }
            }
        }
        
        // Slot dividers disabled - balls fall through now
        // if (slotDividers && ball.y + bRadius > CONFIG.SLOTS.funnelStartY) {
        //     for (const divider of slotDividers) {
        //         if (this.ballToDivider(ball, divider)) {
        //             collided = true;
        //         }
        //     }
        // }

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
     * Check and handle collision with goal mouth rim (sides bounce the ball)
     * Returns true if ball bounced off rim - basketball rim feel!
     */
    ballToGoalMouthRim(ball, mouth) {
        if (!mouth) return false;
        const bRadius = (typeof ball.hitRadius === 'number') ? ball.hitRadius : ball.radius;

        // Goal mouth dimensions
        const mouthLeft = mouth.x;
        const mouthRight = mouth.x + mouth.width;
        const mouthTop = mouth.y;
        const mouthCenterX = mouth.x + mouth.width / 2;

        // Rim thickness (matches GoalMouth render)
        const rimThickness = 12;
        const innerHoleRadius = (mouth.width / 2) - rimThickness;

        // Only check if ball is near the mouth vertically (extended range for taller tube)
        if (ball.y + bRadius < mouthTop - 15 || ball.y - bRadius > mouthTop + 45) {
            return false;
        }

        // Check if ball is hitting the rim area
        const distFromCenter = ball.x - mouthCenterX;
        const absDistFromCenter = Math.abs(distFromCenter);

        // Ball is in the rim zone (between inner hole edge and outer edge)
        if (absDistFromCenter > innerHoleRadius - bRadius * 0.5 &&
            absDistFromCenter < (mouth.width / 2) + bRadius &&
            ball.y + bRadius > mouthTop - 5) {

            // Calculate collision response - basketball rim feel
            const rimRestitution = 0.75; // Bouncy like a basketball rim
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

            // Left rim collision
            if (distFromCenter < 0 && ball.x + bRadius > mouthLeft) {
                const rimInnerEdge = mouthCenterX - innerHoleRadius;
                if (ball.x + bRadius > mouthLeft && ball.x < rimInnerEdge + bRadius) {
                    // Calculate angle of impact for realistic bounce
                    const overlapX = ball.x + bRadius - mouthLeft;
                    const pushStrength = Math.min(overlapX + 2, 8);

                    // Bounce off left rim - push away with energy
                    ball.x = mouthLeft - bRadius - 1;

                    // Add upward component for exciting "rattling" feel
                    const upwardBoost = Math.max(2, Math.abs(ball.vy) * 0.3);
                    ball.vx = -(Math.abs(ball.vx) + pushStrength) * rimRestitution;
                    ball.vy = -Math.abs(ball.vy) * 0.6 - upwardBoost;

                    // Add slight randomness for unpredictability
                    ball.vx += (Math.random() - 0.5) * 2;
                    ball.vy += (Math.random() - 0.5) * 1;

                    // Debounce rim sound - minimum 100ms between hits
                    const now = performance.now();
                    if (!ball.lastRimHitTime || now - ball.lastRimHitTime > 100) {
                        ball.lastRimHitTime = now;
                        // Play rim hit sound
                        try {
                            if (window.audioManager && typeof window.audioManager.playRimHit === 'function') {
                                window.audioManager.playRimHit();
                            }
                        } catch (e) {}

                        // Trigger screen shake
                        if (window.game && typeof window.game.triggerShake === 'function') {
                            window.game.triggerShake(4, 80);
                        }
                    }

                    return true;
                }
            }

            // Right rim collision
            if (distFromCenter > 0 && ball.x - bRadius < mouthRight) {
                const rimInnerEdge = mouthCenterX + innerHoleRadius;
                if (ball.x - bRadius < mouthRight && ball.x > rimInnerEdge - bRadius) {
                    // Calculate angle of impact for realistic bounce
                    const overlapX = mouthRight - (ball.x - bRadius);
                    const pushStrength = Math.min(overlapX + 2, 8);

                    // Bounce off right rim - push away with energy
                    ball.x = mouthRight + bRadius + 1;

                    // Add upward component for exciting "rattling" feel
                    const upwardBoost = Math.max(2, Math.abs(ball.vy) * 0.3);
                    ball.vx = (Math.abs(ball.vx) + pushStrength) * rimRestitution;
                    ball.vy = -Math.abs(ball.vy) * 0.6 - upwardBoost;

                    // Add slight randomness for unpredictability
                    ball.vx += (Math.random() - 0.5) * 2;
                    ball.vy += (Math.random() - 0.5) * 1;

                    // Debounce rim sound - minimum 100ms between hits
                    const now = performance.now();
                    if (!ball.lastRimHitTime || now - ball.lastRimHitTime > 100) {
                        ball.lastRimHitTime = now;
                        // Play rim hit sound
                        try {
                            if (window.audioManager && typeof window.audioManager.playRimHit === 'function') {
                                window.audioManager.playRimHit();
                            }
                        } catch (e) {}

                        // Trigger screen shake
                        if (window.game && typeof window.game.triggerShake === 'function') {
                            window.game.triggerShake(4, 80);
                        }
                    }

                    return true;
                }
            }
        }

        return false;
    },

    /**
     * Check if ball falls into the goal mouth hole (not the rim)
     */
    ballToGoalMouth(ball, mouth) {
        if (!mouth) return false;
        const bRadius = (typeof ball.hitRadius === 'number') ? ball.hitRadius : ball.radius;

        // Goal mouth center and inner hole
        const mouthCenterX = mouth.x + mouth.width / 2;
        const mouthTop = mouth.y;

        // Rim thickness (matches GoalMouth render)
        const rimThickness = 8;
        const innerHoleRadius = (mouth.width / 2) - rimThickness * 1.2;

        // Ball must be within the inner hole horizontally
        const distFromCenter = Math.abs(ball.x - mouthCenterX);
        const withinHole = distFromCenter < innerHoleRadius - bRadius * 0.5;

        // Ball must be entering from the top
        const withinY = ball.y + bRadius >= mouthTop && ball.y < mouthTop + mouth.height * 0.5;

        return withinHole && withinY;
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
