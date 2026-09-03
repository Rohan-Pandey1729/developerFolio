(function () {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Qorbit: telemetry-driven recovery sequence ──────────────────────
    function initQorbit(canvas, card) {
        var ctx = canvas.getContext('2d');
        if (!ctx) return null;

        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var w = 0, h = 0;
        var t = 0;
        var running = false;
        var rafId = 0;
        var particles = [];
        var trail = [];

        var telTime = card.querySelector('[data-tel="time"]');
        var telAlt = card.querySelector('[data-tel="alt"]');
        var telState = card.querySelector('[data-tel="state"]');

        var CYCLE = 10;
        var launchX = 0;
        var apogeeY = 0;
        var groundY = 0;

        function resize() {
            var rect = canvas.getBoundingClientRect();
            w = Math.max(1, Math.floor(rect.width));
            h = Math.max(1, Math.floor(rect.height));
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            launchX = w * 0.14;
            groundY = h * 0.84;
            apogeeY = groundY - h * 0.52;
        }

        // phase 0–1 maps to: pad → boost → coast → deploy → chute descent → landed
        function flightState(phase) {
            if (phase < 0.08) return 'preflight';
            if (phase < 0.38) return 'boost';
            if (phase < 0.48) return 'coast';
            if (phase < 0.54) return 'deploy';
            if (phase < 0.88) return 'descent';
            return 'landed';
        }

        function rocketPos(phase) {
            var padX = launchX;
            var apogeeX = w * 0.52;

            if (phase < 0.08) {
                return { x: padX, y: groundY - 14, angle: -Math.PI / 2, chute: 0, flame: false };
            }
            if (phase < 0.38) {
                var p = (phase - 0.08) / 0.3;
                var ease = 1 - Math.pow(1 - p, 2.2);
                return {
                    x: padX + (apogeeX - padX) * ease,
                    y: groundY - 14 - (groundY - 14 - apogeeY) * ease,
                    angle: -Math.PI / 2 + ease * 0.12,
                    chute: 0,
                    flame: true
                };
            }
            if (phase < 0.48) {
                var drift = Math.sin((phase - 0.38) * 18) * 2;
                return { x: apogeeX + drift, y: apogeeY, angle: 0.08, chute: 0, flame: false };
            }
            if (phase < 0.54) {
                var dp = (phase - 0.48) / 0.06;
                return { x: apogeeX, y: apogeeY + dp * 8, angle: 0.15, chute: Math.min(1, dp * 1.4), flame: false };
            }
            if (phase < 0.88) {
                var fp = (phase - 0.54) / 0.34;
                var sway = Math.sin(fp * 9 + t * 2) * 14 * (1 - fp * 0.4);
                return {
                    x: apogeeX + sway,
                    y: apogeeY + (groundY - 18 - apogeeY) * (fp * fp * 0.85 + fp * 0.15),
                    angle: Math.sin(fp * 9 + t * 2) * 0.18,
                    chute: 1,
                    flame: false
                };
            }
            return { x: apogeeX, y: groundY - 16, angle: 0.05, chute: 0.85, flame: false };
        }

        function predictedArc() {
            var padX = launchX;
            var apogeeX = w * 0.52;
            var pts = [];
            for (var i = 0; i <= 40; i++) {
                var p = i / 40;
                var ease = 1 - Math.pow(1 - p, 2.2);
                pts.push({
                    x: padX + (apogeeX - padX) * ease,
                    y: groundY - 14 - (groundY - 14 - apogeeY) * ease
                });
            }
            return pts;
        }

        function spawnExhaust(x, y) {
            for (var i = 0; i < 2; i++) {
                particles.push({
                    x: x + (Math.random() - 0.5) * 4,
                    y: y + 10 + Math.random() * 4,
                    vx: (Math.random() - 0.5) * 1.2,
                    vy: 1.5 + Math.random() * 2.5,
                    life: 1,
                    decay: 0.04 + Math.random() * 0.03,
                    r: 1.5 + Math.random() * 2
                });
            }
        }

        function drawRocket(x, y, angle, chute, flame) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);

            if (flame) {
                var fg = ctx.createLinearGradient(0, 12, 0, 28);
                fg.addColorStop(0, 'rgba(251,191,36,0.95)');
                fg.addColorStop(0.5, 'rgba(245,158,11,0.55)');
                fg.addColorStop(1, 'rgba(245,158,11,0)');
                ctx.fillStyle = fg;
                ctx.beginPath();
                ctx.moveTo(-4, 12);
                ctx.lineTo(0, 22 + Math.random() * 4);
                ctx.lineTo(4, 12);
                ctx.closePath();
                ctx.fill();
            }

            // Body
            ctx.fillStyle = '#e8ecf0';
            ctx.fillRect(-5, -12, 10, 22);

            // Nose
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.moveTo(0, -18);
            ctx.lineTo(-5, -12);
            ctx.lineTo(5, -12);
            ctx.closePath();
            ctx.fill();

            // Band
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-5.5, 2, 11, 4);

            // Fins
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.moveTo(-5, 8);
            ctx.lineTo(-9, 14);
            ctx.lineTo(-5, 12);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(5, 8);
            ctx.lineTo(9, 14);
            ctx.lineTo(5, 12);
            ctx.closePath();
            ctx.fill();

            // Recovery module indicator
            ctx.fillStyle = 'rgba(34,197,94,0.85)';
            ctx.fillRect(-3, -8, 6, 3);

            if (chute > 0.05) {
                var c = chute;
                ctx.strokeStyle = 'rgba(251,191,36,' + (c * 0.95) + ')';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(-7, -18);
                ctx.lineTo(-5, -18 - 20 * c);
                ctx.moveTo(7, -18);
                ctx.lineTo(5, -18 - 20 * c);
                ctx.stroke();
                ctx.fillStyle = 'rgba(245,158,11,' + (c * 0.4) + ')';
                ctx.beginPath();
                ctx.ellipse(0, -18 - 16 * c, 14 * c, 9 * c, 0, Math.PI, 0);
                ctx.fill();
                ctx.strokeStyle = 'rgba(251,191,36,' + (c * 0.6) + ')';
                ctx.beginPath();
                ctx.moveTo(-14 * c, -18 - 16 * c);
                ctx.quadraticCurveTo(0, -18 - 24 * c, 14 * c, -18 - 16 * c);
                ctx.stroke();
            }

            ctx.restore();
        }

        function drawHud(state, phase, pos, deployMs) {
            var labels = {
                preflight: 'PREFLIGHT',
                boost: 'ACTIVE',
                coast: 'TRACKING',
                deploy: 'PROTECTED',
                descent: 'PROTECTED',
                landed: 'RECORDED'
            };
            if (telState) telState.textContent = labels[state] || 'ACTIVE';

            var elapsed = phase * CYCLE;
            if (telTime) telTime.textContent = elapsed.toFixed(3) + 's';
            if (telAlt) {
                var altM = Math.max(0, Math.round((groundY - pos.y) * 0.95));
                telAlt.textContent = altM + ' m';
            }

            // Apogee flash
            if (state === 'coast' || (state === 'deploy' && phase < 0.5)) {
                ctx.save();
                ctx.font = '700 9px Outfit, system-ui, sans-serif';
                ctx.fillStyle = 'rgba(245,158,11,' + (0.55 + Math.sin(t * 8) * 0.25) + ')';
                ctx.fillText('APOGEE', pos.x + 14, pos.y - 10);
                ctx.restore();
            }

            // Deploy timer callout
            if (state === 'deploy') {
                ctx.save();
                ctx.font = '600 8px DM Sans, system-ui, sans-serif';
                ctx.fillStyle = 'rgba(34,197,94,0.9)';
                ctx.fillText('DEPLOY ' + deployMs + 'ms', pos.x + 14, pos.y + 4);
                ctx.restore();
            }

            if (state === 'landed') {
                ctx.save();
                ctx.font = '600 9px DM Sans, system-ui, sans-serif';
                ctx.fillStyle = 'rgba(34,197,94,0.75)';
                ctx.fillText('✓ FLIGHT LOGGED', pos.x - 28, pos.y + 22);
                ctx.restore();
            }
        }

        function draw() {
            ctx.clearRect(0, 0, w, h);

            var phase = (t % CYCLE) / CYCLE;
            var state = flightState(phase);
            var pos = rocketPos(phase);
            var deployMs = state === 'deploy'
                ? Math.min(380, Math.round((phase - 0.48) / 0.06 * 380))
                : (phase >= 0.54 ? 312 : 0);

            // Stars
            for (var s = 0; s < 28; s++) {
                var sx = (s * 137.5 + t * 6) % w;
                var sy = (s * 97.3) % (h * 0.75);
                ctx.beginPath();
                ctx.arc(sx, sy, 0.5 + (s % 3) * 0.25, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(226,232,240,' + (0.12 + (s % 5) * 0.05) + ')';
                ctx.fill();
            }

            // Launch pad
            ctx.strokeStyle = 'rgba(148,163,184,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(launchX - 18, groundY);
            ctx.lineTo(launchX + 18, groundY);
            ctx.stroke();
            ctx.fillStyle = 'rgba(148,163,184,0.08)';
            ctx.fillRect(launchX - 14, groundY - 4, 28, 4);

            // Ground
            ctx.strokeStyle = 'rgba(148,163,184,0.12)';
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(w, groundY);
            ctx.stroke();

            // Predicted trajectory (dashed arc)
            var arc = predictedArc();
            ctx.setLineDash([4, 6]);
            ctx.strokeStyle = 'rgba(245,158,11,0.22)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(arc[0].x, arc[0].y);
            for (var a = 1; a < arc.length; a++) ctx.lineTo(arc[a].x, arc[a].y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Apogee target ring
            ctx.strokeStyle = 'rgba(245,158,11,0.18)';
            ctx.beginPath();
            ctx.arc(w * 0.52, apogeeY, 16, 0, Math.PI * 2);
            ctx.stroke();

            // Live trail during boost/coast
            if (state === 'boost' || state === 'coast' || state === 'deploy') {
                trail.push({ x: pos.x, y: pos.y });
                if (trail.length > 48) trail.shift();
            } else if (state === 'preflight' || state === 'landed') {
                if (phase < 0.02 || phase > 0.94) trail = [];
            }

            if (trail.length > 1) {
                ctx.strokeStyle = 'rgba(245,158,11,0.45)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(trail[0].x, trail[0].y);
                for (var ti = 1; ti < trail.length; ti++) ctx.lineTo(trail[ti].x, trail[ti].y);
                ctx.stroke();
            }

            // Particles
            if (pos.flame) spawnExhaust(pos.x, pos.y);
            for (var pi = particles.length - 1; pi >= 0; pi--) {
                var p = particles[pi];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;
                if (p.life <= 0) { particles.splice(pi, 1); continue; }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(245,158,11,' + (p.life * 0.7) + ')';
                ctx.fill();
            }

            // Preflight checklist pulse
            if (state === 'preflight') {
                var checkAlpha = 0.35 + Math.sin(t * 4) * 0.2;
                ctx.font = '600 8px DM Sans, system-ui, sans-serif';
                ctx.fillStyle = 'rgba(245,158,11,' + checkAlpha + ')';
                ctx.fillText('ARMED · CHECKS OK', launchX - 34, groundY - 28);
            }

            drawRocket(pos.x, pos.y, pos.angle, pos.chute, pos.flame);
            drawHud(state, phase, pos, deployMs);

            t += 0.016;
        }

        function loop() {
            if (!running) return;
            draw();
            rafId = requestAnimationFrame(loop);
        }

        function start() {
            if (running) return;
            running = true;
            rafId = requestAnimationFrame(loop);
        }

        function stop() {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
        }

        resize();
        window.addEventListener('resize', resize);
        if (!reducedMotion) draw();

        return { start: start, stop: stop, resize: resize };
    }

    // ── Lumina: neural research pipeline animation ──────────────────────
    function initLumina(canvas, card) {
        var ctx = canvas.getContext('2d');
        if (!ctx) return null;

        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var w = 0, h = 0;
        var t = 0;
        var running = false;
        var rafId = 0;

        var nodes = card.querySelectorAll('.pipeline-node');
        var activeStep = 0;
        var stepTimer = 0;

        var graphNodes = [];
        var edges = [];

        function buildGraph() {
            graphNodes = [
                { x: w * 0.15, y: h * 0.35, r: 5, label: '?' },
                { x: w * 0.35, y: h * 0.22, r: 4 },
                { x: w * 0.55, y: h * 0.38, r: 5 },
                { x: w * 0.75, y: h * 0.25, r: 4 },
                { x: w * 0.88, y: h * 0.42, r: 6 }
            ];
            edges = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 2], [1, 4]];
        }

        function resize() {
            var rect = canvas.getBoundingClientRect();
            w = Math.max(1, Math.floor(rect.width));
            h = Math.max(1, Math.floor(rect.height));
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            buildGraph();
        }

        function draw() {
            ctx.clearRect(0, 0, w, h);

            // Soft grid
            ctx.strokeStyle = 'rgba(129,140,248,0.06)';
            ctx.lineWidth = 1;
            for (var gx = 0; gx < w; gx += 28) {
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                ctx.lineTo(gx, h);
                ctx.stroke();
            }

            // Edges with pulse
            var pulse = 0.5 + 0.5 * Math.sin(t * 2);
            edges.forEach(function (e, i) {
                var a = graphNodes[e[0]];
                var b = graphNodes[e[1]];
                var lit = (i % 4) <= activeStep;
                ctx.strokeStyle = lit
                    ? 'rgba(165,180,252,' + (0.35 + pulse * 0.35) + ')'
                    : 'rgba(129,140,248,0.12)';
                ctx.lineWidth = lit ? 1.5 : 1;
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.stroke();

                // Traveling dot on active edges
                if (lit && !reducedMotion) {
                    var prog = (t * 0.8 + i * 0.3) % 1;
                    var dx = a.x + (b.x - a.x) * prog;
                    var dy = a.y + (b.y - a.y) * prog;
                    ctx.beginPath();
                    ctx.arc(dx, dy, 2, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(196,181,253,0.9)';
                    ctx.fill();
                }
            });

            // Nodes
            graphNodes.forEach(function (n, i) {
                var lit = i <= activeStep + 1;
                var glow = lit ? 8 + pulse * 6 : 0;
                ctx.shadowColor = '#818cf8';
                ctx.shadowBlur = glow;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = lit ? '#a5b4fc' : 'rgba(129,140,248,0.35)';
                ctx.fill();
                ctx.shadowBlur = 0;

                if (n.label) {
                    ctx.fillStyle = 'rgba(196,181,253,0.8)';
                    ctx.font = '700 11px Outfit, system-ui, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(n.label, n.x, n.y + 4);
                }
            });

            // Floating paper icon at end
            if (activeStep >= 3) {
                var paperX = w * 0.88;
                var paperY = h * 0.42 + Math.sin(t * 1.5) * 3;
                ctx.fillStyle = 'rgba(196,181,253,0.15)';
                ctx.strokeStyle = 'rgba(165,180,252,0.5)';
                ctx.lineWidth = 1;
                ctx.fillRect(paperX - 10, paperY - 14, 20, 26);
                ctx.strokeRect(paperX - 10, paperY - 14, 20, 26);
                ctx.strokeStyle = 'rgba(165,180,252,0.3)';
                for (var ly = 0; ly < 3; ly++) {
                    ctx.beginPath();
                    ctx.moveTo(paperX - 6, paperY - 6 + ly * 6);
                    ctx.lineTo(paperX + 6, paperY - 6 + ly * 6);
                    ctx.stroke();
                }
            }

            stepTimer += 0.016;
            if (stepTimer > 2.4) {
                stepTimer = 0;
                activeStep = (activeStep + 1) % 4;
                nodes.forEach(function (node, idx) {
                    node.classList.toggle('active', idx <= activeStep);
                });
            }

            t += 0.016;
        }

        function loop() {
            if (!running) return;
            draw();
            rafId = requestAnimationFrame(loop);
        }

        function start() {
            if (running) return;
            running = true;
            rafId = requestAnimationFrame(loop);
        }

        function stop() {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
        }

        resize();
        window.addEventListener('resize', resize);
        if (!reducedMotion) draw();

        return { start: start, stop: stop, resize: resize };
    }

    // ── Boot all venture canvases ───────────────────────────────────────
    var animators = [];

    document.querySelectorAll('.venture-canvas').forEach(function (canvas) {
        var card = canvas.closest('.venture-card');
        var type = canvas.getAttribute('data-venture');
        var anim = type === 'qorbit' ? initQorbit(canvas, card) : initLumina(canvas, card);
        if (anim) animators.push({ el: canvas, anim: anim });
    });

    if (!animators.length) return;

    // Start when section scrolls into view; pause when offscreen
    var section = document.getElementById('ventures');
    if (section) {
        var visible = false;
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                visible = entry.isIntersecting;
                animators.forEach(function (a) {
                    if (visible && !document.hidden && !reducedMotion) a.anim.start();
                    else a.anim.stop();
                });
            });
        }, { threshold: 0.15 });
        io.observe(section);
    }

    document.addEventListener('visibilitychange', function () {
        animators.forEach(function (a) {
            if (document.hidden || reducedMotion) a.anim.stop();
            else if (section) {
                var rect = section.getBoundingClientRect();
                if (rect.top < window.innerHeight && rect.bottom > 0) a.anim.start();
            }
        });
    });

    // 3D tilt on venture cards (desktop)
    if (!reducedMotion && window.matchMedia('(pointer: fine)').matches) {
        document.querySelectorAll('.venture-card').forEach(function (card) {
            var raf = 0;
            card.addEventListener('pointermove', function (e) {
                if (raf) return;
                raf = requestAnimationFrame(function () {
                    raf = 0;
                    var rect = card.getBoundingClientRect();
                    var px = (e.clientX - rect.left) / rect.width - 0.5;
                    var py = (e.clientY - rect.top) / rect.height - 0.5;
                    card.style.transform =
                        'perspective(900px) rotateX(' + (-py * 5).toFixed(2) + 'deg) rotateY(' + (px * 7).toFixed(2) + 'deg) translateY(-6px)';
                });
            });
            card.addEventListener('pointerleave', function () {
                if (raf) { cancelAnimationFrame(raf); raf = 0; }
                card.style.transform = '';
            });
        });
    }
})();
