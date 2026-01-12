/**
 * Board entity - tall rounded rectangle with integrated chevron bumps
 * Chevrons are inward cuts into the board edge, not floating triangles
 */

class Board {
    constructor() {
        const config = CONFIG.BOARD;
        
        this.x = config.marginX;
        this.y = config.marginTop;
        this.width = config.width;
        this.height = config.height;
        this.borderRadius = config.borderRadius;
        this.chevronDepth = config.chevronDepth;
        this.chevronCount = config.chevronCount; // 3 per side
        this.innerInset = config.innerInset;
        this.innerTopPadding = config.innerTopPadding;
        this.innerBottomPadding = config.innerBottomPadding;
        
        // Calculate inner bounds for collision (straight walls)
        this.innerLeft = this.x + this.innerInset;
        this.innerRight = this.x + this.width - this.innerInset;
        this.innerTop = this.y + this.innerTopPadding;
        this.innerHeight = this.height - (this.innerTopPadding + this.innerBottomPadding);
        this.innerBottom = this.innerTop + this.innerHeight;
        this.innerWidth = this.innerRight - this.innerLeft;
        this.chevronAnchors = this.buildChevronAnchors();
        this.chevronCount = this.chevronAnchors.length || this.chevronCount;
        this.chevronSegments = this.buildChevronSegments();
    }
    
    /**
     * Render just the outer frame (called LAST)
     */
    renderFrame(ctx, scale) {
        ctx.save();
        
        const x = this.x * scale;
        const y = this.y * scale;
        const w = this.width * scale;
        const h = this.height * scale;
        const r = this.borderRadius * scale;
        const innerPath = this.createInnerPath(scale);
        
        const createFramePath = () => {
            const framePath = new Path2D();
            const innerTop = this.innerTop * scale;
            
            // Outer frame without top - start at inner top level
            // Left side from inner top down
            framePath.moveTo(x, innerTop);
            framePath.lineTo(x, y + h - r);
            framePath.arcTo(x, y + h, x + r, y + h, r); // Bottom-left corner
            framePath.lineTo(x + w - r, y + h); // Bottom edge
            framePath.arcTo(x + w, y + h, x + w, y + h - r, r); // Bottom-right corner
            framePath.lineTo(x + w, innerTop); // Right side up to inner top
            framePath.lineTo(x, innerTop); // Connect across the top at inner level
            framePath.closePath();
            
            // Add inner path as a hole (reverse winding)
            framePath.addPath(innerPath);
            return framePath;
        };
        
        // Draw outer frame with shadows (frame only, not covering inner area)
        const framePath = createFramePath();
        
        // Layer 1: Large diffuse outer shadow
        ctx.shadowColor = CONFIG.COLORS.frameShadowLight;
        ctx.shadowBlur = 100 * scale;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 40 * scale;
        
        ctx.fillStyle = CONFIG.COLORS.board;
        ctx.fill(framePath, 'evenodd');
        
        // Layer 2: Medium shadow for depth
        ctx.shadowColor = CONFIG.COLORS.frameShadowMedium;
        ctx.shadowBlur = 40 * scale;
        ctx.shadowOffsetY = 15 * scale;
        
        ctx.fill(framePath, 'evenodd');
        
        // Layer 3: Tight shadow for crispness
        ctx.shadowColor = CONFIG.COLORS.frameShadowFaint;
        ctx.shadowBlur = 10 * scale;
        ctx.shadowOffsetY = 4 * scale;
        
        ctx.fill(framePath, 'evenodd');
        
        ctx.shadowColor = 'transparent';
        ctx.restore();
    }
    
