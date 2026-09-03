(function () {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Qorbit: the save ────────────────────────────────────────────────
    // The animation dramatizes what Qorbit is actually for. The rocket reaches
    // apogee, the PRIMARY charge fails to fire, and two futures diverge in the
    // same frame: the ballistic one that ends in a crater, and the one where
    // the backup fires 312ms later and the rocket comes home.
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
        var ghostTrail = [];

        var telTime = card.querySelector('[data-tel="time"]');
        var telAlt = card.querySelector('[data-tel="alt"]');
        var telState = card.querySelector('[data-tel="state"]');

        var CYCLE = 11;          // seconds per full flight
        var APOGEE_M = 245;      // metres — a typical TARC profile
        var BACKUP_MS = 312;

        // Phase boundaries, as fractions of the cycle.
        var P_BOOST = 0.06, P_COAST = 0.34, P_FAIL = 0.42,
            P_FIRE = 0.47, P_BLOOM = 0.52, P_LAND = 0.90;

        var padX = 0, groundY = 0, apX = 0, apY = 0, mPerPx = 1;

        function resize() {
            var rect = canvas.getBoundingClientRect();
            w = Math.max(1, Math.floor(rect.width));
            h = Math.max(1, Math.floor(rect.height));
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            padX = w * 0.10;
            groundY = h * 0.60;   // stays clear of the telemetry HUD below
            apX = w * 0.36;
            apY = h * 0.10;
            mPerPx = APOGEE_M / Math.max(1, groundY - apY);
        }

        function easeOut(u) { return 1 - Math.pow(1 - u, 2.1); }
        function span(p, a, b) { return Math.max(0, Math.min(1, (p - a) / (b - a))); }

        // Powered climb from the pad to apogee.
        function boostPos(u) {
            var e = easeOut(u);
            return { x: padX + (apX - padX) * e, y: groundY - 14 - (groundY - 14 - apY) * e };
        }

        // What happens with no recovery: ballistic, tumbling, into the dirt.
        function ghostPos(v) {
            return {
                x: apX + w * 0.15 * v,
                y: apY + (groundY - apY) * v * v
            };
        }

        // What happens with Qorbit: canopy out, near-terminal descent, drifting.
        function livePos(v) {
            var sway = Math.sin(v * 7 + t * 1.6) * 8 * (1 - v * 0.45);
            return {
                x: apX + w * 0.40 * v + sway,
                y: apY + (groundY - 16 - apY) * (0.12 * v + 0.88 * Math.pow(v, 1.12))
            };
        }

        function stateFor(p) {
            if (p < P_BOOST) return 'preflight';
            if (p < P_COAST) return 'boost';
            if (p < P_FAIL) return 'coast';
            if (p < P_FIRE) return 'fail';
            if (p < P_BLOOM) return 'fire';
            if (p < P_LAND) return 'descent';
            return 'landed';
        }

        function spawnExhaust(x, y, ang) {
            for (var i = 0; i < 3; i++) {
                particles.push({
                    x: x - Math.sin(ang) * -16 + (Math.random() - 0.5) * 5,
                    y: y + 16 + Math.random() * 5,
                    vx: (Math.random() - 0.5) * 1.6,
                    vy: 1.8 + Math.random() * 2.8,
                    life: 1,
                    decay: 0.035 + Math.random() * 0.03,
                    r: 2 + Math.random() * 2.6
                });
            }
        }

        function spawnDebris(x, y) {
            for (var i = 0; i < 14; i++) {
                var a = -Math.PI * (0.15 + Math.random() * 0.7);
                var s = 1 + Math.random() * 3;
                particles.push({
                    x: x, y: y,
                    vx: Math.cos(a) * s * (Math.random() < 0.5 ? -1 : 1),
                    vy: Math.sin(a) * s,
                    life: 1, decay: 0.03, r: 1 + Math.random() * 1.8,
                    red: true
                });
            }
        }

        // ── Rocket ──────────────────────────────────────────────────────
        function drawBody(scale, ghost) {
            var s = scale;
            ctx.scale(s, s);

            if (ghost) {
                ctx.globalAlpha *= 0.55;
                ctx.fillStyle = '#64748b';
                ctx.fillRect(-5, -12, 10, 22);
                ctx.beginPath();
                ctx.moveTo(0, -19); ctx.lineTo(-5, -12); ctx.lineTo(5, -12);
                ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#475569';
                ctx.beginPath();
                ctx.moveTo(-5, 8); ctx.lineTo(-10, 15); ctx.lineTo(-5, 12); ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(5, 8); ctx.lineTo(10, 15); ctx.lineTo(5, 12); ctx.closePath(); ctx.fill();
                ctx.scale(1 / s, 1 / s);
                return;
            }

            // Airframe
            var bg = ctx.createLinearGradient(-6, 0, 6, 0);
            bg.addColorStop(0, '#cbd5e1');
            bg.addColorStop(0.4, '#f8fafc');
            bg.addColorStop(1, '#94a3b8');
            ctx.fillStyle = bg;
            ctx.fillRect(-5.5, -12, 11, 22);

            // Nose
            ctx.fillStyle = '#f8fafc';
            ctx.beginPath();
            ctx.moveTo(0, -20); ctx.lineTo(-5.5, -12); ctx.lineTo(5.5, -12);
            ctx.closePath(); ctx.fill();

            // Qorbit avionics band
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-6, 1, 12, 5);
            ctx.fillStyle = 'rgba(251,191,36,0.9)';
            ctx.fillRect(-6, 1, 12, 2);

            // Fins
            ctx.fillStyle = '#8fa0b5';
            ctx.beginPath();
            ctx.moveTo(-5.5, 8); ctx.lineTo(-10, 15); ctx.lineTo(-5.5, 12); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(5.5, 8); ctx.lineTo(10, 15); ctx.lineTo(5.5, 12); ctx.closePath(); ctx.fill();

            ctx.scale(1 / s, 1 / s);
        }

        // Status LED on the recovery module: green armed, red on primary fail.
        function drawModuleLed(scale, colour, pulse) {
            ctx.save();
            ctx.scale(scale, scale);
            ctx.shadowColor = colour;
            ctx.shadowBlur = 6 + pulse * 8;
            ctx.fillStyle = colour;
            ctx.beginPath();
            ctx.arc(0, -6, 1.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // A real canopy: filled dome, gores, shroud lines.
        function drawCanopy(bloom) {
            var b = Math.max(0, Math.min(1, bloom));
            if (b < 0.02) return;
            var R = 30 * b;
            var cy = -26 - 12 * b;

            var cg = ctx.createLinearGradient(-R, cy - R * 0.6, R, cy + R * 0.3);
            cg.addColorStop(0, 'rgba(251,191,36,' + (0.85 * b) + ')');
            cg.addColorStop(0.5, 'rgba(245,158,11,' + (0.62 * b) + ')');
            cg.addColorStop(1, 'rgba(180,105,10,' + (0.72 * b) + ')');

            ctx.beginPath();
            ctx.ellipse(0, cy, R, R * 0.66, 0, Math.PI, 0);
            ctx.closePath();
            ctx.fillStyle = cg;
            ctx.fill();
            ctx.strokeStyle = 'rgba(254,215,132,' + (0.85 * b) + ')';
            ctx.lineWidth = 1.1;
            ctx.stroke();

            // Gores
            ctx.strokeStyle = 'rgba(120,63,4,' + (0.4 * b) + ')';
            ctx.lineWidth = 0.7;
            for (var g = -2; g <= 2; g++) {
                ctx.beginPath();
                ctx.moveTo(0, cy);
                ctx.lineTo(R * (g / 2.4), cy - R * 0.62 * (1 - Math.abs(g) / 3.4));
                ctx.stroke();
            }

            // Shroud lines down to the airframe
            ctx.strokeStyle = 'rgba(226,232,240,' + (0.55 * b) + ')';
            ctx.lineWidth = 0.8;
            [-1, -0.45, 0.45, 1].forEach(function (k) {
                ctx.beginPath();
                ctx.moveTo(R * k, cy);
                ctx.lineTo(k * 3, -19);
                ctx.stroke();
            });
        }

        function drawRocket(x, y, angle, bloom, flame, ghost, scale) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            var s = scale || 1.35;

            if (flame) {
                var fl = 26 + Math.random() * 12;
                var fg = ctx.createLinearGradient(0, 14, 0, 14 + fl);
                fg.addColorStop(0, 'rgba(255,255,255,0.95)');
                fg.addColorStop(0.25, 'rgba(251,191,36,0.9)');
                fg.addColorStop(0.6, 'rgba(245,158,11,0.45)');
                fg.addColorStop(1, 'rgba(245,158,11,0)');
                ctx.fillStyle = fg;
                ctx.beginPath();
                ctx.moveTo(-6, 14);
                ctx.lineTo(0, 14 + fl);
                ctx.lineTo(6, 14);
                ctx.closePath();
                ctx.fill();
            }

            if (bloom > 0.02) drawCanopy(bloom);
            drawBody(s, ghost);
            ctx.restore();
        }

        // ── Backdrop ────────────────────────────────────────────────────
        function drawBackdrop() {
            // Altitude gridlines + tape
            ctx.font = '600 7px "DM Sans", system-ui, sans-serif';
            for (var i = 0; i <= 4; i++) {
                var gy = groundY - (groundY - apY) * (i / 4);
                ctx.strokeStyle = 'rgba(148,163,184,' + (i === 0 ? 0.16 : 0.055) + ')';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(w * 0.055, gy);
                ctx.lineTo(w, gy);
                ctx.stroke();
                if (i > 0) {
                    ctx.fillStyle = 'rgba(148,163,184,0.4)';
                    ctx.fillText(Math.round(APOGEE_M * i / 4) + 'm', 4, gy - 2);
                }
            }

            // Stars above the trace
            for (var s = 0; s < 22; s++) {
                var sx = (s * 137.5 + t * 4) % w;
                var sy = (s * 61.7) % (h * 0.5);
                ctx.beginPath();
                ctx.arc(sx, sy, 0.5 + (s % 3) * 0.2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(226,232,240,' + (0.08 + (s % 4) * 0.04) + ')';
                ctx.fill();
            }

            // Pad
            ctx.fillStyle = 'rgba(148,163,184,0.14)';
            ctx.fillRect(padX - 13, groundY - 4, 26, 4);
        }

        function drawPlannedArc() {
            ctx.setLineDash([3, 6]);
            ctx.strokeStyle = 'rgba(245,158,11,0.18)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (var i = 0; i <= 36; i++) {
                var pt = boostPos(i / 36);
                if (i === 0) ctx.moveTo(pt.x, pt.y); else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // Apogee target ring
            ctx.strokeStyle = 'rgba(245,158,11,0.22)';
            ctx.beginPath();
            ctx.arc(apX, apY, 13, 0, Math.PI * 2);
            ctx.stroke();
        }

        function strokeTrail(pts, colour, width, dashed) {
            if (pts.length < 2) return;
            if (dashed) ctx.setLineDash([3, 4]);
            ctx.strokeStyle = colour;
            ctx.lineWidth = width;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        function label(text, x, y, colour, size) {
            ctx.font = '700 ' + (size || 8) + 'px "DM Sans", system-ui, sans-serif';
            ctx.fillStyle = colour;
            ctx.fillText(text, x, y);
        }

        // ── Frame ───────────────────────────────────────────────────────
        function draw() {
            ctx.clearRect(0, 0, w, h);

            var p = (t % CYCLE) / CYCLE;
            var state = stateFor(p);
            var live, ghost = null, bloom = 0, flame = false, angle = 0;

            drawBackdrop();
            drawPlannedArc();

            if (p < P_BOOST) {
                live = { x: padX, y: groundY - 15 };
                if (trail.length) { trail = []; ghostTrail = []; }
            } else if (p < P_COAST) {
                var u = span(p, P_BOOST, P_COAST);
                live = boostPos(u);
                var nx = boostPos(Math.min(1, u + 0.03));
                angle = Math.atan2(nx.x - live.x, -(nx.y - live.y)) * 0.85;
                flame = true;
            } else if (p < P_FIRE) {
                // Coast through apogee, then the primary charge simply doesn't fire.
                live = { x: apX, y: apY + span(p, P_COAST, P_FIRE) * 5 };
                angle = 0.1;
            } else {
                var v = span(p, P_FIRE, P_LAND);
                live = livePos(v);
                bloom = Math.min(1, span(p, P_FIRE, P_BLOOM) * 1.25);
                angle = Math.sin(v * 7 + t * 1.6) * 0.14;

                var gv = span(p, P_FIRE, P_FIRE + 0.20);
                ghost = ghostPos(gv);
                if (gv >= 1) ghost.y = groundY;
            }

            // Trails
            if (p >= P_BOOST && p < P_LAND + 0.06) {
                trail.push({ x: live.x, y: live.y });
                if (trail.length > 150) trail.shift();
            }
            if (ghost) {
                ghostTrail.push({ x: ghost.x, y: ghost.y });
                if (ghostTrail.length > 90) ghostTrail.shift();
            }

            strokeTrail(ghostTrail, 'rgba(248,113,113,0.42)', 1.2, true);
            strokeTrail(trail, 'rgba(245,158,11,0.5)', 1.6, false);

            // Exhaust + debris
            if (flame) spawnExhaust(live.x, live.y, angle);
            for (var pi = particles.length - 1; pi >= 0; pi--) {
                var pc = particles[pi];
                pc.x += pc.vx;
                pc.y += pc.vy;
                if (pc.red) pc.vy += 0.12;
                pc.life -= pc.decay;
                if (pc.life <= 0) { particles.splice(pi, 1); continue; }
                ctx.beginPath();
                ctx.arc(pc.x, pc.y, pc.r * pc.life, 0, Math.PI * 2);
                ctx.fillStyle = pc.red
                    ? 'rgba(248,113,113,' + (pc.life * 0.65) + ')'
                    : 'rgba(245,158,11,' + (pc.life * 0.7) + ')';
                ctx.fill();
            }

            // Ghost outcome: tumbling airframe, then a crater marker.
            if (ghost) {
                var gLanded = ghost.y >= groundY - 0.5;
                if (!gLanded) {
                    drawRocket(ghost.x, ghost.y, span(p, P_FIRE, P_FIRE + 0.2) * 11, 0, false, true, 1.15);
                } else {
                    if (!spawnedDebris) { spawnDebris(ghost.x, groundY - 4); spawnedDebris = true; }
                    ctx.strokeStyle = 'rgba(248,113,113,0.75)';
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.moveTo(ghost.x - 26, groundY - 8); ctx.lineTo(ghost.x - 18, groundY);
                    ctx.moveTo(ghost.x - 18, groundY - 8); ctx.lineTo(ghost.x - 26, groundY);
                    ctx.stroke();
                    ctx.textAlign = 'center';
                    label('BALLISTIC', ghost.x, groundY - 13, 'rgba(248,113,113,0.85)', 7.5);
                    ctx.textAlign = 'left';
                }
            } else {
                spawnedDebris = false;
            }

            // The live rocket
            var ledPulse = 0.5 + 0.5 * Math.sin(t * 9);
            drawRocket(live.x, live.y, angle, bloom, flame, false, 1.35);
            if (state === 'preflight' || state === 'boost' || state === 'coast') {
                ctx.save(); ctx.translate(live.x, live.y); ctx.rotate(angle);
                drawModuleLed(1.35, '#22c55e', ledPulse * 0.4);
                ctx.restore();
            } else if (state === 'fail') {
                ctx.save(); ctx.translate(live.x, live.y); ctx.rotate(angle);
                drawModuleLed(1.35, '#f87171', ledPulse);
                ctx.restore();
            }

            // ── Callouts: the story beats ───────────────────────────────
            ctx.textAlign = 'left';

            if (state === 'preflight') {
                label('ARMED · PRE-FLIGHT CHECKS OK', padX - 8, groundY - 30,
                    'rgba(34,197,94,' + (0.5 + ledPulse * 0.35) + ')', 7.5);
            }

            if (state === 'coast' || state === 'fail') {
                label('APOGEE ' + APOGEE_M + 'm', apX + 16, apY - 4,
                    'rgba(245,158,11,' + (0.6 + Math.sin(t * 7) * 0.25) + ')', 8);
            }

            if (state === 'fail') {
                var blink = Math.sin(t * 16) > -0.2 ? 1 : 0.25;
                label('✕ PRIMARY CHARGE — NO FIRE', apX + 16, apY + 9,
                    'rgba(248,113,113,' + (0.95 * blink) + ')', 8);
            }

            // Backup ignition: bright ring pulse at the moment it fires.
            if (p >= P_FIRE && p < P_FIRE + 0.06) {
                var k = span(p, P_FIRE, P_FIRE + 0.06);
                ctx.strokeStyle = 'rgba(251,191,36,' + (1 - k) + ')';
                ctx.lineWidth = 2 * (1 - k) + 0.5;
                ctx.beginPath();
                ctx.arc(live.x, live.y, 8 + k * 42, 0, Math.PI * 2);
                ctx.stroke();
            }

            if (p >= P_FIRE && p < P_LAND) {
                label('QORBIT BACKUP FIRED · ' + BACKUP_MS + ' ms', apX - 4, apY + 26,
                    'rgba(34,197,94,' + (p < P_FIRE + 0.14 ? 0.95 : 0.55) + ')', 8);
            }

            if (state === 'landed') {
                var lx = live.x;
                ctx.strokeStyle = 'rgba(34,197,94,0.85)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(lx - 28, groundY - 4);
                ctx.lineTo(lx - 24, groundY);
                ctx.lineTo(lx - 18, groundY - 9);
                ctx.stroke();
                ctx.textAlign = 'center';
                label('RECOVERED', lx, groundY - 13, 'rgba(74,222,128,0.95)', 7.5);
                ctx.textAlign = 'left';
            }

            // Ground line last, so markers sit on it
            ctx.strokeStyle = 'rgba(148,163,184,0.22)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(w, groundY);
            ctx.stroke();

            // ── HUD ────────────────────────────────────────────────────
            var labels = {
                preflight: 'ARMED',
                boost: 'BOOST',
                coast: 'APOGEE',
                fail: 'PRIMARY FAIL',
                fire: 'BACKUP FIRED',
                descent: 'PROTECTED',
                landed: 'RECOVERED'
            };
            if (telState) {
                telState.textContent = labels[state];
                telState.style.color = state === 'fail'
                    ? '#f87171'
                    : (state === 'fire' || state === 'landed' ? '#4ade80' : '');
            }
            if (telTime) telTime.textContent = (p * CYCLE).toFixed(2) + 's';
            if (telAlt) {
                telAlt.textContent = Math.max(0, Math.round((groundY - live.y) * mPerPx)) + ' m';
            }

            t += 0.016;
        }

        var spawnedDebris = false;

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
