/**
 * Simple Sound Manager using WebAudio for short peg-hit sound
 */
class SoundManager {
    constructor() {
        this.ctx = null;
        this._initDeferred = false;
        this.masterGain = null;

        // Try to create AudioContext lazily on first user gesture
        this._bindUnlock();
    }

    _bindUnlock() {
        const resume = () => {
            if (!this.ctx) {
                try {
                    const Ctx = window.AudioContext || window.webkitAudioContext;
                    if (Ctx) {
                        this.ctx = new Ctx();
                        // create master gain for global volume control
                        try {
                            this.masterGain = this.ctx.createGain();
                            this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
                            this.masterGain.connect(this.ctx.destination);
                        } catch (e) {
                            this.masterGain = null;
                        }
                    }
                } catch (e) {
                    this.ctx = null;
                }
            }

            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }

            if (!this._initDeferred) {
                this._initDeferred = true;
                window.removeEventListener('pointerdown', resume);
                window.removeEventListener('touchstart', resume);
                window.removeEventListener('click', resume);
            }
        };

        window.addEventListener('pointerdown', resume, { once: true });
        window.addEventListener('touchstart', resume, { once: true });
        window.addEventListener('click', resume, { once: true });
    }

    playPegHit() {
        if (window.audioMuted) return;
        try {
            if (!this.ctx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (Ctx) this.ctx = new Ctx();
                else return;
            }

            // ensure masterGain exists when ctx created here
            if (this.ctx && !this.masterGain) {
                try {
                    this.masterGain = this.ctx.createGain();
                    this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
                    this.masterGain.connect(this.ctx.destination);
                } catch (e) {
                    this.masterGain = null;
                }
            }

            const now = this.ctx.currentTime;

            // Short burst of filtered noise for metallic body
            const noiseDur = 0.14;
            const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseDur), this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) {
                // white noise with quick decay envelope baked in
                const t = i / data.length;
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
            }
            const noiseSrc = this.ctx.createBufferSource();
            noiseSrc.buffer = buffer;

            const band = this.ctx.createBiquadFilter();
            band.type = 'bandpass';
            band.frequency.value = 2600 + Math.random() * 3000; // 2.6k - 5.6k
            band.Q.value = 8 + Math.random() * 6;

            // narrow stereo pan for peg hits
            const pan = (Math.random() * 2 - 1) * 0.15;
            const panner = this.ctx.createStereoPanner();
            panner.pan.setValueAtTime(pan, this.ctx.currentTime);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.0001, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.6 * 0.9, now + 0.002);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

            noiseSrc.connect(band);
            band.connect(noiseGain);
            noiseGain.connect(panner);
            if (this.masterGain) panner.connect(this.masterGain); else panner.connect(this.ctx.destination);

            noiseSrc.start(now);
            noiseSrc.stop(now + noiseDur);

            // Add a short pitched metallic blip to add tonal 'ring'
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            const baseFreq = 900 + Math.random() * 600; // body pitch
            osc.frequency.setValueAtTime(baseFreq * (1 + (Math.random() - 0.5) * 0.08), now);

            // Gentle downward pitch envelope for realism
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, now + 0.06);

            const oscGain = this.ctx.createGain();
            oscGain.gain.setValueAtTime(0.0001, now);
            oscGain.gain.exponentialRampToValueAtTime(0.5, now + 0.0015);
            oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

            // A little highpass to remove low rumble
            const hp = this.ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 700 + Math.random() * 600;

            osc.connect(hp);
            hp.connect(oscGain);
            oscGain.connect(panner);
            if (this.masterGain) panner.connect(this.masterGain); else panner.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.1);

            // Optional tiny metallic overtone
            if (Math.random() > 0.5) {
                const osc2 = this.ctx.createOscillator();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(3000 + Math.random() * 1500, now);
                const g2 = this.ctx.createGain();
                g2.gain.setValueAtTime(0.0001, now);
                g2.gain.exponentialRampToValueAtTime(0.2, now + 0.002);
                g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
                osc2.connect(g2);
                g2.connect(panner);
                if (this.masterGain) panner.connect(this.masterGain); else panner.connect(this.ctx.destination);
                osc2.start(now);
                osc2.stop(now + 0.09);
            }
        } catch (e) {
            // silent fail
        }
    }

    playWallHit() {
        if (window.audioMuted) return;
        try {
            if (!this.ctx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (Ctx) this.ctx = new Ctx();
                else return;
            }

            // ensure masterGain exists when ctx created here
            if (this.ctx && !this.masterGain) {
                try {
                    this.masterGain = this.ctx.createGain();
                    this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
                    this.masterGain.connect(this.ctx.destination);
                } catch (e) {
                    this.masterGain = null;
                }
            }

            const now = this.ctx.currentTime;

            // Wall hit: lower, less bright than peg hit
            const base = 600 + Math.random() * 400; // 600-1000 Hz
            const cents = (Math.random() * 2 - 1) * 20; // ±20 cents
            const freq = base * Math.pow(2, cents / 1200);

            const pan = (Math.random() * 2 - 1) * 0.1; // narrow pan

            const attack = 0.001;
            const decay = 0.02 + Math.random() * 0.02; // 20-40ms
            const release = 0.008 + Math.random() * 0.01; // 8-18ms
            const totalDur = attack + decay + release + 0.02;

            const panner = this.ctx.createStereoPanner();
            panner.pan.setValueAtTime(pan, now);

            const master = this.ctx.createGain();
            master.gain.setValueAtTime(0.0001, now);
            master.gain.exponentialRampToValueAtTime(0.9, now + attack);
            master.gain.exponentialRampToValueAtTime(0.001, now + attack + decay + release);
            master.connect(panner);
            if (this.masterGain) panner.connect(this.masterGain); else panner.connect(this.ctx.destination);

            // Short, damped noise to simulate impact body
            const noiseDur = Math.max(0.04, decay + release);
            const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseDur), this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) {
                const t = i / data.length;
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.5);
            }

            const noiseSrc = this.ctx.createBufferSource();
            noiseSrc.buffer = buffer;

            // Lowpass to remove high 'ting'
            const lp = this.ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 4200;

            const noiseG = this.ctx.createGain();
            noiseG.gain.setValueAtTime(0.0001, now);
            noiseG.gain.exponentialRampToValueAtTime(0.7, now + attack);
            noiseG.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay + release);

            noiseSrc.connect(lp);
            lp.connect(noiseG);
            noiseG.connect(master);

            noiseSrc.start(now);
            noiseSrc.stop(now + noiseDur);

            // Low-frequency damped tone for body
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);

            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.45, now + attack);
            g.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay + release);

            // Gentle highpass to keep tone clear
            const hp = this.ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 200;

            osc.connect(hp);
            hp.connect(g);
            g.connect(master);

            osc.start(now);
            osc.stop(now + totalDur);

        } catch (e) {
            // silent
        }
    }

    playCelebration() {
        if (window.audioMuted) return;
        try {
            if (!this.ctx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (Ctx) this.ctx = new Ctx(); else return;
            }
            if (this.ctx && !this.masterGain) {
                try {
                    this.masterGain = this.ctx.createGain();
                    this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
                    this.masterGain.connect(this.ctx.destination);
                } catch (e) { this.masterGain = null; }
            }
            const now = this.ctx.currentTime;
            // short rising bell arpeggio
            const freqs = [440, 660, 880, 1100];
            freqs.forEach((f, i) => {
                const osc = this.ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now + i * 0.06);
                const g = this.ctx.createGain();
                g.gain.setValueAtTime(0.0001, now + i * 0.06);
                g.gain.exponentialRampToValueAtTime(0.6 / (i + 1), now + i * 0.06 + 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + 0.28);
                const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
                osc.connect(hp); hp.connect(g); g.connect(this.masterGain || this.ctx.destination);
                osc.start(now + i * 0.06);
                osc.stop(now + i * 0.06 + 0.3);
            });
        } catch (e) {
            // ignore
        }
    }

    playBucketHit() {
        if (window.audioMuted) return;
        try {
            if (!this.ctx) {
                const Ctx = window.AudioContext || window.webkitAudioContext;
                if (Ctx) this.ctx = new Ctx(); else return;
            }
            if (this.ctx && !this.masterGain) {
                try {
                    this.masterGain = this.ctx.createGain();
                    this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime);
                    this.masterGain.connect(this.ctx.destination);
                } catch (e) { this.masterGain = null; }
            }

            const now = this.ctx.currentTime;

            // Small bright chime for landing in bucket
            const baseFreq = 1200 + Math.random() * 600; // 1.2k - 1.8k
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, now);

            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.6, now + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

            // subtle quick overtone for character
            if (Math.random() > 0.5) {
                const o2 = this.ctx.createOscillator();
                o2.type = 'triangle';
                o2.frequency.setValueAtTime(baseFreq * (1.9 + Math.random() * 0.6), now);
                const g2 = this.ctx.createGain();
                g2.gain.setValueAtTime(0.0001, now);
                g2.gain.exponentialRampToValueAtTime(0.25, now + 0.006);
                g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
                o2.connect(g2);
                g2.connect(this.masterGain || this.ctx.destination);
                o2.start(now);
                o2.stop(now + 0.13);
            }

            // tiny filtered noise to give a quick click
            const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.06), this.ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < data.length; i++) {
                const t = i / data.length;
                data[i] = (Math.random() * 2 - 1) * (1 - t);
            }
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            const hp = this.ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
            const ng = this.ctx.createGain();
            ng.gain.setValueAtTime(0.0001, now);
            ng.gain.exponentialRampToValueAtTime(0.35, now + 0.002);
            ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
            src.connect(hp);
            hp.connect(ng);
            ng.connect(this.masterGain || this.ctx.destination);

            osc.connect(g);
            g.connect(this.masterGain || this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.14);
            src.start(now);
            src.stop(now + 0.06);
        } catch (e) {
            // silent
        }
    }
}

// Expose a simple global audio manager
try {
    window.audioManager = new SoundManager();
    // expose a simple API for admin controls
    window.audioManager.setMasterVolume = function(v){
        try{
            if (window.audioManager.masterGain && window.audioManager.ctx) {
                window.audioManager.masterGain.gain.setValueAtTime(Number(v), window.audioManager.ctx.currentTime);
            }
        } catch(e) {}
    };
} catch (e) {
    // ignore
}