    /**
     * Render the playfield (called FIRST, before slots)
     */
    renderPlayfield(ctx, scale) {
        ctx.save();
        
        const innerPath = this.createInnerPath(scale);
        const innerX = this.innerLeft * scale;
        const innerWidth = this.innerWidth * scale;
        const innerY = this.innerTop * scale;
        const innerHeight = this.innerHeight * scale;

        // Inner panel base fill with subtle drop shadow for depth
        ctx.save();
        ctx.shadowColor = CONFIG.COLORS.boardShadow;
        ctx.shadowBlur = 35 * scale;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 18 * scale;
        ctx.fillStyle = CONFIG.COLORS.playfield;
        ctx.fill(innerPath);
        ctx.restore();

        // Clip to inner panel for layered gradients
        ctx.save();
        ctx.clip(innerPath);
        const panelGradient = ctx.createLinearGradient(innerX, innerY, innerX, innerY + innerHeight);
        panelGradient.addColorStop(0, CONFIG.COLORS.playfieldGradientTop);
        panelGradient.addColorStop(0.45, CONFIG.COLORS.playfieldGradientMid);
        panelGradient.addColorStop(0.9, CONFIG.COLORS.playfieldGradientBottom);
        ctx.fillStyle = panelGradient;
        ctx.fillRect(innerX - 50 * scale, innerY, innerWidth + 100 * scale, innerHeight);

        // Lateral shading to emphasize beveled edges
        const lateralGradient = ctx.createLinearGradient(innerX - 40 * scale, 0, innerX + innerWidth + 40 * scale, 0);
        lateralGradient.addColorStop(0, CONFIG.COLORS.lateralShade);
        lateralGradient.addColorStop(0.3, CONFIG.COLORS.transparent);
        lateralGradient.addColorStop(0.7, CONFIG.COLORS.transparent);
        lateralGradient.addColorStop(1, CONFIG.COLORS.lateralShade);
        ctx.fillStyle = lateralGradient;
        ctx.fillRect(innerX - 40 * scale, innerY, innerWidth + 80 * scale, innerHeight);

        // Bottom basin shadow to mimic inspo depth
        const bottomShadow = ctx.createLinearGradient(
            innerX,
            innerY + innerHeight - 250 * scale,
            innerX,
            innerY + innerHeight + 50 * scale
        );
        bottomShadow.addColorStop(0, CONFIG.COLORS.transparent);
        bottomShadow.addColorStop(1, CONFIG.COLORS.bottomShadow);
        ctx.fillStyle = bottomShadow;
        ctx.fillRect(innerX - 20 * scale, innerY + innerHeight - 250 * scale, innerWidth + 40 * scale, 310 * scale);

        ctx.restore();

        // Dark inner glow to push playfield deeper (render BEFORE bevels)
        this.renderInnerGlow(ctx, scale, innerPath);

        // Render chevron bevel shadows on top of glow (only if chevrons exist)
        if (this.chevronAnchors.length > 0) {
            this.renderChevronBevels(ctx, scale);
        }

        // Highlighted inner outline for clean edge
        ctx.save();
        ctx.strokeStyle = CONFIG.COLORS.frameHighlight;
        ctx.lineWidth = 3 * scale;
        ctx.stroke(innerPath);
        ctx.restore();
        
        ctx.restore();
    }
    
    /**
     * Legacy render method - calls both in sequence
     */
    render(ctx, scale) {
        this.renderPlayfield(ctx, scale);
        this.renderFrame(ctx, scale);
    }

      
    buildChevronAnchors() {
        // If chevronCount is 0, don't create any anchors
        if (this.chevronCount === 0) {
            return [];
        }
        
        const anchors = [];
        const pegConfig = CONFIG.PEGS;
        const verticalGap = pegConfig.verticalGap;
        const halfWindow = verticalGap * 0.55;
        
        for (let row = 0; row < pegConfig.rows; row++) {
            const isNarrowRow = row % 2 === 1; // rows with fewer pegs
            if (!isNarrowRow) continue;
            const center = pegConfig.startY + row * verticalGap;
            let top = center - halfWindow;
            let bottom = center + halfWindow;
            top = Math.max(this.innerTop + 10, top);
            bottom = Math.min(this.innerBottom - 10, bottom);
            if (bottom - top <= 20) continue;
            anchors.push({
                top,
                mid: (top + bottom) / 2,
                bottom
            });
        }
        
        if (anchors.length === 0 && this.chevronCount > 0) {
            const zoneHeight = this.innerHeight / this.chevronCount;
            for (let i = 0; i < this.chevronCount; i++) {
                const top = this.innerTop + i * zoneHeight;
                const bottom = top + zoneHeight;
                anchors.push({
                    top,
                    mid: top + zoneHeight / 2,
                    bottom
                });
            }
        }
        
        return anchors;
    }

