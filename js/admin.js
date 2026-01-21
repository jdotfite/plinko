// Admin panel behavior
(function(){
    function $(id){ return document.getElementById(id); }

    const gear = $('admin-gear');
    const panel = $('admin-panel');
    const overlay = $('admin-overlay');
    const closeBtn = $('admin-close');
    const resetBtn = $('admin-reset');

    const audioToggle = $('audio-toggle');
    const audioVolume = $('audio-volume');
    const audioVolumeValue = $('audio-volume-value');
    const gravityRange = $('gravity-range');
    const gravityValue = $('gravity-value');
    const powerRange = $('power-range');
    const powerValue = $('power-value');
    const mouthSpeedRange = $('mouth-speed-range');
    const mouthSpeedValue = $('mouth-speed-value');
    const shotsRange = $('shots-range');
    const shotsValue = $('shots-value');
    const layoutSelect = $('layout-select');
    const levelSelect = $('level-select');
    const greenPegRange = $('green-peg-range');
    const greenPegValue = $('green-peg-value');
    const twoPlayerToggle = $('two-player-toggle');
    const powerupGrid = $('powerup-grid');
    const powerupCount = $('powerup-count');

    const STORAGE_KEY = 'plinko_settings_v3';

    function openPanel(){
        if (panel) {
            panel.classList.remove('hidden');
            panel.classList.add('open');
            panel.setAttribute('aria-hidden','false');
        }
        if (overlay) overlay.classList.remove('hidden');
    }
    function closePanel(){
        if (panel) {
            panel.classList.remove('open');
            panel.classList.add('hidden');
            panel.setAttribute('aria-hidden','true');
        }
        if (overlay) overlay.classList.add('hidden');
    }

    gear && gear.addEventListener('click', openPanel);
    closeBtn && closeBtn.addEventListener('click', closePanel);
    overlay && overlay.addEventListener('click', closePanel);

    // Expose for inline fallbacks
    window.openAdminPanel = openPanel;
    window.closeAdminPanel = closePanel;

    function applyTuning() {
        if (!window.game) return;
        if (gravityRange) window.game.setTuning('gravity', parseFloat(gravityRange.value));
        if (powerRange) window.game.setTuning('maxPower', parseFloat(powerRange.value));
        if (mouthSpeedRange) window.game.setTuning('mouthSpeed', parseFloat(mouthSpeedRange.value));
    }

    function saveSettings() {
        try {
            const obj = {
                audioMuted: !!window.audioMuted,
                masterVolume: audioVolume ? parseFloat(audioVolume.value) : 1,
                gravity: gravityRange ? parseFloat(gravityRange.value) : null,
                maxPower: powerRange ? parseFloat(powerRange.value) : null,
                mouthSpeed: mouthSpeedRange ? parseFloat(mouthSpeedRange.value) : null,
                shotsPerPlayer: shotsRange ? parseInt(shotsRange.value, 10) : null,
                layout: layoutSelect ? layoutSelect.value : 'classic',
                levelIndex: levelSelect ? parseInt(levelSelect.value, 10) : 0,
                greenPegCount: greenPegRange ? parseInt(greenPegRange.value, 10) : 6,
                twoPlayerMode: twoPlayerToggle ? twoPlayerToggle.checked : false,
                enabledPowerUps: window.game ? window.game.enabledPowerUps : null
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
        } catch (e) {}
    }

    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const obj = JSON.parse(raw);
            if (typeof obj.audioMuted === 'boolean') {
                window.audioMuted = obj.audioMuted;
                if (audioToggle) audioToggle.checked = !window.audioMuted;
            }
            if (typeof obj.masterVolume === 'number' && audioVolume) {
                audioVolume.value = String(obj.masterVolume);
                if (audioVolumeValue) audioVolumeValue.textContent = `${Math.round(obj.masterVolume * 100)}%`;
                AudioHelper.setMasterVolume(obj.masterVolume);
            }
            if (typeof obj.gravity === 'number' && gravityRange) {
                gravityRange.value = String(obj.gravity);
                if (gravityValue) gravityValue.textContent = String(obj.gravity.toFixed(2));
            }
            if (typeof obj.maxPower === 'number' && powerRange) {
                powerRange.value = String(obj.maxPower);
                if (powerValue) powerValue.textContent = String(obj.maxPower.toFixed(1));
            }
            if (typeof obj.mouthSpeed === 'number' && mouthSpeedRange) {
                mouthSpeedRange.value = String(obj.mouthSpeed);
                if (mouthSpeedValue) mouthSpeedValue.textContent = String(obj.mouthSpeed.toFixed(2));
            }
            if (typeof obj.shotsPerPlayer === 'number' && shotsRange) {
                shotsRange.value = String(obj.shotsPerPlayer);
                if (shotsValue) shotsValue.textContent = String(obj.shotsPerPlayer);
                if (window.game) {
                    window.game.setShotsPerPlayer(obj.shotsPerPlayer, true);
                }
            }
            if (obj.layout && layoutSelect) {
                layoutSelect.value = obj.layout;
                if (window.game && typeof window.game.setLayout === 'function' && window.LAYOUTS && window.LAYOUTS[obj.layout]) {
                    window.game.setLayout(window.LAYOUTS[obj.layout]);
                }
            }
            if (typeof obj.levelIndex === 'number' && levelSelect) {
                levelSelect.value = String(obj.levelIndex);
                if (window.game && typeof window.game.setLevel === 'function') {
                    window.game.setLevel(obj.levelIndex);
                }
            }
            if (typeof obj.greenPegCount === 'number' && greenPegRange) {
                greenPegRange.value = String(obj.greenPegCount);
                if (greenPegValue) greenPegValue.textContent = String(obj.greenPegCount);
                if (window.game) {
                    window.game.greenPegCount = obj.greenPegCount;
                }
            }
            if (typeof obj.twoPlayerMode === 'boolean' && twoPlayerToggle) {
                twoPlayerToggle.checked = obj.twoPlayerMode;
                if (window.game) {
                    window.game.twoPlayerMode = obj.twoPlayerMode;
                }
            }
            if (Array.isArray(obj.enabledPowerUps) && window.game) {
                window.game.enabledPowerUps = obj.enabledPowerUps;
            }
        } catch (e) {}
    }

    // Audio toggle
    if (audioToggle) {
        audioToggle.checked = !window.audioMuted;
        audioToggle.addEventListener('change', (e) => {
            window.audioMuted = !e.target.checked;
            saveSettings();
        });
    }

    // Volume slider
    if (audioVolume) {
        const v0 = parseFloat(audioVolume.value) || 1;
        if (audioVolumeValue) audioVolumeValue.textContent = `${Math.round(v0 * 100)}%`;
        audioVolume.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            if (audioVolumeValue) audioVolumeValue.textContent = `${Math.round(v * 100)}%`;
            AudioHelper.setMasterVolume(v);
            saveSettings();
        });
    }

    if (gravityRange) {
        gravityValue.textContent = gravityRange.value;
        gravityRange.addEventListener('input', (e) => {
            gravityValue.textContent = parseFloat(e.target.value).toFixed(2);
        });
        gravityRange.addEventListener('change', () => {
            applyTuning();
            saveSettings();
        });
    }

    if (powerRange) {
        powerValue.textContent = powerRange.value;
        powerRange.addEventListener('input', (e) => {
            powerValue.textContent = parseFloat(e.target.value).toFixed(1);
        });
        powerRange.addEventListener('change', () => {
            applyTuning();
            saveSettings();
        });
    }

    if (mouthSpeedRange) {
        mouthSpeedValue.textContent = mouthSpeedRange.value;
        mouthSpeedRange.addEventListener('input', (e) => {
            mouthSpeedValue.textContent = parseFloat(e.target.value).toFixed(2);
        });
        mouthSpeedRange.addEventListener('change', () => {
            applyTuning();
            saveSettings();
        });
    }

    if (shotsRange) {
        shotsValue.textContent = shotsRange.value;
        shotsRange.addEventListener('input', (e) => {
            shotsValue.textContent = e.target.value;
        });
        shotsRange.addEventListener('change', () => {
            if (window.game) {
                window.game.setShotsPerPlayer(parseInt(shotsRange.value, 10), true);
            }
            saveSettings();
        });
    }

    if (layoutSelect) {
        layoutSelect.addEventListener('change', () => {
            const key = layoutSelect.value;
            if (window.game && typeof window.game.setLayout === 'function' && window.LAYOUTS && window.LAYOUTS[key]) {
                window.game.setLayout(window.LAYOUTS[key]);
            }
            saveSettings();
        });
    }

    if (levelSelect) {
        levelSelect.addEventListener('change', () => {
            if (window.game && typeof window.game.setLevel === 'function') {
                window.game.setLevel(parseInt(levelSelect.value, 10));
            }
            saveSettings();
        });
    }

    if (greenPegRange) {
        greenPegValue.textContent = greenPegRange.value;
        greenPegRange.addEventListener('input', (e) => {
            greenPegValue.textContent = e.target.value;
        });
        greenPegRange.addEventListener('change', () => {
            if (window.game && typeof window.game.setGreenPegCount === 'function') {
                window.game.setGreenPegCount(parseInt(greenPegRange.value, 10));
            }
            saveSettings();
        });
    }

    if (twoPlayerToggle) {
        twoPlayerToggle.checked = false; // Default to single player
        twoPlayerToggle.addEventListener('change', (e) => {
            if (window.game && typeof window.game.setTwoPlayerMode === 'function') {
                window.game.setTwoPlayerMode(e.target.checked);
            }
            saveSettings();
        });
    }

    // =============================================
    // Power-Up Toggle UI
    // =============================================

    function populatePowerUpGrid() {
        if (!powerupGrid || !CONFIG.POWERUPS) return;

        const allPowerUps = Object.keys(CONFIG.POWERUPS);
        const enabledList = window.game ? window.game.enabledPowerUps : allPowerUps;
        const enabledCount = enabledList.length;

        if (powerupCount) {
            powerupCount.textContent = `${enabledCount}/${allPowerUps.length}`;
        }

        powerupGrid.innerHTML = '';

        for (const id of allPowerUps) {
            const powerup = CONFIG.POWERUPS[id];
            const isEnabled = enabledList.includes(id);

            const item = document.createElement('div');
            item.className = 'powerup-item';
            if (isEnabled) item.classList.add('enabled');

            item.innerHTML = `
                <div class="powerup-icon" style="background: ${powerup.color}"></div>
                <div class="powerup-name">${powerup.name}</div>
            `;
            item.title = powerup.desc;

            item.addEventListener('click', () => {
                const nowEnabled = item.classList.toggle('enabled');
                if (window.game && typeof window.game.setPowerUpEnabled === 'function') {
                    window.game.setPowerUpEnabled(id, nowEnabled);
                }
                updatePowerUpCount();
                saveSettings();
            });

            powerupGrid.appendChild(item);
        }
    }

    function updatePowerUpCount() {
        if (!powerupCount || !CONFIG.POWERUPS) return;
        const allPowerUps = Object.keys(CONFIG.POWERUPS);
        const enabledList = window.game ? window.game.enabledPowerUps : allPowerUps;
        powerupCount.textContent = `${enabledList.length}/${allPowerUps.length}`;
    }

    function resetSettings() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}

        window.audioMuted = false;
        if (audioToggle) audioToggle.checked = true;
        if (audioVolume) {
            audioVolume.value = '1';
            if (audioVolumeValue) audioVolumeValue.textContent = '100%';
            AudioHelper.setMasterVolume(1);
        }
        if (gravityRange) {
            gravityRange.value = '0.45';
            gravityValue.textContent = '0.45';
        }
        if (powerRange) {
            powerRange.value = '20';
            powerValue.textContent = '20';
        }
        if (mouthSpeedRange) {
            mouthSpeedRange.value = '2.0';
            mouthSpeedValue.textContent = '2.0';
        }
        if (shotsRange) {
            shotsRange.value = '10';
            shotsValue.textContent = '10';
        }
        if (layoutSelect) {
            layoutSelect.value = 'classic';
            if (window.game && typeof window.game.setLayout === 'function' && window.LAYOUTS && window.LAYOUTS.classic) {
                window.game.setLayout(window.LAYOUTS.classic);
            }
        }
        if (levelSelect) {
            levelSelect.value = '0';
            if (window.game && typeof window.game.setLevel === 'function') {
                window.game.setLevel(0);
            }
        }
        if (greenPegRange) {
            greenPegRange.value = '6';
            greenPegValue.textContent = '6';
        }
        if (twoPlayerToggle) {
            twoPlayerToggle.checked = false;
        }
        applyTuning();
        if (window.game) {
            window.game.setShotsPerPlayer(10, true);
            window.game.setGreenPegCount(6);
            window.game.setTwoPlayerMode(false);
            // Reset all power-ups to enabled
            window.game.enabledPowerUps = Object.keys(CONFIG.POWERUPS);
        }
        populatePowerUpGrid();
        saveSettings();
    }

    resetBtn && resetBtn.addEventListener('click', resetSettings);

    // =============================================
    // Trail Selection UI
    // =============================================

    const trailGrid = $('trail-grid');
    const trailCount = $('trail-count');

    function populateTrailGrid() {
        if (!trailGrid || !window.TrailSystem) return;

        const trails = window.TrailSystem.getAllTrails();
        const unlocked = trails.filter(t => t.isUnlocked).length;

        if (trailCount) {
            trailCount.textContent = `${unlocked}/${trails.length}`;
        }

        trailGrid.innerHTML = '';

        // Sort: unlocked first, then by rarity
        const rarityOrder = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
        trails.sort((a, b) => {
            if (a.isUnlocked !== b.isUnlocked) return b.isUnlocked - a.isUnlocked;
            return rarityOrder[a.rarity] - rarityOrder[b.rarity];
        });

        for (const trail of trails) {
            const item = document.createElement('div');
            item.className = 'trail-item';
            if (!trail.isUnlocked) item.classList.add('locked');
            if (window.TrailSystem.current === trail.id) item.classList.add('selected');

            const rarityColor = window.TrailSystem.rarityColors[trail.rarity] || '#888';

            item.innerHTML = `
                <div class="trail-preview ${trail.id}"></div>
                <div class="trail-name">${trail.name}</div>
                <div class="trail-rarity" style="color: ${rarityColor}">${trail.rarity}</div>
            `;

            if (!trail.isUnlocked) {
                item.title = trail.unlockCondition || 'Locked';
            } else {
                item.title = trail.description || '';
            }

            item.addEventListener('click', () => {
                if (!trail.isUnlocked) return;
                if (window.TrailSystem.select(trail.id)) {
                    // Update selection UI
                    trailGrid.querySelectorAll('.trail-item').forEach(el => {
                        el.classList.remove('selected');
                    });
                    item.classList.add('selected');
                }
            });

            trailGrid.appendChild(item);
        }
    }

    // Populate on load and when panel opens
    setTimeout(populateTrailGrid, 100);
    setTimeout(populatePowerUpGrid, 100);

    // Refresh grids when panel opens (to show new unlocks)
    gear && gear.addEventListener('click', () => {
        setTimeout(populateTrailGrid, 50);
        setTimeout(populatePowerUpGrid, 50);
    });

    // Bottom gear button also opens admin
    const bottomGear = $('bottom-gear');
    bottomGear && bottomGear.addEventListener('click', () => {
        openPanel();
        setTimeout(populateTrailGrid, 50);
        setTimeout(populatePowerUpGrid, 50);
    });

    loadSettings();
    setTimeout(applyTuning, 0);
})();
