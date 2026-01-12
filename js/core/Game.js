/**
 * Main Game class - orchestrates everything
 */

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.inputHandler = new InputHandler(canvas, this.renderer);
        
        // Game state
        this.state = CONFIG.STATES.IDLE;
        this.score = 0;
        this.aimX = null;
        
        // Entities
        this.board = new Board();
        this.pegs = createPegs();
        this.slots = createSlots();
        this.slotDividers = createSlotDividers(this.slots);
        this.ball = null;
        
        // Physics timing
        this.lastTime = 0;
        this.accumulator = 0;
        
        // Bind input callbacks
        this.inputHandler.onAimStart = (x, y) => this.startAiming(x);
        this.inputHandler.onAimMove = (x, y) => this.updateAim(x);
        this.inputHandler.onDrop = (x) => this.dropBall(x);
        
        // Initial render of static elements
        this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);
    }
    
    /**
     * Start the game loop
     */
    start() {
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    /**
     * Main game loop
     */
    gameLoop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Fixed timestep physics
        this.accumulator += deltaTime;
        const fixedDT = CONFIG.PHYSICS.fixedTimeStep;
        
        while (this.accumulator >= fixedDT) {
            this.update(fixedDT);
            this.accumulator -= fixedDT;
        }
        
        // Render
        this.renderer.render(this);
        
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    /**
     * Update game state
     */
    update(dt) {
        if (this.state === CONFIG.STATES.DROPPING && this.ball) {
            // Update ball physics
            this.ball.update(dt);
            
            // Check peg collisions
            for (const peg of this.pegs) {
                const collision = Collision.ballToPeg(this.ball, peg);
                if (collision) {
                    Collision.resolveBallPeg(this.ball, collision);
                }
            }
            
            // Check wall collisions (including slot dividers)
            Collision.ballToWalls(this.ball, this.board, this.slotDividers);
            
            // Check slot collision
            const landedSlot = Collision.ballToSlots(this.ball, this.slots);
            if (landedSlot) {
                this.handleWin(landedSlot);
            }
        }
        
        // Auto-reset after scoring
        if (this.state === CONFIG.STATES.SCORING) {
            const elapsed = performance.now() - this.scoringStartTime;
            if (elapsed > 2000) {
                this.resetRound();
            }
        }
    }
    
    /**
     * Start aiming (touch/click in drop zone)
     */
    startAiming(x) {
        if (this.state !== CONFIG.STATES.IDLE) return;
        
        this.state = CONFIG.STATES.AIMING;
        this.aimX = x;
        
        // Create ball at aim position
        this.ball = new Ball(x, CONFIG.BALL.dropZoneMaxY);
    }
    
    /**
     * Update aim position
     */
    updateAim(x) {
        if (this.state !== CONFIG.STATES.AIMING) return;
        
        this.aimX = x;
        if (this.ball) {
            this.ball.x = x;
        }
    }
    
    /**
     * Drop the ball
     */
    dropBall(x) {
        if (this.state !== CONFIG.STATES.AIMING) return;
        
        this.state = CONFIG.STATES.DROPPING;
        this.aimX = null;
        
        if (this.ball) {
            this.ball.x = x;
            this.ball.y = CONFIG.BALL.dropZoneMaxY;
            this.ball.drop();
        }
    }
    
    /**
     * Handle ball landing in slot
     */
    handleWin(slot) {
        this.state = CONFIG.STATES.SCORING;
        this.scoringStartTime = performance.now();
        
        // Update score
        this.score += slot.value;
        
        // Land ball
        this.ball.land(slot);
        
        // Trigger slot animation
        slot.triggerWin();
        
        // Force re-render of static elements to show slot highlight
        this.renderer.staticDirty = true;
        this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);
    }
    
    /**
     * Reset for next round
     */
    resetRound() {
        this.state = CONFIG.STATES.IDLE;
        this.ball = null;
        this.aimX = null;
        
        // Reset slots
        for (const slot of this.slots) {
            slot.reset();
        }
        
        // Re-render static elements
        this.renderer.staticDirty = true;
        this.renderer.renderStatic(this.board, this.pegs, this.slots, this.slotDividers);
    }
}