    buildChevronSegments() {
        const segments = [];
        const insetDepth = this.chevronDepth * 0.9;
        
        for (const anchor of this.chevronAnchors) {
            const { top, mid, bottom } = anchor;
            const leftBaseTop = { x: this.innerLeft, y: top };
            const leftBaseBottom = { x: this.innerLeft, y: bottom };
            const leftPeak = { x: this.innerLeft + insetDepth, y: mid };
            segments.push({ a: leftBaseTop, b: leftPeak });
            segments.push({ a: leftPeak, b: leftBaseBottom });
            
            const rightBaseTop = { x: this.innerRight, y: top };
            const rightBaseBottom = { x: this.innerRight, y: bottom };
            const rightPeak = { x: this.innerRight - insetDepth, y: mid };
            segments.push({ a: rightPeak, b: rightBaseTop });
            segments.push({ a: rightBaseBottom, b: rightPeak });
        }
        
        return segments;
    }

    createInnerPath(scale) {
        const path = new Path2D();
        const left = this.innerLeft * scale;
        const right = this.innerRight * scale;
        const top = this.innerTop * scale;
        const bottom = this.innerBottom * scale;
        
        // If no chevrons, create simple rectangular path
        if (this.chevronAnchors.length === 0) {
            path.moveTo(left, top);
            path.lineTo(right, top);
            path.lineTo(right, bottom);
            path.lineTo(left, bottom);
            path.closePath();
            return path;
        }
        
        const depth = this.chevronDepth * scale * 0.9;
        const anchors = this.chevronAnchors.map(anchor => ({
            top: anchor.top * scale,
            mid: anchor.mid * scale,
            bottom: anchor.bottom * scale
        }));
        
        path.moveTo(left, top);
        path.lineTo(right, top);

        for (const anchor of anchors) {
            path.lineTo(right, anchor.top);
            path.lineTo(right - depth, anchor.mid);
            path.lineTo(right, anchor.bottom);
        }
        
        path.lineTo(right, bottom);
        path.lineTo(left, bottom);

        for (let i = anchors.length - 1; i >= 0; i--) {
            const anchor = anchors[i];
            path.lineTo(left, anchor.bottom);
            path.lineTo(left + depth, anchor.mid);
            path.lineTo(left, anchor.top);
        }
        
        path.lineTo(left, top);
        path.closePath();
        return path;
    }

