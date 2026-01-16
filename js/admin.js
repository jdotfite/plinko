// Admin panel behavior
(function(){
    function $(id){ return document.getElementById(id); }

    const gear = $('admin-gear');
    const panel = $('admin-panel');
    const overlay = $('admin-overlay');
    const closeBtn = $('admin-close');
    const audioToggle = $('audio-toggle');
    const audioVolume = $('audio-volume');
    const audioVolumeValue = $('audio-volume-value');
    const burstRange = $('burst-count-range');
    const burstValue = $('burst-count-value');
    const slotRange = $('slot-count-range');
    const slotValue = $('slot-count-value');
    const themeSelect = $('theme-select');
    const trailSelect = $('trail-select');
    const STORAGE_KEY = 'plinko_settings_v1';
    const resetBtn = $('admin-reset');

    function openPanel(){
        panel && panel.classList.remove('hidden');
        panel && panel.classList.add('open');
        overlay && overlay.classList.remove('hidden');
    }
    function closePanel(){
        panel && panel.classList.remove('open');
        panel && panel.classList.add('hidden');
        overlay && overlay.classList.add('hidden');
    }

    gear && gear.addEventListener('click', openPanel);
    closeBtn && closeBtn.addEventListener('click', closePanel);
    overlay && overlay.addEventListener('click', closePanel);

    // Expose for inline fallbacks
    window.openAdminPanel = openPanel;
    window.closeAdminPanel = closePanel;

    // Audio toggle (checkbox)
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
            if (window.audioManager && typeof window.audioManager.setMasterVolume === 'function') {
                window.audioManager.setMasterVolume(v);
            }
            saveSettings();
        });
    }

    // Burst count (coins per click)
    if (burstRange) {
        burstValue.textContent = burstRange.value;
        burstRange.addEventListener('input', (e) => {
            burstValue.textContent = e.target.value;
        });
        burstRange.addEventListener('change', (e) => {
            const v = parseInt(e.target.value) || 1;
            CONFIG.BALL.burstCount = v;
            saveSettings();
        });
    }

    // Slot count (buckets) - limit to only 3 or 5 using a stepped range
    if (slotRange) {
        // restrict slider to 3 and 5 only
        slotRange.min = 3;
        slotRange.max = 5;
        slotRange.step = 2;

        try {
            // prefer live game value if available
            const live = (window.game && Array.isArray(window.game.slots)) ? window.game.slots.length : null;
            const cfg = (CONFIG.SLOTS && Array.isArray(CONFIG.SLOTS.values)) ? CONFIG.SLOTS.values.length : null;
            const initial = live || cfg || parseInt(slotRange.value) || 5;
            const start = (initial === 3 || initial === 5) ? initial : 5;
            slotRange.value = start;
            if (slotValue) slotValue.textContent = start;
        } catch (e) {
            if (slotValue) slotValue.textContent = slotRange.value;
        }

        slotRange.addEventListener('input', (e) => {
            const raw = parseInt(e.target.value) || 5;
            const val = (raw === 3) ? 3 : 5;
            if (slotValue) slotValue.textContent = val;
            // update label inputs to match preview count and persist choice immediately
            try { renderSlotLabelInputs(val); } catch (err) {}
            saveSettings();
        });

        slotRange.addEventListener('change', (e) => {
            let n = parseInt(e.target.value) || 5;
            n = (n === 3) ? 3 : 5;
            console.log('[admin] Slot count change ->', n);
            if (window.game && typeof window.game.setSlotCount === 'function') {
                window.game.setSlotCount(n);
                // regenerate label inputs for new count and apply any labels
                renderSlotLabelInputs(n);
                if (window.game && typeof window.game.setSlotLabels === 'function') {
                    // apply current admin labels (trim/pad to n)
                    const labelsToApply = slotLabels.slice(0, n);
                    while (labelsToApply.length < n) labelsToApply.push('');
                    window.game.setSlotLabels(labelsToApply);
                    saveSettings();
                }
            } else {
                console.warn('[admin] Game instance not ready to set slot count');
                // ensure UI and labels persist even when the game isn't ready
                renderSlotLabelInputs(n);
                saveSettings();
            }
        });
    }

    // --- Slot label inputs management ---
    const labelsContainer = $('slot-labels');
    // Keep an in-memory labels array
    let slotLabels = [];

    function renderSlotLabelInputs(count) {
        if (!labelsContainer) return;
        labelsContainer.innerHTML = '';
        const n = Math.max(1, Math.floor(count));
        // Try to seed from existing game slot labels if present
        if (window.game && window.game.slots && slotLabels.length === 0) {
            slotLabels = window.game.slots.map(s => s.label || '');
        }
        // Ensure array sized
        while (slotLabels.length < n) slotLabels.push('');
        slotLabels = slotLabels.slice(0, n);

        for (let i = 0; i < n; i++) {
            const row = document.createElement('div');
            row.className = 'slot-label-row';
            const lbl = document.createElement('div');
            lbl.className = 'slot-label-index';
            lbl.textContent = `#${i+1}`;
            const input = document.createElement('input');
            input.className = 'slot-label-input';
            input.type = 'text';
            input.placeholder = `Label ${i+1}`;
            input.value = slotLabels[i] || '';
            input.dataset.index = String(i);
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                slotLabels[idx] = e.target.value;
                // apply immediately if game present
                if (window.game && typeof window.game.setSlotLabels === 'function') {
                    window.game.setSlotLabels(slotLabels.slice(0, window.game.slots.length));
                }
                // Always persist label edits to localStorage so they aren't lost
                saveSettings();
            });
            row.appendChild(lbl);
            row.appendChild(input);
            labelsContainer.appendChild(row);
        }
    }

    // initialize slot label inputs on load
    try {
        const initialCount = parseInt(slotRange.value) || 5;
        renderSlotLabelInputs(initialCount);
    } catch (e) {}

    // Persist settings to localStorage
    function saveSettings() {
        try {
            const obj = {
                audioMuted: !!window.audioMuted,
                masterVolume: audioVolume ? parseFloat(audioVolume.value) : 1,
                burstCount: CONFIG.BALL.burstCount || (burstRange ? parseInt(burstRange.value) : 1),
                slotCount: slotRange ? parseInt(slotRange.value) : null,
                slotLabels: slotLabels || [],
                    theme: (THEME_STATE && THEME_STATE.current) ? THEME_STATE.current : null,
                    trailEffect: (window.currentTrailType) ? window.currentTrailType : null
            };
            const json = JSON.stringify(obj);
            localStorage.setItem(STORAGE_KEY, json);
            console.debug('[admin] saveSettings ->', obj);
        } catch (e) {
            console.warn('[admin] saveSettings failed', e);
        }
    }

    // Load settings from localStorage and apply to UI + game
    function loadSettings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            console.debug('[admin] loadSettings raw ->', raw);
            if (!raw) return;
            const obj = JSON.parse(raw);
            console.debug('[admin] loadSettings parsed ->', obj);
            if (typeof obj.audioMuted === 'boolean') {
                window.audioMuted = obj.audioMuted;
                if (audioToggle) audioToggle.checked = !window.audioMuted;
            }
            if (typeof obj.masterVolume === 'number' && audioVolume) {
                audioVolume.value = String(obj.masterVolume);
                if (audioVolumeValue) audioVolumeValue.textContent = `${Math.round(obj.masterVolume * 100)}%`;
                if (window.audioManager && typeof window.audioManager.setMasterVolume === 'function') {
                    window.audioManager.setMasterVolume(obj.masterVolume);
                }
            }
            if (typeof obj.burstCount === 'number' && burstRange) {
                burstRange.value = String(obj.burstCount);
                if (burstValue) burstValue.textContent = String(obj.burstCount);
                CONFIG.BALL.burstCount = obj.burstCount;
            }
            if (typeof obj.slotCount === 'number' && slotRange) {
                const sc = (obj.slotCount === 3 || obj.slotCount === 5) ? obj.slotCount : null;
                if (sc) {
                    slotRange.value = String(sc);
                    if (slotValue) slotValue.textContent = String(sc);
                }
            }
            if (Array.isArray(obj.slotLabels)) {
                slotLabels = obj.slotLabels.slice();
            }
            if (obj.theme && themeSelect) {
                themeSelect.value = obj.theme;
                if (THEME_STATE) THEME_STATE.current = obj.theme;
                if (window.themeManager && typeof window.themeManager.applyTheme === 'function') {
                    window.themeManager.applyTheme();
                }
            }
            if (obj.trailEffect && trailSelect) {
                trailSelect.value = obj.trailEffect;
                window.currentTrailType = obj.trailEffect;
            }

            const finalCount = (slotRange) ? parseInt(slotRange.value) : null;
            if (finalCount && window.game && typeof window.game.setSlotCount === 'function') {
                window.game.setSlotCount(finalCount);
                renderSlotLabelInputs(finalCount);
                const labelsToApply = (slotLabels || []).slice(0, finalCount);
                while (labelsToApply.length < finalCount) labelsToApply.push('');
                if (window.game && typeof window.game.setSlotLabels === 'function') {
                    window.game.setSlotLabels(labelsToApply);
                }
            } else if (slotRange) {
                renderSlotLabelInputs(parseInt(slotRange.value));
            }
        } catch (e) {
            console.warn('[admin] loadSettings failed', e);
        }
    }

    // Load any saved settings now
    loadSettings();

    // If the game initializes after this script, sync the slot slider
    // to the live game's slot count (clamped to allowed values).
    (function syncSlotsOnce(){
        if (!slotRange) return;
        // Check localStorage for a saved slotCount preference
        let savedCount = null;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed.slotCount === 'number') {
                    savedCount = (parsed.slotCount === 3 || parsed.slotCount === 5) ? parsed.slotCount : null;
                }
            }
        } catch (e) { savedCount = null; }

        let tries = 0;
        const id = setInterval(() => {
            tries++;
            if (window.game && Array.isArray(window.game.slots)) {
                // If user previously saved a preference, apply it to the live game
                if (savedCount) {
                    try {
                        if (typeof window.game.setSlotCount === 'function') {
                            window.game.setSlotCount(savedCount);
                        }
                        slotRange.value = String(savedCount);
                        if (slotValue) slotValue.textContent = String(savedCount);
                        renderSlotLabelInputs(savedCount);
                    } catch (e) {
                        console.warn('[admin] failed to apply saved slotCount to game', e);
                    }
                } else {
                    // No saved preference — reflect live game value into the UI
                    const n = window.game.slots.length;
                    const val = (n === 3) ? 3 : 5;
                    slotRange.value = String(val);
                    if (slotValue) slotValue.textContent = String(val);
                    try { renderSlotLabelInputs(val); } catch (e) {}
                }

                clearInterval(id);
            } else if (tries > 40) {
                clearInterval(id);
            }
        }, 150);
    })();

    // Reset settings handler
    function resetSettings() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}

        // Reset UI + runtime values to defaults
        window.audioMuted = false;
        if (audioToggle) audioToggle.checked = true;
        if (audioVolume) {
            audioVolume.value = '1';
            if (audioVolumeValue) audioVolumeValue.textContent = '100%';
            if (window.audioManager && typeof window.audioManager.setMasterVolume === 'function') {
                window.audioManager.setMasterVolume(1);
            }
        }
        if (burstRange) {
            burstRange.value = String(CONFIG.BALL.burstCount || 1);
            if (burstValue) burstValue.textContent = String(CONFIG.BALL.burstCount || 1);
        }

        let defaultSlots = (CONFIG.SLOTS && Array.isArray(CONFIG.SLOTS.values)) ? CONFIG.SLOTS.values.length : 5;
        defaultSlots = (defaultSlots === 3 || defaultSlots === 5) ? defaultSlots : 5;
        if (slotRange) {
            slotRange.value = String(defaultSlots);
            if (slotValue) slotValue.textContent = String(defaultSlots);
        }
        slotLabels = [];
        renderSlotLabelInputs(defaultSlots);

        if (window.game && typeof window.game.setSlotCount === 'function') {
            window.game.setSlotCount(defaultSlots);
            if (window.game && typeof window.game.setSlotLabels === 'function') {
                const labelsToApply = new Array(defaultSlots).fill('');
                window.game.setSlotLabels(labelsToApply);
            }
        }

        if (themeSelect) {
            themeSelect.value = 'light';
            if (THEME_STATE) THEME_STATE.current = 'light';
            if (window.themeManager && typeof window.themeManager.applyTheme === 'function') {
                window.themeManager.applyTheme();
            }
        }

        // persist cleared defaults
        saveSettings();
    }

    resetBtn && resetBtn.addEventListener('click', resetSettings);

    // Theme selector
    if (themeSelect) {
        themeSelect.value = (THEME_STATE && THEME_STATE.current) ? THEME_STATE.current : 'light';
        themeSelect.addEventListener('change', (e) => {
            const t = e.target.value;
            if (THEME_STATE) THEME_STATE.current = t;
            if (window.themeManager && typeof window.themeManager.applyTheme === 'function') {
                window.themeManager.applyTheme();
                if (window.game && window.game.renderer) {
                    window.game.renderer.staticDirty = true;
                    window.game.renderer.renderStatic(window.game.board, window.game.pegs, window.game.slots, window.game.slotDividers);
                }
                if (typeof window.themeManager.updateButtonIcon === 'function') {
                    window.themeManager.updateButtonIcon();
                }
            }
        });
    }

    // Trail selector
    if (trailSelect) {
        // Set default if not present
        const defaultTrail = 'off';
        trailSelect.value = window.currentTrailType || defaultTrail;
        window.currentTrailType = trailSelect.value;
        trailSelect.addEventListener('change', (e) => {
            const t = e.target.value;
            window.currentTrailType = t;
            // persist choice
            saveSettings();
        });
    }

})();
