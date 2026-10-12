/* =========================================================
   Артём Соколов — визитка. Скрипты без зависимостей.
   ========================================================= */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- Тема ---------- */
  var KEY = 'as-theme';
  var toggle = document.getElementById('themeToggle');
  var themes = ['light', 'dark', 'money'];
  var themeNames = { light: 'Светлая', dark: 'Тёмная', money: 'Денежная' };
  var themeColors = { light: '#f3f3f1', dark: '#0f0f11', money: '#081c15' };
  var regularFaces = document.querySelectorAll('.hero__face--regular');
  var moneyFaces = document.querySelectorAll('.hero__face--money');
  var moneyAnimation = document.querySelector('.hero__face--animation');
  var moneyStill = document.querySelector('.hero__face--money-still');
  var animationReady = false;
  var portraitVisible = true;
  var motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  var moneyEffects = createMoneyEffects();

  function syncMoneyPortrait() {
    if (!moneyAnimation) return;
    var animated = animationReady && portraitVisible && root.getAttribute('data-theme') === 'money' && !motionPreference.matches && !document.hidden;
    moneyAnimation.hidden = !animated;
    if (moneyStill) moneyStill.hidden = root.getAttribute('data-theme') !== 'money' || animated;
  }

  function prepareMoneyPortrait() {
    if (!moneyAnimation || !moneyAnimation.complete || !moneyAnimation.naturalWidth) return;
    var decode = moneyAnimation.decode ? moneyAnimation.decode() : Promise.resolve();
    decode.then(function () {
      animationReady = true;
      syncMoneyPortrait();
    }, function () {});
  }

  if (moneyAnimation) {
    moneyAnimation.addEventListener('load', prepareMoneyPortrait);
    prepareMoneyPortrait();
  }
  var observedPortrait = document.getElementById('portrait');
  if (observedPortrait && window.IntersectionObserver) {
    var portraitObserver = new IntersectionObserver(function (entries) {
      portraitVisible = entries[0].isIntersecting;
      syncMoneyPortrait();
    });
    portraitObserver.observe(observedPortrait);
  }

  motionPreference.addEventListener('change', syncMoneyPortrait);
  document.addEventListener('visibilitychange', syncMoneyPortrait);

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
    regularFaces.forEach(function (face) { face.hidden = theme === 'money'; });
    moneyFaces.forEach(function (face) { face.hidden = theme !== 'money'; });
    syncMoneyPortrait();
    moneyEffects.setEnabled(theme === 'money');
  }

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (themes.indexOf(saved) !== -1) {
    applyTheme(saved);
  } else {
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

  /* ---------- Вращающийся плоский портрет ---------- */
  var portrait = document.getElementById('portrait');
  var rotor = document.getElementById('portraitRotor');
  var reset = document.getElementById('portraitReset');
  var yaw = 0;
  var pitch = 0;
  var drag = null;

  function renderPortrait() {
    rotor.style.transform = 'rotateX(' + pitch + 'deg) rotateY(' + yaw + 'deg)';
    var angle = Math.round(((yaw + 180) % 360 + 360) % 360 - 180);
    var verticalAngle = ((pitch + 180) % 360 + 360) % 360 - 180;
    var front = Math.cos(angle * Math.PI / 180) * Math.cos(verticalAngle * Math.PI / 180) >= 0;
    var side = front ? 'Лицевая сторона' : 'Обратная сторона';
    portrait.setAttribute('aria-valuenow', String(angle));
    portrait.setAttribute('aria-valuetext', side + ', ' + angle + ' градусов, наклон ' + Math.round(pitch) + ' градусов');
  }

  function resetPortrait() {
    yaw = 0;
    pitch = 0;
    renderPortrait();
  }

  if (portrait && rotor) {
    portrait.addEventListener('pointerdown', function (event) {
      if (!event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: yaw, pitch: pitch };
      portrait.setPointerCapture(event.pointerId);
      portrait.classList.add('is-dragging');
    });
    portrait.addEventListener('pointermove', function (event) {
      if (!drag || event.pointerId !== drag.id) return;
      yaw = drag.yaw + (event.clientX - drag.x) * 360 / portrait.clientWidth;
      pitch = drag.pitch - (event.clientY - drag.y) * 360 / portrait.clientHeight;
      renderPortrait();
    });
    function endDrag(event) {
      if (!drag || event.pointerId !== drag.id) return;
      drag = null;
      portrait.classList.remove('is-dragging');
      if (portrait.hasPointerCapture(event.pointerId)) portrait.releasePointerCapture(event.pointerId);
    }
    portrait.addEventListener('pointerup', endDrag);
    portrait.addEventListener('pointercancel', endDrag);
    portrait.addEventListener('lostpointercapture', endDrag);
    portrait.addEventListener('dblclick', resetPortrait);
    portrait.addEventListener('keydown', function (event) {
      var step = event.shiftKey ? 45 : 15;
      switch (event.key) {
        case 'ArrowLeft': yaw -= step; break;
        case 'ArrowRight': yaw += step; break;
        case 'ArrowUp': pitch += step; break;
        case 'ArrowDown': pitch -= step; break;
        case 'Home': resetPortrait(); break;
        case 'End': yaw = 180; pitch = 0; break;
        default: return;
      }
      event.preventDefault();
      renderPortrait();
    });
    if (reset) reset.addEventListener('click', resetPortrait);
  }

  /* ---------- Купюры: один canvas, без нагрузки на разметку ---------- */
  function createMoneyEffects() {
    var canvas = document.getElementById('moneyRain');
    var ctx = canvas && canvas.getContext('2d');
    if (!ctx) return { setEnabled: function () {} };
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var enabled = false;
    var frame = 0;
    var lastTime = 0;
    var width = 0;
    var height = 0;
    var scale = 1;
    var resizeFrame = 0;
    var headGeometry = null;
    var particles = [];
    var eyeParticles = [];
    var eyeClock = 0;
    var lastScroll = window.scrollY;
    var head = document.getElementById('portrait');
    var noteRequested = false;
    var bill = document.createElement('canvas');
    bill.width = 200;
    bill.height = 96;
    var ink = bill.getContext('2d');
    if (!ink) return { setEnabled: function () {} };
    var paper = ink.createLinearGradient(0, 0, 200, 96);
    paper.addColorStop(0, '#a7c983');
    paper.addColorStop(1, '#5b9869');
    ink.fillStyle = paper;
    ink.fillRect(0, 0, 200, 96);
    ink.strokeStyle = '#28583c';
    ink.lineWidth = 2;
    ink.strokeRect(7, 7, 186, 82);
    ink.strokeRect(12, 12, 176, 72);
    ink.beginPath();
    ink.ellipse(100, 48, 27, 34, 0, 0, Math.PI * 2);
    ink.stroke();
    ink.font = 'bold 36px Georgia, serif';
    ink.textAlign = 'center';
    ink.textBaseline = 'middle';
    ink.fillStyle = '#28583c';
    ink.fillText('$', 100, 50);
    ink.font = 'bold 16px Georgia, serif';
    ink.fillText('100', 39, 28);
    ink.fillText('100', 161, 69);
    ink.globalAlpha = .35;
    for (var line = 0; line < 5; line++) {
      ink.fillRect(24, 49 + line * 5, 28, 1);
      ink.fillRect(147, 24 + line * 5, 28, 1);
    }

    function loadBanknote() {
      if (noteRequested) return;
      noteRequested = true;
      var note = new Image();
      note.onload = function () {
        ink.globalAlpha = 1;
        ink.clearRect(0, 0, bill.width, bill.height);
        ink.drawImage(note, 0, 0, bill.width, bill.height);
        if (enabled && motion.matches) draw(0);
      };
      note.src = 'assets/img/money-bill.webp';
    }

    function makeParticle(initial) {
      return {
        x: Math.random() * width,
        y: initial ? Math.random() * height : -100,
        size: (width < 600 ? 32 : 44) + Math.random() * 32,
        speed: 100 + Math.random() * 100,
        drift: (Math.random() - .5) * 44,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - .5) * .7,
        phase: Math.random() * Math.PI * 2,
        opacity: .48 + Math.random() * .24
      };
    }

    function cacheHeadGeometry() {
      if (!head) return;
      var bounds = head.getBoundingClientRect();
      headGeometry = {
        left: bounds.left + window.scrollX,
        top: bounds.top + window.scrollY,
        width: bounds.width,
        height: bounds.height
      };
    }

    function eyeOrigins() {
      if (!headGeometry) return null;
      var yAngle = (yaw || 0) * Math.PI / 180;
      var xAngle = (pitch || 0) * Math.PI / 180;
      var cosY = Math.cos(yAngle), sinY = Math.sin(yAngle);
      var cosX = Math.cos(xAngle), sinX = Math.sin(xAngle);
      // Stop emitting when the silhouette is facing the viewer or the face is edge-on.
      if (cosY * cosX < .2) return null;
      var top = headGeometry.top - window.scrollY;
      if (top + headGeometry.height < 0 || top > window.innerHeight) return null;
      // Project the eye centers through the same rotations and perspective as the portrait.
      return [.31, .69].map(function (position) {
        var x = (position - .5) * headGeometry.width;
        var y = (.41 - .5) * headGeometry.height;
        var rotatedX = x * cosY + .5 * sinY;
        var rotatedZ = -x * sinY + .5 * cosY;
        var rotatedY = y * cosX - rotatedZ * sinX;
        var depth = y * sinX + rotatedZ * cosX;
        var perspective = 850 / (850 - depth);
        return {
          x: headGeometry.left - window.scrollX + headGeometry.width / 2 + rotatedX * perspective,
          y: top + headGeometry.height / 2 + rotatedY * perspective
        };
      });
    }

    function emitFromEyes(origins) {
      if (eyeParticles.length >= (width < 600 ? 32 : 44)) return;
      origins.forEach(function (origin, index) {
        eyeParticles.push({
          x: origin.x,
          y: origin.y,
          size: (width < 600 ? 20 : 25) + Math.random() * 12,
          speed: 85 + Math.random() * 40,
          gravity: 150 + Math.random() * 65,
          drift: (index === 0 ? -1 : 1) * (30 + Math.random() * 35),
          angle: (Math.random() - .5) * .6,
          spin: (index === 0 ? -1 : 1) * (1.2 + Math.random() * 1.2),
          phase: Math.random() * Math.PI * 2,
          opacity: .86 + Math.random() * .14,
          age: 0
        });
      });
    }

    function drawBill(particle) {
      var fromEye = typeof particle.age === 'number';
      var fade = fromEye ? Math.min(1, particle.age * 14, (4 - particle.age) * 2) : 1;
      var size = particle.size * (fromEye ? Math.min(1, .45 + particle.age * 7) : 1);
      var cos = Math.cos(particle.angle), sin = Math.sin(particle.angle);
      var flutter = .65 + Math.abs(Math.cos(particle.phase)) * .35;
      ctx.globalAlpha = particle.opacity * Math.max(0, fade);
      ctx.setTransform(scale * cos, scale * sin, -scale * sin * flutter, scale * cos * flutter,
        scale * (particle.x + Math.sin(particle.phase) * (fromEye ? 3 : 16)), scale * particle.y);
      ctx.drawImage(bill, -size / 2, -size * .24, size, size * .48);
    }

    function resize() {
      var bounds = canvas.getBoundingClientRect();
      var nextWidth = Math.round(bounds.width), nextHeight = Math.round(bounds.height);
      var nextScale = Math.min(window.devicePixelRatio || 1, nextWidth < 600 ? 1.25 : 1.5);
      if (width === nextWidth && height === nextHeight && scale === nextScale) return;
      var oldWidth = width;
      width = nextWidth;
      height = nextHeight;
      scale = nextScale;
      var targetWidth = Math.round(width * scale), targetHeight = Math.round(height * scale);
      if (canvas.width !== targetWidth) canvas.width = targetWidth;
      if (canvas.height !== targetHeight) canvas.height = targetHeight;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      var count = width < 600 ? 20 : 36;
      if (!oldWidth) {
        particles = Array.from({ length: count }, function () { return makeParticle(true); });
        lastScroll = window.scrollY;
      } else if (oldWidth !== width) {
        particles.forEach(function (particle) { particle.x *= width / oldWidth; });
      }
      particles.length = Math.min(particles.length, count);
      while (particles.length < count) particles.push(makeParticle(true));
      cacheHeadGeometry();
      if (enabled) draw(0);
    }

    function scheduleResize() {
      if (!enabled || resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(function () {
        resizeFrame = 0;
        if (enabled) resize();
      });
    }

    function draw(delta) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, width, height);
      for (var index = 0; index < particles.length; index++) {
        var particle = particles[index];
        particle.y += particle.speed * delta;
        particle.x += particle.drift * delta;
        particle.angle += particle.spin * delta;
        particle.phase += delta * .9;
        if (particle.y > height + 100 || particle.x < -120 || particle.x > width + 120) {
          particle = particles[index] = makeParticle(false);
        }
        drawBill(particle);
      }

      var scrollChange = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      var remaining = 0;
      for (var eyeIndex = 0; eyeIndex < eyeParticles.length; eyeIndex++) {
        var particle = eyeParticles[eyeIndex];
        particle.age += delta;
        particle.y += particle.speed * delta - scrollChange;
        particle.speed += particle.gravity * delta;
        particle.x += particle.drift * delta;
        particle.angle += particle.spin * delta;
        particle.phase += delta * 5;
        if (particle.age >= 4 || particle.y > height + 100 || particle.y < -100 || particle.x < -100 || particle.x > width + 100) continue;
        drawBill(particle);
        eyeParticles[remaining++] = particle;
      }
      eyeParticles.length = remaining;

      if (delta > 0) {
        eyeClock += delta;
        if (eyeClock >= .14) {
          var origins = eyeOrigins();
          if (origins) {
            emitFromEyes(origins);
            eyeClock %= .14;
          } else {
            eyeClock = 0;
          }
        }
      }
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.globalAlpha = 1;
    }

    function tick(time) {
      var delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
      lastTime = time;
      draw(delta);
      frame = window.requestAnimationFrame(tick);
    }

    function syncAnimation() {
      window.cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      if (!enabled || document.hidden) return;
      if (motion.matches) draw(0);
      else frame = window.requestAnimationFrame(tick);
    }

    window.addEventListener('resize', scheduleResize, { passive: true });
    if (head && window.ResizeObserver) {
      var headObserver = new ResizeObserver(cacheHeadGeometry);
      headObserver.observe(head);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(cacheHeadGeometry);
    document.addEventListener('visibilitychange', syncAnimation);
    motion.addEventListener('change', syncAnimation);
    return {
      setEnabled: function (value) {
        enabled = value;
        canvas.hidden = !enabled;
        if (enabled) {
          resize();
          loadBanknote();
        } else {
          eyeParticles = [];
          eyeClock = 0;
        }
        syncAnimation();
      }
    };
  }

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
