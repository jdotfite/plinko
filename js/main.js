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
        const board = game.board;

        // Calculate playfield bounds in screen coordinates
        const innerLeft = rect.left + board.innerLeft * scale;
        const innerRight = rect.left + board.innerRight * scale;
        const innerTop = rect.top + board.innerTop * scale;

        // P1 panel - top left of playfield
        const p1Panel = document.getElementById('hud-p1');
        if (p1Panel) {
            p1Panel.style.left = `${innerLeft + 14 * scale}px`;
            p1Panel.style.top = `${innerTop + 14 * scale}px`;
            p1Panel.style.opacity = '1';
        }

        // P2 panel - top right of playfield
        const p2Panel = document.getElementById('hud-p2');
        if (p2Panel) {
            p2Panel.style.right = 'auto';
            p2Panel.style.left = `${innerRight - 14 * scale - p2Panel.offsetWidth}px`;
            p2Panel.style.top = `${innerTop + 14 * scale}px`;
            p2Panel.style.opacity = '1';
        }

        // Center HUD - below cannon
        const centerHud = document.getElementById('hud-center');
        if (centerHud) {
            const cannonY = game.cannon.y * scale;
            centerHud.style.left = `${rect.left + (board.innerLeft + board.innerWidth / 2) * scale}px`;
            centerHud.style.top = `${rect.top + cannonY + 75 * scale}px`;
            centerHud.style.transform = 'translateX(-50%)';
            centerHud.style.opacity = '1';
        }
    }

    // Position HUD on load and resize
    window.positionHUD = positionHUD;
    setTimeout(positionHUD, 100);
    setTimeout(positionHUD, 300); // Second call to ensure proper sizing after fonts load
    window.addEventListener('resize', positionHUD);

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
        const p1Score = document.getElementById('p1-score');
        const p2Score = document.getElementById('p2-score');
        const comboEl = document.getElementById('combo-meter');
        const orangeEl = document.getElementById('orange-remaining');
        const p1Panel = document.getElementById('hud-p1');
        const p2Panel = document.getElementById('hud-p2');
        if (!state) return;

        if (p1Score) p1Score.textContent = String(state.p1 || 0);
        if (p2Score) p2Score.textContent = String(state.p2 || 0);
        if (orangeEl) {
            orangeEl.textContent = String(state.orangePegsRemaining ?? 25);
        }
        if (comboEl) {
            const comboValue = 1 + (state.combo || 0) * (window.game ? window.game.tuning.comboStep : 0.1);
            comboEl.textContent = `x${comboValue.toFixed(1)}`;
        }
        const levelSelect = document.getElementById('level-select');
        if (levelSelect && typeof state.levelIndex === 'number') {
            levelSelect.value = String(state.levelIndex);
        }
        // Highlight active player panel
        if (p1Panel && p2Panel) {
            p1Panel.classList.toggle('active', state.currentPlayer === 1);
            p2Panel.classList.toggle('active', state.currentPlayer === 2);
        }
    };
    if (window.game && typeof window.game._notifyHud === 'function') {
        window.game._notifyHud();
    }

    // Match modal wiring
    const modal = document.getElementById('round-modal');
    const textEl = document.getElementById('round-modal-text');
    const okBtn = document.getElementById('round-modal-ok');
    if (modal && textEl && okBtn) {
        textEl.textContent = 'Clear all orange pegs!';
        modal.classList.remove('hidden');
        okBtn.onclick = () => {
            modal.classList.add('hidden');
        };
    }

    console.log('Peggle-style game ready. Clear all orange pegs to win!');
});
