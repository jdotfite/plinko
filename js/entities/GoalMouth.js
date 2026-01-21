/**
 * Goal Mouth - moving catch target at the bottom (pipe/bucket design)
 */

class GoalMouth {
    constructor(board, opts = {}) {
        const innerLeft = board.innerLeft;
        const innerRight = board.innerRight;
        const width = opts.width || 120;
        this.width = width;
        this.height = opts.height || 50;
        this.y = (typeof opts.y === 'number') ? opts.y : (board.innerBottom - this.height);
        this.x = innerLeft + (innerRight - innerLeft - width) / 2;
        this.speed = opts.speed || 0.85;
        this.direction = 1;

        // Easing configuration - distance from wall to start slowing down
        this.easeDistance = opts.easeDistance || 40;
        this.easeAmount = opts.easeAmount || 0.25;  // How much to slow (0 = none, 1 = full stop)
    }

    setSpeed(speed) {
        if (typeof speed === 'number' && !Number.isNaN(speed)) {
            this.speed = speed;
        }
    }

    setEaseDistance(dist) {
        if (typeof dist === 'number' && !Number.isNaN(dist)) {
            this.easeDistance = Math.max(0, dist);
        }
    }

    update(dt, board) {
        const innerLeft = board.innerLeft;
        const innerRight = board.innerRight;
        const minX = innerLeft + 20;
        const maxX = innerRight - this.width - 20;

        // Calculate distance from nearest wall
        const distFromLeft = this.x - minX;
        const distFromRight = maxX - this.x;
        const distFromNearestWall = Math.min(distFromLeft, distFromRight);

        // Apply subtle easing near walls (both approaching AND leaving)
        let speedMult = 1;
        if (this.easeDistance > 0 && distFromNearestWall < this.easeDistance) {
            // Subtle ease: only reduce speed slightly near walls
            const t = distFromNearestWall / this.easeDistance;
            const easeCurve = Math.sin(t * Math.PI / 2);  // 0 at wall, 1 at easeDistance
            // Interpolate between (1 - easeAmount) and 1 based on curve
            speedMult = (1 - this.easeAmount) + this.easeAmount * easeCurve;
        }

        this.x += this.direction * this.speed * speedMult * dt * 120;

        // Bounce off walls
        if (this.x <= minX) {
            this.x = minX;
            this.direction = 1;
        } else if (this.x >= maxX) {
            this.x = maxX;
            this.direction = -1;
        }
    }

    render(ctx, scale) {
        const x = this.x * scale;
        const y = this.y * scale;
        const w = this.width * scale;
        const h = this.height * scale;
        const cx = x + w / 2;
        const pipeRadius = w / 2;
        const pipeDepth = h * 0.7;
        const rimThickness = 8 * scale;

        ctx.save();

        // Pipe body shadow
        ctx.shadowColor = 'rgba(0,0,0,0.25)';
        ctx.shadowBlur = 14 * scale;
        ctx.shadowOffsetY = 6 * scale;

        // Outer pipe body (white/light gray cylinder look)
        const bodyGrad = ctx.createLinearGradient(x, 0, x + w, 0);
        bodyGrad.addColorStop(0, '#d8d8d8');
        bodyGrad.addColorStop(0.15, '#f5f5f5');
        bodyGrad.addColorStop(0.5, '#ffffff');
        bodyGrad.addColorStop(0.85, '#f5f5f5');
        bodyGrad.addColorStop(1, '#d8d8d8');

        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        // Left side
        ctx.moveTo(x, y + rimThickness);
        ctx.lineTo(x, y + pipeDepth);
        // Bottom curve
        ctx.quadraticCurveTo(x, y + h, cx, y + h);
        ctx.quadraticCurveTo(x + w, y + h, x + w, y + pipeDepth);
        // Right side
        ctx.lineTo(x + w, y + rimThickness);
        // Top rim (elliptical)
        ctx.ellipse(cx, y + rimThickness, pipeRadius, rimThickness * 0.6, 0, 0, Math.PI, true);
        ctx.closePath();
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // Pipe rim (top ring) - gives 3D depth
        const rimGrad = ctx.createLinearGradient(x, y, x + w, y);
        rimGrad.addColorStop(0, '#c0c0c0');
        rimGrad.addColorStop(0.2, '#ffffff');
        rimGrad.addColorStop(0.5, '#ffffff');
        rimGrad.addColorStop(0.8, '#ffffff');
        rimGrad.addColorStop(1, '#c0c0c0');

        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.ellipse(cx, y + rimThickness, pipeRadius, rimThickness * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rim border
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1.5 * scale;
        ctx.stroke();

        // Inner hole (dark) - the actual opening
        const innerRadius = pipeRadius - rimThickness * 0.8;
        const innerDepthY = y + rimThickness + 2 * scale;

        // Inner darkness gradient
        const innerGrad = ctx.createRadialGradient(
            cx, innerDepthY, innerRadius * 0.3,
            cx, innerDepthY, innerRadius
        );
        innerGrad.addColorStop(0, '#000000');
        innerGrad.addColorStop(0.7, '#1a1a1a');
        innerGrad.addColorStop(1, '#333333');

        ctx.fillStyle = innerGrad;
        ctx.beginPath();
        ctx.ellipse(cx, innerDepthY, innerRadius, rimThickness * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner rim shadow (adds depth to the opening)
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.ellipse(cx, innerDepthY, innerRadius, rimThickness * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Highlight on front rim edge
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.ellipse(cx, y + rimThickness, pipeRadius - 1 * scale, rimThickness * 0.5, 0, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();

        ctx.restore();
    }
}
