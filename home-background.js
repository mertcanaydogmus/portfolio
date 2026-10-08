// A decorative light field: links and page content stay in the normal HTML layer.
(() => {
  const ambient = document.querySelector('.home .ambient, .ambient[data-portfolio-background]');
  if (!ambient) return;
  const secondaryPage = ambient.hasAttribute('data-portfolio-background');

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('2d', { alpha: false });
  const glow = document.createElement('canvas');
  const light = glow.getContext('2d');
  if (!context || !light) return;
  ambient.append(canvas);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { x: 0.5, y: 0.6, targetX: 0.5, targetY: 0.6, strength: 0, targetStrength: 0 };
  let width = 0, height = 0, ratio = 1, glowScale = 1, points = [];
  let frame = 0, previousTime = 0, phase = 0, pageActive = true;

  function resize() {
    const bounds = ambient.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    // Render the soft light at a smaller resolution; keep the dot grid crisp.
    glowScale = Math.min(0.45, 640 / width);
    glow.width = Math.ceil(width * glowScale);
    glow.height = Math.ceil(height * glowScale);
    points = [];
    const gap = width < 600 ? 26 : 22;
    for (let y = 11; y < height; y += gap) {
      for (let x = 11; x < width; x += gap) {
        const tint = (Math.sin(x * 12.9898 + y * 78.233) + 1) / 2;
        points.push({ x, y, tint });
      }
    }
    paint();
  }

  function haze(x, y, radius, color) {
    const gradient = light.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    light.fillStyle = gradient;
    light.fillRect(0, 0, width, height);
  }

  function ribbon(offset, opacity) {
    const cursorX = (pointer.x - 0.5) * pointer.strength;
    const cursorY = (pointer.y - 0.5) * pointer.strength;
    const color = light.createLinearGradient(0, 0, width, height * 0.2);
    color.addColorStop(0, '#8462e8');
    color.addColorStop(0.32, '#8984f5');
    color.addColorStop(0.62, '#65bce1');
    color.addColorStop(1, '#8d63e7');
    light.strokeStyle = color;
    light.lineCap = 'round';
    light.lineJoin = 'round';
    light.filter = `blur(${Math.max(3, height * glowScale * 0.022)}px)`;
    light.beginPath();
    for (let step = 0; step <= 96; step++) {
      const x = width * (step / 96 * 1.16 - 0.08);
      const u = x / width;
      const arch = Math.sin(Math.PI * Math.max(0, Math.min(1, u)));
      const drift = Math.sin(u * Math.PI * 2 + phase * 0.32 + offset * 4) * 0.045;
      const follow = cursorY * 0.18 + cursorX * (u - 0.5) * 0.24;
      const y = height * (0.43 + arch * 0.42 + drift + offset + follow);
      if (step === 0) light.moveTo(x, y);
      else light.lineTo(x, y);
    }
    // A wide, faint halo under a narrower luminous edge, with no grain texture.
    for (const [size, alpha] of [[0.3, 0.035], [0.22, 0.045], [0.15, 0.065], [0.09, 0.085], [0.045, 0.11], [0.018, 0.1]]) {
      light.lineWidth = Math.max(5, height * size);
      light.globalAlpha = alpha * opacity;
      light.stroke();
    }
    light.globalAlpha = 1;
    light.filter = 'none';
  }

  function paint() {
    if (!width || !height) return;
    light.setTransform(1, 0, 0, 1, 0, 0);
    light.clearRect(0, 0, glow.width, glow.height);
    light.setTransform(glowScale, 0, 0, glowScale, 0, 0);
    light.globalCompositeOperation = 'lighter';
    const cursorX = (pointer.x - 0.5) * pointer.strength;
    const cursorY = (pointer.y - 0.5) * pointer.strength;
    haze(width * (0.04 + cursorX * 0.14), height * (0.96 + cursorY * 0.1), Math.max(width * 0.47, height * 0.65), '#624ac77a');
    haze(width * (0.94 + cursorX * 0.14), height * (1.02 + cursorY * 0.1), Math.max(width * 0.45, height * 0.65), '#5968ba70');
    ribbon(0, 1.3);
    ribbon(0.15 + Math.sin(phase * 0.23) * 0.04, 0.5);
    if (pointer.strength > 0.01) {
      haze(pointer.x * width, pointer.y * height, Math.min(width, height) * 0.38, `rgba(89,146,210,${pointer.strength * 0.13})`);
    }

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#03050b';
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.globalAlpha = secondaryPage ? 0.58 : 1;
    context.drawImage(glow, 0, 0, width, height);
    context.globalAlpha = 1;

    const reach = Math.min(width * 0.4, 180);
    for (const point of points) {
      const dx = point.x - pointer.x * width;
      const dy = point.y - pointer.y * height;
      const distance = Math.hypot(dx, dy);
      const influence = Math.pow(Math.max(0, 1 - distance / reach), 2) * pointer.strength;
      const push = influence * 24;
      const x = point.x + dx / Math.max(1, distance) * push;
      const y = point.y + dy / Math.max(1, distance) * push;
      const alpha = (0.19 + point.tint * 0.12 + influence * 0.5) * (secondaryPage ? 0.75 : 1);
      context.fillStyle = `rgba(${Math.round(96 + influence * 40)},${Math.round(118 + influence * 65)},${Math.round(143 + influence * 80)},${alpha})`;
      context.beginPath();
      context.arc(x, y, 0.75 + influence * 0.65, 0, Math.PI * 2);
      context.fill();
    }
  }

  function animate(time) {
    frame = 0;
    if (document.hidden || !pageActive || reducedMotion.matches) return;
    const elapsed = previousTime ? (time - previousTime) / 1000 : 1 / 30;
    if (elapsed >= 1 / 30 - 0.001) {
      const delta = Math.min(elapsed, 0.08);
      previousTime = time;
      phase += delta;
      const ease = 1 - Math.exp(-delta * 5);
      pointer.x += (pointer.targetX - pointer.x) * ease;
      pointer.y += (pointer.targetY - pointer.y) * ease;
      pointer.strength += (pointer.targetStrength - pointer.strength) * ease;
      paint();
    }
    frame = requestAnimationFrame(animate);
  }

  function resetPointer() {
    pointer.targetX = 0.5;
    pointer.targetY = 0.6;
    pointer.targetStrength = 0;
  }

  function updatePlayback() {
    cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    if (reducedMotion.matches) {
      resetPointer();
      pointer.x = 0.5;
      pointer.y = 0.6;
      pointer.strength = 0;
      phase = 0;
      paint();
    } else if (!document.hidden && pageActive) {
      frame = requestAnimationFrame(animate);
    }
  }

  window.addEventListener('pointermove', event => {
    if (reducedMotion.matches || event.pointerType === 'touch') return;
    const bounds = ambient.getBoundingClientRect();
    pointer.targetX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / width));
    pointer.targetY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / height));
    pointer.targetStrength = 1;
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', resetPointer);
  window.addEventListener('blur', resetPointer);
  document.addEventListener('visibilitychange', updatePlayback);
  reducedMotion.addEventListener('change', updatePlayback);
  window.addEventListener('pagehide', () => { pageActive = false; updatePlayback(); });
  window.addEventListener('pageshow', () => { pageActive = true; updatePlayback(); });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(ambient);
  else window.addEventListener('resize', resize, { passive: true });
  resize();
  updatePlayback();
})();
