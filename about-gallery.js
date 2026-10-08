(() => {
  const gallery = document.querySelector('.about-gallery');
  if (!gallery) return;
  const slides = [...gallery.querySelectorAll('.about-slide')];
  const dots = [...gallery.querySelectorAll('[data-gallery-index]')];
  const status = gallery.querySelector('[data-gallery-status]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, timer = 0, active = true;
  let inView = !gallery.closest('.home-flow') || !('IntersectionObserver' in window);
  let incoming = null, change = 0;

  function schedule(delay = 2800) {
    clearTimeout(timer);
    timer = 0;
    if (motion.matches || document.hidden || !active || !inView) return;
    timer = setTimeout(() => show(index + 1), delay);
  }

  function arrangeStack() {
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
      slide.classList.toggle('is-behind-left', i === (index + 1) % slides.length);
      slide.classList.toggle('is-behind-right', i === (index + 2) % slides.length);
      slide.setAttribute('aria-hidden', String(i !== index));
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }

  function settle() {
    change++;
    incoming?.cancel();
    incoming = null;
    slides.forEach(slide => slide.classList.remove('is-leaving'));
    arrangeStack();
  }

  function show(next, manual = false) {
    const target = (next + slides.length) % slides.length;
    if (target === index) { schedule(); return; }
    settle();
    const outgoing = slides[index];
    index = target;
    arrangeStack();
    if (!motion.matches && typeof slides[index].animate === 'function') {
      const token = change;
      outgoing.classList.add('is-leaving');
      incoming = slides[index].animate([
        { transform: 'translate3d(0,38%,0) rotate(4deg) scale(.94)', opacity: 0 },
        { transform: 'translate3d(0,0,0) rotate(0deg) scale(1)', opacity: 1 }
      ], { duration: 850, easing: 'cubic-bezier(.22,1,.36,1)' });
      incoming.finished.then(() => {
        if (token !== change) return;
        incoming = null;
        outgoing.classList.remove('is-leaving');
      }).catch(() => {});
    }
    if (manual) status.textContent = `Photo ${index + 1} of ${slides.length}`;
    schedule();
  }

  gallery.querySelector('.about-gallery-controls').hidden = false;
  gallery.querySelector('[data-gallery-previous]').addEventListener('click', () => show(index - 1, true));
  gallery.querySelector('[data-gallery-next]').addEventListener('click', () => show(index + 1, true));
  dots.forEach((dot, i) => dot.addEventListener('click', () => show(i, true)));
  gallery.addEventListener('keydown', event => {
    const target = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: slides.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    show(target, true);
  });
  document.addEventListener('visibilitychange', () => schedule());
  window.addEventListener('pagehide', () => { active = false; schedule(); });
  window.addEventListener('pageshow', () => { active = true; schedule(1200); });
  motion.addEventListener('change', () => {
    settle();
    schedule();
  });
  if (gallery.closest('.home-flow') && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      const visible = entries[0].isIntersecting;
      if (visible === inView) return;
      inView = visible;
      schedule(1200);
    }, { threshold:0.12 }).observe(gallery);
  }
  arrangeStack();
  schedule(1200);
})();