    renderChevronBevels(ctx, scale) {
        ctx.save();
        ctx.clip(this.createInnerPath(scale));
        const depth = this.chevronDepth * scale * 0.9;
        const left = this.innerLeft * scale;
        const right = this.innerRight * scale;
        const anchors = this.chevronAnchors.map(anchor => ({
            top: anchor.top * scale,
            mid: anchor.mid * scale,
            bottom: anchor.bottom * scale
        }));
        
        for (const anchor of anchors) {
            const y1 = anchor.top;
            const yMid = anchor.mid;
            const y2 = anchor.bottom;
            
            // Left bevel
            const leftGradient = ctx.createLinearGradient(left, yMid, left + depth, yMid);
            leftGradient.addColorStop(0, CONFIG.COLORS.chevronBevel);
            leftGradient.addColorStop(1, CONFIG.COLORS.transparent);
            ctx.fillStyle = leftGradient;
            ctx.beginPath();
            ctx.moveTo(left, y1);
            ctx.lineTo(left + depth, yMid);
            ctx.lineTo(left, y2);
            ctx.closePath();
            ctx.fill();
            
            // Right bevel
            const rightGradient = ctx.createLinearGradient(right - depth, yMid, right, yMid);
            rightGradient.addColorStop(0, CONFIG.COLORS.transparent);
            rightGradient.addColorStop(1, CONFIG.COLORS.chevronBevel);
            ctx.fillStyle = rightGradient;
            ctx.beginPath();
            ctx.moveTo(right, y1);
            ctx.lineTo(right - depth, yMid);
            ctx.lineTo(right, y2);
            ctx.closePath();
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    renderInnerGlow(ctx, scale, innerPath) {
        ctx.save();
        ctx.clip(innerPath);
        
        const innerX = this.innerLeft * scale;
        const innerY = this.innerTop * scale;
        const innerWidth = this.innerWidth * scale;
        const glowWidth = 30 * scale;
        
        // Top glow only - side glows will be rendered as outer glows
        const topGlow = ctx.createLinearGradient(innerX, innerY, innerX, innerY + glowWidth);
        topGlow.addColorStop(0, CONFIG.COLORS.innerGlow);
        topGlow.addColorStop(1, CONFIG.COLORS.transparent);
        ctx.fillStyle = topGlow;
        ctx.fillRect(innerX, innerY, innerWidth, glowWidth);
        
        ctx.restore();
    }
    
    renderOuterGlow(ctx, scale) {
        // Render glows along the chevron edges (not clipped)
        ctx.save();
        
        const glowWidth = 30 * scale;
        const left = this.innerLeft * scale;
        const right = this.innerRight * scale;
        const innerY = this.innerTop * scale;
        const innerHeight = this.innerHeight * scale;
        const depth = this.chevronDepth * scale * 0.9;
        
        if (this.chevronAnchors.length === 0) {
            ctx.restore();
            return;
        }
        
        // Map chevron anchors to scaled positions
        const anchors = this.chevronAnchors.map(anchor => ({
            top: anchor.top * scale,
            mid: anchor.mid * scale,
            bottom: anchor.bottom * scale
        }));
        
        // Left side outer glows - follows chevron contour
        let prevBottom = innerY;
        for (let i = 0; i < anchors.length; i++) {
            const anchor = anchors[i];
            
            // Straight segment glow
            if (anchor.top > prevBottom) {
                const leftGlow = ctx.createLinearGradient(left, 0, left + glowWidth, 0);
                leftGlow.addColorStop(0, 'rgba(0, 0, 0, 0.5)');  // Much darker for visibility
                leftGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = leftGlow;
                ctx.fillRect(left, prevBottom, glowWidth, anchor.top - prevBottom);
            }
            
            // Chevron peak glow - from straight edge to peak
            const peakGlow = ctx.createLinearGradient(left, 0, left + depth, 0);
            peakGlow.addColorStop(0, 'rgba(0, 0, 0, 0.5)');  // Much darker for visibility
            peakGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = peakGlow;
            ctx.beginPath();
            ctx.moveTo(left, anchor.top);
            ctx.lineTo(left + depth, anchor.mid);
            ctx.lineTo(left, anchor.bottom);
            ctx.closePath();
            ctx.fill();
            
            prevBottom = anchor.bottom;
        }
        
        // Final straight segment
        if (prevBottom < innerY + innerHeight) {
            const leftGlow = ctx.createLinearGradient(left, 0, left + glowWidth, 0);
            leftGlow.addColorStop(0, 'rgba(0, 0, 0, 0.5)');  // Much darker for visibility
            leftGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = leftGlow;
            ctx.fillRect(left, prevBottom, glowWidth, innerY + innerHeight - prevBottom);
        }
        
        // Right side outer glows - follows chevron contour
        prevBottom = innerY;
        for (let i = 0; i < anchors.length; i++) {
            const anchor = anchors[i];
            
            // Straight segment glow
            if (anchor.top > prevBottom) {
                const rightGlow = ctx.createLinearGradient(right - glowWidth, 0, right, 0);
                rightGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
                rightGlow.addColorStop(1, 'rgba(0, 0, 0, 0.5)');  // Much darker for visibility
                ctx.fillStyle = rightGlow;
                ctx.fillRect(right - glowWidth, prevBottom, glowWidth, anchor.top - prevBottom);
            }
            
            // Chevron peak glow - from straight edge to peak
            const peakGlow = ctx.createLinearGradient(right - depth, 0, right, 0);
            peakGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
            peakGlow.addColorStop(1, 'rgba(0, 0, 0, 0.5)');  // Much darker for visibility
            ctx.fillStyle = peakGlow;
            ctx.beginPath();
            ctx.moveTo(right, anchor.top);
            ctx.lineTo(right - depth, anchor.mid);
            ctx.lineTo(right, anchor.bottom);
            ctx.closePath();
            ctx.fill();
            
            prevBottom = anchor.bottom;
        }
        
        // Final straight segment
        if (prevBottom < innerY + innerHeight) {
            const rightGlow = ctx.createLinearGradient(right - glowWidth, 0, right, 0);
            rightGlow.addColorStop(0, 'rgba(0, 0, 0, 0)');
            rightGlow.addColorStop(1, 'rgba(0, 0, 0, 0.5)');  // Much darker for visibility
            ctx.fillStyle = rightGlow;
            ctx.fillRect(right - glowWidth, prevBottom, glowWidth, innerY + innerHeight - prevBottom);
        }
        
        ctx.restore();
    }
}
