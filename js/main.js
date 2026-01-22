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
        const bottomContent = document.querySelector('.bottom-ui-content');
        if (bottomPanel) {
            const canvasBottom = rect.bottom;
            const canvasLeft = rect.left;

            // Scale the UI panel proportionally with the canvas
            // Base width is 1080px (CONFIG.TARGET_WIDTH), so scale factor matches renderer
            bottomPanel.style.position = 'fixed';
            bottomPanel.style.left = `${canvasLeft}px`;
            bottomPanel.style.width = '1080px';  // Fixed base width
            bottomPanel.style.maxWidth = '1080px';
            bottomPanel.style.transformOrigin = 'bottom left';
            bottomPanel.style.transform = `scale(${scale})`;
            // Always pin to viewport bottom
            bottomPanel.style.bottom = '0';

            // Calculate gap between canvas bottom and viewport bottom, add as padding
            const gapToBottom = window.innerHeight - canvasBottom;
            // Convert to unscaled pixels for the padding (since panel is scaled)
            const extraPadding = Math.max(0, gapToBottom / scale);
            if (bottomContent) {
                bottomContent.style.paddingBottom = `${extraPadding + 10}px`;
            }
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
        const scoreEl = document.getElementById('modal-score');
        const targetsEl = document.getElementById('modal-targets');
        const ballsEl = document.getElementById('modal-balls');
        const playBtn = document.getElementById('round-modal-ok');
        const retryBtn = document.getElementById('round-modal-retry');
        const stars = document.querySelectorAll('.neu-star');

        // Toggle win state class for celebration styling
        if (modalContent) {
            modalContent.classList.toggle('win-state', isWin);
        }

        // Update level indicator
        if (levelEl) {
            levelEl.textContent = isWin ? 'CLEARED!' : `LEVEL ${levelNum}`;
        }

        // Update title
        if (titleEl) titleEl.textContent = title;

        // Update stats
        if (window.game) {
            if (scoreEl) {
                scoreEl.textContent = isWin
                    ? window.game.players[0].score.toLocaleString()
                    : '0';
            }
            if (targetsEl) {
                targetsEl.textContent = isWin
                    ? '0'
                    : String(window.game.orangePegsRemaining || 25);
            }
            if (ballsEl) {
                ballsEl.textContent = isWin
                    ? '0'
                    : String(window.game.shotsPerPlayer);
            }
        }

        // Update stars - earn stars based on win
        stars.forEach((star, idx) => {
            // In win state, light up stars (could be based on score thresholds later)
            star.classList.toggle('earned', isWin);
        });

        // Update buttons
        if (playBtn) {
            const btnSpan = playBtn.querySelector('span');
            if (btnSpan) btnSpan.textContent = isWin ? 'NEXT' : 'PLAY';
        }

        // Show retry button after round ends (win or loss), hide on initial
        // isWin indicates round is over, so show retry option
        if (retryBtn) {
            retryBtn.classList.toggle('hidden', !isWin);
        }
    };

    // =============================================
    // INTRO MODAL (First-time Tutorial)
    // =============================================

    const introModal = document.getElementById('intro-modal');
    const introStartBtn = document.getElementById('intro-start-btn');
    const introCloseBtn = document.getElementById('intro-close-btn');
    const hasSeenIntro = localStorage.getItem('plinko_seen_intro');

    // Show intro on first visit
    if (introModal && !hasSeenIntro) {
        introModal.classList.remove('hidden');
    }

    // Helper to dismiss intro and show level select
    const dismissIntro = () => {
        // Mark as seen
        localStorage.setItem('plinko_seen_intro', 'true');

        // Hide intro
        introModal.classList.add('hidden');

        // Show the level select modal instead of starting directly
        if (window.game) {
            window.game.showLevelSelect();
        }
    };

    if (introStartBtn) {
        introStartBtn.onclick = dismissIntro;
    }

    if (introCloseBtn) {
        introCloseBtn.onclick = dismissIntro;
    }

    // =============================================
    // LEVEL SELECT MODAL
    // =============================================

    const levelSelectModal = document.getElementById('level-select-modal');
    const levelSelectClose = document.getElementById('level-select-close');

    // Update total stars in level select header
    window.updateTotalStars = function() {
        const totalStarsEl = document.getElementById('total-stars-count');
        if (totalStarsEl && window.LEVEL_PROGRESS) {
            const total = window.LEVEL_PROGRESS.getTotalStars();
            totalStarsEl.textContent = total;
        }
    };

    if (levelSelectClose) {
        levelSelectClose.onclick = () => {
            levelSelectModal.classList.add('hidden');
            // Start level 1 (or current level) when closing without selecting
            if (window.game) {
                window.game.resetMatch();
                window.game.startMagazineAnimation();
            }
        };
    }

    // =============================================
    // MATCH MODAL WIRING
    // =============================================

    const modal = document.getElementById('round-modal');
    const okBtn = document.getElementById('round-modal-ok');
    const retryBtn = document.getElementById('round-modal-retry');

    // If user has seen intro, show level select on first load
    // Otherwise, intro modal will show first
    if (modal && okBtn) {
        if (hasSeenIntro) {
            // Don't show match modal, show level select instead
            modal.classList.add('hidden');
            if (window.game) {
                window.game.showLevelSelect();
            }
        } else {
            // Intro will be shown, keep match modal hidden until after intro
            modal.classList.add('hidden');
        }

        // Play/Next button handler
        okBtn.onclick = () => {
            modal.classList.add('hidden');
            // Start magazine loading animation after modal is dismissed
            if (window.game && typeof window.game.startMagazineAnimation === 'function') {
                window.game.startMagazineAnimation();
            }
        };

        // Retry button handler (restart same level)
        if (retryBtn) {
            retryBtn.onclick = () => {
                modal.classList.add('hidden');
                if (window.game) {
                    window.game.resetMatch();
                    window.updateModalContent(window.game.currentLevelIndex + 1, 'Ready to Play!');
                    window.game.startMagazineAnimation();
                }
            };
        }
    }

    console.log('Peggle-style game ready. Clear all orange pegs to win!');

    // =============================================
    // LEVEL EDITOR SETUP
    // =============================================

    // Initialize Level Editor
    if (window.LevelEditor && window.game) {
        window.levelEditor = new LevelEditor(window.game);

        // Admin panel button to open editor
        const editorBtn = document.getElementById('admin-editor-btn');
        if (editorBtn) {
            editorBtn.addEventListener('click', () => {
                // Close admin panel
                const panel = document.getElementById('admin-panel');
                const overlay = document.getElementById('admin-overlay');
                if (panel) panel.classList.add('hidden');
                if (overlay) overlay.classList.add('hidden');

                // Open editor
                window.levelEditor.activate();
            });
        }

        // Editor panel buttons
        document.getElementById('editor-close')?.addEventListener('click', () => {
            window.levelEditor.deactivate();
        });

        document.getElementById('editor-test')?.addEventListener('click', () => {
            window.levelEditor.startTestPlay();
        });

        document.getElementById('editor-stop-test')?.addEventListener('click', () => {
            window.levelEditor.stopTestPlay();
        });

        // Tool buttons
        document.querySelectorAll('.editor-tool-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                if (tool) {
                    window.levelEditor._setTool(tool);
                }
            });
        });

        // Level name input
        document.getElementById('editor-level-name')?.addEventListener('input', (e) => {
            window.levelEditor.levelName = e.target.value;
        });

        // Star threshold inputs
        document.getElementById('editor-star1')?.addEventListener('change', (e) => {
            window.levelEditor.starThresholds.star1 = parseInt(e.target.value) || 20000;
        });
        document.getElementById('editor-star2')?.addEventListener('change', (e) => {
            window.levelEditor.starThresholds.star2 = parseInt(e.target.value) || 22500;
        });
        document.getElementById('editor-star3')?.addEventListener('change', (e) => {
            window.levelEditor.starThresholds.star3 = parseInt(e.target.value) || 25000;
        });

        // Action buttons
        document.getElementById('editor-clear')?.addEventListener('click', () => {
            window.levelEditor.clearAll();
        });

        document.getElementById('editor-mirror')?.addEventListener('click', () => {
            window.levelEditor.mirrorHorizontal();
        });

        // Save/Load buttons
        document.getElementById('editor-new')?.addEventListener('click', () => {
            window.levelEditor.newLevel();
        });

        document.getElementById('editor-load')?.addEventListener('click', () => {
            const select = document.getElementById('editor-level-select');
            if (select && select.value) {
                window.levelEditor.loadLevel(select.value);
            }
        });

        document.getElementById('editor-save')?.addEventListener('click', () => {
            const nameInput = document.getElementById('editor-level-name');
            const name = nameInput?.value || 'Untitled Level';
            window.levelEditor.saveLevel(name);
            alert(`Level "${name}" saved!`);
        });

        document.getElementById('editor-delete')?.addEventListener('click', () => {
            window.levelEditor.deleteLevel();
        });

        document.getElementById('editor-export')?.addEventListener('click', () => {
            window.levelEditor.exportLevel();
        });

        document.getElementById('editor-import')?.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                window.levelEditor.importLevel(e.target.files[0]);
                e.target.value = ''; // Reset file input
            }
        });

        // Level select dropdown
        document.getElementById('editor-level-select')?.addEventListener('change', (e) => {
            if (e.target.value) {
                window.levelEditor.loadLevel(e.target.value);
            }
        });

        // Keyboard shortcut to toggle editor (E key when not playing)
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                // Don't toggle if typing in an input
                if (document.activeElement.tagName === 'INPUT' ||
                    document.activeElement.tagName === 'TEXTAREA') {
                    return;
                }
                // Don't toggle during active gameplay
                if (window.game && window.game.state === CONFIG.STATES.BALL_ACTIVE) {
                    return;
                }
                window.levelEditor.toggle();
            }
        });

        console.log('Level Editor initialized. Press E to toggle.');
    }
});
