// Scale bounded, native HTML design specimens; body copy stays in responsive flow.
(() => {
  const specimens=document.querySelectorAll('.source-component');
  const size=el=>el.style.setProperty('--source-scale',el.clientWidth/Number(el.style.getPropertyValue('--source-width')));
  specimens.forEach(size);
  if('ResizeObserver' in window){const observer=new ResizeObserver(entries=>entries.forEach(({target})=>size(target)));specimens.forEach(el=>observer.observe(el));}
  else window.addEventListener('resize',()=>specimens.forEach(size));
})();
