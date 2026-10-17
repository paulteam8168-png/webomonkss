(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const config = window.WEBOMONKS_CONFIG || {};
  const hero = $('.hero');
  const canvas = $('#hero-canvas');
  const orbWrap = $('#orb-wrap');
  const header = $('#header');
  const progressBar = $('#progress-bar');

  // Fixed header and progress bar.
  let scrollTicking = false;
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      progressBar.style.transform = `scaleX(${Math.min(1, scrollY / maxScroll)})`;
      header.classList.toggle('scrolled', scrollY > 30);
      if (hero) hero.style.setProperty('--scroll-shift', `${Math.min(scrollY * 0.12, 140)}px`);
      scrollTicking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu.
  const menuBtn = $('#menu-toggle');
  const nav = $('#main-nav');
  function closeMenu() { menuBtn.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.setAttribute('aria-label', 'Open menu'); nav.classList.remove('open'); }
  menuBtn.addEventListener('click', () => {
    const willOpen = !nav.classList.contains('open');
    nav.classList.toggle('open', willOpen);
    menuBtn.classList.toggle('open', willOpen);
    menuBtn.setAttribute('aria-expanded', String(willOpen));
    menuBtn.setAttribute('aria-label', willOpen ? 'Close menu' : 'Open menu');
  });
  $$('#main-nav a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  // Entry transitions.
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      }
    }, { threshold: 0.10, rootMargin: '0px 0px -32px 0px' });
    $$('.reveal').forEach(el => observer.observe(el));
  } else { $$('.reveal').forEach(el => el.classList.add('visible')); }

  // Cursor-following ambient purple glow, desktop only.
  const cursorGlow = $('.cursor-glow');
  if (matchMedia('(hover: hover) and (pointer: fine)').matches && !prefersReducedMotion) {
    window.addEventListener('pointermove', e => {
      cursorGlow.style.setProperty('--cursor-x', `${e.clientX}px`);
      cursorGlow.style.setProperty('--cursor-y', `${e.clientY}px`);
    }, { passive: true });
  } else { cursorGlow.style.display = 'none'; }

  // Canvas 2D fallback, using actual 3D perspective math for older/blocked WebGL devices.
  function init2dParticleOrb() {
    const ctx = canvas.getContext('2d');
    if (!ctx) { orbWrap.classList.add('no-webgl'); return; }
    const count = innerWidth < 650 ? 1450 : 2550;
    const points = [];
    const golden = Math.PI * (3-Math.sqrt(5));
    for (let i=0;i<count;i++) {
      const y = 1-2*(i+.5)/count, r=Math.sqrt(1-y*y), a=i*golden;
      const rad=1+.075*Math.sin(a*2.7+y*9);
      points.push({x:Math.cos(a)*r*rad,y:y*rad,z:Math.sin(a)*r*rad,seed:(Math.sin(i*12.17)*43758.5453)%1});
    }
    let yaw=-.2, pitch=-.13, targetYaw=-.2,targetPitch=-.13;
    let down=false, lastX=0,lastY=0, inView=true;
    orbWrap.addEventListener('pointerdown',e=>{down=true;lastX=e.clientX;lastY=e.clientY;orbWrap.classList.add('dragging');if(orbWrap.setPointerCapture) orbWrap.setPointerCapture(e.pointerId);});
    orbWrap.addEventListener('pointermove',e=>{if(!down)return;targetYaw+=(e.clientX-lastX)*.007;targetPitch+=(e.clientY-lastY)*.006;lastX=e.clientX;lastY=e.clientY;});
    const stop=()=>{down=false;orbWrap.classList.remove('dragging');};
    orbWrap.addEventListener('pointerup',stop);orbWrap.addEventListener('pointercancel',stop);
    if ('IntersectionObserver' in window) new IntersectionObserver(e=>inView=e[0].isIntersecting).observe(hero);
    let prev=0;
    function draw(now) {
      requestAnimationFrame(draw);
      if(!inView||document.hidden||now-prev < (prefersReducedMotion?180:33)) return;
      prev=now;
      const dpr=Math.min(devicePixelRatio||1,2), rect=canvas.getBoundingClientRect();
      const w=Math.round(rect.width*dpr), h=Math.round(rect.height*dpr);
      if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
      ctx.clearRect(0,0,w,h);
      if(!down&&!prefersReducedMotion)targetYaw+=.003;
      yaw+=(targetYaw-yaw)*.07;pitch+=(targetPitch-pitch)*.07;
      const cy=Math.cos(yaw),sy=Math.sin(yaw),cx=Math.cos(pitch),sx=Math.sin(pitch);
      const scale=Math.min(w,h)*.42;
      for(const pt of points) {
        const x=cy*pt.x+sy*pt.z,z=-sy*pt.x+cy*pt.z;
        const y=cx*pt.y-sx*z, zz=sx*pt.y+cx*z;
        const perspective=3.5/(4.6-zz);
        const screenX=w/2+x*perspective*scale;
        const screenY=h/2+y*perspective*scale;
        const alpha=Math.max(.22,Math.min(.95,.58+.23*zz));
        const radius=(.8+Math.abs(pt.seed)*1.0)*dpr*(1.1+.19*zz);
        ctx.fillStyle=`rgba(${Math.round(176+zz*20)},${Math.round(145+zz*22)},255,${alpha})`;
        ctx.beginPath();ctx.arc(screenX,screenY,radius,0,Math.PI*2);ctx.fill();
      }
    }
    requestAnimationFrame(draw);
  }

  // Physically 3D particle mesh, rendered with WebGL: no library or network dependencies.
  function initParticleOrb() {
    let gl;
    try { gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false }); } catch (_) {}
    if (!gl) { init2dParticleOrb(); return; }
    const vs = `
      attribute vec3 aPosition;
      attribute float aSeed;
      uniform float uTime;
      uniform float uYaw;
      uniform float uPitch;
      uniform float uAspect;
      uniform float uDpr;
      uniform float uScale;
      varying float vAlpha;
      varying float vHue;
      void main() {
        vec3 p = aPosition;
        float distortion = 1.0 + 0.038 * sin(7.0*p.y + uTime*0.7 + 12.0*aSeed)
                                 + 0.022 * cos(9.0*p.x - uTime*0.36);
        p *= distortion;
        float cy = cos(uYaw), sy = sin(uYaw);
        p = vec3(cy*p.x + sy*p.z, p.y, -sy*p.x + cy*p.z);
        float cx = cos(uPitch), sx = sin(uPitch);
        p = vec3(p.x, cx*p.y - sx*p.z, sx*p.y + cx*p.z);
        float perspective = 3.5 / (4.6 - p.z);
        gl_Position = vec4(p.x * perspective * uScale / uAspect,
                           p.y * perspective * uScale, 0.0, 1.0);
        gl_PointSize = uDpr * (0.8 + aSeed*1.8) * (1.2 + (p.z+1.6)*0.22);
        vAlpha = 0.34 + aSeed*0.54 + 0.13*p.z;
        vHue = 0.5 + 0.5*sin(aSeed*8.0 + p.y*2.1 + uTime*0.38);
      }
    `;
    const fs = `
      precision mediump float;
      varying float vAlpha;
      varying float vHue;
      void main() {
        float d = length(gl_PointCoord - vec2(.5));
        float core = 1.0 - smoothstep(.08, .42, d);
        float halo = (1.0 - smoothstep(.13, .5, d)) * .3;
        vec3 lavender = vec3(.63, .49, 1.0);
        vec3 ice = vec3(.86, .81, 1.0);
        vec3 c = mix(lavender, ice, vHue);
        gl_FragColor = vec4(c, (core + halo) * vAlpha);
      }
    `;
    function compile(type, code) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, code); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      return shader;
    }
    let program;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vs));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    } catch (err) { console.warn('WebGL particle orb unavailable', err); init2dParticleOrb(); return; }
    gl.useProgram(program);
    const count = innerWidth < 650 ? 3400 : 5700;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    // Golden-angle sampling gives an evenly distributed three-dimensional sphere.
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - 2 * (i + .5) / count;
      const r = Math.sqrt(1 - y*y);
      const theta = goldenAngle*i;
      const wave = 1 + 0.09*Math.sin(theta*2.7 + y*9) + 0.035*Math.cos(y*24 + i*.03);
      positions[i*3] = Math.cos(theta)*r*wave;
      positions[i*3+1] = y*wave;
      positions[i*3+2] = Math.sin(theta)*r*wave;
      seeds[i] = (Math.sin(i*192.341) * 43758.5453) % 1;
      if (seeds[i] < 0) seeds[i] += 1;
    }
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition); gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    const seedBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer); gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
    const aSeed = gl.getAttribLocation(program, 'aSeed');
    gl.enableVertexAttribArray(aSeed); gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 0, 0);
    const uniforms = {};
    for (const key of ['uTime','uYaw','uPitch','uAspect','uDpr','uScale']) uniforms[key] = gl.getUniformLocation(program, key);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.disable(gl.DEPTH_TEST);
    let width = 0, height = 0;
    let yaw = -.22, pitch = -.13, targetYaw = -.22, targetPitch = -.13;
    let drag = false, lastX = 0, lastY = 0, pointerDriftX = 0, pointerDriftY = 0;
    let inView = true;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      width = Math.round(rect.width * dpr); height = Math.round(rect.height * dpr);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height); }
    }
    const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas);
    window.addEventListener('resize', resize, { passive: true });
    resize();
    orbWrap.addEventListener('pointerdown', e => {
      drag = true; lastX = e.clientX; lastY = e.clientY;
      orbWrap.classList.add('dragging');
      if (orbWrap.setPointerCapture) orbWrap.setPointerCapture(e.pointerId);
    });
    orbWrap.addEventListener('pointermove', e => {
      if (!drag) return;
      targetYaw += (e.clientX - lastX) * .007;
      targetPitch += (e.clientY - lastY) * .006;
      targetPitch = Math.max(-1.2, Math.min(1.2, targetPitch));
      lastX = e.clientX; lastY = e.clientY;
    });
    const stopDrag = () => { drag = false; orbWrap.classList.remove('dragging'); };
    orbWrap.addEventListener('pointerup', stopDrag); orbWrap.addEventListener('pointercancel', stopDrag);
    window.addEventListener('pointermove', e => {
      if (drag) return;
      pointerDriftX = (e.clientX / innerWidth - .5) * .3;
      pointerDriftY = (e.clientY / innerHeight - .5) * .2;
    }, { passive: true });
    if ('IntersectionObserver' in window) new IntersectionObserver(e => inView = e[0].isIntersecting, { threshold: 0 }).observe(hero);
    let start = performance.now(), previousFrame = 0;
    function render(now) {
      requestAnimationFrame(render);
      if (!inView || document.hidden || width === 0 || height === 0) return;
      if (prefersReducedMotion && now - previousFrame < 180) return;
      previousFrame = now;
      resize();
      const time = (now-start)/1000;
      if (!drag && !prefersReducedMotion) targetYaw += .00165;
      yaw += (targetYaw+pointerDriftX - yaw)*.042;
      pitch += (targetPitch+pointerDriftY - pitch)*.042;
      gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uniforms.uTime, time);
      gl.uniform1f(uniforms.uYaw, yaw);
      gl.uniform1f(uniforms.uPitch, pitch);
      gl.uniform1f(uniforms.uAspect, canvas.width/canvas.height);
      gl.uniform1f(uniforms.uDpr, Math.min(devicePixelRatio||1,2));
      gl.uniform1f(uniforms.uScale, 1.45);
      gl.drawArrays(gl.POINTS,0,count);
    }
    requestAnimationFrame(render);
  }
  initParticleOrb();

  // Card tilt and interactive service modal.
  const services = {
    meta: { no:'01 /', title:'Meta Ads', intro:'Create thumb-stopping campaigns for Facebook and Instagram, optimized around the actions your business cares about.', features:['Audience and competitor research','Full-funnel campaign planning','Ad creative and copy direction','Conversion tracking and pixel setup','Testing, reporting and optimization'] },
    google: { no:'02 /', title:'Google Ads', intro:'Capture existing demand and bring your brand to customers at the exact moment they are ready to discover you.', features:['Search and display campaign setup','Keyword and search intent research','Landing-page recommendations','Conversion tracking and analytics','Bid, budget and performance optimization'] },
    seo: { no:'03 /', title:'SEO & Search', intro:'Build visibility that compounds with a stronger technical foundation, relevant content and search-first strategy.', features:['Technical website SEO audit','On-page SEO and internal linking','Keyword strategy and content roadmap','Local SEO and Google Business Profile','Search reporting and ongoing improvements'] },
    digital: { no:'04 /', title:'Digital Strategy', intro:'Connect your brand, messaging, customer journey and media mix in one thoughtful digital growth system.', features:['Market and audience discovery','Brand positioning and messaging','Multi-channel marketing roadmap','Content and creative strategy','Measurement and growth experiments'] }
  };
  const dialog = $('#service-dialog');
  const dialogCta = $('#dialog-cta');
  let lastFocused = null;
  function openService(key) {
    const data = services[key]; if (!data) return;
    lastFocused = document.activeElement;
    $('#dialog-number').textContent = data.no;
    $('#dialog-title').textContent = data.title;
    $('#dialog-description').textContent = data.intro;
    const list = $('#dialog-features'); list.replaceChildren();
    data.features.forEach(item => { const li = document.createElement('li'); li.textContent = item; list.appendChild(li); });
    dialogCta.dataset.service = data.title;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('dialog-open');
  }
  function closeDialog() { if (dialog.open) dialog.close(); document.body.classList.remove('dialog-open'); lastFocused?.focus(); }
  $$('.service-card').forEach(card => {
    card.addEventListener('click', () => openService(card.dataset.service));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') {e.preventDefault();openService(card.dataset.service);} });
    if (matchMedia('(hover: hover) and (pointer: fine)').matches && !prefersReducedMotion) {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(); const px = (e.clientX-r.left)/r.width-.5; const py = (e.clientY-r.top)/r.height-.5;
        card.style.setProperty('--rotX',`${(-py*4).toFixed(2)}deg`);
        card.style.setProperty('--rotY',`${(px*5).toFixed(2)}deg`);
        card.style.setProperty('--shineX',`${(px+.5)*100}%`);
        card.style.setProperty('--shineY',`${(py+.5)*100}%`);
      });
      card.addEventListener('pointerleave', () => {card.style.setProperty('--rotX','0deg');card.style.setProperty('--rotY','0deg');});
    }
  });
  $('#dialog-close').addEventListener('click', closeDialog);
  dialog.addEventListener('click', e => { if (e.target === dialog) closeDialog(); });
  dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  dialogCta.addEventListener('click', () => { const choice = dialogCta.dataset.service; closeDialog(); const select = $('#contact-form select[name="service"]'); select.value = choice; });

  // Contact: direct POST to optional configured provider, otherwise a pre-filled email draft.
  const contactForm = $('#contact-form');
  const status = $('#form-status');
  const email = config.contactEmail || '';
  if (email) { const link = $('#email-link'); link.href = `mailto:${email}`; link.firstChild.textContent = `${email} `; }
  $('#year').textContent = new Date().getFullYear();
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    status.className = 'form-status'; status.textContent = '';
    if (!contactForm.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(contactForm).entries());
    const button = $('.form-submit',contactForm);
    if (config.formEndpoint) {
      button.disabled = true; button.classList.add('submitting');
      try {
        const response = await fetch(config.formEndpoint, {
          method: 'POST', headers: {'Accept':'application/json','Content-Type':'application/json'},
          body: JSON.stringify({name:fields.name,email:fields.email,service:fields.service,message:fields.message})
        });
        if (!response.ok) throw Error('Request failed');
        status.classList.add('success');
        status.textContent = 'Thanks! Your enquiry has been sent. We look forward to speaking with you.';
        contactForm.reset();
      } catch (_) {
        status.classList.add('error');
        status.textContent = 'Unable to send right now. Please try the email link on the left.';
      } finally { button.disabled = false; button.classList.remove('submitting'); }
    } else {
      if (!email) { status.classList.add('error'); status.textContent = 'Please configure a contact email in config.js before using this form.'; return; }
      const subject = `WEBOMONKS enquiry — ${fields.service}`;
      const body = `Name: ${fields.name}\nEmail: ${fields.email}\nService: ${fields.service}\n\nProject details:\n${fields.message}`;
      status.classList.add('success');
      status.textContent = 'Your email app should open with a prepared enquiry. Press Send there to finish.';
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  });
})();
