(function () {
    'use strict';

    // Text scramble effect
    function scrambleText(el, finalText) {
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·×#@%';
        var duration = 1400;
        var start = null;
        function step(ts) {
            if (!start) start = ts;
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

    // Custom cursor (desktop only)
    var cursor = document.querySelector('.cursor');
    var cursorDot = document.querySelector('.cursor-dot');
    var hoverTargets = 'a, button, [role="button"], input, textarea, .btn';

    if (cursor && cursorDot && window.matchMedia('(pointer: fine)').matches) {
        document.addEventListener('mousemove', function (e) {
            cursorDot.style.left = e.clientX + 'px';
            cursorDot.style.top = e.clientY + 'px';
        });

        document.querySelectorAll(hoverTargets).forEach(function (el) {
            el.addEventListener('mouseenter', function () { cursor.classList.add('hover'); });
            el.addEventListener('mouseleave', function () { cursor.classList.remove('hover'); });
        });
    }

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
