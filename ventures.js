(function () {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Qorbit: the save ────────────────────────────────────────────────
    // The animation dramatizes what Qorbit is actually for. The rocket reaches
    // apogee, the PRIMARY charge fails to fire, and both futures fall together
    // until the backup fires — one comes home under canopy, the other doesn't.
    //
    // Everything is driven by elapsed seconds and every traced path is sampled
    // analytically from its own parametric curve, so the motion is identical at
    // 60Hz and 120Hz and no line is ever a polyline of accumulated frames.
    function initQorbit(canvas, card) {
        var ctx = canvas.getContext('2d');
        if (!ctx) return null;

        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var w = 0, h = 0, scale = 1.4;
        var clock = 0;          // seconds, wraps at CYCLE
        var lastMs = 0;
        var running = false;
        var rafId = 0;
        var particles = [];
        var cycleIndex = -1;
        var debrisDone = false;

        var telTime = card.querySelector('[data-tel="time"]');
        var telAlt = card.querySelector('[data-tel="alt"]');
        var telState = card.querySelector('[data-tel="state"]');

        var CYCLE = 12;
        var APOGEE_M = 245;
        var BACKUP_MS = 312;

        // Beat boundaries in seconds. The backup window is stretched for
        // legibility — it is a diagram of the sequence, not a real-time replay.
        var T_LIFT = 0.9,
            T_APOGEE = 4.2,
            T_FAULT = 5.2,     // primary should have fired here; it doesn't
            T_FIRE = 6.55,     // backup fires
            T_BLOOM = 6.95,    // canopy fully open
            T_TOUCH = 10.9,
            T_IMPACT = 7.4;    // the ballistic future hits the ground

        var padX = 0, groundY = 0, apX = 0, apY = 0, mPerPx = 1;
        var apexX = 0, apexY = 0;   // end of the coast — where the fall begins
        var fallY = 0, fallX = 0;   // where the unpowered fall hands off to the canopy
        var noseAngle = 0;          // smoothed, so the nose never snaps

        function resize() {
            var rect = canvas.getBoundingClientRect();
            w = Math.max(1, Math.round(rect.width));
            h = Math.max(1, Math.round(rect.height));
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            padX = w * 0.10;
            groundY = h * 0.60;      // clear of the telemetry HUD below
            apX = w * 0.36;
            apY = h * 0.10;
            // Scale altitude so apogee reads APOGEE_M and touchdown reads 0 —
            // the rocket's own resting height is not altitude.
            mPerPx = APOGEE_M / Math.max(1, groundY - 16 - apY);
            scale = 1.2 + Math.min(1, h / 250) * 0.28;

            apexX = apX + 3;
            apexY = apY + 2;
            fallX = apX + w * 0.05;
            fallY = apY + (groundY - apY) * 0.30;
        }

        function clamp01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
        function at(a, b) { return clamp01((clock - a) / (b - a)); }
        function easeOut(u) { return 1 - Math.pow(1 - u, 2.1); }

        // ── The parametric paths ────────────────────────────────────────
        // A gravity turn: near-vertical off the pad, arcing over at apogee.
        // Horizontal travel lags (u^1.9) while altitude comes on early
        // (ease-out), so the tangent rotates from vertical toward horizontal
        // instead of holding one fixed lean the whole climb.
        function boostPos(u, o) {
            o.x = padX + (apX - padX) * Math.pow(u, 1.9);
            o.y = groundY - 14 - (groundY - 14 - apY) * easeOut(u);
            return o;
        }

        // Coast: at apogee, sagging very slightly.
        function coastPos(c, o) {
            o.x = apX + (apexX - apX) * c;
            o.y = apY + (apexY - apY) * c * c;
            return o;
        }

        // Primary failed: unpowered, still nose-up, picking up speed. Starts
        // exactly where the coast ended so there is no jump between beats.
        function fallPos(s, o) {
            o.x = apexX + (fallX - apexX) * s;
            o.y = apexY + (fallY - apexY) * s * s;
            return o;
        }

        // Under canopy: near-terminal, drifting downwind.
        function chutePos(v, o) {
            o.x = fallX + w * 0.32 * v;
            o.y = fallY + (groundY - 16 - fallY) * (0.15 * v + 0.85 * Math.pow(v, 1.1));
            return o;
        }

        // No recovery at all: full ballistic, into the dirt.
        function ghostPos(g, o) {
            o.x = apX + w * 0.16 * g;
            o.y = apY + (groundY - apY) * g * g;
            return o;
        }

        // ── Smooth stroking ────────────────────────────────────────────
        // Sample a curve into points, then stroke it through quadratic
        // midpoints so the result reads as a curve, not a chain of segments.
        var _p = { x: 0, y: 0 }, _a = { x: 0, y: 0 }, _b = { x: 0, y: 0 };

        // Nose attitude from the path tangent. Sampled symmetrically and
        // guarded, because the tangent length goes to zero at apogee and a
        // naive atan2(0, -0) returns PI — which flipped the rocket over for
        // a frame right at the top of the climb.
        function tangentAngle(fn, u, gain) {
            fn(Math.max(0, u - 0.03), _a);
            fn(Math.min(1, u + 0.03), _b);
            var dx = _b.x - _a.x, dy = _b.y - _a.y;
            if (dx * dx + dy * dy < 1e-6) return noseAngle;
            return Math.atan2(dx, -dy) * (gain === undefined ? 1 : gain);
        }

        function samples(fn, from, to, steps) {
            var pts = [];
            for (var i = 0; i <= steps; i++) {
                fn(from + (to - from) * (i / steps), _p);
                pts.push({ x: _p.x, y: _p.y });
            }
            return pts;
        }

        function strokeSmooth(pts, colour, width, dash, glow) {
            if (pts.length < 2) return;
            ctx.save();
            if (dash) ctx.setLineDash(dash);
            if (glow) { ctx.shadowColor = colour; ctx.shadowBlur = glow; }
            ctx.strokeStyle = colour;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (var i = 1; i < pts.length - 1; i++) {
                var mx = (pts[i].x + pts[i + 1].x) / 2;
                var my = (pts[i].y + pts[i + 1].y) / 2;
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
            }
            ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            ctx.stroke();
            ctx.restore();
        }

        // ── Particles (per second, not per frame) ──────────────────────
        function spawnExhaust(x, y, dt) {
            var n = Math.min(4, Math.round(dt * 150));
            for (var i = 0; i < n; i++) {
                particles.push({
                    x: x + (Math.random() - 0.5) * 5,
                    y: y + 15 * scale + Math.random() * 5,
                    vx: (Math.random() - 0.5) * 70,
                    vy: 110 + Math.random() * 130,
                    life: 1, decay: 2.2 + Math.random() * 1.4,
                    r: 2 + Math.random() * 2.4, g: 0
                });
            }
        }

        function spawnDebris(x, y) {
            for (var i = 0; i < 16; i++) {
                var a = -Math.PI * (0.15 + Math.random() * 0.7);
                var s = 60 + Math.random() * 170;
                particles.push({
                    x: x, y: y,
                    vx: Math.cos(a) * s * (Math.random() < 0.5 ? -1 : 1),
                    vy: Math.sin(a) * s,
                    life: 1, decay: 1.5, r: 1 + Math.random() * 1.8,
                    red: true, g: 320
                });
            }
        }

        function stepParticles(dt) {
            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i];
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vy += p.g * dt;
                p.life -= p.decay * dt;
                if (p.life <= 0) { particles.splice(i, 1); continue; }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
                ctx.fillStyle = p.red
                    ? 'rgba(248,113,113,' + (p.life * 0.6).toFixed(3) + ')'
                    : 'rgba(245,158,11,' + (p.life * 0.65).toFixed(3) + ')';
                ctx.fill();
            }
        }

        // ── Rocket ─────────────────────────────────────────────────────
        function drawAirframe(ghost) {
            ctx.scale(scale, scale);

            if (ghost) {
                ctx.globalAlpha *= 0.5;
                ctx.fillStyle = '#5b697e';
                ctx.beginPath();
                ctx.moveTo(0, -19);
                ctx.lineTo(-5, -12); ctx.lineTo(-5, 10);
                ctx.lineTo(5, 10); ctx.lineTo(5, -12);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#414f63';
                ctx.beginPath();
                ctx.moveTo(-5, 8); ctx.lineTo(-10, 15); ctx.lineTo(-5, 12); ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(5, 8); ctx.lineTo(10, 15); ctx.lineTo(5, 12); ctx.closePath(); ctx.fill();
                ctx.scale(1 / scale, 1 / scale);
                return;
            }

            var bg = ctx.createLinearGradient(-6, 0, 6, 0);
            bg.addColorStop(0, '#a9b6c7');
            bg.addColorStop(0.38, '#f8fafc');
            bg.addColorStop(1, '#8793a6');

            // Airframe and nose as one rounded silhouette
            ctx.fillStyle = bg;
            ctx.beginPath();
            ctx.moveTo(0, -20);
            ctx.quadraticCurveTo(-5.5, -14, -5.5, -11);
            ctx.lineTo(-5.5, 10);
            ctx.lineTo(5.5, 10);
            ctx.lineTo(5.5, -11);
            ctx.quadraticCurveTo(5.5, -14, 0, -20);
            ctx.closePath();
            ctx.fill();

            // Qorbit avionics band
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(-6, 0.5, 12, 5);
            ctx.fillStyle = 'rgba(254,215,132,0.85)';
            ctx.fillRect(-6, 0.5, 12, 1.8);

            ctx.fillStyle = '#7f8ea3';
            ctx.beginPath();
            ctx.moveTo(-5.5, 7); ctx.quadraticCurveTo(-10, 12, -10, 15);
            ctx.lineTo(-5.5, 12); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(5.5, 7); ctx.quadraticCurveTo(10, 12, 10, 15);
            ctx.lineTo(5.5, 12); ctx.closePath(); ctx.fill();

            ctx.scale(1 / scale, 1 / scale);
        }

        function drawLed(colour, pulse) {
            ctx.save();
            ctx.scale(scale, scale);
            ctx.shadowColor = colour;
            ctx.shadowBlur = 5 + pulse * 7;
            ctx.fillStyle = colour;
            ctx.beginPath();
            ctx.arc(0, -6.5, 1.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Deterministic flame — layered sines, so it breathes instead of strobing.
        function drawFlame() {
            var flick = 1
                + 0.16 * Math.sin(clock * 41)
                + 0.09 * Math.sin(clock * 67 + 1.7)
                + 0.05 * Math.sin(clock * 103 + 0.4);
            var top = 13 * scale;
            var len = 30 * scale * flick;
            var wid = 6 * scale;

            var g = ctx.createLinearGradient(0, top, 0, top + len);
            g.addColorStop(0, 'rgba(255,255,255,0.95)');
            g.addColorStop(0.22, 'rgba(254,215,132,0.9)');
            g.addColorStop(0.55, 'rgba(245,158,11,0.42)');
            g.addColorStop(1, 'rgba(245,158,11,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(-wid, top);
            ctx.quadraticCurveTo(-wid * 0.5, top + len * 0.6, 0, top + len);
            ctx.quadraticCurveTo(wid * 0.5, top + len * 0.6, wid, top);
            ctx.closePath();
            ctx.fill();
        }

        // A real canopy: filled dome, gores, shroud lines.
        function drawCanopy(b) {
            if (b < 0.02) return;
            var R = 31 * b * (0.97 + 0.03 * Math.sin(clock * 3.1));
            var cy = -27 - 13 * b;

            var g = ctx.createLinearGradient(-R, cy - R * 0.6, R, cy + R * 0.3);
            g.addColorStop(0, 'rgba(254,215,132,' + (0.9 * b).toFixed(3) + ')');
            g.addColorStop(0.48, 'rgba(245,158,11,' + (0.66 * b).toFixed(3) + ')');
            g.addColorStop(1, 'rgba(163,94,8,' + (0.75 * b).toFixed(3) + ')');

            ctx.beginPath();
            ctx.moveTo(-R, cy);
            ctx.bezierCurveTo(-R, cy - R * 0.95, R, cy - R * 0.95, R, cy);
            ctx.quadraticCurveTo(R * 0.5, cy + R * 0.14, 0, cy + R * 0.1);
            ctx.quadraticCurveTo(-R * 0.5, cy + R * 0.14, -R, cy);
            ctx.closePath();
            ctx.fillStyle = g;
            ctx.fill();
            ctx.strokeStyle = 'rgba(254,226,168,' + (0.7 * b).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.strokeStyle = 'rgba(120,63,4,' + (0.32 * b).toFixed(3) + ')';
            ctx.lineWidth = 0.7;
            for (var i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(R * (i / 2.6), cy + R * 0.08);
                ctx.quadraticCurveTo(R * (i / 2.6), cy - R * 0.4,
                    R * (i / 3.2), cy - R * 0.66 * (1 - Math.abs(i) / 3.6));
                ctx.stroke();
            }

            ctx.strokeStyle = 'rgba(226,232,240,' + (0.45 * b).toFixed(3) + ')';
            ctx.lineWidth = 0.75;
            [-1, -0.42, 0.42, 1].forEach(function (k) {
                ctx.beginPath();
                ctx.moveTo(R * k * 0.97, cy + R * 0.06);
                ctx.quadraticCurveTo(k * 8, -24, k * 3, -19);
                ctx.stroke();
            });
        }

        // ── Text ───────────────────────────────────────────────────────
        function text(str, x, y, colour, size, align) {
            ctx.font = '700 ' + (size || 8.5) + 'px "DM Sans", system-ui, sans-serif';
            ctx.textAlign = align || 'left';
            ctx.lineWidth = 2.6;
            ctx.strokeStyle = 'rgba(5,11,21,0.8)';
            ctx.strokeText(str, x, y);
            ctx.fillStyle = colour;
            ctx.fillText(str, x, y);
            ctx.textAlign = 'left';
        }

        // ── Backdrop ───────────────────────────────────────────────────
        function drawBackdrop() {
            for (var i = 0; i <= 4; i++) {
                var gy = groundY - (groundY - apY) * (i / 4);
                ctx.strokeStyle = 'rgba(148,163,184,' + (i === 0 ? 0.15 : 0.05) + ')';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(w * 0.058, gy);
                ctx.lineTo(w, gy);
                ctx.stroke();
                if (i > 0) {
                    ctx.font = '600 7px "DM Sans", system-ui, sans-serif';
                    ctx.fillStyle = 'rgba(148,163,184,0.38)';
                    ctx.fillText(Math.round(APOGEE_M * i / 4) + 'm', 3, gy - 2.5);
                }
            }

            for (var s = 0; s < 20; s++) {
                var sx = (s * 137.5 + clock * 3) % w;
                var sy = (s * 61.7) % (h * 0.48);
                ctx.beginPath();
                ctx.arc(sx, sy, 0.45 + (s % 3) * 0.2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(226,232,240,' + (0.07 + (s % 4) * 0.035) + ')';
                ctx.fill();
            }

            ctx.fillStyle = 'rgba(148,163,184,0.13)';
            ctx.fillRect(padX - 13, groundY - 4, 26, 4);
        }

        // ── Frame ──────────────────────────────────────────────────────
        function draw(dt) {
            ctx.clearRect(0, 0, w, h);
            drawBackdrop();

            // Planned profile
            strokeSmooth(samples(boostPos, 0, 1, 30), 'rgba(245,158,11,0.16)', 1, [3, 6]);

            var apoPulse = 0.5 + 0.5 * Math.sin(clock * 4);
            ctx.strokeStyle = 'rgba(245,158,11,' + (0.16 + apoPulse * 0.12).toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(apX, apY, 13, 0, Math.PI * 2);
            ctx.stroke();

            // ── Where is everything right now ──────────────────────────
            var live = { x: 0, y: 0 }, ghost = null;
            var angle = 0, bloom = 0, flame = false, tumble = 0;
            var phase;

            if (clock < T_LIFT) {
                phase = 'armed';
                live.x = padX; live.y = groundY - 15;
                angle = 0;
            } else if (clock < T_APOGEE) {
                phase = 'boost';
                var u = at(T_LIFT, T_APOGEE);
                boostPos(u, live);
                angle = tangentAngle(boostPos, u, 0.6);
                flame = true;
                strokeSmooth(samples(boostPos, 0, u, 34), 'rgba(245,158,11,0.55)', 1.7, null, 7);
            } else if (clock < T_FAULT) {
                phase = 'coast';
                var c = at(T_APOGEE, T_FAULT);
                coastPos(c, live);
                angle = tangentAngle(boostPos, 1, 0.6);
                strokeSmooth(samples(boostPos, 0, 1, 34), 'rgba(245,158,11,0.5)', 1.7, null, 7);
            } else {
                strokeSmooth(samples(boostPos, 0, 1, 34), 'rgba(245,158,11,0.4)', 1.5, null, 5);

                var g = at(T_FAULT, T_IMPACT);
                ghost = { x: 0, y: 0 };
                ghostPos(g, ghost);
                strokeSmooth(samples(ghostPos, 0, g, 26), 'rgba(248,113,113,0.4)', 1.2, [3, 4]);

                if (clock < T_FIRE) {
                    phase = 'fault';
                    var s = at(T_FAULT, T_FIRE);
                    fallPos(s, live);
                    // Tip over from the apogee attitude as it starts to drop.
                    angle = tangentAngle(boostPos, 1, 0.6) + s * 0.4;
                    strokeSmooth(samples(fallPos, 0, s, 20), 'rgba(245,158,11,0.45)', 1.5, null, 5);
                } else {
                    phase = clock < T_BLOOM ? 'fire' : (clock < T_TOUCH ? 'descent' : 'landed');
                    var v = at(T_FIRE, T_TOUCH);
                    chutePos(v, live);
                    bloom = at(T_FIRE, T_BLOOM);
                    // Sway the airframe, not the traced centreline, so the
                    // descent path stays a clean curve.
                    var sway = Math.sin(clock * 1.5) * 7 * (1 - v * 0.5);
                    live.x += sway;
                    angle = Math.sin(clock * 1.5) * 0.13;
                    strokeSmooth(samples(fallPos, 0, 1, 20), 'rgba(245,158,11,0.4)', 1.5, null, 4);
                    strokeSmooth(samples(chutePos, 0, v, 30), 'rgba(245,158,11,0.5)', 1.6, null, 6);
                }
            }

            // Ease the nose toward its target attitude, so every beat change
            // is a rotation rather than a jump.
            var turn = 1 - Math.pow(0.0008, dt);
            noseAngle += (angle - noseAngle) * turn;
            angle = noseAngle;

            // ── Exhaust and debris ─────────────────────────────────────
            if (flame) spawnExhaust(live.x, live.y, dt);
            stepParticles(dt);

            // ── The ballistic future ───────────────────────────────────
            if (ghost) {
                if (ghost.y < groundY - 1) {
                    tumble = at(T_FAULT, T_IMPACT) * 5.5;
                    ctx.save();
                    ctx.translate(ghost.x, ghost.y);
                    ctx.rotate(tumble);
                    drawAirframe(true);
                    ctx.restore();
                    debrisDone = false;
                } else {
                    if (!debrisDone) { spawnDebris(ghost.x, groundY - 4); debrisDone = true; }
                    ctx.strokeStyle = 'rgba(248,113,113,0.8)';
                    ctx.lineWidth = 1.7;
                    ctx.beginPath();
                    ctx.moveTo(ghost.x - 26, groundY - 8); ctx.lineTo(ghost.x - 18, groundY);
                    ctx.moveTo(ghost.x - 18, groundY - 8); ctx.lineTo(ghost.x - 26, groundY);
                    ctx.stroke();
                    text('BALLISTIC', ghost.x, groundY - 13, 'rgba(248,113,113,0.9)', 8, 'center');
                }
            }

            // ── The saved rocket ───────────────────────────────────────
            ctx.save();
            ctx.translate(live.x, live.y);
            ctx.rotate(angle);
            if (flame) drawFlame();
            if (bloom > 0.02) drawCanopy(bloom);
            drawAirframe(false);
            var ledPulse = 0.5 + 0.5 * Math.sin(clock * 9);
            if (phase === 'fault') drawLed('#f87171', ledPulse);
            else if (phase === 'armed' || phase === 'boost' || phase === 'coast') drawLed('#22c55e', ledPulse * 0.45);
            else drawLed('#4ade80', 0.3);
            ctx.restore();

            // ── Callouts ───────────────────────────────────────────────
            if (phase === 'armed') {
                text('ARMED · CHECKS OK', padX - 8, groundY - 30,
                    'rgba(34,197,94,' + (0.5 + ledPulse * 0.35).toFixed(2) + ')', 8);
            }

            if (phase === 'coast' || phase === 'fault') {
                text('APOGEE ' + APOGEE_M + 'm', apX + 17, apY - 3,
                    'rgba(251,191,36,' + (0.6 + apoPulse * 0.3).toFixed(2) + ')', 8.5);
            }

            if (phase === 'fault') {
                // Fault latches, then the backup counter races to 312ms.
                var blink = Math.sin(clock * 17) > -0.3 ? 1 : 0.3;
                text('✕ PRIMARY — NO FIRE', apX + 17, apY + 11,
                    'rgba(248,113,113,' + (0.95 * blink).toFixed(2) + ')', 8.5);

                var ms = Math.round(at(T_FAULT + 0.28, T_FIRE) * BACKUP_MS);
                if (clock > T_FAULT + 0.28) {
                    text('BACKUP ARMING  ' + String(ms).padStart(3, '0') + ' ms',
                        apX + 17, apY + 24, 'rgba(74,222,128,0.9)', 8.5);
                }
            }

            // Ignition ring
            if (clock >= T_FIRE && clock < T_FIRE + 0.45) {
                var k = at(T_FIRE, T_FIRE + 0.45);
                ctx.strokeStyle = 'rgba(254,215,132,' + (1 - k).toFixed(3) + ')';
                ctx.lineWidth = 2.4 * (1 - k) + 0.4;
                ctx.beginPath();
                ctx.arc(live.x, live.y, 8 + k * 46, 0, Math.PI * 2);
                ctx.stroke();
            }

            if (clock >= T_FIRE && clock < T_TOUCH) {
                var fade = clock < T_FIRE + 1.2 ? 0.95 : 0.5;
                text('✓ BACKUP FIRED · ' + BACKUP_MS + ' ms', apX + 17, apY + 24,
                    'rgba(74,222,128,' + fade + ')', 8.5);
            }

            if (phase === 'landed') {
                ctx.strokeStyle = 'rgba(74,222,128,0.9)';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(live.x - 28, groundY - 4);
                ctx.lineTo(live.x - 24, groundY);
                ctx.lineTo(live.x - 18, groundY - 9);
                ctx.stroke();
                text('RECOVERED', live.x, groundY - 13, 'rgba(74,222,128,0.95)', 8, 'center');
            }

            // Ground last, so markers sit on it
            ctx.strokeStyle = 'rgba(148,163,184,0.22)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, groundY);
            ctx.lineTo(w, groundY);
            ctx.stroke();

            // ── HUD ────────────────────────────────────────────────────
            var LABEL = {
                armed: 'ARMED', boost: 'BOOST', coast: 'APOGEE',
                fault: 'PRIMARY FAIL', fire: 'BACKUP FIRED',
                descent: 'PROTECTED', landed: 'RECOVERED'
            };
            if (telState) {
                telState.textContent = LABEL[phase];
                telState.style.color = phase === 'fault'
                    ? '#f87171'
                    : (phase === 'fire' || phase === 'landed' ? '#4ade80' : '');
            }
            if (telTime) telTime.textContent = clock.toFixed(2) + 's';
            if (telAlt) telAlt.textContent = Math.max(0, Math.round((groundY - 16 - live.y) * mPerPx)) + ' m';
        }

        // ── Loop: real elapsed time, so 60Hz and 120Hz look identical ──
        function frame(now) {
            if (!running) return;
            rafId = requestAnimationFrame(frame);
            var dt = (now - lastMs) / 1000;
            lastMs = now;
            if (!(dt > 0)) dt = 0.016;
            if (dt > 0.05) dt = 0.05;   // swallow tab-switch and GC gaps

            clock += dt;
            if (clock >= CYCLE) {
                clock -= CYCLE;
                particles.length = 0;
                debrisDone = false;
                noseAngle = 0;
            }
            draw(dt);
        }

        function start() {
            if (running) return;
            running = true;
            lastMs = performance.now();
            rafId = requestAnimationFrame(frame);
        }

        function stop() {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
        }

        resize();
        window.addEventListener('resize', resize);
        if (!reducedMotion) draw(0.016);

        return { start: start, stop: stop, resize: resize };
    }

    // ── Lumina: neural research pipeline animation ──────────────────────
    function initLumina(canvas, card) {
        var ctx = canvas.getContext('2d');
        if (!ctx) return null;

        var dpr = Math.min(2, window.devicePixelRatio || 1);
        var w = 0, h = 0;
        var t = 0;
        var lastMs = 0;
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

        function draw(dt) {
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

            stepTimer += dt;
            if (stepTimer > 2.4) {
                stepTimer = 0;
                activeStep = (activeStep + 1) % 4;
                nodes.forEach(function (node, idx) {
                    node.classList.toggle('active', idx <= activeStep);
                });
            }

            t += dt;
        }

        // Real elapsed time, so the pace matches on 60Hz and 120Hz displays.
        function loop(now) {
            if (!running) return;
            rafId = requestAnimationFrame(loop);
            var dt = (now - lastMs) / 1000;
            lastMs = now;
            if (!(dt > 0)) dt = 0.016;
            if (dt > 0.05) dt = 0.05;
            draw(dt);
        }

        function start() {
            if (running) return;
            running = true;
            lastMs = performance.now();
            rafId = requestAnimationFrame(loop);
        }

        function stop() {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
        }

        resize();
        window.addEventListener('resize', resize);
        if (!reducedMotion) draw(0.016);

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
                    // Kept mild: a stronger rotation makes the browser resample
                    // the live canvas inside the card and it reads as aliasing.
                    card.style.transform =
                        'perspective(1100px) rotateX(' + (-py * 2.2).toFixed(2) + 'deg) rotateY(' + (px * 3).toFixed(2) + 'deg) translateY(-6px)';
                });
            });
            card.addEventListener('pointerleave', function () {
                if (raf) { cancelAnimationFrame(raf); raf = 0; }
                card.style.transform = '';
            });
        });
    }
})();
