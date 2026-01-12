/**
 * Input Handler - manages touch and mouse input
 */

class InputHandler {
    constructor(canvas, renderer) {
        this.canvas = canvas;
        this.renderer = renderer;
        
        this.isPressed = false;
        this.currentX = null;
        this.currentY = null;
        
        this.onAimStart = null;
        this.onAimMove = null;
        this.onDrop = null;
        
        this.bindEvents();
    }
    
    /**
     * Bind all input events
     */
    bindEvents() {
        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this.handleEnd(e), { passive: false });
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleEnd(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleEnd(e));
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    /**
     * Handle input start
     */
    handleStart(event) {
        event.preventDefault();
        
        const pos = this.renderer.getEventPosition(event);
        
        // Check if in drop zone
        if (this.isInDropZone(pos.x, pos.y)) {
            this.isPressed = true;
            this.currentX = this.constrainX(pos.x);
            this.currentY = pos.y;
            
            if (this.onAimStart) {
                this.onAimStart(this.currentX, this.currentY);
            }
        }
    }
    
    /**
     * Handle input move
     */
    handleMove(event) {
        if (!this.isPressed) return;
        
        event.preventDefault();
        
        const pos = this.renderer.getEventPosition(event);
        this.currentX = this.constrainX(pos.x);
        this.currentY = pos.y;
        
        if (this.onAimMove) {
            this.onAimMove(this.currentX, this.currentY);
        }
    }
    
    /**
     * Handle input end
     */
    handleEnd(event) {
        if (!this.isPressed) return;
        
        event.preventDefault();
        
        this.isPressed = false;
        
        if (this.onDrop && this.currentX !== null) {
            this.onDrop(this.currentX);
        }
        
        this.currentX = null;
        this.currentY = null;
    }
    
    /**
     * Check if position is in drop zone
     */
    isInDropZone(x, y) {
        const board = CONFIG.BOARD;
        const ball = CONFIG.BALL;
        
        return y >= ball.dropZoneMinY && 
               y <= ball.dropZoneMaxY + 100 &&
               x >= board.marginX && 
               x <= board.marginX + board.width;
    }
    
    /**
     * Constrain X position to valid drop area
     */
    constrainX(x) {
        const board = CONFIG.BOARD;
        const margin = 50;
        
        const minX = board.marginX + board.chevronDepth + margin;
        const maxX = board.marginX + board.width - board.chevronDepth - margin;
        
        return Utils.clamp(x, minX, maxX);
    }
}
