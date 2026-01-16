/**
 * Plinko Game - Entry Point
 */

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    
    if (!canvas) {
        console.error('Game canvas not found!');
        return;
    }
    
    // Initialize theme manager
    window.themeManager = new ThemeManager();
    
    // Create and start game
    window.game = new Game(canvas);
    window.game.start();

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
            const angle = (Math.random() * Math.PI) - (Math.PI / 2);
            const dist = 40 + Math.random() * 100;
            const dx = (Math.random() - 0.5) * dist * 1.2;
            const dy = - (40 + Math.random() * 140); // negative = upward
            const rot = Math.random() * 720 - 360;
                const anim = el.animate([
                    { transform: `translate(0px,0px) rotate(0deg)`, opacity: 1 },
                    { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 }
                ], { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.2,.8,.2,1)' });

                // Remove element when animation finishes to avoid lingering DOM pieces
                let removed = false;
                const removeEl = () => { if (removed) return; removed = true; try { if (el.parentNode === container) container.removeChild(el); } catch (e) {} };
                if (anim && typeof anim.onfinish !== 'undefined') {
                    anim.onfinish = removeEl;
                } else if (anim && anim.finished && typeof anim.finished.then === 'function') {
                    anim.finished.then(removeEl).catch(removeEl);
                }
                // Fallback removal in case animation API isn't fully supported
                setTimeout(removeEl, 1800 + Math.random() * 800);
        }
    };

    // Small pulse effect when a coin lands (subtle ring)
    window.spawnPulse = function(pageX, pageY) {
        const container = document.getElementById('confetti-container');
        if (!container) return;
        const el = document.createElement('div');
        el.className = 'pulse-hit';
        el.style.left = `${pageX}px`;
        el.style.top = `${pageY}px`;
        container.appendChild(el);
        el.animate([
            { transform: 'translate(-50%,-50%) scale(0.2)', opacity: 0.9 },
            { transform: 'translate(-50%,-50%) scale(1.4)', opacity: 0 }
        ], { duration: 500, easing: 'cubic-bezier(.2,.9,.2,1)' });
        setTimeout(() => { try { container.removeChild(el); } catch (e) {} }, 700);
    };

    // Round modal wiring: show initial start modal
    const modal = document.getElementById('round-modal');
    const textEl = document.getElementById('round-modal-text');
    const okBtn = document.getElementById('round-modal-ok');
    // Round counter updater
    window.updateRoundCounter = function(round, drops, max, landed) {
        const el = document.getElementById('round-counter');
        if (!el) return;
        el.textContent = `Round ${round} — ${drops}/${max} dropped`;
    };
    // initialize counter display
    try { if (typeof window.updateRoundCounter === 'function') window.updateRoundCounter(window.game.currentRound, window.game.dropsThisRound, window.game.maxDropsPerRound, window.game.landedThisRound); } catch(e){}
    if (modal && textEl && okBtn && window.game) {
        textEl.textContent = `Round 1: Drop up to ${window.game.maxDropsPerRound} coins then press OK to begin.`;
        modal.classList.remove('hidden');
        okBtn.onclick = () => {
            modal.classList.add('hidden');
            window.game.allowDropping = true;
            try { if (typeof window.updateRoundCounter === 'function') window.updateRoundCounter(window.game.currentRound, window.game.dropsThisRound, window.game.maxDropsPerRound, window.game.landedThisRound); } catch(e){}
        };
    }
    
    console.log('🎮 Plinko Game Started!');
    console.log('Touch or click above the board to drop a ball.');
});
