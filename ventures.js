(function () {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Qorbit: rocket flight + recovery deploy animation ───────────────
    function initQorbit(canvas, card) {
        var ctx = canvas.getContext('2d');
        if (!ctx) return null;

        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var w = 0, h = 0;
        var t = 0;
        var running = false;
        var rafId = 0;

        var telTime = card.querySelector('[data-tel="time"]');
        var telAlt = card.querySelector('[data-tel="alt"]');
        var telState = card.querySelector('[data-tel="state"]');

        var states = ['ACTIVE', 'TRACKING', 'PROTECTED', 'RECORDED'];
        var stateIdx = 0;
        var stateTimer = 0;

        function resize() {
            var rect = canvas.getBoundingClientRect();
            w = Math.max(1, Math.floor(rect.width));
            h = Math.max(1, Math.floor(rect.height));
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function drawRocket(x, y, angle, scale) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            ctx.scale(scale, scale);

            // Exhaust glow
            var eg = ctx.createRadialGradient(0, 14, 0, 0, 14, 18);
            eg.addColorStop(0, 'rgba(245,158,11,0.45)');
            eg.addColorStop(1, 'rgba(245,158,11,0)');
            ctx.fillStyle = eg;
            ctx.beginPath();
            ctx.ellipse(0, 14, 10, 16, 0, 0, Math.PI * 2);
            ctx.fill();

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

            // Parachute (appears during deploy phase)
            var phase = (t % 8) / 8;
            if (phase > 0.55 && phase < 0.85) {
                var deploy = Math.min(1, (phase - 0.55) / 0.12);
                ctx.strokeStyle = 'rgba(251,191,36,' + (deploy * 0.9) + ')';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(-8, -18);
                ctx.quadraticCurveTo(0, -18 - 22 * deploy, 8, -18);
                ctx.stroke();
                ctx.fillStyle = 'rgba(245,158,11,' + (deploy * 0.35) + ')';
                ctx.beginPath();
                ctx.ellipse(0, -18 - 14 * deploy, 12 * deploy, 8 * deploy, 0, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }

        function drawTrail(points) {
            if (points.length < 2) return;
            ctx.strokeStyle = 'rgba(245,158,11,0.35)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (var i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
        }

        function draw() {
            ctx.clearRect(0, 0, w, h);

            // Stars
            for (var s = 0; s < 24; s++) {
                var sx = ((s * 137.5 + t * 8) % w);
                var sy = ((s * 97.3) % (h * 0.7));
                ctx.beginPath();
                ctx.arc(sx, sy, 0.6 + (s % 3) * 0.3, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(226,232,240,' + (0.15 + (s % 5) * 0.06) + ')';
                ctx.fill();
            }

            // Ground line
            var groundY = h * 0.82;
            ctx.strokeStyle = 'rgba(148,163,184,0.15)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(w, groundY);
            ctx.stroke();

            // Flight path
            var cycle = 8;
            var phase = (t % cycle) / cycle;
            var rx = w * 0.12 + (w * 0.76) * phase;
            var ry;
            if (phase < 0.45) {
                ry = groundY - (h * 0.55) * Math.sin(phase / 0.45 * Math.PI);
            } else if (phase < 0.55) {
                ry = groundY - h * 0.55;
            } else {
                var fall = (phase - 0.55) / 0.45;
                ry = groundY - h * 0.55 * (1 - fall * fall);
            }

            var angle = phase < 0.45 ? -Math.PI / 2 + 0.15 : (phase < 0.55 ? 0.1 : 0.4);
            drawRocket(rx, ry, angle, 1.1);

            // Apogee marker
            if (phase >= 0.44 && phase <= 0.56) {
                ctx.fillStyle = 'rgba(245,158,11,0.6)';
                ctx.font = '600 9px DM Sans, system-ui, sans-serif';
                ctx.fillText('APOGEE', rx + 12, ry - 8);
            }

            // Telemetry sync
            if (telTime) telTime.textContent = (phase * cycle * 0.4).toFixed(3) + 's';
            if (telAlt) {
                var altM = Math.max(0, Math.round((groundY - ry) * 0.9));
                telAlt.textContent = altM + ' m';
            }
            stateTimer += 0.016;
            if (stateTimer > 1.2) {
                stateTimer = 0;
                stateIdx = (stateIdx + 1) % states.length;
            }
            if (telState) telState.textContent = states[stateIdx];

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
