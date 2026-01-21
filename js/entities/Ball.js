/**
 * Ball/Token entity (clean, robust implementation)
 */

class Ball {
    constructor(x, y) {
        this.x = x || 0;
        this.y = y || 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = CONFIG.BALL.radius || 28;
        this.hitRadius = this.radius + 4;
        this.active = false;
        this.landed = false;
        this.landedSlot = null;
        this._trail = [];
        this.soundVariant = 0;
        this.hiddenUntilExit = false;
        this.cannonOrigin = null;
        this.muzzleDist = 0;

        // Style bonus tracking
        this.distanceTraveled = 0;
        this.firstPegHit = false;
        this.distanceBeforeFirstHit = 0;
        this.wallBounceCount = 0;
        this.lastWallHitTime = 0;
        this.awardedBonuses = new Set(); // Track which bonuses already awarded
    }

    reset(x, y) {
        this.x = x || this.x;
        this.y = y || this.y;
        this.vx = 0;
        this.vy = 0;
        this.active = false;
        this.landed = false;
        this.landedSlot = null;
        this._trail = [];

        // Reset style bonus tracking
        this.distanceTraveled = 0;
        this.firstPegHit = false;
        this.distanceBeforeFirstHit = 0;
        this.wallBounceCount = 0;
        this.lastWallHitTime = 0;
        this.awardedBonuses = new Set();
    }

    drop() {
        this.active = true;
        this.vy = 0;
        this.vx = Utils.randomVariance(0, 0.5);
    }

    launch(angle, power) {
        this.active = true;
        this.landed = false;
        this.vx = Math.cos(angle) * power;
        this.vy = Math.sin(angle) * power;
    }

    update(dt, tuning) {
        if (!this.active || this.landed) return;

        const p = tuning || CONFIG.PHYSICS;
        const gravity = (typeof p.gravity === 'number') ? p.gravity : CONFIG.PHYSICS.gravity;
        const friction = (typeof p.friction === 'number') ? p.friction : CONFIG.PHYSICS.friction;

        this.vy += gravity;
        this.vx *= friction;
        this.vy *= friction;

        const speed = Math.hypot(this.vx, this.vy);
        const maxVelocity = (typeof p.maxVelocity === 'number') ? p.maxVelocity : CONFIG.PHYSICS.maxVelocity;
        if (speed > maxVelocity) {
            const s = maxVelocity / speed;
            this.vx *= s; this.vy *= s;
        }

        // Track distance traveled for style bonuses
        const moveDist = Math.hypot(this.vx, this.vy);
        this.distanceTraveled += moveDist;
        if (!this.firstPegHit) {
            this.distanceBeforeFirstHit = this.distanceTraveled;
        }

        this.x += this.vx;
        this.y += this.vy;

        if (this.hiddenUntilExit && this.cannonOrigin) {
            const dx = this.x - this.cannonOrigin.x;
            const dy = this.y - this.cannonOrigin.y;
            if (Math.hypot(dx, dy) >= (this.muzzleDist || 0)) {
                this.hiddenUntilExit = false;
            }
        }

        // Trail handling
        try {
            const now = performance.now();
            const type = window.currentTrailType || 'off';
            if (type !== 'off') {
                this._trail.push({ x: this.x, y: this.y, t: now });
                const maxLen = (type === 'glow' || type === 'smoke' || type === 'snow') ? 26 : 18;
                if (this._trail.length > maxLen) this._trail.splice(0, this._trail.length - maxLen);

                if (type === 'snow' && window.particleSystem) {
                    const sp = Math.hypot(this.vx, this.vy);
                    const prob = Math.min(0.9, 0.02 + sp * 0.035);
                    if (Math.random() < prob) {
                        const behindX = this.x - Math.sign(this.vx || 1) * (this.radius * 0.2);
                        const behindY = this.y - Math.abs(this.vy) * 0.02;
                        window.particleSystem.spawnFlake({ x: behindX, y: behindY, speed: sp });
                    }
                }
            } else {
                if (this._trail.length) this._trail = [];
            }
        } catch (e) {}
    }

