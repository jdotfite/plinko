/**
 * Plinko Game - Entry Point
 */

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');

    if (!canvas) {
        console.error('Game canvas not found.');
        return;
    }

    // Initialize theme manager
    window.themeManager = new ThemeManager();

    // Initialize trail system (loads saved selection)
    if (window.TrailSystem) {
        window.TrailSystem.init();
    } else {
        window.currentTrailType = 'glow';
    }

    // Create and start game
    window.game = new Game(canvas);
    window.game.start();

    // Position HUD elements inside playfield
    function positionHUD() {
        const game = window.game;
        if (!game || !game.renderer) return;

        const rect = canvas.getBoundingClientRect();
        const scale = game.renderer.scale || 1;

        // Hide old P1/P2 panels from playfield (now in bottom panel)
        const p1Panel = document.getElementById('hud-p1');
        const p2Panel = document.getElementById('hud-p2');
        if (p1Panel) p1Panel.style.display = 'none';
        if (p2Panel) p2Panel.style.display = 'none';

        // Center HUD - hidden (replaced by bottom panel)
        const centerHud = document.getElementById('hud-center');
        if (centerHud) centerHud.style.display = 'none';

        // Bottom UI Panel - position at bottom of canvas and SCALE with canvas
        const bottomPanel = document.getElementById('bottom-ui-panel');
        if (bottomPanel) {
            const canvasBottom = rect.bottom;
            const canvasLeft = rect.left;
            const canvasWidth = rect.width;

            // Scale the UI panel proportionally with the canvas
            // Base width is 1080px (CONFIG.TARGET_WIDTH), so scale factor matches renderer
            bottomPanel.style.position = 'fixed';
            bottomPanel.style.left = `${canvasLeft}px`;
            bottomPanel.style.width = '1080px';  // Fixed base width
            bottomPanel.style.maxWidth = '1080px';
            bottomPanel.style.transformOrigin = 'bottom left';
            bottomPanel.style.transform = `scale(${scale})`;
            // Position accounts for scaled height
            bottomPanel.style.bottom = `${window.innerHeight - canvasBottom}px`;
        }
    }

    // Position HUD on load and resize
    window.positionHUD = positionHUD;
    setTimeout(positionHUD, 100);
    setTimeout(positionHUD, 300); // Second call to ensure proper sizing after fonts load
    window.addEventListener('resize', positionHUD);

    // Wire up bottom gear button to open admin panel
    const bottomGear = document.getElementById('bottom-gear');
    if (bottomGear) {
        bottomGear.addEventListener('click', () => {
            const panel = document.getElementById('admin-panel');
            const overlay = document.getElementById('admin-overlay');
            if (panel && overlay) {
                panel.classList.remove('hidden');
                panel.classList.add('open');
                panel.setAttribute('aria-hidden', 'false');
                overlay.classList.remove('hidden');
            }
        });
    }

    // Confetti helper (simple DOM-based pieces)
    window.spawnConfetti = function(pageX, pageY, count = 12) {
        const container = document.getElementById('confetti-container');
        if (!container) return;
        const colors = ['#000000', '#ffffff'];
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'confetti-piece';
            el.style.background = colors[Math.floor(Math.random() * colors.length)];
            el.style.left = `${pageX}px`;
            el.style.top = `${pageY}px`;
            el.style.opacity = '1';
            container.appendChild(el);

            // random upward trajectory (shoot up a bit then fall)
            const dist = 40 + Math.random() * 100;
            const dx = (Math.random() - 0.5) * dist * 1.2;
            const dy = -(40 + Math.random() * 140); // negative = upward
            const rot = Math.random() * 720 - 360;
            const anim = el.animate([
                { transform: 'translate(0px,0px) rotate(0deg)', opacity: 1 },
                { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 }
            ], { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.2,.8,.2,1)' });

            // Remove element when animation finishes to avoid lingering DOM pieces
            let removed = false;
            const removeEl = () => {
                if (removed) return;
                removed = true;
                try { if (el.parentNode === container) container.removeChild(el); } catch (e) {}
            };
            if (anim && typeof anim.onfinish !== 'undefined') {
                anim.onfinish = removeEl;
            } else if (anim && anim.finished && typeof anim.finished.then === 'function') {
                anim.finished.then(removeEl).catch(removeEl);
            }
            // Fallback removal in case animation API isn't fully supported
            setTimeout(removeEl, 1800 + Math.random() * 800);
        }
    };

    // HUD updater
    window.updateHud = function(state) {
        if (!state) return;

        // Update level select if present
        const levelSelect = document.getElementById('level-select');
        if (levelSelect && typeof state.levelIndex === 'number') {
            levelSelect.value = String(state.levelIndex);
        }

        // Update bottom UI panel - P1 score
        const bottomP1Score = document.getElementById('bottom-p1-score');
        if (bottomP1Score) bottomP1Score.textContent = String(state.p1 || 0);

        // Update bottom UI panel - P2 score
        const bottomP2Score = document.getElementById('bottom-p2-score');
        if (bottomP2Score) bottomP2Score.textContent = String(state.p2 || 0);

        // Update bottom UI panel - P1 balls remaining
        const bottomP1Balls = document.getElementById('bottom-p1-balls');
        if (bottomP1Balls && window.game) {
            const remaining = window.game.shotsPerPlayer - (state.shotsTaken?.[0] || 0);
            bottomP1Balls.textContent = String(remaining);
        }

        // Update bottom UI panel - P2 balls remaining
        const bottomP2Balls = document.getElementById('bottom-p2-balls');
        if (bottomP2Balls && window.game) {
            const remaining = window.game.shotsPerPlayer - (state.shotsTaken?.[1] || 0);
            bottomP2Balls.textContent = String(remaining);
        }

        // Update bottom UI panel - orange pegs
        const bottomOrange = document.getElementById('bottom-orange');
        if (bottomOrange) {
            bottomOrange.textContent = String(state.orangePegsRemaining ?? 25);
        }

        // Update bottom UI panel - combo
        const bottomCombo = document.getElementById('bottom-combo');
        if (bottomCombo) {
            const comboValue = 1 + (state.combo || 0) * (window.game ? window.game.tuning.comboStep : 0.1);
            bottomCombo.textContent = `x${comboValue.toFixed(1)}`;
        }

        // Highlight active player in bottom panel and hide P2 in single player mode
        const p1Section = document.querySelector('.bottom-player.p1');
        const p2Section = document.querySelector('.bottom-player.p2');
        const isTwoPlayer = window.game && window.game.twoPlayerMode;
        if (p1Section && p2Section) {
            p1Section.classList.toggle('active', state.currentPlayer === 1);
            p2Section.classList.toggle('active', state.currentPlayer === 2);
            // Hide P2 section in single player mode
            p2Section.style.display = isTwoPlayer ? '' : 'none';
        }
    };
    if (window.game && typeof window.game._notifyHud === 'function') {
        window.game._notifyHud();
    }

    // Helper to update modal content (defined first so it can be used below)
    window.updateModalContent = function(levelNum, title, isWin = false) {
        const modalContent = document.querySelector('.round-modal-content');
        const levelEl = document.getElementById('modal-level');
        const titleEl = document.getElementById('round-modal-text');
        const ballsEl = document.getElementById('modal-balls');
        const medallionLetter = document.querySelector('.medallion-letter');
        const playBtn = document.getElementById('round-modal-ok');

        // Toggle win state class for celebration styling
        if (modalContent) {
            modalContent.classList.toggle('win-state', isWin);
        }

        if (levelEl) levelEl.textContent = isWin ? 'Complete!' : `Level ${levelNum}`;
        if (titleEl) titleEl.textContent = title;
        if (ballsEl && window.game) {
            ballsEl.textContent = `${window.game.shotsPerPlayer} balls to use`;
        }
        if (medallionLetter) {
            medallionLetter.textContent = isWin ? '!' : levelNum;
        }
        if (playBtn) {
            const btnSpan = playBtn.querySelector('span');
            if (btnSpan) btnSpan.textContent = isWin ? 'NEXT' : 'PLAY';
        }
    };

    // Match modal wiring
    const modal = document.getElementById('round-modal');
    const okBtn = document.getElementById('round-modal-ok');
    if (modal && okBtn) {
        // Update modal content for initial display
        window.updateModalContent(1, 'Ready to Play!');
        modal.classList.remove('hidden');
        okBtn.onclick = () => {
            modal.classList.add('hidden');
            // Start magazine loading animation after modal is dismissed
            if (window.game && typeof window.game.startMagazineAnimation === 'function') {
                window.game.startMagazineAnimation();
            }
        };
    }

    console.log('Peggle-style game ready. Clear all orange pegs to win!');
});
