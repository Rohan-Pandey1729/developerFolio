(function () {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Qorbit: the save ────────────────────────────────────────────────
    // The flight trace itself is SVG animated by CSS keyframes (see the
    // "Qorbit flight trace" block in styles.css) — that keeps the motion on
    // the compositor and the labels as real DOM text. All this driver does is
    // gate the timeline on visibility and keep the telemetry readout in step,
    // reading the phase straight off the running animation so the numbers can
    // never drift from the picture.
    function initQorbit(root, card) {
        var svg = root.querySelector('.qorbit-svg');
        var scene = root.querySelector('.qorbit-scene');
        var boost = root.querySelector('.qorbit-boost');
        var recovered = root.querySelector('.qorbit-recovered');
        var ghost = root.querySelector('.qorbit-ghost');
        var area = root.querySelector('.qorbit-area');
        var planned = root.querySelector('.qorbit-planned');
        var grid = root.querySelector('.qorbit-grid');
        var ground = root.querySelector('.qorbit-ground');
        var telAlt = card.querySelector('[data-tel="alt"]');
        var telMs = card.querySelector('[data-tel="ms"]');
        var telState = card.querySelector('[data-tel="state"]');
        if (!svg || !boost || !recovered) return null;

        var CYCLE = 6500;               // ms — must match the CSS duration
        var APOGEE_M = 245;
        var BACKUP_MS = 312;

        // Beat boundaries as a fraction of the cycle, mirroring the keyframes.
        var LIFT = 0.023, APOGEE = 0.308, FAULT = 0.40,
            FIRE = 0.531, TOUCH = 0.815;
        var DIP = 0.38;   // share of the recovered path drawn by the time it fires

        // ── One source of truth for the layout ─────────────────────────
        // Normalised 0..1 (y down). Everything — curves, markers, labels —
        // is derived from these, so nothing can drift out of alignment.
        var PAD = [0.055, 0.90];
        var APEX = [0.40, 0.10];
        var DEPLOY = [0.50, 0.34];
        var IMPACT = [0.58, 0.90];
        var LAND = [0.85, 0.90];
        var GROUND_Y = 0.90;

        var MARKS = {
            '--apogee': APEX, '--deploy': DEPLOY,
            '--impact': IMPACT, '--land': LAND
        };
        var TAGS = {
            '--apogee': APEX, '--fault': APEX, '--deploy': DEPLOY,
            '--impact': IMPACT, '--land': LAND
        };

        var W = 0, H = 0;

        function P(pt) { return (pt[0] * W).toFixed(2) + ' ' + (pt[1] * H).toFixed(2); }
        function C(x, y) { return (x * W).toFixed(2) + ' ' + (y * H).toFixed(2); }

        // Returns false when the SVG has no usable box yet (hidden ancestor,
        // pre-layout, zero-size container). Writing geometry in that state
        // would bake in a degenerate viewBox and bogus dash lengths, so bail
        // and let the ResizeObserver call us again once it has a size.
        function layout() {
            var r = svg.getBoundingClientRect();
            if (r.width < 24 || r.height < 24) return false;
            W = r.width;
            H = r.height;
            svg.setAttribute('viewBox', '0 0 ' + W.toFixed(2) + ' ' + H.toFixed(2));

            // Gravity turn: steep off the pad, arcing over into apogee.
            var dBoost = 'M ' + P(PAD) +
                ' C ' + C(0.13, 0.70) + ', ' + C(0.24, 0.19) + ', ' + P(APEX);

            // Unpowered drop, then the canopy descent.
            var dRecov = 'M ' + P(APEX) +
                ' C ' + C(0.44, 0.17) + ', ' + C(0.47, 0.27) + ', ' + P(DEPLOY) +
                ' C ' + C(0.60, 0.47) + ', ' + C(0.74, 0.74) + ', ' + P(LAND);

            // No recovery at all: accelerating all the way in.
            var dGhost = 'M ' + P(APEX) +
                ' C ' + C(0.45, 0.27) + ', ' + C(0.52, 0.58) + ', ' + P(IMPACT);

            // What the primary charge was supposed to do.
            var dPlanned = 'M ' + P(APEX) +
                ' C ' + C(0.50, 0.05) + ', ' + C(0.62, 0.13) + ', ' + C(0.70, 0.32);

            boost.setAttribute('d', dBoost);
            recovered.setAttribute('d', dRecov);
            ghost.setAttribute('d', dGhost);
            planned.setAttribute('d', dPlanned);
            area.setAttribute('d', dBoost + ' ' + dRecov.slice(dRecov.indexOf('C')) +
                ' L ' + C(LAND[0], GROUND_Y) + ' L ' + C(PAD[0], GROUND_Y) + ' Z');

            ground.setAttribute('x1', 0);
            ground.setAttribute('x2', W.toFixed(2));
            ground.setAttribute('y1', (GROUND_Y * H).toFixed(2));
            ground.setAttribute('y2', (GROUND_Y * H).toFixed(2));

            grid.textContent = '';
            [0.24, 0.47, 0.70].forEach(function (fy) {
                var ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                ln.setAttribute('x1', 0);
                ln.setAttribute('x2', W.toFixed(2));
                ln.setAttribute('y1', (fy * H).toFixed(2));
                ln.setAttribute('y2', (fy * H).toFixed(2));
                grid.appendChild(ln);
            });

            return true;
        }

        function positionOverlays() {

            Object.keys(MARKS).forEach(function (k) {
                var el = root.querySelector('.qorbit-mark' + k);
                if (el) {
                    el.style.left = (MARKS[k][0] * 100) + '%';
                    el.style.top = (MARKS[k][1] * 100) + '%';
                }
            });
            Object.keys(TAGS).forEach(function (k) {
                var el = root.querySelector('.qorbit-tag' + k);
                if (el) {
                    el.style.left = (TAGS[k][0] * 100) + '%';
                    el.style.top = (TAGS[k][1] * 100) + '%';
                }
            });
        }

        var running = false, rafId = 0, fallbackStart = 0;
        var boostLen = 0, recovLen = 0, apogeeY = 0, groundY = 1;

        // Altitude scale comes from the paths themselves — apogee where the
        // boost ends, zero where the descent ends — so the readout can never
        // disagree with the drawn curve.
        var laidOut = false;

        function measure() {
            if (!layout()) { laidOut = false; return false; }
            positionOverlays();
            try {
                boostLen = boost.getTotalLength();
                recovLen = recovered.getTotalLength();
                apogeeY = boost.getPointAtLength(boostLen).y;
                groundY = recovered.getPointAtLength(recovLen).y;
                // Dash lengths live in the same pixel space as the geometry.
                boost.style.setProperty('--len', boostLen.toFixed(2) + 'px');
                recovered.style.setProperty('--len', recovLen.toFixed(2) + 'px');
                ghost.style.setProperty('--len', ghost.getTotalLength().toFixed(2) + 'px');
                laidOut = true;
            } catch (e) {
                boostLen = recovLen = 0;
                laidOut = false;
            }
            return laidOut;
        }

        function phase() {
            if (boost.getAnimations) {
                var a = boost.getAnimations()[0];
                if (a && a.currentTime != null) return (a.currentTime % CYCLE) / CYCLE;
            }
            return ((performance.now() - fallbackStart) % CYCLE) / CYCLE;
        }

        function altitudeAt(p) {
            if (!boostLen || !recovLen || groundY === apogeeY) return null;
            var y;
            if (p < LIFT) y = groundY;
            else if (p < APOGEE) y = boost.getPointAtLength((p - LIFT) / (APOGEE - LIFT) * boostLen).y;
            else if (p < FAULT) y = apogeeY;
            else if (p < FIRE) y = recovered.getPointAtLength((p - FAULT) / (FIRE - FAULT) * DIP * recovLen).y;
            else if (p < TOUCH) y = recovered.getPointAtLength((DIP + (p - FIRE) / (TOUCH - FIRE) * (1 - DIP)) * recovLen).y;
            else y = groundY;
            return Math.max(0, Math.round((groundY - y) / (groundY - apogeeY) * APOGEE_M));
        }

        function stateAt(p) {
            if (p < LIFT) return 'PREFLIGHT';
            if (p < APOGEE) return 'BOOST';
            if (p < FAULT) return 'APOGEE';
            if (p < FIRE) return 'PRIMARY FAIL';
            if (p < FIRE + 0.06) return 'DEPLOYED';
            if (p < TOUCH) return 'DESCENT';
            return 'RECOVERED';
        }

        function sync() {
            if (!running) return;
            rafId = requestAnimationFrame(sync);

            if (!laidOut && !measure()) return;   // still no box; try again next frame

            var p = phase();
            var state = stateAt(p);

            if (telState && telState.textContent !== state) {
                telState.textContent = state;
                telState.style.color = state === 'PRIMARY FAIL'
                    ? '#f87171'
                    : (state === 'DEPLOYED' || state === 'RECOVERED' ? '#4ade80' : '');
            }

            if (telAlt) {
                var alt = altitudeAt(p);
                if (alt !== null) telAlt.textContent = alt + ' m';
            }

            if (telMs) {
                var ms;
                if (p < FAULT) ms = '—';
                else if (p < FIRE) ms = Math.round((p - FAULT) / (FIRE - FAULT) * BACKUP_MS) + ' ms';
                else ms = BACKUP_MS + ' ms';
                if (telMs.textContent !== ms) {
                    telMs.textContent = ms;
                    telMs.style.color = p >= FIRE ? '#4ade80' : '';
                }
            }
        }

        function start() {
            if (running) return;
            running = true;
            if (!laidOut) measure();
            if (!fallbackStart) fallbackStart = performance.now();
            root.classList.add('is-running');
            rafId = requestAnimationFrame(sync);
        }

        function stop() {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
            root.classList.remove('is-running');
        }

        measure();
        window.addEventListener('resize', measure);
        if (scene && window.ResizeObserver) new ResizeObserver(measure).observe(scene);

        if (reducedMotion) {
            if (telState) { telState.textContent = 'RECOVERED'; telState.style.color = '#4ade80'; }
            if (telAlt) telAlt.textContent = '0 m';
            if (telMs) { telMs.textContent = BACKUP_MS + ' ms'; telMs.style.color = '#4ade80'; }
        }

        return { start: start, stop: stop, resize: measure };
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

    // Qorbit is an SVG/CSS scene; Lumina is still a canvas.
    document.querySelectorAll('[data-qorbit]').forEach(function (root) {
        var anim = initQorbit(root, root.closest('.venture-card') || root);
        if (anim) animators.push({ el: root, anim: anim });
    });

    document.querySelectorAll('.venture-canvas').forEach(function (canvas) {
        var card = canvas.closest('.venture-card');
        var anim = initLumina(canvas, card);
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
