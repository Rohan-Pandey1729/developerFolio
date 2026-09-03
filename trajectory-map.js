/**
 * The Growing Map — an interactive constellation of everything I've built.
 *
 * Each point is a real thread of work: a role, a venture, a build, a method,
 * a degree. Points switch on at the moment that thread started, so scrubbing
 * the timeline plays my trajectory forward from 2022 to now.
 *
 * Layout is deterministic (seeded RNG + a fixed relaxation pass), so the map
 * looks identical on every load — it reads as a place, not as noise.
 */
(function () {
    'use strict';

    var host = document.getElementById('trajectory-map');
    if (!host) return;

    var canvas = host.querySelector('.tmap-canvas');
    var tip = host.querySelector('.tmap-tip');
    var yearEl = host.querySelector('[data-tmap="year"]');
    var countEl = host.querySelector('[data-tmap="count"]');
    var scrub = host.querySelector('.tmap-scrub');
    var scrubFill = host.querySelector('.tmap-scrub-fill');
    if (!canvas) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Palette ─────────────────────────────────────────────────────────
    var DOMAINS = {
        aero: { label: 'Aerospace & recovery', rgb: [245, 158, 11] },
        ml: { label: 'ML & reinforcement learning', rgb: [129, 140, 248] },
        bio: { label: 'Bio & NeuroAI', rgb: [52, 211, 153] },
        sys: { label: 'Systems & infrastructure', rgb: [56, 189, 248] },
        math: { label: 'Mathematics', rgb: [251, 113, 133] }
    };

    var T0 = 2022.0;   // start of the timeline
    var T1 = 2026.75;  // "now"

    // ── The map data ────────────────────────────────────────────────────
    // t: decimal year the thread started. w: visual weight (0–1).
    var NODES = [
        // Aerospace & recovery
        { id: 'sarp', d: 'aero', t: 2022.75, w: 0.8, name: 'SARP — Lead Engineer', note: 'ARES rocket: GPS-guided recovery, drogue logic, telemetry in C++/Python.', href: '#experience' },
        { id: 'gps', d: 'aero', t: 2022.9, w: 0.4, name: 'GPS-guided recovery', note: 'Closed-loop recovery guidance for high-power rocketry.', href: '#experience' },
        { id: 'drogue', d: 'aero', t: 2023.2, w: 0.35, name: 'Drogue logic', note: 'Two-stage descent: drogue at apogee, main at low altitude.', href: '#experience' },
        { id: 'telem', d: 'aero', t: 2023.4, w: 0.45, name: 'Flight telemetry', note: 'Live downlink and onboard logging in C++ and Python.', href: '#experience' },
        { id: 'lspace', d: 'aero', t: 2024.4, w: 0.7, name: "NASA L'SPACE", note: 'Led a team of 11 on a lunar ice-mapping rover — PDR, budget, programmatics.', href: '#experience' },
        { id: 'qorbit', d: 'aero', t: 2025.95, w: 1.0, name: 'Qorbit Systems', note: 'Founder. Smarter recovery for model rocketry — sub-400ms backup deployment.', href: 'https://www.qorbitsystems.com/' },
        { id: 'flightsim', d: 'aero', t: 2026.0, w: 0.5, name: 'Physics flight simulation', note: 'Simulated flight profiles that drive the pre-flight checks.', href: '#ventures' },
        { id: 'tarc', d: 'aero', t: 2026.2, w: 0.45, name: 'TARC platform', note: 'Shareable flight records for 4,000+ competition teams.', href: '#ventures' },

        // ML & reinforcement learning
        { id: 'rl', d: 'ml', t: 2024.75, w: 0.9, name: 'Reinforcement learning', note: 'The through-line: control, search, and synthesis as learned policy.', href: '#about' },
        { id: 'nswc', d: 'ml', t: 2024.75, w: 0.7, name: 'Naval Surface Warfare Center', note: 'DDPG agents in MATLAB/Simulink optimizing axial turbomachinery aerodynamics.', href: '#experience' },
        { id: 'ddpg', d: 'ml', t: 2024.8, w: 0.4, name: 'DDPG', note: 'Continuous-control agents under complex physical dynamics.', href: '#experience' },
        { id: 'pytorch', d: 'ml', t: 2024.3, w: 0.4, name: 'PyTorch', note: 'Primary training stack.', href: '#about' },
        { id: 'tf', d: 'ml', t: 2024.3, w: 0.3, name: 'TensorFlow', note: 'Secondary training stack.', href: '#about' },
        { id: 'mathai', d: 'ml', t: 2025.7, w: 1.0, name: 'Math AI Lab, UW', note: 'Research Assistant. RL framework for synthesizing efficient arithmetic circuits.', href: '#experience' },
        { id: 'ppo', d: 'ml', t: 2025.75, w: 0.55, name: 'PPO', note: 'Policy optimization over circuit-construction actions.', href: '#experience' },
        { id: 'gnn', d: 'ml', t: 2025.75, w: 0.6, name: 'Graph neural networks', note: 'Circuits are graphs — so the policy reads them as graphs.', href: '#experience' },
        { id: 'curriculum', d: 'ml', t: 2025.85, w: 0.4, name: 'Curriculum learning', note: 'Staged difficulty to reach ~70% success on degree-m polynomials.', href: '#experience' },
        { id: 'mcts', d: 'ml', t: 2026.3, w: 0.55, name: 'Monte Carlo tree search', note: 'Search on top of the policy to improve sample efficiency at higher degree.', href: '#experience' },
        { id: 'verify', d: 'ml', t: 2026.35, w: 0.45, name: 'Symbolic verification', note: 'Every synthesized circuit is checked symbolically, not just empirically.', href: '#experience' },
        { id: 'bench', d: 'ml', t: 2026.5, w: 0.5, name: 'Open-source benchmarks', note: 'Preparing benchmarks and targeting ICLR / ICML / NeurIPS.', href: '#publications' },
        { id: 'mercor', d: 'ml', t: 2025.95, w: 0.6, name: 'Mercor — ML Engineer', note: 'End-to-end pipeline for large-scale text sentiment analysis.', href: '#experience' },
        { id: 'transformer', d: 'ml', t: 2026.05, w: 0.45, name: 'Transformer fine-tuning', note: 'Domain-specific fine-tuning with custom scoring metrics.', href: '#experience' },

        // Bio & NeuroAI
        { id: 'neurominor', d: 'bio', t: 2024.0, w: 0.6, name: 'Neural Computation minor', note: 'Neural Computation & Engineering — AI in neuroscience.', href: '#about' },
        { id: 'mindco', d: 'bio', t: 2024.7, w: 0.65, name: 'MINDCO LABS', note: 'Real-time eye tracking fused with EEG to decode gaze to text.', href: '#experience' },
        { id: 'eeg', d: 'bio', t: 2024.72, w: 0.5, name: 'EEG decoding', note: 'Deep learning on live headset signals.', href: '#experience' },
        { id: 'bci', d: 'bio', t: 2024.8, w: 0.5, name: 'Brain–computer interfaces', note: 'Gaze-to-text as a BCI input channel.', href: '#experience' },
        { id: 'fredhutch', d: 'bio', t: 2024.6, w: 0.95, name: 'Fred Hutch', note: 'Data Scientist Intern. Mathematical models of CAR T-cell and tumor interaction.', href: '#experience' },
        { id: 'cart', d: 'bio', t: 2024.65, w: 0.6, name: 'CAR T-cell modeling', note: 'Treatment efficacy modeled on patient-derived B-ALL data.', href: '#experience' },
        { id: 'ode', d: 'bio', t: 2024.9, w: 0.5, name: 'ODE systems', note: 'Coupled ODEs fit by regression and loss optimization.', href: '#experience' },
        { id: 'neuraltrace', d: 'bio', t: 2025.4, w: 0.7, name: 'NeuralTrace', note: 'Top project, NeuroAI Hackathon. Live EEG in the browser, 3D brain, no backend.', href: '/developerFolio/case-studies/neuraltrace/' },
        { id: 'bloomsync', d: 'bio', t: 2025.75, w: 0.7, name: 'BloomSync AI', note: '2nd place, DubHacks. Reprogramming apple flowering genes via FT/TFL1 edits.', href: '/developerFolio/case-studies/bloomsync-ai/' },
        { id: 'ftfl', d: 'bio', t: 2025.78, w: 0.35, name: 'FT / TFL1 edits', note: 'New-wood fruiting for robotics-ready orchards.', href: '/developerFolio/case-studies/bloomsync-ai/' },

        // Systems & infrastructure
        { id: 'pwc', d: 'sys', t: 2025.45, w: 0.7, name: 'PwC — Cloud & Digital SAP', note: 'High-performance Python pipelines and a secure self-service web app.', href: '#experience' },
        { id: 'vector', d: 'sys', t: 2025.5, w: 0.4, name: 'Vectorization & parallel I/O', note: 'Latency work on data pipelines.', href: '#experience' },
        { id: 'huskymaps', d: 'sys', t: 2025.6, w: 0.7, name: 'Husky Maps', note: 'Winner, UW Claude Hackathon 2025. Indoor shortcuts across campus.', href: '/developerFolio/case-studies/husky-maps/' },
        { id: 'webserial', d: 'sys', t: 2025.42, w: 0.3, name: 'Web Serial API', note: 'Hardware straight into the browser — no native app.', href: '/developerFolio/case-studies/neuraltrace/' },
        { id: 'do', d: 'sys', t: 2026.2, w: 1.0, name: 'DigitalOcean', note: 'Software Engineer II. Cloud infrastructure and developer tools at scale.', href: '#experience' },
        { id: 'cloud', d: 'sys', t: 2026.25, w: 0.5, name: 'Cloud infrastructure', note: 'Systems design, reliability, and performance across production services.', href: '#experience' },
        { id: 'devtools', d: 'sys', t: 2026.3, w: 0.45, name: 'Developer tooling', note: 'APIs, tooling, and automation for developer experience.', href: '#experience' },
        { id: 'lumina', d: 'sys', t: 2026.2, w: 0.95, name: 'Lumina Research', note: 'Founder. A course that takes you from a research question to a submitted paper.', href: 'https://www.lumina-research.com/' },
        { id: 'pipeline', d: 'sys', t: 2026.3, w: 0.4, name: 'Research workflow', note: 'Question → literature → analysis → paper, AI-guided at every stage.', href: '#ventures' },

        // Mathematics
        { id: 'acms', d: 'math', t: 2022.2, w: 0.95, name: 'ACMS at UW', note: 'BS/MS in Applied & Computational Mathematical Sciences.', href: '#about' },
        { id: 'optim', d: 'math', t: 2024.2, w: 0.6, name: 'Mathematical optimization', note: 'The shared language under the RL, the ODEs, and the pipelines.', href: '#about' },
        { id: 'poly', d: 'math', t: 2025.8, w: 0.6, name: 'Polynomial synthesis', note: 'Efficient arithmetic circuits for degree-m polynomials.', href: '#experience' },
        { id: 'regress', d: 'math', t: 2024.95, w: 0.4, name: 'Regression & loss design', note: 'Fitting models to messy, real, patient-derived data.', href: '#experience' },
        { id: 'symbolic', d: 'math', t: 2026.4, w: 0.45, name: 'Symbolic systems', note: 'Where the algebra and the learned policy meet.', href: '#about' }
    ];

    var EDGES = [
        ['sarp', 'gps'], ['sarp', 'drogue'], ['sarp', 'telem'], ['gps', 'drogue'],
        ['sarp', 'qorbit'], ['drogue', 'qorbit'], ['telem', 'qorbit'],
        ['qorbit', 'flightsim'], ['qorbit', 'tarc'], ['lspace', 'sarp'], ['lspace', 'qorbit'],

        ['rl', 'nswc'], ['nswc', 'ddpg'], ['rl', 'ddpg'], ['rl', 'ppo'],
        ['mathai', 'ppo'], ['mathai', 'gnn'], ['mathai', 'curriculum'], ['mathai', 'mcts'],
        ['mathai', 'verify'], ['mathai', 'bench'], ['ppo', 'mcts'], ['gnn', 'ppo'],
        ['rl', 'mathai'], ['mercor', 'transformer'], ['pytorch', 'rl'], ['tf', 'pytorch'],
        ['pytorch', 'mercor'],

        ['neurominor', 'mindco'], ['mindco', 'eeg'], ['eeg', 'bci'], ['mindco', 'bci'],
        ['eeg', 'neuraltrace'], ['neurominor', 'neuraltrace'],
        ['fredhutch', 'cart'], ['cart', 'ode'], ['fredhutch', 'ode'],
        ['bloomsync', 'ftfl'], ['bloomsync', 'fredhutch'],

        ['pwc', 'vector'], ['pwc', 'cloud'], ['do', 'cloud'], ['do', 'devtools'],
        ['cloud', 'devtools'], ['huskymaps', 'devtools'], ['lumina', 'pipeline'],
        ['neuraltrace', 'webserial'], ['webserial', 'huskymaps'],

        ['acms', 'optim'], ['optim', 'rl'], ['optim', 'ode'], ['optim', 'regress'],
        ['regress', 'cart'], ['poly', 'mathai'], ['poly', 'symbolic'], ['symbolic', 'verify'],
        ['acms', 'poly'], ['acms', 'neurominor'],

        // cross-domain bridges — the parts of the map that actually connect
        ['qorbit', 'do'], ['lumina', 'bench'], ['lumina', 'mathai'],
        ['rl', 'flightsim'], ['vector', 'pytorch'], ['bci', 'rl']
    ];

    var byId = {};
    NODES.forEach(function (n) { byId[n.id] = n; });
    var LINKS = EDGES.filter(function (e) { return byId[e[0]] && byId[e[1]]; })
        .map(function (e) { return { a: byId[e[0]], b: byId[e[1]] }; });

    // ── Deterministic layout ────────────────────────────────────────────
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            var x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
            return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
        };
    }

    var CLUSTERS = {
        math: { x: 0.26, y: 0.20 },
        sys: { x: 0.74, y: 0.24 },
        ml: { x: 0.50, y: 0.50 },
        bio: { x: 0.24, y: 0.76 },
        aero: { x: 0.76, y: 0.74 }
    };

    function layout() {
        var rnd = mulberry32(20260903);
        NODES.forEach(function (n, i) {
            var c = CLUSTERS[n.d];
            var ang = rnd() * Math.PI * 2;
            var rad = 0.05 + Math.pow(rnd(), 0.7) * 0.15;
            n.px = c.x + Math.cos(ang) * rad;
            n.py = c.y + Math.sin(ang) * rad * 0.9;
            n.idx = i;
        });

        // Relax: springs along edges, repulsion between everything, pull to cluster.
        for (var pass = 0; pass < 220; pass++) {
            for (var i = 0; i < NODES.length; i++) {
                var a = NODES[i];
                for (var j = i + 1; j < NODES.length; j++) {
                    var b = NODES[j];
                    var dx = b.px - a.px, dy = b.py - a.py;
                    var d2 = dx * dx + dy * dy;
                    if (d2 < 1e-7) { dx = 0.001; dy = 0.001; d2 = 2e-6; }
                    var d = Math.sqrt(d2);
                    var min = 0.055;
                    if (d < min) {
                        var push = (min - d) * 0.22;
                        var ux = dx / d, uy = dy / d;
                        a.px -= ux * push; a.py -= uy * push;
                        b.px += ux * push; b.py += uy * push;
                    }
                }
            }
            LINKS.forEach(function (l) {
                var dx = l.b.px - l.a.px, dy = l.b.py - l.a.py;
                var d = Math.hypot(dx, dy) || 1e-4;
                var target = l.a.d === l.b.d ? 0.09 : 0.30;
                var k = (d - target) * (l.a.d === l.b.d ? 0.045 : 0.012);
                var ux = dx / d, uy = dy / d;
                l.a.px += ux * k; l.a.py += uy * k;
                l.b.px -= ux * k; l.b.py -= uy * k;
            });
            NODES.forEach(function (n) {
                var c = CLUSTERS[n.d];
                n.px += (c.x - n.px) * 0.012;
                n.py += (c.y - n.py) * 0.012;
                n.px = Math.max(0.05, Math.min(0.95, n.px));
                n.py = Math.max(0.05, Math.min(0.95, n.py));
            });
        }

        // Decorative starfield behind the data — deliberately tiny and dim so
        // it never reads as a data point.
        DUST.length = 0;
        var drnd = mulberry32(77123);
        for (var k = 0; k < 320; k++) {
            DUST.push({
                x: drnd(), y: drnd(),
                r: 0.3 + drnd() * 0.7,
                a: 0.05 + drnd() * 0.13,
                ph: drnd() * Math.PI * 2
            });
        }
    }

    var DUST = [];
    layout();

    // ── Sizing ──────────────────────────────────────────────────────────
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, PAD = 0, PAD_T = 0, PAD_B = 0;
    var foot = host.querySelector('.tmap-foot');
    var counter = host.querySelector('.tmap-counter');
    var labelPx = 10;

    function resize() {
        var rect = canvas.getBoundingClientRect();
        W = Math.max(1, Math.round(rect.width));
        H = Math.max(1, Math.round(rect.height));
        canvas.width = Math.round(W * dpr);
        canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        PAD = Math.min(W, H) * 0.07;
        // Reserve the space the legend, scrubber and counter actually occupy so
        // no point can ever land underneath them.
        PAD_T = PAD + (counter ? counter.offsetHeight * 0.5 : 0);
        PAD_B = Math.max(PAD, (foot ? foot.offsetHeight : 0) + 12);
        labelPx = W < 460 ? 8.5 : 10;
        project();
    }

    function project() {
        var iw = W - PAD * 2, ih = Math.max(40, H - PAD_T - PAD_B);
        NODES.forEach(function (n) {
            n.x = PAD + n.px * iw;
            n.y = PAD_T + n.py * ih;
            n.r = 2.6 + n.w * 5.4;
        });
    }

    // ── Timeline ────────────────────────────────────────────────────────
    var progress = 0;          // 0..1 across [T0, T1]
    var target = 1;
    var autoplay = true;
    var mouse = { x: -999, y: -999, inside: false };
    var hovered = null;
    var t = 0;

    function yearAt(p) { return T0 + p * (T1 - T0); }

    function nodeAlpha(n, yr) {
        var age = yr - n.t;
        if (age < 0) return 0;
        return Math.min(1, age / 0.28);
    }

    function setProgress(p, stopAuto) {
        target = Math.max(0, Math.min(1, p));
        if (stopAuto) { autoplay = false; progress = target; }
    }

    // ── Interaction ─────────────────────────────────────────────────────
    canvas.addEventListener('pointermove', function (e) {
        var rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.inside = true;
    });

    canvas.addEventListener('pointerleave', function () {
        mouse.inside = false;
        mouse.x = mouse.y = -999;
    });

    canvas.addEventListener('click', function () {
        if (!hovered || !hovered.href) return;
        if (/^https?:/.test(hovered.href)) {
            window.open(hovered.href, '_blank', 'noopener');
        } else {
            window.location.href = hovered.href;
        }
    });

    function hitTest() {
        if (!mouse.inside) return null;
        var best = null, bestD = 26 * 26;
        var yr = yearAt(progress);
        for (var i = 0; i < NODES.length; i++) {
            var n = NODES[i];
            if (nodeAlpha(n, yr) < 0.4) continue;
            var dx = n.x - mouse.x, dy = n.y - mouse.y;
            var d2 = dx * dx + dy * dy;
            var reach = Math.max(16, n.r + 12);
            if (d2 < reach * reach && d2 < bestD) { bestD = d2; best = n; }
        }
        return best;
    }

    function renderTip() {
        if (!tip) return;
        if (!hovered) { tip.classList.remove('is-on'); return; }
        var dom = DOMAINS[hovered.d];
        tip.style.setProperty('--tip-color', 'rgb(' + dom.rgb.join(',') + ')');
        tip.innerHTML =
            '<span class="tmap-tip-kicker">' + Math.floor(hovered.t) + ' · ' + dom.label + '</span>' +
            '<strong class="tmap-tip-name">' + hovered.name + '</strong>' +
            '<span class="tmap-tip-note">' + hovered.note + '</span>';
        tip.classList.add('is-on');

        // Keep the card inside the map box.
        var tw = tip.offsetWidth || 240;
        var th = tip.offsetHeight || 90;
        var x = hovered.x + 18;
        var y = hovered.y - th / 2;
        if (x + tw > W - 8) x = hovered.x - tw - 18;
        y = Math.max(8, Math.min(H - th - 8, y));
        tip.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    }

    // Timeline scrubber
    if (scrub) {
        var dragging = false;

        function scrubTo(clientX) {
            var rect = scrub.getBoundingClientRect();
            setProgress((clientX - rect.left) / Math.max(1, rect.width), true);
            scrub.setAttribute('aria-valuenow', yearAt(target).toFixed(1));
        }

        scrub.addEventListener('pointerdown', function (e) {
            dragging = true;
            scrub.setPointerCapture(e.pointerId);
            scrubTo(e.clientX);
        });
        scrub.addEventListener('pointermove', function (e) {
            if (dragging) scrubTo(e.clientX);
        });
        scrub.addEventListener('pointerup', function () { dragging = false; });
        scrub.addEventListener('pointercancel', function () { dragging = false; });
        scrub.addEventListener('keydown', function (e) {
            var step = e.shiftKey ? 0.2 : 0.05;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { setProgress(target + step, true); e.preventDefault(); }
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { setProgress(target - step, true); e.preventDefault(); }
            else if (e.key === 'Home') { setProgress(0, true); e.preventDefault(); }
            else if (e.key === 'End') { setProgress(1, true); e.preventDefault(); }
            scrub.setAttribute('aria-valuenow', yearAt(target).toFixed(1));
        });
    }

    // ── Draw ────────────────────────────────────────────────────────────
    function rgba(rgb, a) {
        return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        var yr = yearAt(progress);

        // Background dust
        for (var i = 0; i < DUST.length; i++) {
            var s = DUST[i];
            var tw = 0.7 + 0.3 * Math.sin(t * 0.9 + s.ph);
            ctx.beginPath();
            ctx.arc(PAD + s.x * (W - PAD * 2), PAD_T + s.y * (H - PAD_T - PAD_B), s.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(203,213,225,' + (s.a * tw).toFixed(3) + ')';
            ctx.fill();
        }

        // Edges — only once both endpoints exist
        for (var e = 0; e < LINKS.length; e++) {
            var l = LINKS[e];
            var aA = nodeAlpha(l.a, yr), aB = nodeAlpha(l.b, yr);
            if (aA <= 0 || aB <= 0) continue;
            var live = Math.min(aA, aB);
            var cross = l.a.d !== l.b.d;
            var lit = hovered && (hovered === l.a || hovered === l.b);
            var base = cross ? 0.1 : 0.2;
            var pulse = 0.5 + 0.5 * Math.sin(t * 1.1 + l.a.idx * 0.7);
            var alpha = live * (lit ? 0.75 : base + pulse * 0.07);

            var g = ctx.createLinearGradient(l.a.x, l.a.y, l.b.x, l.b.y);
            g.addColorStop(0, rgba(DOMAINS[l.a.d].rgb, alpha));
            g.addColorStop(1, rgba(DOMAINS[l.b.d].rgb, alpha));
            ctx.strokeStyle = g;
            ctx.lineWidth = lit ? 1.6 : (cross ? 0.7 : 1);
            ctx.beginPath();
            ctx.moveTo(l.a.x, l.a.y);
            ctx.lineTo(l.b.x, l.b.y);
            ctx.stroke();

            // A signal travelling down the highlighted edges
            if (lit && !reducedMotion) {
                var pr = (t * 0.55 + l.a.idx * 0.2) % 1;
                ctx.beginPath();
                ctx.arc(l.a.x + (l.b.x - l.a.x) * pr, l.a.y + (l.b.y - l.a.y) * pr, 2.2, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.fill();
            }
        }

        // Nodes
        var live = 0;
        for (var k = 0; k < NODES.length; k++) {
            var n = NODES[k];
            var a = nodeAlpha(n, yr);
            if (a <= 0) continue;
            live++;

            var rgb = DOMAINS[n.d].rgb;
            var isHover = hovered === n;
            var dim = hovered && !isHover ? 0.42 : 1;
            // Overshoot as a node switches on, so arrivals read as arrivals.
            var pop = a < 1 ? 1 + (1 - a) * 1.1 : 1;
            var twinkle = reducedMotion ? 1 : 0.9 + 0.1 * Math.sin(t * 1.6 + n.idx);
            var r = n.r * pop * twinkle * (isHover ? 1.5 : 1);

            // halo
            var grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * (isHover ? 6 : 4.2));
            grd.addColorStop(0, rgba(rgb, 0.42 * a * dim));
            grd.addColorStop(1, rgba(rgb, 0));
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(n.x, n.y, r * (isHover ? 6 : 4.2), 0, Math.PI * 2);
            ctx.fill();

            // core
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fillStyle = rgba(rgb, (0.75 + 0.25 * n.w) * a * dim);
            ctx.fill();

            if (isHover) {
                ctx.strokeStyle = 'rgba(255,255,255,0.9)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(n.x, n.y, r + 5, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Anchors — the biggest threads keep a standing label. A dark halo
            // keeps them readable where they cross a neighbouring cluster.
            if (n.w >= 0.95 && a > 0.6 && !hovered) {
                ctx.font = '600 ' + labelPx + 'px "DM Sans", system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.lineJoin = 'round';
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(9,14,28,' + (0.85 * a).toFixed(2) + ')';
                ctx.strokeText(n.name.toUpperCase(), n.x, n.y - r - 10);
                ctx.fillStyle = 'rgba(226,232,240,' + (0.62 * a).toFixed(2) + ')';
                ctx.fillText(n.name.toUpperCase(), n.x, n.y - r - 10);
                ctx.textAlign = 'left';
            }
        }

        if (yearEl) yearEl.textContent = String(Math.floor(yr));
        if (countEl) countEl.textContent = live + (live === 1 ? ' thread' : ' threads');
        if (scrubFill) scrubFill.style.width = (progress * 100).toFixed(2) + '%';
    }

    // ── Loop ────────────────────────────────────────────────────────────
    var running = false, rafId = 0, last = 0;

    function frame(now) {
        if (!running) return;
        rafId = requestAnimationFrame(frame);
        var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
        last = now;
        t += dt;

        if (autoplay) {
            // ~6.5s to play the whole trajectory, then hold at "now".
            progress = Math.min(1, progress + dt / 6.5);
            if (progress >= 1) autoplay = false;
        } else {
            progress += (target - progress) * Math.min(1, dt * 9);
        }

        var next = hitTest();
        if (next !== hovered) {
            hovered = next;
            canvas.style.cursor = hovered ? 'pointer' : 'default';
            renderTip();
        } else if (hovered) {
            renderTip();
        }

        draw();
    }

    function start() {
        if (running) return;
        running = true;
        last = performance.now();
        rafId = requestAnimationFrame(frame);
    }

    function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
    }

    resize();
    window.addEventListener('resize', function () {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        resize();
    });

    if (reducedMotion) {
        autoplay = false;
        progress = target = 1;
        draw();
        canvas.addEventListener('pointermove', function () {
            hovered = hitTest();
            renderTip();
            draw();
        });
    } else {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting && !document.hidden) start();
                else stop();
            });
        }, { threshold: 0.05 });
        io.observe(host);

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) stop();
            else start();
        });

        start();
    }

    host.classList.add('is-ready');
})();
