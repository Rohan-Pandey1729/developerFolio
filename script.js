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
        var selector = '.btn, .hackathon-card, .publications-card, .now-card, .now-mini';
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

    // Subtle background flair (starfield) — hero canvas
    (function () {
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
