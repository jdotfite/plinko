// Particle system for snow flakes and sparks
(function(){
    const PS = {
        particles: [],
        lastTime: null,
        // spawn a procedural flake at position {x,y} in game coords
        spawnFlake(opts = {}){
            const {x=0,y=0, speed=0, scale=1} = opts;
            const now = performance.now();
            // seed
            const seed = Math.floor(Math.random()*0xFFFF);
            const arms = 6;
            const segments = 2 + Math.floor(Math.random()*2); // 2-3 segments
            const life = 700 + Math.random()*500; // ms
            const rot = (Math.random()-0.5) * 0.5;
            const rotSpeed = (Math.random()-0.5) * 0.0015 * (1 + speed*0.06);
            const baseSize = (12 + Math.random()*8) * (1 + speed*0.08) * scale; // base flake size in px (game coords)
            // drift velocity small sideways
            const drift = { x: (Math.random()-0.5) * 0.08 * (1+speed*0.3), y: 0.02 + Math.random()*0.06 };
            PS.particles.push({
                type: 'flake',
                x, y,
                vx: drift.x, vy: drift.y,
                birth: now,
                life,
                seed,
                arms,
                segments,
                rot,
                rotSpeed,
                baseSize,
                speed,
                shattered: false
            });
            // keep array reasonable
            if (PS.particles.length > 800) PS.particles.splice(0, PS.particles.length - 600);
        },
        spawnSparks(x, y, count=6){
            const now = performance.now();
            for (let i=0;i<count;i++){
                const ang = Math.random()*Math.PI*2;
                const s = 60 + Math.random()*120;
                PS.particles.push({
                    type: 'spark', x, y,
                    vx: Math.cos(ang)*s*0.002, vy: Math.sin(ang)*s*0.002 - 0.01,
                    birth: now,
                    life: 300 + Math.random()*200,
                    size: 1 + Math.random()*2
                });
            }
        },
        update(){
            const now = performance.now();
            if (!PS.lastTime) PS.lastTime = now;
            const dt = Math.min(40, now - PS.lastTime); // ms
            PS.lastTime = now;
            for (let i = PS.particles.length - 1; i >= 0; i--) {
                const p = PS.particles[i];
                const t = (now - p.birth) / p.life;
                if (t >= 1) {
                    // explode into sparks occasionally
                    if (p.type === 'flake' && !p.shattered && Math.random() < 0.35) {
                        PS.spawnSparks(p.x, p.y, 3 + Math.floor(Math.random()*4));
                        p.shattered = true;
                    }
                    PS.particles.splice(i,1);
                    continue;
                }
                // simple motion
                p.x += p.vx * dt;
                p.y += p.vy * dt + 0.0005 * dt; // tiny gravity
                if (p.type === 'flake') {
                    p.rot += p.rotSpeed * dt;
                    // slight drift modulation
                    p.vx += (Math.sin((p.birth + now)*0.0002 + p.seed) * 0.00004) * dt;
                } else if (p.type === 'spark') {
                    // sparks slow down and fall
                    p.vx *= 0.995;
                    p.vy += 0.0008 * dt;
                }
            }
        },
        render(ctx, scale){
            if (!PS.particles.length) return;
            const now = performance.now();
            // choose base channel from theme
            const isDark = (typeof THEME_STATE !== 'undefined' && THEME_STATE.current === 'dark');
            const baseChannel = isDark ? 255 : 24;
            ctx.save();
            for (let i = 0; i < PS.particles.length; i++){
                const p = PS.particles[i];
                const t = (now - p.birth) / p.life;
                if (p.type === 'spark') {
                        const alpha = 1 - t*t;
                            ctx.globalAlpha = alpha * 0.9 * 0.18;
                    ctx.fillStyle = `rgba(${baseChannel},${baseChannel},${baseChannel},1)`;
                    ctx.beginPath();
                    ctx.arc(p.x*scale, p.y*scale, (p.size || 1.2) * scale, 0, Math.PI*2);
                    ctx.fill();
                    continue;
                }
                // flake rendering - 6-fold symmetry with cheap branching
                const lifeEase = 1 - Math.pow(1 - t, 2); // easeOut
                const size = p.baseSize * lifeEase;
                const alpha = Math.max(0, 1 - t*t);
                // brightness pulse
                const pulse = 0.08 + 0.12 * Math.sin((now - p.birth) * 0.012 + p.seed);
                ctx.globalAlpha = alpha * (0.5 + pulse) * 0.18;
                ctx.strokeStyle = `rgba(${baseChannel},${baseChannel},${baseChannel},1)`;
                ctx.lineWidth = Math.max(1, Math.min(3, size * 0.06)) * scale;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.save();
                ctx.translate(p.x*scale, p.y*scale);
                ctx.rotate(p.rot);
                // for each arm
                for (let a = 0; a < p.arms; a++){
                    const ang = a * (Math.PI*2 / p.arms) + ((p.seed % 13)-6)/400; // tiny jitter
                    ctx.save();
                    ctx.rotate(ang);
                    // draw 2-4 segments
                    let segCount = Math.max(2, p.segments);
                    let segLen = size * 0.5;
                    for (let s=0;s<segCount;s++){
                        const out = segLen * (1 - s*0.28);
                        ctx.beginPath();
                        ctx.moveTo(0 + s*0.0001, 0 + s*0.0001);
                        ctx.lineTo(out, 0);
                        ctx.stroke();
                        // branch occasionally
                        if (s > 0 && Math.random() < 0.35) {
                            ctx.beginPath();
                            const bx = out * 0.5;
                            const by = 0;
                            ctx.moveTo(bx, by);
                            ctx.lineTo(bx + out*0.35*Math.cos(Math.PI/6), by + out*0.35*Math.sin(Math.PI/6));
                            ctx.stroke();
                            ctx.beginPath();
                            ctx.moveTo(bx, by);
                            ctx.lineTo(bx + out*0.35*Math.cos(-Math.PI/6), by + out*0.35*Math.sin(-Math.PI/6));
                            ctx.stroke();
                        }
                        // step forward for next segment
                        ctx.translate(out, 0);
                    }
                    ctx.restore();
                }
                ctx.restore();
            }
            ctx.globalAlpha = 1;
            ctx.restore();
        }
    };

    // expose globally
    window.particleSystem = PS;
})();
