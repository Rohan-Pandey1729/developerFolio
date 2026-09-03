(function () {
    'use strict';

    // Text scramble effect
    function scrambleText(el, finalText) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·×#@%';
        var duration = 3200;
        var frameInterval = 45; // ms between scramble updates — keeps each state visible
        var start = null;
        var lastFrame = null;
        function step(ts) {
            if (!start) start = ts;
            if (lastFrame !== null && ts - lastFrame < frameInterval) {
                requestAnimationFrame(step);
                return;
            }
            lastFrame = ts;
            var progress = Math.min((ts - start) / duration, 1);
            var revealed = Math.floor(progress * finalText.length);
            var output = '';
            for (var i = 0; i < finalText.length; i++) {
                if (i < revealed || finalText[i] === ' ') {
                    output += finalText[i];
                } else {
                    output += chars[Math.floor(Math.random() * chars.length)];
                }
            }
            el.textContent = output;
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = finalText;
        }
        requestAnimationFrame(step);
    }

    // Loader — rocket blast-off, then fade in portfolio. Always enable clicks.
    function finishLoading() {
        if (document.body.classList.contains('loaded')) return;
        document.body.classList.add('loaded');
        var loaderEl = document.getElementById('loader');
        if (loaderEl) {
            loaderEl.classList.add('done');
            setTimeout(function () { loaderEl.remove(); }, 800);
        }
        // Trigger hero label scramble after fade-in
        var heroLabel = document.querySelector('.hero-label');
        if (heroLabel) {
            var finalText = heroLabel.textContent.trim();
            setTimeout(function () { scrambleText(heroLabel, finalText); }, 450);
        }
    }

    var loader = document.getElementById('loader');
    if (loader) {
        setTimeout(finishLoading, 2500);
        // Fallback: ensure page is clickable even if first timeout is delayed (e.g. tab in background)
        setTimeout(finishLoading, 4000);
    } else {
        finishLoading();
    }

    // Footer year
    var yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Now widget time (America/Los_Angeles)
    (function () {
        var nowTime = document.getElementById('now-time');
        if (!nowTime) return;
        var fmt = new Intl.DateTimeFormat([], { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' });
        function tick() {
            nowTime.textContent = fmt.format(new Date()) + ' PT';
        }
        tick();
        setInterval(tick, 30000);
    })();

    // Smooth scroll for anchor links (offset for fixed header)
    var baseUrl = 'https://rohan-pandey1729.github.io/developerFolio';
    document.querySelectorAll('a[href^="#"], a[href^="' + baseUrl + '"]').forEach(function (a) {
        a.addEventListener('click', function (e) {
            var href = this.getAttribute('href');
            if (href === '#') return;
            var hash = href.indexOf('#') !== -1 ? href.split('#')[1] : null;
            var target = hash ? document.querySelector('#' + hash) : null;
            if (target) {
                e.preventDefault();
                var y = target.getBoundingClientRect().top + window.scrollY - 70;
                window.scrollTo({ top: y, behavior: 'smooth' });
            }
        });
    });


    // Nav underline position (scrollspy + underline)
    var navLinks = document.querySelectorAll('.nav-link');
    var navUnderline = document.querySelector('.nav-underline');
    var sections = Array.from(document.querySelectorAll('section[id]'));

    function updateNav() {
        var scrollY = window.scrollY;
        var innerHeight = window.innerHeight * 0.35;
        var current = null;
        sections.forEach(function (s) {
            var top = s.offsetTop;
            if (scrollY >= top - innerHeight) current = s.id;
        });

        var activeLink = null;
        navLinks.forEach(function (link) {
            var href = link.getAttribute('href');
            if (href === '#' + current) {
                link.classList.add('active');
                activeLink = link;
            } else {
                link.classList.remove('active');
            }
        });

        var linkToUse = activeLink || navLinks[0];
        if (navUnderline && linkToUse && linkToUse.offsetParent) {
            var rect = linkToUse.getBoundingClientRect();
            var navEl = linkToUse.closest('.nav');
            var navRect = navEl.getBoundingClientRect();
            navUnderline.style.left = (rect.left - navRect.left) + 'px';
            navUnderline.style.width = rect.width + 'px';
        }
    }

    window.addEventListener('scroll', updateNav);
    window.addEventListener('resize', updateNav);
    updateNav();

    // Reveal on scroll + stagger + section title line + timeline draw
    var revealOpts = { threshold: 0.12, rootMargin: '0px 0px -50px 0px' };

    var revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');
            if (entry.target.classList.contains('section-title')) {
                entry.target.classList.add('visible');
            }
            revealObserver.unobserve(entry.target);
        });
    }, revealOpts);

    document.querySelectorAll('.reveal').forEach(function (el) {
        revealObserver.observe(el);
    });

    document.querySelectorAll('.section-title').forEach(function (title) {
        revealObserver.observe(title);
    });

    // Section transitions: mark sections as in-view for background glow
    (function () {
        var secs = Array.from(document.querySelectorAll('.section'));
        if (!secs.length) return;
        var o = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) entry.target.classList.add('in-view');
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
        secs.forEach(function (s) { o.observe(s); });
    })();

    var timeline = document.querySelector('.timeline');
    if (timeline) {
        var timelineObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    timeline.classList.add('drawn');
                    timelineObserver.unobserve(timeline);
                }
            });
        }, { threshold: 0.2 });
        timelineObserver.observe(timeline);
    }

    // Interactive timeline: accordion behavior (keep one open)
    (function () {
        var items = Array.from(document.querySelectorAll('.timeline details.timeline-item'));
        if (!items.length) return;
        items.forEach(function (d) {
            d.addEventListener('toggle', function () {
                if (!d.open) return;
                items.forEach(function (other) {
                    if (other !== d) other.removeAttribute('open');
                });
            });
        });
    })();

    // Stagger delays for timeline and about
    document.querySelectorAll('.timeline-item.reveal').forEach(function (el, i) {
        el.classList.add('stagger-' + (Math.min(i + 1, 8)));
    });
    document.querySelectorAll('.about-text.reveal, .skills.reveal').forEach(function (el, i) {
        el.classList.add('stagger-' + (i + 1));
    });
    document.querySelectorAll('.hackathon-card.reveal').forEach(function (el, i) {
        el.classList.add('stagger-' + (i + 1));
    });
    document.querySelectorAll('.venture-card.reveal').forEach(function (el, i) {
        el.classList.add('stagger-' + (i + 1));
    });

    // Mobile nav toggle
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.querySelector('.nav');
    if (toggle && nav) {
        toggle.addEventListener('click', function () {
            nav.classList.toggle('open');
        });
        document.querySelectorAll('.nav-link').forEach(function (link) {
            link.addEventListener('click', function () {
                nav.classList.remove('open');
            });
        });
    }

    // Scroll progress bar
    var progressBar = document.getElementById('scroll-progress');
    if (progressBar) {
        window.addEventListener('scroll', function () {
            var total = document.documentElement.scrollHeight - window.innerHeight;
            progressBar.style.width = (total > 0 ? (window.scrollY / total) * 100 : 0) + '%';
        }, { passive: true });
    }

    // Micro-interactions: ripples for clickable elements
    (function () {
        var selector = '.btn, .hackathon-card, .publications-card, .now-card, .now-mini, .venture-card';
        function addRipple(el) {
            el.addEventListener('pointerdown', function (e) {
                if (e.button !== undefined && e.button !== 0) return;
                var rect = el.getBoundingClientRect();
                var x = ((e.clientX - rect.left) / rect.width) * 100;
                var y = ((e.clientY - rect.top) / rect.height) * 100;
                el.style.setProperty('--rx', x + '%');
                el.style.setProperty('--ry', y + '%');
                el.classList.remove('ripple');
                // force reflow so animation restarts
                void el.offsetWidth;
                el.classList.add('ripple');
            });
            el.addEventListener('animationend', function (ev) {
                if (ev.animationName === 'ripple') el.classList.remove('ripple');
            });
        }
        document.querySelectorAll(selector).forEach(addRipple);
    })();

    // Subtle background flair (starfield) — hero canvas.
    // Fallback only: runs when the 3D scene (three-scene.js) reports failure
    // or never reports at all (module blocked / old browser).
    function startStarfield2D() {
        var canvas = document.getElementById('bg-flair');
        if (!canvas) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reduce work on low-power devices
        var isLowPower = false;
        try {
            isLowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
                (navigator.deviceMemory && navigator.deviceMemory <= 4);
        } catch (_) { }

        var dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        var w = 0, h = 0;
        var stars = [];
        var mouseX = 0.5, mouseY = 0.35;

        function resize() {
            var rect = canvas.getBoundingClientRect();
            w = Math.max(1, Math.floor(rect.width));
            h = Math.max(1, Math.floor(rect.height));
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            var denom = isLowPower ? 32000 : 22000;
            var count = Math.floor((w * h) / denom);
            stars = new Array(count).fill(0).map(function () {
                return {
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: Math.random() * 1.6 + 0.2,
                    a: Math.random() * 0.6 + 0.15,
                    s: Math.random() * 0.35 + 0.05
                };
            });
        }

        window.addEventListener('resize', resize);
        document.addEventListener('mousemove', function (e) {
            mouseX = e.clientX / Math.max(1, window.innerWidth);
            mouseY = e.clientY / Math.max(1, window.innerHeight);
        }, { passive: true });

        resize();

        var t0 = performance.now();
        var running = true;
        var rafId = 0;

        function draw(t) {
            if (!running) return;
            var dt = Math.min(48, t - t0);
            t0 = t;

            ctx.clearRect(0, 0, w, h);
            var px = (mouseX - 0.5) * 18;
            var py = (mouseY - 0.35) * 14;

            for (var i = 0; i < stars.length; i++) {
                var s = stars[i];
                s.y += (dt * 0.02) * s.s;
                if (s.y > h + 8) { s.y = -8; s.x = Math.random() * w; }

                var x = s.x + px * s.s;
                var y = s.y + py * s.s;

                ctx.beginPath();
                ctx.fillStyle = 'rgba(245, 158, 11,' + s.a + ')';
                ctx.arc(x, y, s.r, 0, Math.PI * 2);
                ctx.fill();
            }

            rafId = requestAnimationFrame(draw);
        }
        rafId = requestAnimationFrame(draw);

        // Pause when hero is offscreen or tab hidden (perf polish)
        function setRunning(on) {
            if (running === on) return;
            running = on;
            if (running) {
                t0 = performance.now();
                rafId = requestAnimationFrame(draw);
            } else if (rafId) {
                cancelAnimationFrame(rafId);
            }
        }

        document.addEventListener('visibilitychange', function () {
            setRunning(!document.hidden);
        });

        var hero = document.getElementById('hero');
        if (hero) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    setRunning(entry.isIntersecting && !document.hidden);
                });
            }, { threshold: 0.05 });
            io.observe(hero);
        }
    }

    (function () {
        var started = false;
        function startOnce() {
            if (started || window.__space3d === 'ready') return;
            started = true;
            startStarfield2D();
        }
        window.addEventListener('space3d:failed', startOnce);
        // Module scripts never ran (ancient browser) or CDN blocked: no event fires.
        setTimeout(function () {
            if (window.__space3d !== 'ready') startOnce();
        }, 2500);
    })();

    // 3D tilt on cards — pointer-tracked perspective
    (function () {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        if (window.matchMedia('(hover: none)').matches) return;
        var cards = document.querySelectorAll('.hackathon-card, .publications-card, .now-card');
        cards.forEach(function (card) {
            var raf = 0;
            card.addEventListener('pointermove', function (e) {
                if (raf) return;
                raf = requestAnimationFrame(function () {
                    raf = 0;
                    var rect = card.getBoundingClientRect();
                    var px = (e.clientX - rect.left) / rect.width - 0.5;
                    var py = (e.clientY - rect.top) / rect.height - 0.5;
                    card.style.transform =
                        'perspective(800px) rotateX(' + (-py * 6).toFixed(2) + 'deg) rotateY(' + (px * 8).toFixed(2) + 'deg) translateY(-4px)';
                });
            });
            card.addEventListener('pointerleave', function () {
                if (raf) { cancelAnimationFrame(raf); raf = 0; }
                card.style.transform = '';
            });
        });
    })();

    // Spotlight modal (for hackathon cards)
    (function () {
        var spotlight = document.getElementById('spotlight');
        if (!spotlight) return;

        var titleEl = document.getElementById('spotlight-title');
        var kickerEl = document.getElementById('spotlight-kicker');
        var descEl = document.getElementById('spotlight-desc');
        var tagsEl = document.getElementById('spotlight-tags');
        var linksEl = document.getElementById('spotlight-links');

        var data = {
            'husky-maps': {
                kicker: 'Hackathon',
                title: 'Husky Maps',
                desc: 'A faster way to commute through campus — find shortcuts through buildings to reduce walking time.',
                tags: ['UX', 'Maps', 'Web'],
                links: [
                    { label: 'Devpost', href: 'https://devpost.com/software/husky-maps', icon: 'fa-solid fa-arrow-up-right-from-square' }
                ]
            },
            'bloomsync-ai': {
                kicker: 'Hackathon',
                title: 'BloomSync AI',
                desc: 'AI-guided bioinformatics pipeline exploring FT/TFL1 edits to enable new-wood fruiting and robotics-ready orchards.',
                tags: ['Bioinformatics', 'Genomics', 'AI'],
                links: [
                    { label: 'Devpost', href: 'https://devpost.com/software/bloomsync-ai', icon: 'fa-solid fa-arrow-up-right-from-square' }
                ]
            },
            'neuraltrace': {
                kicker: 'NeuroAI Hackathon',
                title: 'NeuralTrace',
                desc: 'Real-time EEG learning visualizer — live EEG (OpenBCI) via Web Serial, a 3D brain with electrode glow, and interactive neural connection animations.',
                tags: ['Three.js', 'TypeScript', 'Web Serial API', 'EEG'],
                links: [
                    { label: 'Live demo', href: 'https://rohan-pandey1729.github.io/NeuroAIHackathon/', icon: 'fa-solid fa-bolt' },
                    { label: 'GitHub', href: 'https://github.com/Rohan-Pandey1729/NeuroAIHackathon', icon: 'fa-brands fa-github' }
                ]
            }
        };

        function setOpen(open) {
            spotlight.classList.toggle('open', open);
            spotlight.setAttribute('aria-hidden', open ? 'false' : 'true');
            document.documentElement.style.overflow = open ? 'hidden' : '';
        }

        function render(key) {
            var item = data[key];
            if (!item) return;
            kickerEl.textContent = item.kicker || '';
            titleEl.textContent = item.title || '';
            descEl.textContent = item.desc || '';
            tagsEl.innerHTML = (item.tags || []).map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');
            linksEl.innerHTML = (item.links || []).map(function (l) {
                return '<a href="' + l.href + '" target="_blank" rel="noopener"><i class="' + (l.icon || 'fa-solid fa-arrow-up-right-from-square') + '"></i> ' + l.label + '</a>';
            }).join('');
        }

        document.querySelectorAll('[data-spotlight]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                var key = a.getAttribute('data-spotlight');
                if (!key) return;
                e.preventDefault();
                render(key);
                setOpen(true);
            });
        });

        spotlight.querySelectorAll('[data-spotlight-close]').forEach(function (el) {
            el.addEventListener('click', function () { setOpen(false); });
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && spotlight.classList.contains('open')) setOpen(false);
        });
    })();

    // Card 3D tilt (desktop only)
    if (window.matchMedia('(pointer: fine)').matches) {
        document.querySelectorAll('.hackathon-card, .publications-card').forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                var rect = card.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;
                var rotY = ((x / rect.width) - 0.5) * 14;
                var rotX = -((y / rect.height) - 0.5) * 10;
                card.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
                card.style.transform = 'perspective(900px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateY(-4px)';
            });
            card.addEventListener('mouseleave', function () {
                card.style.transition = '';
                card.style.transform = '';
            });
        });

        // Magnetic nav links
        document.querySelectorAll('.nav-link').forEach(function (link) {
            link.addEventListener('mousemove', function (e) {
                var rect = link.getBoundingClientRect();
                var dx = (e.clientX - (rect.left + rect.width / 2)) * 0.18;
                var dy = (e.clientY - (rect.top + rect.height / 2)) * 0.18;
                link.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
            });
            link.addEventListener('mouseleave', function () {
                link.style.transform = '';
            });
        });
    }

    // Contact form — Formspree
    var form = document.getElementById('contact-form');
    var statusEl = document.getElementById('form-status');
    if (form && statusEl) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var action = form.getAttribute('action');
            if (!action || action.indexOf('YOUR_FORM_ID') !== -1) {
                statusEl.textContent = 'Set your Formspree form ID in the form action (index.html).';
                statusEl.className = 'form-status error';
                return;
            }
            statusEl.textContent = 'Sending…';
            statusEl.className = 'form-status';

            var fd = new FormData(form);
            fetch(action, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
                .then(function (r) {
                    if (r.ok) {
                        statusEl.textContent = 'Thanks! Your message was sent.';
                        statusEl.className = 'form-status success';
                        form.reset();
                    } else {
                        statusEl.textContent = 'Something went wrong. Email me at rpande.1729@gmail.com';
                        statusEl.className = 'form-status error';
                    }
                })
                .catch(function () {
                    statusEl.textContent = 'Network error. Email me at rpande.1729@gmail.com';
                    statusEl.className = 'form-status error';
                });
        });
    }
})();

