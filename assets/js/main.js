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
      try { localStorage.setItem(KEY, next); } catch (e) {}
      var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!document.startViewTransition || calm) { applyTheme(next); return; }
      // Новая тема растекается кругом от кнопки
      var r = toggle.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      var vt = document.startViewTransition(function () { applyTheme(next); });
      vt.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 650, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }
        );
      });
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


  /* ---------- Имя появляется по буквам ---------- */
  (function () {
    var h1 = document.querySelector('.hero h1');
    if (!h1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var text = h1.textContent;
    h1.setAttribute('aria-label', text);
    h1.textContent = '';
    var i = 0;
    text.split(' ').forEach(function (word, w) {
      if (w) h1.appendChild(document.createTextNode(' '));
      var wrap = document.createElement('span');
      wrap.className = 'word'; wrap.setAttribute('aria-hidden', 'true');
      word.split('').forEach(function (ch) {
        var s = document.createElement('span');
        s.className = 'char'; s.textContent = ch;
        s.style.animationDelay = (0.15 + i++ * 0.035) + 's';
        wrap.appendChild(s);
      });
      h1.appendChild(wrap);
    });
    h1.classList.add('is-split');
  })();

  /* ---------- Магнитные кнопки ---------- */
  (function () {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('.nav__tg, .theme, .nav__links a, .tile__tag, .copy').forEach(function (el) {
      el.classList.add('magnet');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + (dx * .3).toFixed(1) + 'px,' + (dy * .4).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  })();

  /* ---------- Плавная прокрутка с инерцией (только колесо мыши) ---------- */
  (function () {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.style.scrollBehavior = 'auto';
    var target = window.scrollY, current = target, running = false;
    function max() { return document.documentElement.scrollHeight - innerHeight; }
    function loop() {
      current += (target - current) * 0.1;
      if (Math.abs(target - current) < 0.5) current = target;
      window.scrollTo(0, current);
      running = current !== target;
      if (running) requestAnimationFrame(loop);
    }
    function go(y) {
      target = Math.max(0, Math.min(max(), y));
      if (!running) { current = window.scrollY; running = true; requestAnimationFrame(loop); }
    }
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.defaultPrevented || document.body.classList.contains('game-open')) return;
      e.preventDefault();
      var d = e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1);
      go((running ? target : window.scrollY) + d);
    }, { passive: false });
    // Клавиатура и полоса прокрутки — синхронизируемся
    window.addEventListener('scroll', function () { if (!running) target = current = window.scrollY; }, { passive: true });
    // Якорные ссылки — тоже плавно
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      go(el.getBoundingClientRect().top + window.scrollY - 24);
      history.replaceState(null, '', a.getAttribute('href'));
    });
  })();

  /* ---------- Пасхалка: тройной клик по фото — мини-игра «Чеканка» ---------- */
  (function () {
    var photo = document.getElementById('photo');
    if (!photo) return;
    var taps = [];
    photo.addEventListener('click', function () {
      var now = Date.now();
      taps = taps.filter(function (t) { return now - t < 600; });
      taps.push(now);
      if (taps.length >= 3) { taps = []; openGame(); }
    });

    function openGame() {
      if (document.querySelector('.egg')) return;
      var best = 0;
      try { best = +localStorage.getItem('as-egg-best') || 0; } catch (e) {}
      var box = document.createElement('div');
      box.className = 'egg';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-label', 'Мини-игра Чеканка');
      box.innerHTML =
        '<canvas class="egg__c"></canvas>' +
        '<div class="egg__hud"><span class="egg__score">0</span><span class="egg__best">рекорд ' + best + '</span></div>' +
        '<p class="egg__hint">Пасхалка! Не дай мячу упасть — жми по нему</p>' +
        '<button class="egg__close" type="button" aria-label="Закрыть">×</button>';
      document.body.appendChild(box);
      document.body.classList.add('game-open');
      var c = box.querySelector('canvas'), g = c.getContext('2d');
      var scoreEl = box.querySelector('.egg__score'), bestEl = box.querySelector('.egg__best'), hint = box.querySelector('.egg__hint');
      var W, H, R, dpr = Math.min(devicePixelRatio || 1, 2);
      function size() {
        W = innerWidth; H = innerHeight;
        c.width = W * dpr; c.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
        R = Math.max(34, Math.min(W, H) * .06);
      }
      size();
      addEventListener('resize', size);
      function fresh() { return { x: W / 2, y: H * .4, vx: 0, vy: 0, a: 0, va: 0 }; }
      var ball = fresh(), score = 0, started = false, raf, parts = [];
      var dark = root.getAttribute('data-theme') === 'dark';

      function kick(px, py) {
        var dx = px - ball.x, dy = py - ball.y;
        if (dx * dx + dy * dy > (R * 1.6) * (R * 1.6)) return;
        started = true; hint.style.opacity = 0;
        ball.vy = -Math.min(17, 12 + score * .15);
        ball.vx = -dx * .22 + (Math.random() - .5) * 3;
        ball.va = -dx * .01;
        score++; scoreEl.textContent = score;
        for (var i = 0; i < 10; i++) parts.push({ x: px, y: py, vx: (Math.random() - .5) * 8, vy: (Math.random() - .8) * 7, l: 1 });
      }
      c.addEventListener('pointerdown', function (e) { kick(e.clientX, e.clientY); });

      function drawBall() {
        g.save(); g.translate(ball.x, ball.y); g.rotate(ball.a);
        g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
        g.lineWidth = 2; g.strokeStyle = '#111'; g.stroke();
        g.fillStyle = '#111';
        for (var k = 0; k < 6; k++) {
          var ang = k * Math.PI / 3, rr = k ? R * .72 : 0;
          var cx = Math.cos(ang) * rr, cy = Math.sin(ang) * rr, s = R * (k ? .22 : .3);
          g.beginPath();
          for (var p = 0; p < 5; p++) {
            var t = p * Math.PI * 2 / 5 - Math.PI / 2;
            if (p) g.lineTo(cx + Math.cos(t) * s, cy + Math.sin(t) * s); else g.moveTo(cx + Math.cos(t) * s, cy + Math.sin(t) * s);
          }
          g.closePath(); g.fill();
        }
        g.restore();
      }

      function frame() {
        if (started) {
          ball.vy += .45; ball.x += ball.vx; ball.y += ball.vy; ball.a += ball.va;
          if (ball.x < R) { ball.x = R; ball.vx *= -.8; }
          if (ball.x > W - R) { ball.x = W - R; ball.vx *= -.8; }
          if (ball.y - R > H) {
            if (score > best) { best = score; try { localStorage.setItem('as-egg-best', best); } catch (e) {} }
            bestEl.textContent = 'рекорд ' + best;
            hint.textContent = 'Упал! Счёт: ' + score + '. Жми по мячу ещё раз';
            hint.style.opacity = 1;
            score = 0; scoreEl.textContent = 0; started = false;
            ball = fresh();
          }
        } else {
          ball.y = H * .4 + Math.sin(Date.now() / 300) * 8;
        }
        g.clearRect(0, 0, W, H);
        var sh = Math.max(.3, 1 - (H - 40 - ball.y) / H);
        g.fillStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)';
        g.beginPath(); g.ellipse(ball.x, H - 40, R * sh, R * .25 * sh, 0, 0, Math.PI * 2); g.fill();
        parts = parts.filter(function (p) { return p.l > 0; });
        parts.forEach(function (p) {
          p.x += p.vx; p.y += p.vy; p.vy += .3; p.l -= .04;
          g.globalAlpha = Math.max(0, p.l); g.fillStyle = '#3a3af0'; g.fillRect(p.x, p.y, 4, 4);
        });
        g.globalAlpha = 1;
        drawBall();
        raf = requestAnimationFrame(frame);
      }
      frame();

      function onKey(e) { if (e.key === 'Escape') close(); }
      function close() {
        cancelAnimationFrame(raf);
        removeEventListener('resize', size);
        removeEventListener('keydown', onKey);
        box.remove();
        document.body.classList.remove('game-open');
      }
      addEventListener('keydown', onKey);
      var closeBtn = box.querySelector('.egg__close');
      closeBtn.addEventListener('click', close);
      closeBtn.focus();
    }
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
