/**
 * Ball/Token entity
 */

class Ball {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.radius = CONFIG.BALL.radius;
        this.active = false;
        this.landed = false;
        this.landedSlot = null;
    }
    
    /**
     * Reset ball to starting position
     */
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.active = false;
        this.landed = false;
        this.landedSlot = null;
    }
    
    /**
     * Start dropping the ball
     */
    drop() {
        this.active = true;
        this.vy = 0;
        // Small random initial x velocity for variety
        this.vx = Utils.randomVariance(0, 0.5);
    }
    
    /**
     * Update physics
     */
    update(dt) {
        if (!this.active || this.landed) return;
        
        const physics = CONFIG.PHYSICS;
        
        // Apply gravity
        this.vy += physics.gravity;
        
        // Apply friction (air resistance)
        this.vx *= physics.friction;
        this.vy *= physics.friction;
        
        // Cap velocity
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > physics.maxVelocity) {
            const scale = physics.maxVelocity / speed;
            this.vx *= scale;
            this.vy *= scale;
        }
        
        // Update position
        this.x += this.vx;
        this.y += this.vy;
    }
    
    /**
     * Handle landing in a slot
     */
    land(slot) {
        this.landed = true;
        this.landedSlot = slot;
        this.active = false;
        
        // Keep ball where it naturally landed - don't snap to center
        // Just stop all movement
        this.vx = 0;
        this.vy = 0;
    }
    
    /**
     * Render the ball - light gray sphere with white border and soft glow
     */
    render(ctx, scale) {
        ctx.save();
        
        const x = this.x * scale;
        const y = this.y * scale;
        const r = this.radius * scale;
        
        // Flat puck style token: white ring + solid gray fill
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 10 * scale;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 8 * scale;
        
        ctx.beginPath();
        ctx.arc(x, y, r + 4 * scale, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLORS.ballBorder;
        ctx.fill();
        
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.COLORS.ballFill;
        ctx.fill();
        
        ctx.restore();
    }
}