// ── Flappy Rocket mini-game ───────────────────────────────
(function () {
    var canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');

    // Logical resolution
    var W = 700, H = 380;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.scale(dpr, dpr);

    // Palette matching the site
    var C_BG      = '#050b15';
    var C_AMBER   = '#f59e0b';
    var C_AMBER_S = '#fbbf24';
    var C_TEXT    = '#e2e8f0';
    var C_MUTED   = '#94a3b8';
    var C_BARRIER = '#0f1825';

    // Persistent best score
    var best = +(localStorage.getItem('flr-best') || 0);

    // Physics constants
    var ROCKET_X  = 110;
    var ROCKET_HW = 13;
    var ROCKET_HH = 22;
    var GRAVITY   = 0.32;
    var THRUST    = -7.2;
    var MAX_VY    = 9;
    var RING_W    = 52;
    var RING_GAP  = 158;

    // Runtime state
    var STATE, score, speed, frame;
    var ry, rvy;
    var rings, particles, stars;

    // ── helpers ──────────────────────────────────────────
    function rrPath(x, y, w2, h2, r2) {
        ctx.moveTo(x + r2, y);
        ctx.lineTo(x + w2 - r2, y);
        ctx.arcTo(x + w2, y, x + w2, y + r2, r2);
        ctx.lineTo(x + w2, y + h2 - r2);
        ctx.arcTo(x + w2, y + h2, x + w2 - r2, y + h2, r2);
        ctx.lineTo(x + r2, y + h2);
        ctx.arcTo(x, y + h2, x, y + h2 - r2, r2);
        ctx.lineTo(x, y + r2);
        ctx.arcTo(x, y, x + r2, y, r2);
        ctx.closePath();
    }

    function ctext(text, x, y, font, color, glow) {
        ctx.save();
        ctx.font = font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = color;
        if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 18; }
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    // ── init ─────────────────────────────────────────────
    function initStars() {
        stars = [];
        for (var i = 0; i < 88; i++) {
            stars.push({
                x: Math.random() * W,
                y: Math.random() * H,
                r: Math.random() * 1.4 + 0.2,
                a: Math.random() * 0.5 + 0.15,
                s: Math.random() * 0.35 + 0.08
            });
        }
    }

    function startGame() {
        score = 0; speed = 2.8; frame = 0;
        ry = H / 2; rvy = 0;
        rings = []; particles = [];
        STATE = 'running';
    }

    function reset() {
        ry = H / 2; rvy = 0;
        rings = []; particles = [];
        score = 0; speed = 2.8; frame = 0;
        STATE = 'idle';
    }

    // ── input ─────────────────────────────────────────────
    function doThrust() {
        if (STATE === 'idle' || STATE === 'dead') { startGame(); return; }
        rvy = THRUST;
        for (var i = 0; i < 5; i++) {
            particles.push({
                x: ROCKET_X - ROCKET_HH - 2, y: ry,
                vx: -(Math.random() * 3.5 + 1.5),
                vy: (Math.random() - 0.5) * 2.8,
                life: 1, decay: 0.08 + Math.random() * 0.06,
                r: 2 + Math.random() * 4
            });
        }
    }

    canvas.addEventListener('click', function (e) { e.preventDefault(); doThrust(); });
    canvas.addEventListener('touchstart', function (e) { e.preventDefault(); doThrust(); }, { passive: false });
    document.addEventListener('keydown', function (e) {
        if (e.code !== 'Space') return;
        var rect = canvas.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) { e.preventDefault(); doThrust(); }
    });

    // ── ring spawning & collision ─────────────────────────
    function spawnRing() {
        var margin = 58;
        var gapTop = margin + Math.random() * (H - RING_GAP - margin * 2);
        rings.push({ x: W + RING_W / 2, gapTop: gapTop, passed: false });
    }

    function hitTest() {
        var m = 4;
        var l = ROCKET_X - ROCKET_HH + m, r2 = ROCKET_X + ROCKET_HH - m; // HH is now along x
        var t = ry - ROCKET_HW + m,       b  = ry + ROCKET_HW - m;        // HW is now along y
        if (b >= H || t <= 0) return true;
        for (var i = 0; i < rings.length; i++) {
            var o = rings[i], rx2 = o.x - RING_W / 2;
            if (r2 < rx2 || l > rx2 + RING_W) continue;
            if (t < o.gapTop || b > o.gapTop + RING_GAP) return true;
        }
        return false;
    }

    // ── drawing ───────────────────────────────────────────
    function drawRocket(cx, cy, tilt) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 2 + tilt); // rotate 90° CW so nose points right
        var hw = ROCKET_HW, hh = ROCKET_HH;

        // Engine ambient glow
        var eg = ctx.createRadialGradient(0, hh * 0.5, 0, 0, hh * 0.5, hw + 12);
        eg.addColorStop(0, 'rgba(245,158,11,0.28)');
        eg.addColorStop(1, 'rgba(245,158,11,0)');
        ctx.fillStyle = eg;
        ctx.fillRect(-hw - 12, -hh * 0.3, hw * 2 + 24, hh * 1.6);

        // Left fin
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(-hw, hh * 0.3); ctx.lineTo(-hw - 9, hh * 0.78); ctx.lineTo(-hw, hh * 0.65);
        ctx.closePath(); ctx.fill();

        // Right fin
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(hw, hh * 0.3); ctx.lineTo(hw + 9, hh * 0.78); ctx.lineTo(hw, hh * 0.65);
        ctx.closePath(); ctx.fill();

        // Body
        ctx.fillStyle = '#e8ecf0';
        ctx.beginPath(); ctx.rect(-hw, -hh * 0.62, hw * 2, hh * 1.25); ctx.fill();

        // Nose cone
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(0, -hh); ctx.lineTo(-hw, -hh * 0.42); ctx.lineTo(hw, -hh * 0.42);
        ctx.closePath(); ctx.fill();

        // Amber band
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.rect(-hw - 1, -hh * 0.1, hw * 2 + 2, hh * 0.16); ctx.fill();

        // Window
        ctx.fillStyle = '#0c1222';
        ctx.beginPath(); ctx.ellipse(0, -hh * 0.08, 5.5, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#334155';
        ctx.beginPath(); ctx.ellipse(0, -hh * 0.1, 3.5, 5, 0, 0, Math.PI * 2); ctx.fill();

        ctx.restore();
    }

    function drawFlame(cx, cy, tilt) {
        // Tail is on the left side of the horizontal rocket
        var tailX = cx - ROCKET_HH - 2;
        var tailY = cy + Math.sin(tilt) * ROCKET_HH * 0.5;
        var flen = 14 + Math.random() * 10;
        ctx.save();
        ctx.translate(tailX, tailY);
        ctx.rotate(tilt);
        var fg = ctx.createLinearGradient(0, 0, -flen, 0);
        fg.addColorStop(0, 'rgba(245,158,11,0.95)');
        fg.addColorStop(0.5, 'rgba(251,191,36,0.5)');
        fg.addColorStop(1, 'rgba(245,158,11,0)');
        ctx.fillStyle = fg;
        ctx.beginPath(); ctx.ellipse(-flen / 2, 0, flen / 2, 6.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function drawBarrier(o) {
        var rx2 = o.x - RING_W / 2;
        var gapBottom = o.gapTop + RING_GAP;

        ctx.shadowColor = C_AMBER; ctx.shadowBlur = 14;
        ctx.strokeStyle = C_AMBER; ctx.lineWidth = 1.5;

        ctx.fillStyle = C_BARRIER;
        ctx.beginPath(); ctx.rect(rx2, 0, RING_W, o.gapTop); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.rect(rx2, gapBottom, RING_W, H - gapBottom); ctx.fill(); ctx.stroke();

        ctx.shadowBlur = 0;

        // Amber rim at gap edges
        ctx.fillStyle = 'rgba(245,158,11,0.28)';
        ctx.beginPath(); ctx.rect(rx2, o.gapTop - 4, RING_W, 4); ctx.fill();
        ctx.beginPath(); ctx.rect(rx2, gapBottom, RING_W, 4); ctx.fill();
    }

    function drawIdleScreen() {
        ctx.fillStyle = 'rgba(5,11,21,0.72)'; ctx.fillRect(0, 0, W, H);

        // Subtle decorative border
        ctx.save();
        ctx.strokeStyle = 'rgba(245,158,11,0.14)'; ctx.lineWidth = 1;
        ctx.beginPath(); rrPath(W / 2 - 130, H / 2 - 84, 260, 170, 14); ctx.stroke();
        ctx.restore();

        ctext('Flappy Rocket', W / 2, H / 2 - 60, 'bold 32px Outfit, system-ui, sans-serif', C_AMBER, C_AMBER);
        ctext('Press Space or tap to launch', W / 2, H / 2 - 18, '16px DM Sans, system-ui, sans-serif', C_TEXT, null);
        if (best > 0) ctext('Best: ' + best, W / 2, H / 2 + 10, '14px DM Sans, system-ui, sans-serif', C_MUTED, null);
        ctext('Tap / click / Space to thrust  ·  dodge the asteroid fields', W / 2, H / 2 + 36, '12px DM Sans, system-ui, sans-serif', 'rgba(148,163,184,0.5)', null);
    }

    function drawDeadScreen() {
        ctx.fillStyle = 'rgba(5,11,21,0.82)'; ctx.fillRect(0, 0, W, H);
        ctext('Mission Failed', W / 2, H / 2 - 64, 'bold 28px Outfit, system-ui, sans-serif', '#f87171', 'rgba(248,113,113,0.4)');
        ctext(String(score), W / 2, H / 2 - 10, 'bold 58px Outfit, system-ui, sans-serif', C_AMBER, C_AMBER);
        var isNew = score >= best;
        ctext(isNew ? ('New best: ' + best) : ('Best: ' + best), W / 2, H / 2 + 38, '14px DM Sans, system-ui, sans-serif', isNew ? C_AMBER_S : C_MUTED, null);
        ctext('Press Space or tap to try again', W / 2, H / 2 + 66, '14px DM Sans, system-ui, sans-serif', C_TEXT, null);
    }

    function drawScore() {
        ctx.save();
        ctx.font = 'bold 42px Outfit, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(245,158,11,0.9)';
        ctx.shadowColor = C_AMBER; ctx.shadowBlur = 10;
        ctx.fillText(score, W / 2, 14);
        ctx.restore();
    }

    // ── update ────────────────────────────────────────────
    function update() {
        if (STATE !== 'running') return;
        frame++;
        speed = 2.8 + score * 0.07;

        var interval = Math.max(60, 94 - Math.floor(score / 5) * 4);
        if (frame % interval === 0) spawnRing();

        rvy = Math.min(MAX_VY, rvy + GRAVITY);
        ry += rvy;

        for (var i = rings.length - 1; i >= 0; i--) {
            rings[i].x -= speed;
            if (!rings[i].passed && rings[i].x + RING_W / 2 < ROCKET_X - ROCKET_HW) {
                rings[i].passed = true;
                score++;
                if (score > best) {
                    best = score;
                    try { localStorage.setItem('flr-best', best); } catch (e2) {}
                }
            }
            if (rings[i].x + RING_W < 0) rings.splice(i, 1);
        }

        for (var j = 0; j < stars.length; j++) {
            stars[j].x -= stars[j].s * (speed / 2.5);
            if (stars[j].x < 0) { stars[j].x = W; stars[j].y = Math.random() * H; }
        }

        if (frame % 2 === 0) {
            particles.push({
                x: ROCKET_X - ROCKET_HH - 2,
                y: ry + (Math.random() - 0.5) * 10,
                vx: -(Math.random() * 1.8 + 0.5),
                vy: (Math.random() - 0.5) * 1.2,
                life: 0.65, decay: 0.06 + Math.random() * 0.04,
                r: 1.5 + Math.random() * 2.5
            });
        }

        for (var k = particles.length - 1; k >= 0; k--) {
            var p = particles[k];
            p.x += p.vx; p.y += p.vy; p.life -= p.decay;
            if (p.life <= 0) particles.splice(k, 1);
        }

        if (hitTest()) STATE = 'dead';
    }

    // ── render ────────────────────────────────────────────
    function render() {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = C_BG; ctx.fillRect(0, 0, W, H);

        for (var i = 0; i < stars.length; i++) {
            var s = stars[i];
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(226,232,240,' + s.a + ')'; ctx.fill();
        }

        if (STATE !== 'idle') {
            for (var j = 0; j < rings.length; j++) drawBarrier(rings[j]);
        }

        for (var k = 0; k < particles.length; k++) {
            var p2 = particles[k];
            ctx.beginPath();
            ctx.arc(p2.x, p2.y, Math.max(0.4, p2.r * p2.life), 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(245,158,11,' + (p2.life * 0.85) + ')';
            ctx.fill();
        }

        var tilt = Math.max(-0.5, Math.min(0.36, rvy * 0.042));
        if (STATE === 'running') drawFlame(ROCKET_X, ry, tilt);
        drawRocket(ROCKET_X, ry, tilt);

        if (STATE === 'running') drawScore();
        if (STATE === 'idle')    drawIdleScreen();
        if (STATE === 'dead')    drawDeadScreen();
    }

    // ── loop ──────────────────────────────────────────────
    var rafId = 0;
    var active = true;

    function loop() {
        if (!active) return;
        update();
        render();
        rafId = requestAnimationFrame(loop);
    }

    document.addEventListener('visibilitychange', function () {
        active = !document.hidden;
        if (active) { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(loop); }
        else { cancelAnimationFrame(rafId); }
    });

    initStars();
    reset();
    loop();
})();
