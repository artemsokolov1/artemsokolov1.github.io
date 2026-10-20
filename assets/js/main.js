/* =========================================================
   Артём Соколов — визитка. Скрипты без зависимостей.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- Тема ---------- */
  var KEY = 'as-theme';
  var toggle = document.getElementById('themeToggle');
  var themes = ['light', 'dark'];
  var themeNames = { light: 'Светлая', dark: 'Тёмная' };
  var themeColors = { light: '#f3f3f1', dark: '#0f0f11' };

  function applyTheme(theme) {
    if (themes.indexOf(theme) === -1) theme = 'light';
    root.setAttribute('data-theme', theme);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', themeColors[theme]);
    if (toggle) {
      var next = themes[(themes.indexOf(theme) + 1) % themes.length];
      var label = 'Тема: ' + themeNames[theme] + '. Переключить на «' + themeNames[next] + '»';
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }
  }

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (themes.indexOf(saved) !== -1) {
    applyTheme(saved);
  } else {
    if (saved !== null) {
      try { localStorage.removeItem(KEY); } catch (e) {}
    }
    applyTheme(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var index = themes.indexOf(root.getAttribute('data-theme'));
      var next = themes[(index + 1) % themes.length];
      applyTheme(next);
      try { localStorage.setItem(KEY, next); } catch (e) {}
    });
  }

  /* ---------- Фото: жидкий WebGL-эффект под курсором ----------
     Картинка видна сразу; эффект — тонкий слой поверх, включается после загрузки. */
  (function () {
    var box = document.getElementById('photo');
    var img = box && box.querySelector('.photo__img');
    if (!box || !img) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var target = { x: .5, y: .5 }, mouse = { x: .5, y: .5 }, power = 0, powerTarget = 0, raf = 0;

    function move(e) {
      var r = box.getBoundingClientRect();
      target.x = (e.clientX - r.left) / r.width;
      target.y = (e.clientY - r.top) / r.height;
      powerTarget = 1;
      box.style.setProperty('--ry', ((target.x - .5) * 10).toFixed(2) + 'deg');
      box.style.setProperty('--rx', ((.5 - target.y) * 10).toFixed(2) + 'deg');
      kick();
    }
    function leave() {
      powerTarget = 0;
      box.style.setProperty('--rx', '0deg'); box.style.setProperty('--ry', '0deg');
      kick();
    }
    box.addEventListener('pointermove', move);
    box.addEventListener('pointerleave', leave);
    box.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') leave(); });

    function start() {
      var canvas = document.createElement('canvas');
      var g = canvas.getContext('webgl', { premultipliedAlpha: false, antialias: false });
      if (!g) return;
      var vs = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;v.y=1.-v.y;gl_Position=vec4(p,0.,1.);}';
      var fs = 'precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 m;uniform float k,time,ia,ba;' +
        'vec2 cover(vec2 u){float s=ia/ba;vec2 o=vec2(.58,.22);if(s>1.){u.x=(u.x-o.x)/s+o.x;}else{u.y=(u.y-o.y)*s+o.y;}return u;}' +
        'void main(){vec2 d=v-m;float r=length(d*vec2(1.,1.25));float f=smoothstep(.38,0.,r)*k;' +
        'vec2 w=vec2(sin(v.y*22.+time*2.2),cos(v.x*22.+time*2.))*.012*f;vec2 u=v+w-d*.08*f;' +
        'float s=.006*f;gl_FragColor=vec4(texture2D(t,cover(u+vec2(s,0.))).r,texture2D(t,cover(u)).g,texture2D(t,cover(u-vec2(s,0.))).b,1.);}';
      function sh(type, src) { var s = g.createShader(type); g.shaderSource(s, src); g.compileShader(s); return s; }
      var pr = g.createProgram();
      g.attachShader(pr, sh(g.VERTEX_SHADER, vs)); g.attachShader(pr, sh(g.FRAGMENT_SHADER, fs)); g.linkProgram(pr);
      if (!g.getProgramParameter(pr, g.LINK_STATUS)) return;
      g.useProgram(pr);
      g.bindBuffer(g.ARRAY_BUFFER, g.createBuffer());
      g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), g.STATIC_DRAW);
      var loc = g.getAttribLocation(pr, 'p'); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
      var tex = g.createTexture(); g.bindTexture(g.TEXTURE_2D, tex);
      [g.TEXTURE_WRAP_S, g.TEXTURE_WRAP_T].forEach(function (p) { g.texParameteri(g.TEXTURE_2D, p, g.CLAMP_TO_EDGE); });
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
      try { g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, img); } catch (e) { return; }
      var U = {}; ['m','k','time','ia','ba'].forEach(function (n) { U[n] = g.getUniformLocation(pr, n); });
      g.uniform1f(U.ia, img.naturalWidth / img.naturalHeight);
      box.appendChild(canvas);

      function size() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(box.clientWidth * dpr); canvas.height = Math.round(box.clientHeight * dpr);
        g.viewport(0, 0, canvas.width, canvas.height);
        g.uniform1f(U.ba, box.clientWidth / box.clientHeight);
      }
      size(); window.addEventListener('resize', function () { size(); kick(); });

      var t0 = performance.now();
      function frame(now) {
        mouse.x += (target.x - mouse.x) * .12; mouse.y += (target.y - mouse.y) * .12;
        power += (powerTarget - power) * .08;
        g.uniform2f(U.m, mouse.x, mouse.y); g.uniform1f(U.k, power); g.uniform1f(U.time, (now - t0) / 1000);
        g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
        raf = (powerTarget > 0 || power > .002) ? requestAnimationFrame(frame) : 0;
      }
      kick = function () { if (!raf) raf = requestAnimationFrame(frame); };
      requestAnimationFrame(function (now) { frame(now); box.classList.add('is-gl'); });
    }
    var kick = function () {};
    function ready() { (window.requestIdleCallback || setTimeout)(start); }
    if (img.complete && img.naturalWidth) ready(); else img.addEventListener('load', ready);
  })();


  /* ---------- Эффекты: появление блоков и наклон карточек ---------- */
  (function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if ('IntersectionObserver' in window) {
      var items = document.querySelectorAll('.section__head, .tile, .donate');
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -40px 0px' });
      items.forEach(function (n) {
        var r = n.getBoundingClientRect();
        if (r.top < window.innerHeight) return; // то, что видно сразу, не прячем
        if (n.classList.contains('tile')) {
          var i = Array.prototype.indexOf.call(n.parentNode.children, n);
          n.style.setProperty('--d', (i % 3) * 0.08 + 's');
        }
        n.classList.add('js-reveal');
        io.observe(n);
      });
    }

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    document.querySelectorAll('.tile__shot').forEach(function (shot) {
      shot.addEventListener('pointermove', function (e) {
        var r = shot.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        shot.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        shot.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        shot.style.setProperty('--ry', ((x - .5) * 8).toFixed(2) + 'deg');
        shot.style.setProperty('--rx', ((.5 - y) * 8).toFixed(2) + 'deg');
        shot.classList.add('is-hover');
      });
      shot.addEventListener('pointerleave', function () {
        shot.style.setProperty('--rx', '0deg'); shot.style.setProperty('--ry', '0deg');
        shot.classList.remove('is-hover');
      });
    });
  })();

  /* ---------- Копирование кошелька ---------- */
  var copyBtn = document.getElementById('copyBtn');
  var status = document.getElementById('copyStatus');

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return ok;
  }

  function showCopied(ok) {
    if (status) status.textContent = ok ? 'Адрес скопирован' : 'Не вышло — выделите адрес вручную';
    if (!copyBtn) return;
    copyBtn.textContent = ok ? 'Скопировано' : 'Скопировать адрес';
    copyBtn.classList.toggle('is-done', ok);
    setTimeout(function () {
      copyBtn.textContent = 'Скопировать адрес';
      copyBtn.classList.remove('is-done');
      if (status) status.textContent = '';
    }, 2400);
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var text = copyBtn.getAttribute('data-copy') || '';
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(
          function () { showCopied(true); },
          function () { showCopied(fallbackCopy(text)); }
        );
      } else {
        showCopied(fallbackCopy(text));
      }
    });
  }

  /* ---------- Год ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
