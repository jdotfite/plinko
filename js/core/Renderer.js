/**
 * Renderer - handles all canvas drawing
 */

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.scale = 1;
        
        // Offscreen canvas for static elements
        this.staticCanvas = document.createElement('canvas');
        this.staticCtx = this.staticCanvas.getContext('2d');
        this.staticDirty = true;
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    /**
     * Handle canvas resize
     */
    resize() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Calculate scale to fit 9:16 aspect ratio
        const targetAspect = CONFIG.TARGET_WIDTH / CONFIG.TARGET_HEIGHT;
        const containerAspect = containerWidth / containerHeight;
        
        let canvasWidth, canvasHeight;
        
        if (containerAspect > targetAspect) {
            // Container is wider - fit to height
            canvasHeight = containerHeight;
            canvasWidth = canvasHeight * targetAspect;
        } else {
            // Container is taller - fit to width
            canvasWidth = containerWidth;
            canvasHeight = canvasWidth / targetAspect;
        }
        
        // Set canvas size
        this.canvas.width = canvasWidth;
        this.canvas.height = canvasHeight;
        this.canvas.style.width = `${canvasWidth}px`;
        this.canvas.style.height = `${canvasHeight}px`;
        
        // Calculate scale
        this.scale = canvasWidth / CONFIG.TARGET_WIDTH;
        
        // Resize static canvas
        this.staticCanvas.width = canvasWidth;
        this.staticCanvas.height = canvasHeight;
        this.staticDirty = true;
    }
    
    /**
     * Render static elements (board, pegs, slots, dividers) to offscreen canvas
     */
    renderStatic(board, pegs, slots, slotDividers) {
        if (!this.staticDirty) return;
        
        const ctx = this.staticCtx;
        const scale = this.scale;
        
        // Clear
        ctx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
        
        // Background - pure white
        ctx.fillStyle = CONFIG.COLORS.background;
        ctx.fillRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
        
        // Board playfield (inner area) - FIRST
        board.renderPlayfield(ctx, scale);
        
        // Slots - render on top of playfield but below frame
        for (const slot of slots) {
            slot.render(ctx, scale);
        }
        
        // Pegs - on top of slots
        for (const peg of pegs) {
            peg.render(ctx, scale);
        }
        
        // Board outer frame - render before dividers
        board.renderFrame(ctx, scale);
        
        // Slot dividers - LAST, integrated with frame
        if (slotDividers) {
            for (const divider of slotDividers) {
                divider.render(ctx, scale);
            }
        }
        
        this.staticDirty = false;
    }
    
    /**
     * Clear the main canvas
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Render a frame
     */
    render(game) {
        const ctx = this.ctx;
        const scale = this.scale;
        
        // Re-render static elements if needed (e.g., theme change)
        if (this.staticDirty) {
            this.renderStatic(game.board, game.pegs, game.slots, game.slotDividers);
        }
        
        // Draw static elements from offscreen canvas
        ctx.drawImage(this.staticCanvas, 0, 0);
        
        // Render pegs (for hit animation - need to redraw)
        for (const peg of game.pegs) {
            const timeSinceHit = performance.now() - peg.lastHitTime;
            if (timeSinceHit < 150) {
                peg.render(ctx, scale);
            }
        }
        
        // Render drop zone indicator when aiming
        if (game.state === CONFIG.STATES.AIMING && game.aimX !== null) {
            this.renderDropIndicator(game.aimX, scale);
        }
        
        // Render ball
        if (game.ball && (game.state === CONFIG.STATES.AIMING || 
                          game.state === CONFIG.STATES.DROPPING ||
                          game.state === CONFIG.STATES.SCORING)) {
            game.ball.render(ctx, scale);
        }
        
        // Render winning slot highlight
        for (const slot of game.slots) {
            if (slot.isWinner) {
                slot.render(ctx, scale);
            }
        }

        // Render score
        this.renderScore(game.score, scale);
    }
    
    /**
     * Render drop position indicator
     */
    renderDropIndicator(x, scale) {
        const ctx = this.ctx;
        const indicatorY = CONFIG.BALL.dropZoneMaxY * scale;
        const ballRadius = CONFIG.BALL.radius * scale;
        
        // Vertical line
        ctx.beginPath();
        ctx.moveTo(x * scale, indicatorY);
        ctx.lineTo(x * scale, CONFIG.BOARD.marginTop * scale);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 2 * scale;
        ctx.setLineDash([5 * scale, 5 * scale]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Drop zone circle
        ctx.beginPath();
        ctx.arc(x * scale, indicatorY - ballRadius - 10 * scale, 5 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();
    }
    
    /**
     * Render score display
     */
    renderScore(score, scale) {
        const ctx = this.ctx;
        
        // Score overlaid on top-right of playfield
        const boardConfig = CONFIG.BOARD;
        const scoreX = boardConfig.width - boardConfig.innerInset - 20;
        const scoreY = boardConfig.innerTopPadding + 20;
        
        ctx.fillStyle = CONFIG.COLORS.slotText;
        ctx.font = `bold ${32 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`$${score}`, scoreX * scale, scoreY * scale);
    }
    
    /**
     * Get canvas-relative coordinates from event
     */
    getEventPosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;
        
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        // Convert to game coordinates
        return {
            x: (clientX - rect.left) / this.scale,
            y: (clientY - rect.top) / this.scale
        };
    }
}
