// Full-resolution light fields with optional, softly eased desktop pointer interaction.
(() => {
  const ambient = document.querySelector('.home .ambient, .ambient[data-portfolio-background]');
  if (!ambient) return;
  const secondaryPage = ambient.hasAttribute('data-portfolio-background');
  const hero = secondaryPage ? null : document.querySelector('.home #home');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const pointer = { x:0.5, y:0.6, targetX:0.5, targetY:0.6, strength:0, targetStrength:0 };
  let canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  ambient.append(canvas);
  const vertexSource = `
    attribute vec2 position;
    void main() { gl_Position = vec4(position, 0.0, 1.0); }
  `;
  const fragmentSource = `
    precision highp float;
    uniform vec2 resolution;
    uniform vec2 cssSize;
    uniform float strength;
    uniform vec3 pointer;
    uniform vec4 ribbon;
    uniform vec4 fields[5];
    uniform vec3 colors[5];
    float softField(vec2 uv, vec4 field) {
      vec2 p = (uv - field.xy) / field.zw;
      return max(0.0, (exp(-3.5 * dot(p,p)) - exp(-3.5)) / (1.0 - exp(-3.5)));
    }
    vec4 gridDot(vec2 pixel, vec2 center, float reach) {
      vec2 delta = center - pointer.xy * cssSize;
      float distance = length(delta);
      float influence = pow(max(0.0,1.0 - distance / reach),2.0) * pointer.z;
      vec2 displaced = center + delta / max(1.0,distance) * influence * 18.0;
      float coverage = 1.0 - smoothstep(0.25,1.15 + influence * 0.65,length(pixel - displaced));
      float tint = (sin(center.x * 12.9898 + center.y * 78.233) + 1.0) * 0.5;
      return vec4((vec3(96.0,118.0,143.0) + vec3(40.0,65.0,80.0) * influence) / 255.0,coverage * (0.19 + tint * 0.12 + influence * 0.5));
    }
    vec3 ribbonLight(vec2 uv) {
      // One continuous analytic curve, not a row of overlapping bitmap stamps.
      float x = (uv.x - ribbon.x) * 2.0;
      float y = ribbon.y + ribbon.z * (1.0 - x * x);
      float slope = -4.0 * ribbon.z * x * cssSize.y / cssSize.x;
      float distance = abs((uv.y - y) * cssSize.y) / sqrt(1.0 + slope * slope);
      float core = exp(-pow(distance / (ribbon.w * 0.75),2.0));
      float halo = exp(-pow(distance / (ribbon.w * 2.8),2.0));
      float cyan = exp(-pow((uv.x - 0.56) * 3.3,2.0));
      vec3 hue = mix(vec3(112.0,79.0,224.0),vec3(77.0,160.0,199.0),cyan) / 255.0;
      return hue * (core * 0.40 + halo * 0.30);
    }
    void main() {
      vec2 uv = vec2(gl_FragCoord.x, resolution.y - gl_FragCoord.y) / resolution;
      vec3 color = vec3(3.0,5.0,11.0) / 255.0;
      for (int i = 0; i < 5; i++) color += colors[i] * softField(uv,fields[i]) * strength * 0.35;
      color += ribbonLight(uv) * strength;
      float reach = min(cssSize.x * 0.4,180.0);
      vec2 delta = (uv - pointer.xy) * cssSize;
      float distance = length(delta);
      color += vec3(89.0,146.0,210.0) / 255.0 * exp(-distance * distance / (reach * reach)) * pointer.z * 0.1;
      // Neighbouring grid cells preserve round dots even when displaced across cell edges.
      vec2 pixel = uv * cssSize;
      float gap = cssSize.x < 600.0 ? 26.0 : 22.0;
      vec2 center = floor((pixel - 11.0 + gap * 0.5) / gap) * gap + 11.0;
      vec4 dotColor = gridDot(pixel,center,reach);
      if (pointer.z > 0.001) {
        for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
          vec4 neighbour = gridDot(pixel,center + vec2(float(x),float(y)) * gap,reach);
          if (neighbour.a > dotColor.a) dotColor = neighbour;
        }
      }
      color = mix(color,dotColor.rgb,dotColor.a);
      // Less than one color level of display dithering avoids bands, not a grain layer.
      float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715))));
      gl_FragColor = vec4(color + (dither - 0.5) / 255.0,1.0);
    }
  `;
  function gpuRenderer() {
    const gl = canvas.getContext('webgl', { alpha:false, antialias:false, depth:false, stencil:false });
    if (!gl) return null;
    const shaders = [];
    const program = gl.createProgram();
    for (const [type,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader,source);
      gl.compileShader(shader);
      shaders.push(shader);
      if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) {
        shaders.forEach(item => gl.deleteShader(item));
        gl.deleteProgram(program);
        return null;
      }
      gl.attachShader(program,shader);
    }
    gl.linkProgram(program);
    shaders.forEach(item => gl.deleteShader(item));
    if (!gl.getProgramParameter(program,gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program,'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    const uniforms = Object.fromEntries(['resolution','cssSize','strength','pointer','ribbon','fields[0]','colors[0]'].map(name => [name,gl.getUniformLocation(program,name)]));
    return (fields,width,height,shape) => {
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.uniform2f(uniforms.resolution,canvas.width,canvas.height);
      gl.uniform2f(uniforms.cssSize,width,height);
      gl.uniform1f(uniforms.strength,secondaryPage ? 0.5 : 0.78);
      gl.uniform3f(uniforms.pointer,pointer.x,pointer.y,pointer.strength);
      gl.uniform4fv(uniforms.ribbon,new Float32Array(shape));
      gl.uniform4fv(uniforms['fields[0]'],new Float32Array(fields.flatMap(field => field.slice(0,4))));
      gl.uniform3fv(uniforms['colors[0]'],new Float32Array(fields.flatMap(field => field.slice(4,7).map(value => value / 255 * field[7]))));
      gl.drawArrays(gl.TRIANGLES,0,6);
    };
  }
  // Full-size, filter-free fallback when the browser disables GPU rendering.
  function fallbackRenderer() {
    const replacement = document.createElement('canvas');
    replacement.setAttribute('aria-hidden','true');
    canvas.replaceWith(replacement);
    canvas = replacement;
    const context = canvas.getContext('2d',{ alpha:false });
    if (!context) return () => {};
    const stops = Array.from({length:65},(_,index) => {
      const distance = (index / 64 * 2 - 1) * 8;
      return {offset:index / 64,alpha:0.4 * Math.exp(-Math.pow(distance / 0.75,2)) + 0.3 * Math.exp(-Math.pow(distance / 2.8,2))};
    });
    return (fields,width,height,shape) => {
      context.setTransform(canvas.width / width,0,0,canvas.height / height,0,0);
      context.globalCompositeOperation = 'source-over';
      context.fillStyle = '#03050b';
      context.fillRect(0,0,width,height);
      context.globalCompositeOperation = 'lighter';
      const cursorRadius = Math.min(width * 0.4,180);
      const visibleFields = pointer.strength > 0.001
        ? [...fields,[pointer.x,pointer.y,cursorRadius / width,cursorRadius / height,89,146,210,pointer.strength * 0.13 / 0.35]]
        : fields;
      for (const [x,y,rx,ry,r,g,b,opacity] of visibleFields) {
        context.save();
        context.translate(x * width,y * height);
        context.scale(rx * width,ry * height);
        const gradient = context.createRadialGradient(0,0,0,0,0,1);
        for (let stop = 0; stop <= 64; stop++) {
          const distance = stop / 64;
          const alpha = Math.max(0,(Math.exp(-3.5 * distance * distance) - Math.exp(-3.5)) / (1 - Math.exp(-3.5))) * opacity * (secondaryPage ? 0.5 : 0.78) * 0.35;
          gradient.addColorStop(distance,'rgba(' + [r,g,b,alpha].join(',') + ')');
        }
        context.fillStyle = gradient;
        context.fillRect(-1,-1,2,2);
        context.restore();
      }
      // Native-resolution vertical gradients form the same smooth curve without Canvas filters.
      const [center,edge,depth,band] = shape;
      const column = Math.max(0.5,width / canvas.width);
      for (let left = 0; left < width; left += column) {
        const u = (left + column / 2) / width;
        const x = (u - center) * 2;
        const y = (edge + depth * (1 - x*x)) * height;
        const slope = -4 * depth * x * height / width;
        const extent = band * Math.sqrt(1 + slope*slope) * 8;
        const cyan = Math.exp(-Math.pow((u - 0.56) * 3.3,2));
        const color = [112 + (77-112)*cyan,79 + (160-79)*cyan,224 + (199-224)*cyan];
        const gradient = context.createLinearGradient(0,y-extent,0,y+extent);
        for (const stop of stops) gradient.addColorStop(stop.offset,'rgba(' + [...color,stop.alpha * (secondaryPage ? 0.5 : 0.78)].join(',') + ')');
        context.fillStyle = gradient;
        context.fillRect(left,Math.max(0,y-extent),column,Math.min(height,y+extent)-Math.max(0,y-extent));
      }
      context.globalCompositeOperation = 'source-over';
      const gap = width < 600 ? 26 : 22;
      for (let y = 11; y < height; y += gap) for (let x = 11; x < width; x += gap) {
        const dx = x - pointer.x * width, dy = y - pointer.y * height;
        const distance = Math.hypot(dx,dy);
        const influence = Math.pow(Math.max(0,1 - distance / cursorRadius),2) * pointer.strength;
        const push = influence * 18;
        const tint = (Math.sin(x * 12.9898 + y * 78.233) + 1) / 2;
        context.fillStyle = 'rgba(' + [96 + influence*40,118 + influence*65,143 + influence*80,0.19 + tint*0.12 + influence*0.5].join(',') + ')';
        context.beginPath();
        context.arc(x + dx / Math.max(1,distance)*push,y + dy / Math.max(1,distance)*push,0.75 + influence*0.65,0,Math.PI * 2);
        context.fill();
      }
    };
  }
  let render = gpuRenderer() || fallbackRenderer();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1, height = 1, frame = 0, previousTime = 0, phase = 0, pageActive = true;
  function paint() {
    const t = phase;
    const fields = [
      [-0.08+0.28*Math.sin(t*0.48),0.84+0.15*Math.cos(t*0.41),0.95,0.70,103,70,211,0.56],
      [1.02+0.25*Math.cos(t*0.43+0.6),0.85+0.19*Math.sin(t*0.55+0.8),1.00,0.73,111,82,216,0.48],
      [0.50+0.33*Math.sin(t*0.39+1.1),1.04+0.13*Math.cos(t*0.5),1.05,0.63,44,91,179,0.52],
      [0.50+0.29*Math.cos(t*0.57+1.2),0.84+0.18*Math.sin(t*0.46+0.4),0.85,0.52,67,141,171,0.32],
      [0.17+0.22*Math.sin(t*0.63+2.2),0.75+0.18*Math.cos(t*0.47+1.6),0.75,0.54,90,71,191,0.25]
    ];
    const followX = (pointer.x - 0.5) * pointer.strength * 0.2;
    const followY = (pointer.y - 0.6) * pointer.strength * 0.16;
    fields.forEach(field => { field[0] += followX; field[1] += followY; });
    // Blend between landscape and portrait geometry instead of squeezing a desktop curve.
    const portrait = Math.max(0,Math.min(1,(1.1 - width / height) / 0.45));
    const shape = [
      0.5 + Math.sin(t*0.31)*0.08 + followX*0.5,
      0.43 + portrait*0.16 + Math.sin(t*0.42)*0.055 + followY*0.5,
      0.34 - portrait*0.16 + Math.cos(t*0.35 + 0.5)*0.035,
      Math.max(22,Math.min(52,height*(0.045 + portrait*0.007)))
    ];
    render(fields,width,height,shape);
  }
  function resize() {
    const bounds = ambient.getBoundingClientRect();
    width = Math.max(1,bounds.width);
    height = Math.max(1,bounds.height);
    // Retina resolution, bounded for very large displays and mobile GPU memory.
    const ratio = Math.min(devicePixelRatio || 1,3,Math.sqrt(8000000 / (width * height)),4096 / Math.max(width,height));
    const pixelWidth = Math.round(width * ratio), pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    paint();
  }
  function animate(time) {
    frame = 0;
    if (document.hidden || !pageActive || reducedMotion.matches) return;
    const elapsed = previousTime ? (time - previousTime) / 1000 : 1/30;
    if (elapsed >= 1/30 - 0.001) {
      previousTime = time;
      const delta = Math.min(elapsed,0.1);
      phase += delta;
      const ease = 1 - Math.exp(-delta * 6);
      pointer.x += (pointer.targetX - pointer.x) * ease;
      pointer.y += (pointer.targetY - pointer.y) * ease;
      pointer.strength += (pointer.targetStrength - pointer.strength) * ease;
      paint();
    }
    frame = requestAnimationFrame(animate);
  }
  function updatePlayback() {
    cancelAnimationFrame(frame);
    previousTime = 0;
    if (reducedMotion.matches) {
      resetPointer();
      pointer.x = 0.5; pointer.y = 0.6; pointer.strength = 0;
      phase = 0; paint();
    }
    else if (!document.hidden && pageActive) frame = requestAnimationFrame(animate);
  }
  function resetPointer() {
    pointer.targetX = 0.5;
    pointer.targetY = 0.6;
    pointer.targetStrength = 0;
  }
  function heroVisible() {
    return hero && hero.getBoundingClientRect().bottom > innerHeight * 0.25;
  }
  if (hero) {
    window.addEventListener('pointermove',event => {
      if (event.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches || !heroVisible()) return;
      const bounds = ambient.getBoundingClientRect();
      pointer.targetX = Math.max(0,Math.min(1,(event.clientX - bounds.left) / width));
      pointer.targetY = Math.max(0,Math.min(1,(event.clientY - bounds.top) / height));
      pointer.targetStrength = 1;
    },{ passive:true });
    document.documentElement.addEventListener('pointerleave',resetPointer);
    window.addEventListener('blur',resetPointer);
    window.addEventListener('scroll',() => { if (!heroVisible()) resetPointer(); },{ passive:true });
    finePointer.addEventListener('change',resetPointer);
  }
  canvas.addEventListener('webglcontextlost',event => {
    event.preventDefault();
    render = fallbackRenderer();
    resize();
  });
  document.addEventListener('visibilitychange',updatePlayback);
  reducedMotion.addEventListener('change',updatePlayback);
  window.addEventListener('pagehide',() => { pageActive = false; updatePlayback(); });
  window.addEventListener('pageshow',() => { pageActive = true; updatePlayback(); });
  window.addEventListener('resize',resize,{ passive:true });
  window.visualViewport?.addEventListener('resize',resize,{ passive:true });
  window.addEventListener('orientationchange',resize,{ passive:true });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(ambient);
  resize();
  updatePlayback();
})();
