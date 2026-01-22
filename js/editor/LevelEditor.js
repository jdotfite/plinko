/**
 * Level Editor - Visual peg placement tool
 */

class LevelEditor {
    constructor(game) {
        this.game = game;
        this.active = false;
        this.currentTool = 'blue'; // 'blue', 'orange', 'green', 'erase', 'move'
        this.pegs = [];
        this.selectedPeg = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };

        // Grid settings
        this.gridSize = 15;
        this.showGrid = true;
        this.pegRadius = CONFIG.PEGS.radius;

        // Level metadata
        this.levelName = 'Untitled Level';
        this.starThresholds = {
            star1: 20000,
            star2: 22500,
            star3: 25000
        };

        // Saved levels in localStorage
        this.savedLevels = this._loadSavedLevels();
        this.currentLevelId = null;

        // Test play state
        this.testMode = false;
        this.originalPegs = null;

        // Bind event handlers
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
    }

    /**
     * Toggle editor mode
     */
    toggle() {
        if (this.active) {
            this.deactivate();
        } else {
            this.activate();
        }
    }

    /**
     * Activate editor mode
     */
    activate() {
        if (this.active) return;
        this.active = true;

        // Pause the game
        this.game.pause();

        // Copy current pegs to editor
        this.pegs = this.game.pegs.map(p => ({
            x: p.x,
            y: p.y,
            type: p.pegType || 'blue'
        }));

        // Show editor UI
        this._showEditorUI();

        // Attach event listeners
        const canvas = this.game.renderer.canvas;
        canvas.addEventListener('mousedown', this._onMouseDown);
        canvas.addEventListener('mousemove', this._onMouseMove);
        canvas.addEventListener('mouseup', this._onMouseUp);
        canvas.addEventListener('contextmenu', this._onContextMenu);
        document.addEventListener('keydown', this._onKeyDown);

        // Start editor render loop
        this._renderLoop();

        console.log('Level Editor activated');
    }

    /**
     * Deactivate editor mode
     */
    deactivate() {
        if (!this.active) return;
        this.active = false;

        // Hide editor UI
        this._hideEditorUI();

        // Remove event listeners
        const canvas = this.game.renderer.canvas;
        canvas.removeEventListener('mousedown', this._onMouseDown);
        canvas.removeEventListener('mousemove', this._onMouseMove);
        canvas.removeEventListener('mouseup', this._onMouseUp);
        canvas.removeEventListener('contextmenu', this._onContextMenu);
        document.removeEventListener('keydown', this._onKeyDown);

        // Resume game with editor pegs
        this._applyPegsToGame();
        this.game.resume();

        console.log('Level Editor deactivated');
    }

    /**
     * Snap coordinates to grid
     */
    snapToGrid(x, y) {
        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            y: Math.round(y / this.gridSize) * this.gridSize
        };
    }

    /**
     * Get playable bounds
     */
    getBounds() {
        const board = CONFIG.BOARD;
        const innerInset = board.innerInset || 0;
        const chevronDepth = board.chevronDepth || 0;

        return {
            left: board.marginX + innerInset + chevronDepth + 30,
            right: board.marginX + board.width - innerInset - chevronDepth - 30,
            top: CONFIG.PEGS.startY - 50,
            bottom: CONFIG.BOARD.marginY + CONFIG.BOARD.height - (board.innerBottomPadding || 100) - 80
        };
    }

    /**
     * Find peg at position
     */
    getPegAt(x, y) {
        for (let i = this.pegs.length - 1; i >= 0; i--) {
            const peg = this.pegs[i];
            const dist = Math.hypot(peg.x - x, peg.y - y);
            if (dist <= this.pegRadius + 5) {
                return { peg, index: i };
            }
        }
        return null;
    }

    /**
     * Check if position is valid for a new peg
     */
    isValidPosition(x, y, excludeIndex = -1) {
        const bounds = this.getBounds();

        // Check bounds
        if (x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {
            return false;
        }

        // Check overlap with other pegs
        const minDist = this.pegRadius * 2 + 4;
        for (let i = 0; i < this.pegs.length; i++) {
            if (i === excludeIndex) continue;
            const peg = this.pegs[i];
            const dist = Math.hypot(peg.x - x, peg.y - y);
            if (dist < minDist) {
                return false;
            }
        }

        return true;
    }

    /**
     * Add a peg
     */
    addPeg(x, y, type = 'blue') {
        const snapped = this.snapToGrid(x, y);
        if (this.isValidPosition(snapped.x, snapped.y)) {
            this.pegs.push({
                x: snapped.x,
                y: snapped.y,
                type: type
            });
            this._updatePegCounts();
            return true;
        }
        return false;
    }

    /**
     * Remove a peg
     */
    removePeg(index) {
        if (index >= 0 && index < this.pegs.length) {
            this.pegs.splice(index, 1);
            this._updatePegCounts();
            return true;
        }
        return false;
    }

    /**
     * Cycle peg type
     */
    cyclePegType(index) {
        if (index >= 0 && index < this.pegs.length) {
            const peg = this.pegs[index];
            const types = ['blue', 'orange', 'green'];
            const currentIdx = types.indexOf(peg.type);
            peg.type = types[(currentIdx + 1) % types.length];
            this._updatePegCounts();
        }
    }

    /**
     * Clear all pegs
     */
    clearAll() {
        if (confirm('Clear all pegs? This cannot be undone.')) {
            this.pegs = [];
            this._updatePegCounts();
        }
    }

    /**
     * Mirror pegs horizontally
     */
    mirrorHorizontal() {
        const bounds = this.getBounds();
        const centerX = (bounds.left + bounds.right) / 2;

        // Create mirrored copies
        const newPegs = [];
        for (const peg of this.pegs) {
            const mirroredX = centerX + (centerX - peg.x);
            const snapped = this.snapToGrid(mirroredX, peg.y);

            // Check if mirror position is valid and doesn't overlap
            if (this.isValidPosition(snapped.x, snapped.y)) {
                newPegs.push({
                    x: snapped.x,
                    y: snapped.y,
                    type: peg.type
                });
            }
        }

        this.pegs = this.pegs.concat(newPegs);
        this._updatePegCounts();
    }

    // =============================================
    // Save/Load
    // =============================================

    /**
     * Save current level
     */
    saveLevel(name = null) {
        if (name) {
            this.levelName = name;
        }

        const levelData = {
            id: this.currentLevelId || this._generateId(),
            name: this.levelName,
            pegs: this.pegs.map(p => ({ x: p.x, y: p.y, type: p.type })),
            starThresholds: { ...this.starThresholds },
            metadata: this._calculateMetadata(),
            updatedAt: new Date().toISOString()
        };

        if (!this.currentLevelId) {
            levelData.createdAt = levelData.updatedAt;
            this.currentLevelId = levelData.id;
        }

        // Update or add to saved levels
        const existingIdx = this.savedLevels.findIndex(l => l.id === levelData.id);
        if (existingIdx >= 0) {
            this.savedLevels[existingIdx] = levelData;
        } else {
            this.savedLevels.push(levelData);
        }

        this._saveLevelsToStorage();
        this._updateLevelSelect();

        console.log(`Level saved: ${this.levelName}`);
        return levelData;
    }

    /**
     * Load a level by ID
     */
    loadLevel(id) {
        const level = this.savedLevels.find(l => l.id === id);
        if (!level) {
            console.error(`Level not found: ${id}`);
            return false;
        }

        this.currentLevelId = level.id;
        this.levelName = level.name;
        this.pegs = level.pegs.map(p => ({ x: p.x, y: p.y, type: p.type }));
        this.starThresholds = { ...level.starThresholds };

        this._updateLevelNameInput();
        this._updatePegCounts();
        this._updateStarInputs();

        console.log(`Level loaded: ${this.levelName}`);
        return true;
    }

    /**
     * Create new level
     */
    newLevel() {
        this.currentLevelId = null;
        this.levelName = 'Untitled Level';
        this.pegs = [];
        this.starThresholds = { star1: 20000, star2: 22500, star3: 25000 };

        this._updateLevelNameInput();
        this._updatePegCounts();
        this._updateStarInputs();
    }

    /**
     * Delete current level
     */
    deleteLevel() {
        if (!this.currentLevelId) return;

        if (confirm(`Delete "${this.levelName}"? This cannot be undone.`)) {
            const idx = this.savedLevels.findIndex(l => l.id === this.currentLevelId);
            if (idx >= 0) {
                this.savedLevels.splice(idx, 1);
                this._saveLevelsToStorage();
            }
            this.newLevel();
            this._updateLevelSelect();
        }
    }

    /**
     * Export level as JSON
     */
    exportLevel() {
        const levelData = {
            name: this.levelName,
            version: 1,
            pegs: this.pegs,
            starThresholds: this.starThresholds,
            metadata: this._calculateMetadata()
        };

        const json = JSON.stringify(levelData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.levelName.replace(/[^a-z0-9]/gi, '_')}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Import level from JSON file
     */
    importLevel(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.currentLevelId = null;
                this.levelName = data.name || 'Imported Level';
                this.pegs = data.pegs || [];
                this.starThresholds = data.starThresholds || { star1: 20000, star2: 22500, star3: 25000 };

                this._updateLevelNameInput();
                this._updatePegCounts();
                this._updateStarInputs();

                console.log(`Level imported: ${this.levelName}`);
            } catch (err) {
                console.error('Failed to import level:', err);
                alert('Failed to import level. Invalid JSON format.');
            }
        };
        reader.readAsText(file);
    }

    // =============================================
    // Test Play
    // =============================================

    /**
     * Enter test play mode
     */
    startTestPlay() {
        if (this.testMode) return;
        this.testMode = true;

        // Save current editor state
        this.originalPegs = this.pegs.map(p => ({ ...p }));

        // Hide editor UI, show test UI
        document.getElementById('editor-panel')?.classList.add('hidden');
        document.getElementById('editor-test-bar')?.classList.remove('hidden');

        // Initialize test round (don't use resetMatch - it rebuilds from layout)
        this._initializeTestRound();

        // Resume game
        this.game.resume();

        console.log('Test play started');
    }

    /**
     * Initialize the game for test play without using resetMatch
     */
    _initializeTestRound() {
        const game = this.game;

        // Reset game state
        game.players = [{ score: 0 }, { score: 0 }];
        game.currentPlayerIndex = 0;
        game.shotsTaken = [0, 0];
        game.matchOver = false;
        game.combo = 0;
        game.freeBallEarned = false;
        game.slowMoUntil = 0;
        game.state = CONFIG.STATES.IDLE;
        game.balls = [];
        game.scorePopups = [];
        game.extremeFever = false;
        game.extremeFeverStart = 0;
        game.extremeFeverTarget = null;
        game.timeScale = 1;
        game.blackHoles = [];

        // Deactivate fever slots
        if (game.feverSlots) {
            game.feverSlots.deactivate();
        }

        // Apply editor pegs to game (don't rebuild from layout!)
        this._applyPegsToGame();

        // Reset power-up state
        game.currentPowerUp = null;
        game.zenMode = false;
        game.powerUpPending = false;

        // Use standard 10 balls for testing
        game.shotsPerPlayer = 10;

        // Reset and start magazines
        if (game.magazines) {
            for (const mag of game.magazines) {
                mag.setTotal(game.shotsPerPlayer);
                mag.reset();
                mag.startLoadingAnimation();
            }
        }

        // Update renderer
        game.renderer.staticDirty = true;
        game._notifyHud();
    }

    /**
     * Exit test play mode
     */
    stopTestPlay() {
        if (!this.testMode) return;
        this.testMode = false;

        // Pause game
        this.game.pause();

        // Reset game state to clean slate
        this.game.balls = [];
        this.game.scorePopups = [];
        this.game.blackHoles = [];
        this.game.state = CONFIG.STATES.IDLE;
        this.game.combo = 0;
        this.game.extremeFever = false;
        this.game.timeScale = 1;
        if (this.game.feverSlots) {
            this.game.feverSlots.deactivate();
        }

        // Restore editor pegs
        this.pegs = this.originalPegs;
        this.originalPegs = null;

        // Show editor UI, hide test UI
        document.getElementById('editor-panel')?.classList.remove('hidden');
        document.getElementById('editor-test-bar')?.classList.add('hidden');

        // Mark renderer as needing refresh
        this.game.renderer.staticDirty = true;

        // Restart render loop
        this._renderLoop();

        console.log('Test play ended');
    }

    // =============================================
    // Event Handlers
    // =============================================

    _onMouseDown(e) {
        if (!this.active || this.testMode) return;

        const pos = this.game.renderer.getEventPosition(e);
        const hit = this.getPegAt(pos.x, pos.y);

        if (e.button === 0) { // Left click
            if (this.currentTool === 'move' && hit) {
                // Start dragging
                this.selectedPeg = hit.index;
                this.isDragging = true;
                this.dragOffset = {
                    x: pos.x - hit.peg.x,
                    y: pos.y - hit.peg.y
                };
            } else if (this.currentTool === 'erase' && hit) {
                // Erase peg
                this.removePeg(hit.index);
            } else if (hit) {
                // Cycle peg type
                this.cyclePegType(hit.index);
            } else {
                // Place new peg
                this.addPeg(pos.x, pos.y, this.currentTool === 'erase' ? 'blue' : this.currentTool);
            }
        }
    }

    _onMouseMove(e) {
        if (!this.active || this.testMode) return;

        const pos = this.game.renderer.getEventPosition(e);

        if (this.isDragging && this.selectedPeg !== null) {
            const newX = pos.x - this.dragOffset.x;
            const newY = pos.y - this.dragOffset.y;
            const snapped = this.snapToGrid(newX, newY);

            if (this.isValidPosition(snapped.x, snapped.y, this.selectedPeg)) {
                this.pegs[this.selectedPeg].x = snapped.x;
                this.pegs[this.selectedPeg].y = snapped.y;
            }
        }

        // Update cursor position display
        const snapped = this.snapToGrid(pos.x, pos.y);
        const coordsEl = document.getElementById('editor-coords');
        if (coordsEl) {
            coordsEl.textContent = `(${Math.round(snapped.x)}, ${Math.round(snapped.y)})`;
        }
    }

    _onMouseUp(e) {
        if (!this.active || this.testMode) return;

        this.isDragging = false;
        this.selectedPeg = null;
    }

    _onContextMenu(e) {
        if (!this.active || this.testMode) return;
        e.preventDefault();

        const pos = this.game.renderer.getEventPosition(e);
        const hit = this.getPegAt(pos.x, pos.y);

        if (hit) {
            this.removePeg(hit.index);
        }
    }

    _onKeyDown(e) {
        if (!this.active) return;

        // Shortcuts
        switch (e.key.toLowerCase()) {
            case 'escape':
                if (this.testMode) {
                    this.stopTestPlay();
                } else {
                    this.deactivate();
                }
                break;
            case '1':
            case 'b':
                this._setTool('blue');
                break;
            case '2':
            case 'o':
                this._setTool('orange');
                break;
            case '3':
            case 'g':
                this._setTool('green');
                break;
            case 'x':
            case 'delete':
                this._setTool('erase');
                break;
            case 'm':
                this._setTool('move');
                break;
            case 's':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.saveLevel();
                }
                break;
            case 't':
                if (!this.testMode) {
                    this.startTestPlay();
                }
                break;
        }
    }

    // =============================================
    // UI Management
    // =============================================

    _showEditorUI() {
        const panel = document.getElementById('editor-panel');
        if (panel) {
            panel.classList.remove('hidden');
            this._updateLevelSelect();
            this._updatePegCounts();
            this._updateLevelNameInput();
            this._updateStarInputs();
        }
    }

    _hideEditorUI() {
        const panel = document.getElementById('editor-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
    }

    _setTool(tool) {
        this.currentTool = tool;

        // Update UI
        document.querySelectorAll('.editor-tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    }

    _updatePegCounts() {
        const counts = this._calculateMetadata();

        const blueEl = document.getElementById('editor-count-blue');
        const orangeEl = document.getElementById('editor-count-orange');
        const greenEl = document.getElementById('editor-count-green');
        const totalEl = document.getElementById('editor-count-total');

        if (blueEl) blueEl.textContent = counts.blueCount;
        if (orangeEl) orangeEl.textContent = counts.orangeCount;
        if (greenEl) greenEl.textContent = counts.greenCount;
        if (totalEl) totalEl.textContent = counts.totalPegs;
    }

    _updateLevelSelect() {
        const select = document.getElementById('editor-level-select');
        if (!select) return;

        select.innerHTML = '<option value="">-- Select Level --</option>';
        for (const level of this.savedLevels) {
            const opt = document.createElement('option');
            opt.value = level.id;
            opt.textContent = level.name;
            if (level.id === this.currentLevelId) {
                opt.selected = true;
            }
            select.appendChild(opt);
        }
    }

    _updateLevelNameInput() {
        const input = document.getElementById('editor-level-name');
        if (input) {
            input.value = this.levelName;
        }
    }

    _updateStarInputs() {
        const star1 = document.getElementById('editor-star1');
        const star2 = document.getElementById('editor-star2');
        const star3 = document.getElementById('editor-star3');

        if (star1) star1.value = this.starThresholds.star1;
        if (star2) star2.value = this.starThresholds.star2;
        if (star3) star3.value = this.starThresholds.star3;
    }

    // =============================================
    // Rendering
    // =============================================

    _renderLoop() {
        if (!this.active || this.testMode) return;

        const ctx = this.game.renderer.ctx;
        const scale = this.game.renderer.scale;

        // Clear and draw background
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Draw static elements (board)
        this.game.renderer.renderStatic(this.game.board, [], [], []);
        ctx.drawImage(this.game.renderer.staticCanvas, 0, 0);

        // Draw grid
        if (this.showGrid) {
            this._renderGrid(ctx, scale);
        }

        // Draw bounds
        this._renderBounds(ctx, scale);

        // Draw pegs
        this._renderPegs(ctx, scale);

        // Draw goal mouth
        if (this.game.goalMouth) {
            this.game.goalMouth.render(ctx, scale);
        }

        // Draw cannon (for reference)
        this.game.renderer.renderCannon(this.game, scale);

        requestAnimationFrame(() => this._renderLoop());
    }

    _renderGrid(ctx, scale) {
        const bounds = this.getBounds();
        ctx.save();
        ctx.strokeStyle = 'rgba(128, 128, 128, 0.15)';
        ctx.lineWidth = 1;

        // Vertical lines
        for (let x = bounds.left; x <= bounds.right; x += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x * scale, bounds.top * scale);
            ctx.lineTo(x * scale, bounds.bottom * scale);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = bounds.top; y <= bounds.bottom; y += this.gridSize) {
            ctx.beginPath();
            ctx.moveTo(bounds.left * scale, y * scale);
            ctx.lineTo(bounds.right * scale, y * scale);
            ctx.stroke();
        }

        ctx.restore();
    }

    _renderBounds(ctx, scale) {
        const bounds = this.getBounds();
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
        ctx.lineWidth = 2 * scale;
        ctx.setLineDash([10 * scale, 5 * scale]);
        ctx.strokeRect(
            bounds.left * scale,
            bounds.top * scale,
            (bounds.right - bounds.left) * scale,
            (bounds.bottom - bounds.top) * scale
        );
        ctx.restore();
    }

    _renderPegs(ctx, scale) {
        for (let i = 0; i < this.pegs.length; i++) {
            const peg = this.pegs[i];
            const x = peg.x * scale;
            const y = peg.y * scale;
            const r = this.pegRadius * scale;

            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);

            // Color by type
            if (peg.type === 'orange') {
                ctx.fillStyle = '#FF6B00';
                ctx.strokeStyle = '#FF8C00';
            } else if (peg.type === 'green') {
                ctx.fillStyle = '#00DD44';
                ctx.strokeStyle = '#00AA22';
            } else {
                ctx.fillStyle = CONFIG.COLORS.peg;
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            }

            ctx.fill();
            ctx.lineWidth = 1.5 * scale;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Highlight selected peg
            if (i === this.selectedPeg) {
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 3 * scale;
                ctx.stroke();
            }
        }
    }

    // =============================================
    // Helpers
    // =============================================

    _calculateMetadata() {
        const counts = { blueCount: 0, orangeCount: 0, greenCount: 0, totalPegs: 0 };
        for (const peg of this.pegs) {
            counts.totalPegs++;
            if (peg.type === 'blue') counts.blueCount++;
            else if (peg.type === 'orange') counts.orangeCount++;
            else if (peg.type === 'green') counts.greenCount++;
        }
        return counts;
    }

    _generateId() {
        return 'lvl_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    _loadSavedLevels() {
        try {
            const data = localStorage.getItem('plinko_editor_levels');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load saved levels:', e);
            return [];
        }
    }

    _saveLevelsToStorage() {
        try {
            localStorage.setItem('plinko_editor_levels', JSON.stringify(this.savedLevels));
        } catch (e) {
            console.error('Failed to save levels:', e);
        }
    }

    _applyPegsToGame() {
        // Convert editor pegs to game Peg objects
        this.game.pegs = this.pegs.map(p => new Peg(p.x, p.y, this.pegRadius, false, p.type));

        // Assign orange pegs (they're already marked)
        // No need to call assignOrangePegs since we placed them manually

        // Update orange count
        this.game.orangePegsRemaining = this.pegs.filter(p => p.type === 'orange').length;

        // Mark static as dirty
        this.game.renderer.staticDirty = true;
    }
}

// Global instance
window.LevelEditor = LevelEditor;
