// Navigation remains ordinary HTML links; JavaScript only enhances the experience.
(() => {
  // File previews have separate document origins; use the local fade instead.
  if (location.protocol === 'file:') {
    document.documentElement.classList.add('file-preview');
    const transitionStyle = document.createElement('style');
    transitionStyle.textContent = '@view-transition { navigation: none; }';
    document.head.append(transitionStyle);
  }
  const contactLinks = [...document.querySelectorAll('.site-header nav a[href^="mailto:"], [data-contact]')];
  if (contactLinks.length && typeof HTMLDialogElement !== 'undefined') {
    const gmailUrl = new URL('https://mail.google.com/mail/');
    gmailUrl.search = new URLSearchParams({ view:'cm', fs:'1', to:'m.aydogmus58@gmail.com' }).toString();
    const dialog = document.createElement('dialog');
    dialog.id = 'contact-confirmation';
    dialog.className = 'contact-dialog';
    dialog.setAttribute('aria-labelledby', 'contact-dialog-title');
    dialog.setAttribute('aria-describedby', 'contact-dialog-description');
    dialog.innerHTML = '<h2 id="contact-dialog-title">Open Gmail?</h2><p id="contact-dialog-description">You’ll be taken to Gmail to write an email to me at <span>m.aydogmus58@gmail.com</span>.</p><div class="contact-dialog-actions"><button type="button" data-contact-cancel autofocus>Cancel</button><a data-contact-confirm target="_blank" rel="noopener noreferrer">Open Gmail <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></a></div>';
    document.body.append(dialog);
    const confirm = dialog.querySelector('[data-contact-confirm]');
    confirm.href = gmailUrl.href;
    let opener = null;
    dialog.querySelector('[data-contact-cancel]').addEventListener('click', () => dialog.close());
    confirm.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => opener?.focus({ preventScroll:true }));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
    });
    contactLinks.forEach(link => {
      link.setAttribute('aria-haspopup', 'dialog');
      link.setAttribute('aria-controls', dialog.id);
      link.addEventListener('click', event => {
        event.preventDefault();
        opener = link;
        dialog.showModal();
      });
    });
  }
  const homeSections = [...document.querySelectorAll('.home-flow>section[id]')];
  if (homeSections.length && 'IntersectionObserver' in window) {
    const homeLinks = [...document.querySelectorAll('.site-header nav a')];
    const observer = new IntersectionObserver(entries => {
      const visible = entries.find(entry => entry.isIntersecting);
      if (!visible) return;
      document.body.classList.toggle('is-past-hero', visible.target.id !== 'home');
      homeLinks.forEach(link => {
        if (link.hash === '#' + visible.target.id || (visible.target.id === 'contact' && link.hasAttribute('data-contact'))) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin:'-15% 0px -65% 0px' });
    homeSections.forEach(section => observer.observe(section));
  }
  if (document.querySelector('.case-hero')) {
    const backToTop = document.createElement('button');
    backToTop.type = 'button';
    backToTop.className = 'back-to-top';
    backToTop.setAttribute('aria-label', 'Back to top');
    backToTop.title = 'Back to top';
    backToTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>';
    document.body.append(backToTop);
    const updateBackToTop = () => {
      const visible = window.scrollY > 400;
      backToTop.classList.toggle('is-visible', visible);
      backToTop.tabIndex = visible ? 0 : -1;
    };
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    updateBackToTop();
    backToTop.addEventListener('click', () => {
      const heading = document.querySelector('h1');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
        heading.addEventListener('blur', () => heading.removeAttribute('tabindex'), { once: true });
      }
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
  }
  const zoomLinks = document.querySelectorAll('[data-zoom]');
  if (zoomLinks.length && typeof HTMLDialogElement !== 'undefined') {
    const dialog = document.createElement('dialog');
    dialog.className = 'image-dialog';
    dialog.setAttribute('aria-label', 'Project image');
    const close = document.createElement('button');
    close.className = 'dialog-close';
    close.type = 'button';
    close.textContent = 'Close ×';
    const image = document.createElement('img');
    const caption = document.createElement('p');
    caption.className = 'dialog-caption';
    dialog.append(close, image, caption);
    document.body.append(dialog);
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target === dialog) {
        const box = dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
      }
    });
    zoomLinks.forEach(link => link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      image.src = link.href;
      image.alt = link.querySelector('img')?.alt || '';
      caption.textContent = link.closest('figure')?.querySelector('figcaption')?.textContent || image.alt;
      dialog.showModal();
    }));
  }
  const sectionLinks = [...document.querySelectorAll('.case-nav a')];
  if ('IntersectionObserver' in window && sectionLinks.length) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting);
      if (!visible.length) return;
      const id = visible[0].target.id;
      sectionLinks.forEach(link => {
        if (link.hash === '#' + id) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-8% 0px -65% 0px' });
    document.querySelectorAll('.case-section').forEach(section => observer.observe(section));
  }
})();
