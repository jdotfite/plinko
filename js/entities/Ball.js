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
    }

    drop() {
        this.active = true;
        this.vy = 0;
        this.vx = Utils.randomVariance(0, 0.5);
    }

    update(dt) {
        if (!this.active || this.landed) return;

        const p = CONFIG.PHYSICS;
        this.vy += p.gravity;
        this.vx *= p.friction;
        this.vy *= p.friction;

        const speed = Math.hypot(this.vx, this.vy);
        if (speed > p.maxVelocity) {
            const s = p.maxVelocity / speed;
            this.vx *= s; this.vy *= s;
        }

        this.x += this.vx;
        this.y += this.vy;

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
        try {
            const type = window.currentTrailType || 'off';
            if (this._trail && this._trail.length > 1 && type !== 'off') this._renderTrail(ctx, scale, type);
        } catch (e) {}

        ctx.save();
        const x = this.x * scale, y = this.y * scale, r = this.radius * scale;

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
        ctx.restore();
    }

    _renderTrail(ctx, scale, type) {
        const pts = this._trail.slice();
        if (!pts || pts.length < 2) return;

        const isDark = (typeof THEME_STATE !== 'undefined' && THEME_STATE.current === 'dark');
        const base = isDark ? 255 : 24;

        if (type === 'glow') {
            ctx.save();
            const len = pts.length;
            for (let i = 0; i < len; i++) {
                const p = pts[i];
                const t = i / (len - 1 || 1);
                const size = (this.radius * scale) * (0.14 + Math.pow(t, 1.6) * 1.0);
                const alpha = Math.min(1, (0.02 + Math.pow(t, 1.4) * 0.45) * 0.36);
                ctx.beginPath();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = `rgba(${base},${base},${base},1)`;
                ctx.shadowColor = `rgba(${base},${base},${base},${0.18 * alpha})`;
                ctx.shadowBlur = 18 * t * scale;
                ctx.arc(p.x * scale, p.y * scale, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
            return;
        }

        if (type === 'snow') {
            ctx.save();
            const len = pts.length;
            for (let i = 0; i < len; i++) {
                const p = pts[i];
                const t = i / (len - 1 || 1);
                const size = (this.radius * scale) * (0.08 + Math.pow(t, 1.4) * 0.9) * 0.9;
                const alpha = Math.min(1, (0.02 + Math.pow(t, 1.4) * 0.55) * 0.36);
                ctx.save();
                ctx.translate(p.x * scale, p.y * scale);
                ctx.rotate(((i % 4) / 4) * Math.PI * 0.5);
                ctx.globalAlpha = alpha;
                ctx.fillStyle = `rgba(${base},${base},${base},1)`;
                ctx.fillRect(-size * 0.12, -size, size * 0.24, size * 2);
                ctx.fillRect(-size, -size * 0.12, size * 2, size * 0.24);
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
            return;
        }

        // smoke / ribbon fallback: simple tapered stroked path
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const last = pts[pts.length - 1];
        const first = pts[0];
        const grad = ctx.createLinearGradient(first.x * scale, first.y * scale, last.x * scale, last.y * scale);
        grad.addColorStop(0, `rgba(${base},${base},${base},0)`);
        grad.addColorStop(0.6, `rgba(${base},${base},${base},0.32)`);
        grad.addColorStop(1, `rgba(${base},${base},${base},0.72)`);

        const steps = 4;
        for (let s = steps; s >= 1; s--) {
            const t = s / steps;
            ctx.beginPath();
            for (let i = 0; i < pts.length; i++) {
                const p = pts[i];
                const px = p.x * scale, py = p.y * scale;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.lineWidth = (6 * t + 1.5) * scale;
            ctx.strokeStyle = grad;
            ctx.globalAlpha = (0.08 + 0.6 * t) * 0.36;
            ctx.shadowColor = `rgba(${base},${base},${base},${0.06 * t})`;
            ctx.shadowBlur = 4 * t * scale;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}
