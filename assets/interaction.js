(() => {
  'use strict';

  const root = document.documentElement;
  const nav = document.querySelector('nav');
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('#primary-navigation');
  const navLinks = [...document.querySelectorAll('.nav-links a')];
  const sections = [...document.querySelectorAll('section[id]')];
  const progress = document.querySelector('.reading-progress span');
  const hero = document.querySelector('.hero');
  const heroVisual = document.querySelector('.hero-visual');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');

  // The menu is only collapsed after its controls are wired up. Without JS, the
  // navigation remains available as a scrollable row on small screens.
  if (nav && navToggle && navMenu) {
    const setMenuOpen = (open, returnFocus = false) => {
      navMenu.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      if (returnFocus) navToggle.focus();
    };

    navToggle.addEventListener('click', () => {
      setMenuOpen(navToggle.getAttribute('aria-expanded') !== 'true');
    });
    navLinks.forEach(link => link.addEventListener('click', () => setMenuOpen(false)));
    document.addEventListener('click', event => {
      if (!nav.contains(event.target) && navToggle.getAttribute('aria-expanded') === 'true') setMenuOpen(false);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') setMenuOpen(false, true);
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1120 && navToggle.getAttribute('aria-expanded') === 'true') setMenuOpen(false);
    });
    root.classList.add('nav-enhanced');
    // Let the initially closed menu settle before enabling open/close transitions.
    window.requestAnimationFrame(() => root.classList.add('nav-transitions'));
  }

  // Batch scroll work into one frame and update the active section and progress.
  let scrollScheduled = false;
  let activeSection = '';
  const updateScrollUI = () => {
    scrollScheduled = false;
    const scrollTop = window.scrollY;
    const scrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (progress) progress.style.transform = `scaleX(${scrollable ? Math.min(scrollTop / scrollable, 1) : 0})`;
    if (nav) nav.classList.toggle('is-scrolled', scrollTop > 16);

    let current = '';
    sections.forEach(section => {
      if (scrollTop >= section.offsetTop - 140) current = section.id;
    });
    if (current !== activeSection) {
      activeSection = current;
      navLinks.forEach(link => {
        const active = link.getAttribute('href') === `#${current}`;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }

    if (hero && heroVisual && !motionPreference.matches && window.innerWidth > 850 && scrollTop < hero.offsetHeight) {
      heroVisual.style.setProperty('--scroll-shift', `${Math.min(scrollTop * .045, 36).toFixed(1)}px`);
    }
  };
  const requestScrollUpdate = () => {
    if (!scrollScheduled) {
      scrollScheduled = true;
      window.requestAnimationFrame(updateScrollUI);
    }
  };
  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate);
  requestScrollUpdate();

  // Reveal once, with a short stagger for cards entering together. Content is
  // visible by default; the class is only added if observation is supported.
  const reveals = [...document.querySelectorAll('.reveal')];
  let revealObserver;
  if (!motionPreference.matches && 'IntersectionObserver' in window) {
    revealObserver = new IntersectionObserver(entries => {
      let stagger = 0;
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.style.setProperty('--reveal-delay', `${Math.min(stagger++, 4) * 70}ms`);
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -35px 0px' });

    // Avoid a flash of hidden content when a visitor opens a deep link.
    reveals.forEach(element => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) element.classList.add('visible');
      else revealObserver.observe(element);
    });
    root.classList.add('motion-enabled');
  }

  // Animate the real, portfolio-sourced values once; screen readers receive
  // the unchanged values in the adjacent visually hidden spans.
  const counters = [...document.querySelectorAll('[data-counter]')];
  const finalCounterValues = counters.map(counter => counter.textContent);
  let counterObserver;
  let counterFrame;
  let countersStarted = false;
  const finishCounters = () => {
    if (counterFrame) window.cancelAnimationFrame(counterFrame);
    counters.forEach((counter, index) => { counter.textContent = finalCounterValues[index]; });
  };
  const animateCounters = () => {
    if (countersStarted || motionPreference.matches) return;
    countersStarted = true;
    const start = performance.now() + 250;
    const duration = 1400;
    const tick = now => {
      const progress = Math.max(0, Math.min((now - start) / duration, 1));
      const eased = 1 - Math.pow(1 - progress, 3);
      counters.forEach(counter => {
        const value = Number(counter.dataset.counter);
        const decimals = Number(counter.dataset.decimals || 0);
        counter.textContent = `${(value * eased).toFixed(decimals)}${counter.dataset.suffix || ''}`;
      });
      if (progress < 1 && !motionPreference.matches) counterFrame = window.requestAnimationFrame(tick);
      else finishCounters();
    };
    counterFrame = window.requestAnimationFrame(tick);
  };
  const stats = document.querySelector('.hero-stats');
  if (stats && !motionPreference.matches && 'IntersectionObserver' in window) {
    counterObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        animateCounters();
        counterObserver.disconnect();
      }
    }, { threshold: .25 });
    counterObserver.observe(stats);
  }

  // A restrained pointer response is used only on devices with a fine pointer.
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let pointerFrame;
  if (hero && heroVisual) {
    hero.addEventListener('pointermove', event => {
      if (motionPreference.matches || !finePointer.matches || window.innerWidth <= 850) return;
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - .5) * 16;
      const y = ((event.clientY - rect.top) / rect.height - .5) * 16;
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      pointerFrame = window.requestAnimationFrame(() => {
        heroVisual.style.setProperty('--pointer-x', `${x.toFixed(1)}px`);
        heroVisual.style.setProperty('--pointer-y', `${y.toFixed(1)}px`);
      });
    });
    hero.addEventListener('pointerleave', () => {
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      heroVisual.style.removeProperty('--pointer-x');
      heroVisual.style.removeProperty('--pointer-y');
    });
  }

  const onMotionChange = event => {
    if (!event.matches) return;
    if (revealObserver) revealObserver.disconnect();
    if (counterObserver) counterObserver.disconnect();
    root.classList.remove('motion-enabled');
    reveals.forEach(element => element.classList.add('visible'));
    finishCounters();
    if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
    if (heroVisual) {
      heroVisual.style.removeProperty('--pointer-x');
      heroVisual.style.removeProperty('--pointer-y');
      heroVisual.style.removeProperty('--scroll-shift');
    }
  };
  if (motionPreference.addEventListener) motionPreference.addEventListener('change', onMotionChange);
  else motionPreference.addListener(onMotionChange);

  // Keep the existing document viewer above the fixed navigation too.
  const documentModal = document.querySelector('#doc-modal');
  if (documentModal) document.body.appendChild(documentModal);

  // Make the existing photo viewer usable with a keyboard as well as a mouse.
  const lightbox = document.querySelector('#lightbox');
  const lightboxImage = document.querySelector('#lightbox-img');
  const lightboxClose = document.querySelector('.lightbox-close');
  let galleryTrigger;
  let previousBodyOverflow = '';
  if (lightbox && lightboxImage && lightboxClose) {
    // Top-level placement keeps the overlay above the fixed navigation.
    document.body.appendChild(lightbox);
    document.querySelectorAll('.gallery-slot').forEach(slot => {
      const image = slot.querySelector('img');
      const caption = slot.querySelector('div')?.textContent.trim() || 'Gallery photo';
      if (image && !image.alt) image.alt = caption;
      slot.setAttribute('role', 'button');
      slot.setAttribute('tabindex', '0');
      slot.setAttribute('aria-label', `View photo: ${caption}`);
      slot.addEventListener('click', () => {
        galleryTrigger = slot;
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        if (image) lightboxImage.alt = image.alt;
        lightbox.setAttribute('aria-hidden', 'false');
        lightboxClose.focus({ preventScroll: true });
      });
      slot.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          slot.click();
        }
      });
    });
    const closeLightbox = () => {
      lightbox.style.display = 'none';
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = previousBodyOverflow;
      if (galleryTrigger) galleryTrigger.focus({ preventScroll: true });
      galleryTrigger = null;
    };
    lightbox.addEventListener('click', closeLightbox);
    document.addEventListener('keydown', event => {
      if (lightbox.style.display === 'none') return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'Tab') {
        event.preventDefault();
        lightboxClose.focus();
      }
    });
  }
})();
