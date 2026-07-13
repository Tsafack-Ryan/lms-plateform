// ============================================================
// STAR ACADEMY — LANDING PAGE JAVASCRIPT
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

    // --- Mise à jour de l'année dans le footer ---
    var yearEl = document.getElementById('current-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // --- Navbar scroll effect ---
    var header = document.getElementById('landing-header');
    if (header) {
        window.addEventListener('scroll', function () {
            header.classList.toggle('scrolled', window.scrollY > 20);
        }, { passive: true });
    }

    // --- Navigation mobile toggle ---
    var toggle = document.getElementById('nav-toggle');
    var navLinks = document.getElementById('nav-links');
    if (toggle && navLinks) {
        toggle.addEventListener('click', function () {
            var isOpen = navLinks.classList.toggle('mobile-open');
            toggle.classList.toggle('open', isOpen);
            toggle.setAttribute('aria-expanded', String(isOpen));
        });

        // Fermer le menu mobile au clic sur un lien
        navLinks.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                navLinks.classList.remove('mobile-open');
                toggle.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            });
        });

        // Fermer le menu au clic en dehors
        document.addEventListener('click', function (e) {
            if (!toggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('mobile-open');
                toggle.classList.remove('open');
                toggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

    // --- Scroll smooth pour les ancres de la nav ---
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            var href = this.getAttribute('href');
            if (href === '#') return;
            var target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                var navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 72;
                var top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16;
                window.scrollTo({ top: top, behavior: 'smooth' });
            }
        });
    });

    // --- Intersection Observer : animation d'entrée des cartes ---
    if ('IntersectionObserver' in window) {
        var fadeElements = document.querySelectorAll(
            '.course-card, .why-card, .testimonial-card, .stat-item'
        );

        // Ajouter le style initial (invisible)
        fadeElements.forEach(function (el) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(24px)';
            el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        });

        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry, i) {
                if (entry.isIntersecting) {
                    // Délai en cascade pour les cartes d'une même grille
                    var siblings = entry.target.parentElement
                        ? Array.from(entry.target.parentElement.children)
                        : [];
                    var index = siblings.indexOf(entry.target);
                    setTimeout(function () {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 80);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        fadeElements.forEach(function (el) {
            observer.observe(el);
        });
    }

    // --- Compteur animé pour les stats ---
    function animateCounter(el, target, duration) {
        var start = 0;
        var startTime = null;
        var isPercent = String(target).includes('%');
        var numericTarget = parseInt(String(target).replace('%', ''));

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            var current = Math.floor(eased * numericTarget);
            el.textContent = isPercent ? current + '%' : current;
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = target;
        }
        requestAnimationFrame(step);
    }

    var statsSection = document.querySelector('.hero-stats');
    if (statsSection && 'IntersectionObserver' in window) {
        var statsObserver = new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) {
                var statsCourses = document.getElementById('stat-courses');
                var statsModules = document.getElementById('stat-modules');
                var statsFree = document.getElementById('stat-students');

                if (statsCourses) animateCounter(statsCourses, 4, 800);
                if (statsModules) animateCounter(statsModules, 3, 800);
                if (statsFree) animateCounter(statsFree, '100%', 1000);

                statsObserver.disconnect();
            }
        }, { threshold: 0.5 });

        statsObserver.observe(statsSection);
    }
});
