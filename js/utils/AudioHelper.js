/**
 * AudioHelper - Centralized audio playback utility
 * Eliminates try-catch and null-check boilerplate throughout codebase
 */
const AudioHelper = {
    /**
     * Play a sound by name with optional parameters
     * @param {string} soundName - The sound method name (without 'play' prefix)
     *                             e.g., 'PegHit' calls audioManager.playPegHit()
     * @param {Object} options - Optional parameters to pass to the sound method
     */
    play(soundName, options = {}) {
        if (!window.audioManager) return;

        const method = `play${soundName}`;
        if (typeof window.audioManager[method] === 'function') {
            try {
                window.audioManager[method](options);
            } catch (e) {
                console.warn(`Audio error playing ${soundName}:`, e);
            }
        }
    },

    /**
     * Play a sound with debouncing (prevents rapid repeated sounds)
     * @param {Object} owner - Object to store debounce timestamp on (usually ball)
     * @param {string} soundName - The sound method name (without 'play' prefix)
     * @param {number} debounceMs - Minimum milliseconds between plays (default 80)
     * @param {Object} options - Optional parameters to pass to the sound method
     */
    playDebounced(owner, soundName, debounceMs = 80, options = {}) {
        const key = `_lastSound_${soundName}`;
        const now = performance.now();

        if (!owner[key] || now - owner[key] > debounceMs) {
            owner[key] = now;
            this.play(soundName, options);
        }
    },

    /**
     * Set the master volume
     * @param {number} volume - Volume level (0-1)
     */
    setMasterVolume(volume) {
        if (window.audioManager && typeof window.audioManager.setMasterVolume === 'function') {
            window.audioManager.setMasterVolume(volume);
        }
    },

    /**
     * Check if audio is available
     * @returns {boolean}
     */
    isAvailable() {
        return !!window.audioManager;
    }
};

// Make available globally
window.AudioHelper = AudioHelper;