    land(slot) {
        this.landed = true;
        this.landedSlot = slot;
        this.active = false;
        this.vx = 0; this.vy = 0;
        this._trail = [];
    }

    render(ctx, scale) {
        if (this.hiddenUntilExit) return;
        const now = performance.now();

        try {
            const type = window.currentTrailType || 'off';
            // Force specific trails for power-up modes
            if (this.isFireball) {
                if (this._trail && this._trail.length > 1) this._renderTrail(ctx, scale, 'fire');
            } else if (this.isThunder) {
                if (this._trail && this._trail.length > 1) this._renderTrail(ctx, scale, 'lightning');
            } else if (this.isGhost) {
                if (this._trail && this._trail.length > 1) this._renderTrail(ctx, scale, 'smoke');
            } else if (this.isMagnet) {
                if (this._trail && this._trail.length > 1) this._renderTrail(ctx, scale, 'neon');
            } else if (this._trail && this._trail.length > 1 && type !== 'off') {
                this._renderTrail(ctx, scale, type);
            }
        } catch (e) {}

        ctx.save();
        const x = this.x * scale, y = this.y * scale, r = this.radius * scale;

        // Fireball mode - flaming ball
        if (this.isFireball) {
            const flicker = Math.sin(now * 0.02) * 0.15 + 0.85;
            ctx.shadowColor = '#FF4500';
            ctx.shadowBlur = 25 * scale * flicker;
            ctx.beginPath();
            ctx.arc(x, y, r + 6 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#FF4500';
            ctx.fill();
            ctx.shadowBlur = 15 * scale;
            ctx.beginPath();
            ctx.arc(x, y, r + 2 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#FF8C00';
            ctx.fill();
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 10 * scale;
            ctx.beginPath();
            ctx.arc(x, y, r - 2 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(x, y, r * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFACD';
            ctx.fill();
        }
        // Ghost mode - transparent, ethereal
        else if (this.isGhost) {
            ctx.globalAlpha = 0.5 + Math.sin(now * 0.01) * 0.2;
            ctx.shadowColor = '#9B59B6';
            ctx.shadowBlur = 20 * scale;
            ctx.beginPath();
            ctx.arc(x, y, r + 4 * scale, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(155, 89, 182, 0.5)';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fill();
            ctx.globalAlpha = 1;
        }
        // Thunder mode - electric blue
        else if (this.isThunder) {
            const pulse = Math.sin(now * 0.03) * 0.3 + 0.7;
            ctx.shadowColor = '#00FFFF';
            ctx.shadowBlur = 25 * scale * pulse;
            ctx.beginPath();
            ctx.arc(x, y, r + 5 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#00BFFF';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = '#00FFFF';
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
        }
        // Magnet mode - pink magnetic glow
        else if (this.isMagnet) {
            const pulse = Math.sin(now * 0.02) * 0.2 + 0.8;
            ctx.shadowColor = '#E91E63';
            ctx.shadowBlur = 20 * scale * pulse;
            // Magnetic field lines
            ctx.strokeStyle = 'rgba(233, 30, 99, 0.4)';
            ctx.lineWidth = 2 * scale;
            for (let i = 0; i < 3; i++) {
                const ringR = r + (10 + i * 8) * scale * pulse;
                ctx.beginPath();
                ctx.arc(x, y, ringR, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(x, y, r + 4 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#E91E63';
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = '#FF69B4';
            ctx.fill();
        }
        // Bomb mode - explosive orange
        else if (this.isBomb) {
            const pulse = Math.sin(now * 0.025) * 0.15 + 0.85;
            ctx.shadowColor = '#FF5722';
            ctx.shadowBlur = 22 * scale * pulse;
            ctx.beginPath();
            ctx.arc(x, y, r + 4 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#FF5722';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = '#212121';
            ctx.fill();
            // Fuse spark
            ctx.fillStyle = '#FFEB3B';
            ctx.beginPath();
            ctx.arc(x - r * 0.4, y - r * 0.6, 3 * scale * pulse, 0, Math.PI * 2);
            ctx.fill();
        }
        // Splitter mode - rainbow prism
        else if (this.isSplitter) {
            const hue = (now * 0.2) % 360;
            ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
            ctx.shadowBlur = 18 * scale;
            ctx.beginPath();
            ctx.arc(x, y, r + 4 * scale, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            const grad = ctx.createLinearGradient(x - r, y, x + r, y);
            grad.addColorStop(0, `hsl(${hue}, 100%, 70%)`);
            grad.addColorStop(0.5, '#FFFFFF');
            grad.addColorStop(1, `hsl(${(hue + 180) % 360}, 100%, 70%)`);
            ctx.fillStyle = grad;
            ctx.fill();
        }
        // Spooky mode - purple ghost aura
        else if (this.isSpooky && !this.spookyUsed) {
            const pulse = Math.sin(now * 0.015) * 0.2 + 0.8;
            ctx.shadowColor = '#9B59B6';
            ctx.shadowBlur = 18 * scale * pulse;
            ctx.beginPath();
            ctx.arc(x, y, r + 4 * scale, 0, Math.PI * 2);
            ctx.fillStyle = '#8E44AD';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = '#D8BFD8';
            ctx.fill();
        }
        // Normal ball
        else {
            ctx.shadowColor = 'rgba(0,0,0,0.12)';
            ctx.shadowBlur = 10 * scale;
            ctx.shadowOffsetY = 8 * scale;
            ctx.beginPath();
            ctx.arc(x, y, r + 4 * scale, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.COLORS.ballBorder;
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = CONFIG.COLORS.ballFill;
            ctx.fill();
        }
        ctx.restore();
    }

    _renderTrail(ctx, scale, type) {
        const pts = this._trail.slice();
        if (!pts || pts.length < 2) return;

        const isDark = (typeof THEME_STATE !== 'undefined' && THEME_STATE.current === 'dark');
        const base = isDark ? 255 : 24;
        const now = performance.now();

        // Route to specific trail renderer
        switch (type) {
            case 'classic': this._trailClassic(ctx, scale, pts, base); break;
            case 'glow': this._trailGlow(ctx, scale, pts, base); break;
            case 'smoke': this._trailSmoke(ctx, scale, pts, base); break;
            case 'bubbles': this._trailBubbles(ctx, scale, pts, now); break;
            case 'pixels': this._trailPixels(ctx, scale, pts, base); break;
            case 'fire': this._trailFire(ctx, scale, pts, now); break;
            case 'ice': this._trailIce(ctx, scale, pts, now); break;
            case 'lightning': this._trailLightning(ctx, scale, pts, now); break;
            case 'hearts': this._trailHearts(ctx, scale, pts); break;
            case 'rainbow': this._trailRainbow(ctx, scale, pts, now); break;
            case 'stars': this._trailStars(ctx, scale, pts, now); break;
            case 'neon': this._trailNeon(ctx, scale, pts, now); break;
            case 'gold': this._trailGold(ctx, scale, pts, now); break;
            case 'plasma': this._trailPlasma(ctx, scale, pts, now); break;
            case 'confetti': this._trailConfetti(ctx, scale, pts, now); break;
            default: this._trailClassic(ctx, scale, pts, base);
        }
    }

    // === CLASSIC: Simple fading dots ===
    _trailClassic(ctx, scale, pts, base) {
        ctx.save();
        const len = pts.length;
        for (let i = 0; i < len; i++) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const size = (this.radius * scale) * (0.2 + t * 0.6);
            const alpha = t * 0.5;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${base},${base},${base})`;
            ctx.beginPath();
            ctx.arc(p.x * scale, p.y * scale, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === GLOW: Soft ethereal orbs with bloom ===
    _trailGlow(ctx, scale, pts, base) {
        ctx.save();
        const len = pts.length;
        for (let i = 0; i < len; i++) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const size = (this.radius * scale) * (0.14 + Math.pow(t, 1.6) * 1.0);
            const alpha = Math.min(1, (0.02 + Math.pow(t, 1.4) * 0.45) * 0.5);
            ctx.beginPath();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgba(${base},${base},${base},1)`;
            ctx.shadowColor = `rgba(${base},${base},${base},${0.3 * alpha})`;
            ctx.shadowBlur = 20 * t * scale;
            ctx.arc(p.x * scale, p.y * scale, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === SMOKE: Wispy smoke puffs ===
    _trailSmoke(ctx, scale, pts, base) {
        ctx.save();
        const len = pts.length;
        for (let i = 0; i < len; i++) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const size = (this.radius * scale) * (0.3 + t * 1.2);
            const alpha = (1 - t) * 0.25;
            const offset = Math.sin(i * 0.5) * 3 * scale;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgba(${base},${base},${base},1)`;
            ctx.beginPath();
            ctx.arc(p.x * scale + offset, p.y * scale, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === BUBBLES: Floating soap bubbles ===
    _trailBubbles(ctx, scale, pts, now) {
        ctx.save();
        const len = pts.length;
        for (let i = 0; i < len; i += 2) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const wobble = Math.sin(now * 0.005 + i) * 4 * scale;
            const size = (this.radius * scale) * (0.25 + t * 0.5);
            const alpha = t * 0.6;

            ctx.globalAlpha = alpha;
            ctx.strokeStyle = `rgba(100, 200, 255, 0.8)`;
            ctx.lineWidth = 1.5 * scale;
            ctx.beginPath();
            ctx.arc(p.x * scale + wobble, p.y * scale - wobble * 0.5, size, 0, Math.PI * 2);
            ctx.stroke();

            // Bubble highlight
            ctx.fillStyle = `rgba(255, 255, 255, 0.4)`;
            ctx.beginPath();
            ctx.arc(p.x * scale + wobble - size * 0.3, p.y * scale - wobble * 0.5 - size * 0.3, size * 0.2, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === PIXELS: Retro 8-bit blocks ===
    _trailPixels(ctx, scale, pts, base) {
        ctx.save();
        const len = pts.length;
        const pixelSize = 6 * scale;
        for (let i = 0; i < len; i++) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const alpha = t * 0.7;
            // Snap to pixel grid
            const px = Math.floor(p.x * scale / pixelSize) * pixelSize;
            const py = Math.floor(p.y * scale / pixelSize) * pixelSize;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `rgb(${base},${base},${base})`;
            ctx.fillRect(px, py, pixelSize, pixelSize);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === FIRE: Blazing flames ===
    _trailFire(ctx, scale, pts, now) {
        ctx.save();
        const len = pts.length;
        for (let i = 0; i < len; i++) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const flicker = Math.sin(now * 0.02 + i * 2) * 0.3 + 0.7;
            const size = (this.radius * scale) * (0.2 + t * 0.9) * flicker;
            const alpha = t * 0.8;

            // Outer orange glow
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillStyle = '#FF4500';
            ctx.shadowColor = '#FF4500';
            ctx.shadowBlur = 15 * scale;
            ctx.beginPath();
            ctx.arc(p.x * scale, p.y * scale, size * 1.3, 0, Math.PI * 2);
            ctx.fill();

            // Inner yellow core
            ctx.shadowBlur = 0;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(p.x * scale, p.y * scale, size * 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === ICE: Frozen crystals ===
    _trailIce(ctx, scale, pts, now) {
        ctx.save();
        const len = pts.length;
        for (let i = 0; i < len; i++) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const size = (this.radius * scale) * (0.15 + t * 0.6);
            const alpha = t * 0.7;
            const rotation = (now * 0.001 + i * 0.5) % (Math.PI * 2);

            ctx.save();
            ctx.translate(p.x * scale, p.y * scale);
            ctx.rotate(rotation);
            ctx.globalAlpha = alpha;

            // Crystal shape (6-pointed)
            ctx.fillStyle = '#87CEEB';
            ctx.shadowColor = '#00BFFF';
            ctx.shadowBlur = 8 * scale;
            for (let j = 0; j < 6; j++) {
                ctx.rotate(Math.PI / 3);
                ctx.fillRect(-size * 0.1, 0, size * 0.2, size);
            }
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === LIGHTNING: Electric bolts ===
    _trailLightning(ctx, scale, pts, now) {
        if (pts.length < 3) return;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Main bolt
        ctx.strokeStyle = '#00FFFF';
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur = 15 * scale;
        ctx.lineWidth = 3 * scale;
        ctx.globalAlpha = 0.9;

        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            const jitter = (Math.random() - 0.5) * 8 * scale;
            const px = p.x * scale + jitter;
            const py = p.y * scale + jitter;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // White core
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === HEARTS: Love particles ===
    _trailHearts(ctx, scale, pts) {
        ctx.save();
        const len = pts.length;
        for (let i = 0; i < len; i += 2) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const size = (this.radius * scale) * (0.3 + t * 0.4);
            const alpha = t * 0.8;

            ctx.save();
            ctx.translate(p.x * scale, p.y * scale);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FF69B4';
            ctx.shadowColor = '#FF1493';
            ctx.shadowBlur = 5 * scale;

            // Draw heart shape
            ctx.beginPath();
            ctx.moveTo(0, size * 0.3);
            ctx.bezierCurveTo(-size, -size * 0.3, -size, size * 0.6, 0, size);
            ctx.bezierCurveTo(size, size * 0.6, size, -size * 0.3, 0, size * 0.3);
            ctx.fill();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === RAINBOW: Full spectrum magic ===
    _trailRainbow(ctx, scale, pts, now) {
        ctx.save();
        const len = pts.length;
        const colors = ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3'];

        for (let i = 0; i < len; i++) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const size = (this.radius * scale) * (0.2 + t * 0.7);
            const alpha = t * 0.7;
            const colorIdx = Math.floor((now * 0.003 + i * 0.3) % colors.length);

            ctx.globalAlpha = alpha;
            ctx.fillStyle = colors[colorIdx];
            ctx.shadowColor = colors[colorIdx];
            ctx.shadowBlur = 12 * scale;
            ctx.beginPath();
            ctx.arc(p.x * scale, p.y * scale, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === STARS: Twinkling stardust ===
    _trailStars(ctx, scale, pts, now) {
        ctx.save();
        const len = pts.length;
        for (let i = 0; i < len; i++) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const twinkle = Math.sin(now * 0.01 + i * 3) * 0.3 + 0.7;
            const size = (this.radius * scale) * (0.15 + t * 0.35) * twinkle;
            const alpha = t * 0.9 * twinkle;

            ctx.save();
            ctx.translate(p.x * scale, p.y * scale);
            ctx.rotate(now * 0.002 + i);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = '#FFFACD';
            ctx.shadowBlur = 10 * scale;

            // 4-pointed star
            ctx.beginPath();
            for (let j = 0; j < 4; j++) {
                const angle = (j / 4) * Math.PI * 2;
                const outerX = Math.cos(angle) * size;
                const outerY = Math.sin(angle) * size;
                const innerAngle = angle + Math.PI / 4;
                const innerX = Math.cos(innerAngle) * size * 0.3;
                const innerY = Math.sin(innerAngle) * size * 0.3;
                if (j === 0) ctx.moveTo(outerX, outerY);
                else ctx.lineTo(outerX, outerY);
                ctx.lineTo(innerX, innerY);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === NEON: Vibrant synthwave glow ===
    _trailNeon(ctx, scale, pts, now) {
        if (pts.length < 2) return;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const hue = (now * 0.05) % 360;
        const color = `hsl(${hue}, 100%, 50%)`;

        // Outer glow
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 25 * scale;
        ctx.lineWidth = 8 * scale;
        ctx.globalAlpha = 0.4;

        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            if (i === 0) ctx.moveTo(p.x * scale, p.y * scale);
            else ctx.lineTo(p.x * scale, p.y * scale);
        }
        ctx.stroke();

        // Bright core
        ctx.shadowBlur = 10 * scale;
        ctx.lineWidth = 3 * scale;
        ctx.globalAlpha = 0.9;
        ctx.stroke();

        // White center
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5 * scale;
        ctx.globalAlpha = 0.8;
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === GOLD: Pure luxury ===
    _trailGold(ctx, scale, pts, now) {
        ctx.save();
        const len = pts.length;
        for (let i = 0; i < len; i++) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const shimmer = Math.sin(now * 0.008 + i * 2) * 0.2 + 0.8;
            const size = (this.radius * scale) * (0.2 + t * 0.7);
            const alpha = t * 0.8 * shimmer;

            // Gold gradient effect
            const gradient = ctx.createRadialGradient(
                p.x * scale, p.y * scale, 0,
                p.x * scale, p.y * scale, size
            );
            gradient.addColorStop(0, '#FFF8DC');
            gradient.addColorStop(0.5, '#FFD700');
            gradient.addColorStop(1, '#B8860B');

            ctx.globalAlpha = alpha;
            ctx.fillStyle = gradient;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 15 * scale;
            ctx.beginPath();
            ctx.arc(p.x * scale, p.y * scale, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === PLASMA: Unstable energy core ===
    _trailPlasma(ctx, scale, pts, now) {
        ctx.save();
        const len = pts.length;
        for (let i = 0; i < len; i++) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const pulse = Math.sin(now * 0.015 + i * 1.5) * 0.4 + 0.6;
            const size = (this.radius * scale) * (0.25 + t * 0.8) * pulse;
            const alpha = t * 0.85;

            // Outer plasma ring
            const hue1 = (now * 0.1 + i * 20) % 360;
            const hue2 = (hue1 + 60) % 360;

            ctx.globalAlpha = alpha * 0.6;
            ctx.strokeStyle = `hsl(${hue1}, 100%, 60%)`;
            ctx.shadowColor = `hsl(${hue1}, 100%, 50%)`;
            ctx.shadowBlur = 20 * scale;
            ctx.lineWidth = 3 * scale;
            ctx.beginPath();
            ctx.arc(p.x * scale, p.y * scale, size, 0, Math.PI * 2);
            ctx.stroke();

            // Inner core
            ctx.globalAlpha = alpha;
            ctx.fillStyle = `hsl(${hue2}, 100%, 80%)`;
            ctx.shadowBlur = 10 * scale;
            ctx.beginPath();
            ctx.arc(p.x * scale, p.y * scale, size * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // === CONFETTI: Party celebration ===
    _trailConfetti(ctx, scale, pts, now) {
        ctx.save();
        const len = pts.length;
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

        for (let i = 0; i < len; i++) {
            const p = pts[i];
            const t = i / (len - 1 || 1);
            const size = (this.radius * scale) * (0.2 + t * 0.4);
            const alpha = t * 0.85;
            const rotation = (now * 0.005 + i * 0.8) % (Math.PI * 2);
            const color = colors[i % colors.length];

            ctx.save();
            ctx.translate(p.x * scale, p.y * scale);
            ctx.rotate(rotation);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 5 * scale;

            // Random confetti shapes
            if (i % 3 === 0) {
                // Square
                ctx.fillRect(-size * 0.5, -size * 0.5, size, size);
            } else if (i % 3 === 1) {
                // Circle
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Triangle
                ctx.beginPath();
                ctx.moveTo(0, -size * 0.6);
                ctx.lineTo(size * 0.5, size * 0.4);
                ctx.lineTo(-size * 0.5, size * 0.4);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

