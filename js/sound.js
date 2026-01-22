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

    playPegHit(arg) {
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

            // parse args: allow either a numeric variant or an options object
            let variant = 0;
            let pitchFactor = 1.0;
            let panOverride = null;
            if (typeof arg === 'number') variant = arg;
            else if (arg && typeof arg === 'object') {
                if (typeof arg.variant === 'number') variant = arg.variant;
                if (typeof arg.pitch === 'number') pitchFactor = arg.pitch;
                if (typeof arg.pan === 'number') panOverride = arg.pan;
            }

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
            const pan = (panOverride !== null) ? panOverride : (Math.random() * 2 - 1) * 0.15;
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
            const baseFreq = (900 + Math.random() * 600) * pitchFactor; // body pitch adjusted by pitchFactor
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

    playCannon() {
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
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(160, now);
            osc.frequency.exponentialRampToValueAtTime(90, now + 0.08);

            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.7, now + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

            osc.connect(g);
            g.connect(this.masterGain || this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.14);
        } catch (e) {
            // ignore
        }
    }

    /**
     * Orange peg hit - higher pitched, more satisfying "ding"
     * Accepts options: { pitch: number, pan: number }
     */
    playOrangePegHit(opts) {
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

            // Parse options
            let pitchFactor = 1.0;
            let panValue = 0;
            if (opts && typeof opts === 'object') {
                if (typeof opts.pitch === 'number') pitchFactor = opts.pitch;
                if (typeof opts.pan === 'number') panValue = opts.pan;
            }

            // Stereo panning
            const panner = this.ctx.createStereoPanner();
            panner.pan.setValueAtTime(panValue, now);
            panner.connect(this.masterGain || this.ctx.destination);

            // Bright, satisfying bell tone for orange peg (scaled by pitch)
            const baseFreq = (1400 + Math.random() * 400) * pitchFactor;

            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, now + 0.15);

            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.65, now + 0.005);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

            // Harmonic overtone for brightness
            const osc2 = this.ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(baseFreq * 2, now);

            const g2 = this.ctx.createGain();
            g2.gain.setValueAtTime(0.0001, now);
            g2.gain.exponentialRampToValueAtTime(0.3, now + 0.004);
            g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

            // Third harmonic for extra shimmer
            const osc3 = this.ctx.createOscillator();
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(baseFreq * 3, now);

            const g3 = this.ctx.createGain();
            g3.gain.setValueAtTime(0.0001, now);
            g3.gain.exponentialRampToValueAtTime(0.15, now + 0.003);
            g3.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

            osc.connect(g);
            osc2.connect(g2);
            osc3.connect(g3);
            g.connect(panner);
            g2.connect(panner);
            g3.connect(panner);

            osc.start(now);
            osc.stop(now + 0.22);
            osc2.start(now);
            osc2.stop(now + 0.14);
            osc3.start(now);
            osc3.stop(now + 0.1);

        } catch (e) {
            // silent
        }
    }

    /**
     * Kerplunk sound - satisfying deep plunk when ball falls into hole
     * Now with celebratory chimes!
     */
    playKerplunk() {
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
            const dest = this.masterGain || this.ctx.destination;

            // === Layer 1: Deep resonant "plunk" tone ===
            const plunkFreq = 90 + Math.random() * 20;
            const plunk = this.ctx.createOscillator();
            plunk.type = 'sine';
            plunk.frequency.setValueAtTime(plunkFreq * 1.6, now);
            plunk.frequency.exponentialRampToValueAtTime(plunkFreq, now + 0.06);
            plunk.frequency.exponentialRampToValueAtTime(plunkFreq * 0.8, now + 0.2);

            const plunkGain = this.ctx.createGain();
            plunkGain.gain.setValueAtTime(0.0001, now);
            plunkGain.gain.exponentialRampToValueAtTime(0.6, now + 0.012);
            plunkGain.gain.exponentialRampToValueAtTime(0.3, now + 0.08);
            plunkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

            const plunkLP = this.ctx.createBiquadFilter();
            plunkLP.type = 'lowpass';
            plunkLP.frequency.value = 500;

            plunk.connect(plunkLP);
            plunkLP.connect(plunkGain);
            plunkGain.connect(dest);
            plunk.start(now);
            plunk.stop(now + 0.35);

            // === Layer 2: Quick impact thud ===
            const thunkFreq = 200 + Math.random() * 40;
            const thunk = this.ctx.createOscillator();
            thunk.type = 'triangle';
            thunk.frequency.setValueAtTime(thunkFreq * 1.3, now);
            thunk.frequency.exponentialRampToValueAtTime(thunkFreq * 0.5, now + 0.05);

            const thunkGain = this.ctx.createGain();
            thunkGain.gain.setValueAtTime(0.0001, now);
            thunkGain.gain.exponentialRampToValueAtTime(0.4, now + 0.006);
            thunkGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

            thunk.connect(thunkGain);
            thunkGain.connect(dest);
            thunk.start(now);
            thunk.stop(now + 0.12);

            // === Layer 3: Celebratory rising chimes! ===
            const chimeNotes = [523.25, 659.25, 783.99]; // C5, E5, G5 - major chord arpeggio
            const chimeStart = now + 0.04; // Slight delay after plunk

            chimeNotes.forEach((freq, i) => {
                const startTime = chimeStart + i * 0.06;

                // Main chime tone
                const chime = this.ctx.createOscillator();
                chime.type = 'sine';
                chime.frequency.setValueAtTime(freq, startTime);

                const chimeGain = this.ctx.createGain();
                chimeGain.gain.setValueAtTime(0.0001, startTime);
                chimeGain.gain.exponentialRampToValueAtTime(0.3 - i * 0.05, startTime + 0.015);
                chimeGain.gain.exponentialRampToValueAtTime(0.15, startTime + 0.1);
                chimeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.4);

                // Shimmer overtone
                const shimmer = this.ctx.createOscillator();
                shimmer.type = 'sine';
                shimmer.frequency.setValueAtTime(freq * 2, startTime);

                const shimmerGain = this.ctx.createGain();
                shimmerGain.gain.setValueAtTime(0.0001, startTime);
                shimmerGain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.01);
                shimmerGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);

                chime.connect(chimeGain);
                shimmer.connect(shimmerGain);
                chimeGain.connect(dest);
                shimmerGain.connect(dest);

                chime.start(startTime);
                chime.stop(startTime + 0.45);
                shimmer.start(startTime);
                shimmer.stop(startTime + 0.3);
            });

            // === Layer 4: Sparkle noise for magic feel ===
            const sparkleDur = 0.15;
            const sparkleBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * sparkleDur), this.ctx.sampleRate);
            const sparkleData = sparkleBuffer.getChannelData(0);
            for (let i = 0; i < sparkleData.length; i++) {
                const t = i / sparkleData.length;
                // Sparkly noise that fades in then out
                const envelope = Math.sin(t * Math.PI) * Math.pow(1 - t, 1.5);
                sparkleData[i] = (Math.random() * 2 - 1) * envelope;
            }

            const sparkleSrc = this.ctx.createBufferSource();
            sparkleSrc.buffer = sparkleBuffer;

            // High pass for bright sparkle
            const sparkleHP = this.ctx.createBiquadFilter();
            sparkleHP.type = 'highpass';
            sparkleHP.frequency.value = 3000;

            const sparkleGain = this.ctx.createGain();
            sparkleGain.gain.setValueAtTime(0.0001, now + 0.05);
            sparkleGain.gain.exponentialRampToValueAtTime(0.2, now + 0.08);
            sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

            sparkleSrc.connect(sparkleHP);
            sparkleHP.connect(sparkleGain);
            sparkleGain.connect(dest);
            sparkleSrc.start(now + 0.05);
            sparkleSrc.stop(now + 0.05 + sparkleDur);

            // === Layer 5: Final triumphant high note ===
            const triumphStart = now + 0.22;
            const triumph = this.ctx.createOscillator();
            triumph.type = 'sine';
            triumph.frequency.setValueAtTime(1046.50, triumphStart); // C6 - octave above

            const triumphGain = this.ctx.createGain();
            triumphGain.gain.setValueAtTime(0.0001, triumphStart);
            triumphGain.gain.exponentialRampToValueAtTime(0.25, triumphStart + 0.02);
            triumphGain.gain.exponentialRampToValueAtTime(0.1, triumphStart + 0.15);
            triumphGain.gain.exponentialRampToValueAtTime(0.0001, triumphStart + 0.5);

            triumph.connect(triumphGain);
            triumphGain.connect(dest);
            triumph.start(triumphStart);
            triumph.stop(triumphStart + 0.55);

        } catch (e) {
            // silent fail
        }
    }

    /**
     * Extreme Fever fanfare - triumphant rising arpeggio
     */
    playFanfare() {
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

            // Triumphant Peggle-style arpeggio: C5 → E5 → G5 → C6
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            const spacing = 0.12;

            notes.forEach((freq, i) => {
                const startTime = now + i * spacing;

                // Main tone
                const osc = this.ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);

                const g = this.ctx.createGain();
                g.gain.setValueAtTime(0.0001, startTime);
                g.gain.exponentialRampToValueAtTime(0.5, startTime + 0.02);
                g.gain.exponentialRampToValueAtTime(0.25, startTime + 0.2);
                g.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

                // Bright harmonic
                const osc2 = this.ctx.createOscillator();
                osc2.type = 'triangle';
                osc2.frequency.setValueAtTime(freq * 2, startTime);

                const g2 = this.ctx.createGain();
                g2.gain.setValueAtTime(0.0001, startTime);
                g2.gain.exponentialRampToValueAtTime(0.2, startTime + 0.015);
                g2.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

                osc.connect(g);
                osc2.connect(g2);
                g.connect(this.masterGain || this.ctx.destination);
                g2.connect(this.masterGain || this.ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 0.55);
                osc2.start(startTime);
                osc2.stop(startTime + 0.35);
            });

            // Final sustained chord (C major)
            const chordStart = now + notes.length * spacing;
            const chordFreqs = [523.25, 659.25, 783.99, 1046.50];

            chordFreqs.forEach((freq) => {
                const osc = this.ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, chordStart);

                const g = this.ctx.createGain();
                g.gain.setValueAtTime(0.0001, chordStart);
                g.gain.exponentialRampToValueAtTime(0.35, chordStart + 0.05);
                g.gain.exponentialRampToValueAtTime(0.0001, chordStart + 1.2);

                osc.connect(g);
                g.connect(this.masterGain || this.ctx.destination);
                osc.start(chordStart);
                osc.stop(chordStart + 1.3);
            });

        } catch (e) {
            // silent
        }
    }

    /**
     * Rim hit sound - metallic basketball rim clang
     */
    playRimHit() {
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
            const dest = this.masterGain || this.ctx.destination;

            // === Layer 1: Metallic ring - the main "clang" ===
            const ringFreq = 800 + Math.random() * 200;
            const ring = this.ctx.createOscillator();
            ring.type = 'triangle';
            ring.frequency.setValueAtTime(ringFreq * 1.2, now);
            ring.frequency.exponentialRampToValueAtTime(ringFreq, now + 0.02);
            ring.frequency.exponentialRampToValueAtTime(ringFreq * 0.85, now + 0.15);

            const ringGain = this.ctx.createGain();
            ringGain.gain.setValueAtTime(0.0001, now);
            ringGain.gain.exponentialRampToValueAtTime(0.7, now + 0.003);
            ringGain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
            ringGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

            ring.connect(ringGain);
            ringGain.connect(dest);
            ring.start(now);
            ring.stop(now + 0.28);

            // === Layer 2: High harmonic for metallic shimmer ===
            const shimmer = this.ctx.createOscillator();
            shimmer.type = 'sine';
            shimmer.frequency.setValueAtTime(ringFreq * 2.5, now);
            shimmer.frequency.exponentialRampToValueAtTime(ringFreq * 2, now + 0.1);

            const shimmerGain = this.ctx.createGain();
            shimmerGain.gain.setValueAtTime(0.0001, now);
            shimmerGain.gain.exponentialRampToValueAtTime(0.35, now + 0.002);
            shimmerGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

            shimmer.connect(shimmerGain);
            shimmerGain.connect(dest);
            shimmer.start(now);
            shimmer.stop(now + 0.15);

            // === Layer 3: Low body thud ===
            const thud = this.ctx.createOscillator();
            thud.type = 'sine';
            thud.frequency.setValueAtTime(180, now);
            thud.frequency.exponentialRampToValueAtTime(100, now + 0.05);

            const thudGain = this.ctx.createGain();
            thudGain.gain.setValueAtTime(0.0001, now);
            thudGain.gain.exponentialRampToValueAtTime(0.5, now + 0.004);
            thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

            thud.connect(thudGain);
            thudGain.connect(dest);
            thud.start(now);
            thud.stop(now + 0.1);

            // === Layer 4: Impact noise burst ===
            const noiseDur = 0.08;
            const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseDur), this.ctx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseData.length; i++) {
                const t = i / noiseData.length;
                noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
            }

            const noiseSrc = this.ctx.createBufferSource();
            noiseSrc.buffer = noiseBuffer;

            const noiseBP = this.ctx.createBiquadFilter();
            noiseBP.type = 'bandpass';
            noiseBP.frequency.value = 2000;
            noiseBP.Q.value = 2;

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.0001, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.4, now + 0.002);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

            noiseSrc.connect(noiseBP);
            noiseBP.connect(noiseGain);
            noiseGain.connect(dest);
            noiseSrc.start(now);
            noiseSrc.stop(now + noiseDur);

        } catch (e) {
            // silent
        }
    }

    /**
     * Power-up activation sound - magical zap + whoosh
     */
    playPowerUp() {
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
            const dest = this.masterGain || this.ctx.destination;

            // === Layer 1: Rising synth sweep ===
            const sweep = this.ctx.createOscillator();
            sweep.type = 'sawtooth';
            sweep.frequency.setValueAtTime(200, now);
            sweep.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
            sweep.frequency.exponentialRampToValueAtTime(800, now + 0.3);

            const sweepGain = this.ctx.createGain();
            sweepGain.gain.setValueAtTime(0.0001, now);
            sweepGain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
            sweepGain.gain.exponentialRampToValueAtTime(0.15, now + 0.15);
            sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

            // Low pass to smooth the sawtooth
            const sweepLP = this.ctx.createBiquadFilter();
            sweepLP.type = 'lowpass';
            sweepLP.frequency.setValueAtTime(1500, now);
            sweepLP.frequency.exponentialRampToValueAtTime(4000, now + 0.15);

            sweep.connect(sweepLP);
            sweepLP.connect(sweepGain);
            sweepGain.connect(dest);
            sweep.start(now);
            sweep.stop(now + 0.4);

            // === Layer 2: Magical chime burst ===
            const chimeNotes = [659.25, 880, 1046.50, 1318.51]; // E5, A5, C6, E6
            chimeNotes.forEach((freq, i) => {
                const startTime = now + 0.02 + i * 0.03;

                const chime = this.ctx.createOscillator();
                chime.type = 'sine';
                chime.frequency.setValueAtTime(freq, startTime);

                const chimeGain = this.ctx.createGain();
                chimeGain.gain.setValueAtTime(0.0001, startTime);
                chimeGain.gain.exponentialRampToValueAtTime(0.35 - i * 0.05, startTime + 0.01);
                chimeGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

                chime.connect(chimeGain);
                chimeGain.connect(dest);
                chime.start(startTime);
                chime.stop(startTime + 0.35);
            });

            // === Layer 3: Electric zap noise ===
            const zapDur = 0.1;
            const zapBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * zapDur), this.ctx.sampleRate);
            const zapData = zapBuffer.getChannelData(0);
            for (let i = 0; i < zapData.length; i++) {
                const t = i / zapData.length;
                zapData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 1.5);
            }

            const zapSrc = this.ctx.createBufferSource();
            zapSrc.buffer = zapBuffer;

            const zapHP = this.ctx.createBiquadFilter();
            zapHP.type = 'highpass';
            zapHP.frequency.value = 2000;

            const zapGain = this.ctx.createGain();
            zapGain.gain.setValueAtTime(0.0001, now);
            zapGain.gain.exponentialRampToValueAtTime(0.4, now + 0.005);
            zapGain.gain.exponentialRampToValueAtTime(0.0001, now + zapDur);

            zapSrc.connect(zapHP);
            zapHP.connect(zapGain);
            zapGain.connect(dest);
            zapSrc.start(now);
            zapSrc.stop(now + zapDur);

            // === Layer 4: Deep power thump ===
            const thump = this.ctx.createOscillator();
            thump.type = 'sine';
            thump.frequency.setValueAtTime(100, now);
            thump.frequency.exponentialRampToValueAtTime(60, now + 0.1);

            const thumpGain = this.ctx.createGain();
            thumpGain.gain.setValueAtTime(0.0001, now);
            thumpGain.gain.exponentialRampToValueAtTime(0.5, now + 0.01);
            thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

            thump.connect(thumpGain);
            thumpGain.connect(dest);
            thump.start(now);
            thump.stop(now + 0.18);

        } catch (e) {
            // silent
        }
    }

    /**
     * Ball clack sound - balls clacking as they drop into magazine
     * Accepts options: { pitch: number }
     */
    playBallClack(opts) {
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
            const dest = this.masterGain || this.ctx.destination;

            // Parse options
            let pitchFactor = 1.0;
            if (opts && typeof opts === 'object') {
                if (typeof opts.pitch === 'number') pitchFactor = opts.pitch;
            }

            // === Layer 1: Short percussive click (ball impact) ===
            const clickFreq = (1800 + Math.random() * 400) * pitchFactor;
            const click = this.ctx.createOscillator();
            click.type = 'sine';
            click.frequency.setValueAtTime(clickFreq, now);
            click.frequency.exponentialRampToValueAtTime(clickFreq * 0.6, now + 0.03);

            const clickGain = this.ctx.createGain();
            clickGain.gain.setValueAtTime(0.0001, now);
            clickGain.gain.exponentialRampToValueAtTime(0.35, now + 0.002);
            clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

            click.connect(clickGain);
            clickGain.connect(dest);
            click.start(now);
            click.stop(now + 0.06);

            // === Layer 2: Lower body thud ===
            const thudFreq = (400 + Math.random() * 100) * pitchFactor;
            const thud = this.ctx.createOscillator();
            thud.type = 'triangle';
            thud.frequency.setValueAtTime(thudFreq, now);
            thud.frequency.exponentialRampToValueAtTime(thudFreq * 0.5, now + 0.04);

            const thudGain = this.ctx.createGain();
            thudGain.gain.setValueAtTime(0.0001, now);
            thudGain.gain.exponentialRampToValueAtTime(0.25, now + 0.003);
            thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

            thud.connect(thudGain);
            thudGain.connect(dest);
            thud.start(now);
            thud.stop(now + 0.07);

            // === Layer 3: Tiny noise burst for texture ===
            const noiseDur = 0.03;
            const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseDur), this.ctx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseData.length; i++) {
                const t = i / noiseData.length;
                noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
            }

            const noiseSrc = this.ctx.createBufferSource();
            noiseSrc.buffer = noiseBuffer;

            const noiseHP = this.ctx.createBiquadFilter();
            noiseHP.type = 'highpass';
            noiseHP.frequency.value = 3000;

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.0001, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.2, now + 0.001);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

            noiseSrc.connect(noiseHP);
            noiseHP.connect(noiseGain);
            noiseGain.connect(dest);
            noiseSrc.start(now);
            noiseSrc.stop(now + noiseDur);

        } catch (e) {
            // silent
        }
    }

    /**
     * Magazine settle sound - subtle mechanical settle when all balls loaded
     */
    playMagazineSettle() {
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
            const dest = this.masterGain || this.ctx.destination;

            // Subtle mechanical "chunk" - balls settling into place
            const settleFreq = 300 + Math.random() * 100;
            const settle = this.ctx.createOscillator();
            settle.type = 'sine';
            settle.frequency.setValueAtTime(settleFreq, now);
            settle.frequency.exponentialRampToValueAtTime(settleFreq * 0.7, now + 0.08);

            const settleGain = this.ctx.createGain();
            settleGain.gain.setValueAtTime(0.0001, now);
            settleGain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
            settleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

            const settleLP = this.ctx.createBiquadFilter();
            settleLP.type = 'lowpass';
            settleLP.frequency.value = 800;

            settle.connect(settleLP);
            settleLP.connect(settleGain);
            settleGain.connect(dest);
            settle.start(now);
            settle.stop(now + 0.15);

            // Soft rattle noise
            const rattleDur = 0.08;
            const rattleBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * rattleDur), this.ctx.sampleRate);
            const rattleData = rattleBuffer.getChannelData(0);
            for (let i = 0; i < rattleData.length; i++) {
                const t = i / rattleData.length;
                rattleData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2) * 0.5;
            }

            const rattleSrc = this.ctx.createBufferSource();
            rattleSrc.buffer = rattleBuffer;

            const rattleBP = this.ctx.createBiquadFilter();
            rattleBP.type = 'bandpass';
            rattleBP.frequency.value = 1200;
            rattleBP.Q.value = 2;

            const rattleGain = this.ctx.createGain();
            rattleGain.gain.setValueAtTime(0.0001, now);
            rattleGain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
            rattleGain.gain.exponentialRampToValueAtTime(0.0001, now + rattleDur);

            rattleSrc.connect(rattleBP);
            rattleBP.connect(rattleGain);
            rattleGain.connect(dest);
            rattleSrc.start(now);
            rattleSrc.stop(now + rattleDur);

        } catch (e) {
            // silent
        }
    }

    /**
     * Cannon load sound - mechanical chunk when ball loads into cannon
     */
    playCannonLoad() {
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
            const dest = this.masterGain || this.ctx.destination;

            // === Layer 1: Mechanical slide sound (ball sliding into chamber) ===
            const slideFreq = 250;
            const slide = this.ctx.createOscillator();
            slide.type = 'triangle';
            slide.frequency.setValueAtTime(slideFreq * 1.5, now);
            slide.frequency.exponentialRampToValueAtTime(slideFreq, now + 0.08);

            const slideGain = this.ctx.createGain();
            slideGain.gain.setValueAtTime(0.0001, now);
            slideGain.gain.exponentialRampToValueAtTime(0.25, now + 0.01);
            slideGain.gain.exponentialRampToValueAtTime(0.1, now + 0.06);
            slideGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

            slide.connect(slideGain);
            slideGain.connect(dest);
            slide.start(now);
            slide.stop(now + 0.14);

            // === Layer 2: Click/lock sound (ball locking into place) ===
            const lockTime = now + 0.08;
            const lockFreq = 800 + Math.random() * 200;
            const lock = this.ctx.createOscillator();
            lock.type = 'sine';
            lock.frequency.setValueAtTime(lockFreq, lockTime);
            lock.frequency.exponentialRampToValueAtTime(lockFreq * 0.6, lockTime + 0.03);

            const lockGain = this.ctx.createGain();
            lockGain.gain.setValueAtTime(0.0001, lockTime);
            lockGain.gain.exponentialRampToValueAtTime(0.4, lockTime + 0.003);
            lockGain.gain.exponentialRampToValueAtTime(0.0001, lockTime + 0.06);

            lock.connect(lockGain);
            lockGain.connect(dest);
            lock.start(lockTime);
            lock.stop(lockTime + 0.08);

            // === Layer 3: Metallic resonance ===
            const resFreq = 600 + Math.random() * 100;
            const res = this.ctx.createOscillator();
            res.type = 'sine';
            res.frequency.setValueAtTime(resFreq, lockTime);

            const resGain = this.ctx.createGain();
            resGain.gain.setValueAtTime(0.0001, lockTime);
            resGain.gain.exponentialRampToValueAtTime(0.2, lockTime + 0.005);
            resGain.gain.exponentialRampToValueAtTime(0.0001, lockTime + 0.15);

            res.connect(resGain);
            resGain.connect(dest);
            res.start(lockTime);
            res.stop(lockTime + 0.18);

            // === Layer 4: Impact noise ===
            const noiseDur = 0.05;
            const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseDur), this.ctx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseData.length; i++) {
                const t = i / noiseData.length;
                noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.5);
            }

            const noiseSrc = this.ctx.createBufferSource();
            noiseSrc.buffer = noiseBuffer;

            const noiseBP = this.ctx.createBiquadFilter();
            noiseBP.type = 'bandpass';
            noiseBP.frequency.value = 2000;
            noiseBP.Q.value = 1.5;

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.0001, lockTime);
            noiseGain.gain.exponentialRampToValueAtTime(0.3, lockTime + 0.002);
            noiseGain.gain.exponentialRampToValueAtTime(0.0001, lockTime + 0.04);

            noiseSrc.connect(noiseBP);
            noiseBP.connect(noiseGain);
            noiseGain.connect(dest);
            noiseSrc.start(lockTime);
            noiseSrc.stop(lockTime + noiseDur);

        } catch (e) {
            // silent
        }
    }

    /**
     * Level failed sound - sad descending tones
     */
    playLevelFail() {
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
            const dest = this.masterGain || this.ctx.destination;

            // Descending minor tones - sad "wah wah wah" feel
            const notes = [392, 349.23, 311.13]; // G4, F4, Eb4 - descending minor
            const spacing = 0.25;

            notes.forEach((freq, i) => {
                const startTime = now + i * spacing;

                // Main tone with slight vibrato for sad effect
                const osc = this.ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, startTime);
                // Slight pitch drop for each note
                osc.frequency.exponentialRampToValueAtTime(freq * 0.95, startTime + 0.2);

                const g = this.ctx.createGain();
                g.gain.setValueAtTime(0.0001, startTime);
                g.gain.exponentialRampToValueAtTime(0.4, startTime + 0.02);
                g.gain.exponentialRampToValueAtTime(0.2, startTime + 0.15);
                g.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

                // Low pass for muffled, sad tone
                const lp = this.ctx.createBiquadFilter();
                lp.type = 'lowpass';
                lp.frequency.value = 1200;

                osc.connect(lp);
                lp.connect(g);
                g.connect(dest);

                osc.start(startTime);
                osc.stop(startTime + 0.4);

                // Subtle low octave for depth
                if (i === 0) {
                    const low = this.ctx.createOscillator();
                    low.type = 'sine';
                    low.frequency.setValueAtTime(freq / 2, startTime);
                    low.frequency.exponentialRampToValueAtTime(freq / 2 * 0.9, startTime + 0.3);

                    const lowG = this.ctx.createGain();
                    lowG.gain.setValueAtTime(0.0001, startTime);
                    lowG.gain.exponentialRampToValueAtTime(0.25, startTime + 0.03);
                    lowG.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

                    low.connect(lowG);
                    lowG.connect(dest);
                    low.start(startTime);
                    low.stop(startTime + 0.55);
                }
            });

        } catch (e) {
            // silent
        }
    }

    /**
     * Ball bonus count sound - coin ching for each ball counted
     * Accepts options: { pitch: number } for ascending pitch
     */
    playBallBonus(opts) {
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
            const dest = this.masterGain || this.ctx.destination;

            // Parse options
            let pitchFactor = 1.0;
            if (opts && typeof opts === 'object') {
                if (typeof opts.pitch === 'number') pitchFactor = opts.pitch;
            }

            // Bright coin ching sound
            const baseFreq = 1800 * pitchFactor;

            // Main chime
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 0.1);

            const g = this.ctx.createGain();
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(0.45, now + 0.005);
            g.gain.exponentialRampToValueAtTime(0.15, now + 0.08);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

            osc.connect(g);
            g.connect(dest);
            osc.start(now);
            osc.stop(now + 0.22);

            // High shimmer overtone
            const shimmer = this.ctx.createOscillator();
            shimmer.type = 'sine';
            shimmer.frequency.setValueAtTime(baseFreq * 2.5, now);

            const shimmerG = this.ctx.createGain();
            shimmerG.gain.setValueAtTime(0.0001, now);
            shimmerG.gain.exponentialRampToValueAtTime(0.2, now + 0.003);
            shimmerG.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

            shimmer.connect(shimmerG);
            shimmerG.connect(dest);
            shimmer.start(now);
            shimmer.stop(now + 0.12);

            // Tiny metallic noise
            const noiseDur = 0.04;
            const noiseBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * noiseDur), this.ctx.sampleRate);
            const noiseData = noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseData.length; i++) {
                const t = i / noiseData.length;
                noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2);
            }

            const noiseSrc = this.ctx.createBufferSource();
            noiseSrc.buffer = noiseBuffer;

            const noiseHP = this.ctx.createBiquadFilter();
            noiseHP.type = 'highpass';
            noiseHP.frequency.value = 4000;

            const noiseG = this.ctx.createGain();
            noiseG.gain.setValueAtTime(0.0001, now);
            noiseG.gain.exponentialRampToValueAtTime(0.15, now + 0.002);
            noiseG.gain.exponentialRampToValueAtTime(0.0001, now + noiseDur);

            noiseSrc.connect(noiseHP);
            noiseHP.connect(noiseG);
            noiseG.connect(dest);
            noiseSrc.start(now);
            noiseSrc.stop(now + noiseDur);

        } catch (e) {
            // silent
        }
    }

    /**
     * Style bonus sound - achievement sparkle
     */
    playStyleBonus() {
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
            const dest = this.masterGain || this.ctx.destination;

            // Quick sparkle whoosh
            const whooshDur = 0.2;
            const whooshBuffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * whooshDur), this.ctx.sampleRate);
            const whooshData = whooshBuffer.getChannelData(0);
            for (let i = 0; i < whooshData.length; i++) {
                const t = i / whooshData.length;
                const env = Math.sin(t * Math.PI) * (1 - t * 0.5);
                whooshData[i] = (Math.random() * 2 - 1) * env;
            }

            const whooshSrc = this.ctx.createBufferSource();
            whooshSrc.buffer = whooshBuffer;

            const whooshHP = this.ctx.createBiquadFilter();
            whooshHP.type = 'highpass';
            whooshHP.frequency.value = 2500;

            const whooshGain = this.ctx.createGain();
            whooshGain.gain.setValueAtTime(0.0001, now);
            whooshGain.gain.exponentialRampToValueAtTime(0.25, now + 0.03);
            whooshGain.gain.exponentialRampToValueAtTime(0.0001, now + whooshDur);

            whooshSrc.connect(whooshHP);
            whooshHP.connect(whooshGain);
            whooshGain.connect(dest);
            whooshSrc.start(now);
            whooshSrc.stop(now + whooshDur);

            // Rising ding notes (quick arpeggio)
            const notes = [880, 1100, 1320]; // A5, C#6, E6 (A major chord)
            notes.forEach((freq, i) => {
                const startTime = now + i * 0.04;

                const osc = this.ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);

                const g = this.ctx.createGain();
                g.gain.setValueAtTime(0.0001, startTime);
                g.gain.exponentialRampToValueAtTime(0.4 - i * 0.08, startTime + 0.01);
                g.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.25);

                // Shimmer overtone
                const osc2 = this.ctx.createOscillator();
                osc2.type = 'sine';
                osc2.frequency.setValueAtTime(freq * 2, startTime);

                const g2 = this.ctx.createGain();
                g2.gain.setValueAtTime(0.0001, startTime);
                g2.gain.exponentialRampToValueAtTime(0.15, startTime + 0.008);
                g2.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.15);

                osc.connect(g);
                osc2.connect(g2);
                g.connect(dest);
                g2.connect(dest);

                osc.start(startTime);
                osc.stop(startTime + 0.3);
                osc2.start(startTime);
                osc2.stop(startTime + 0.18);
            });

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
