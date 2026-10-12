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

  /* ---------- Вращающийся плоский портрет ---------- */
  var portrait = document.getElementById('portrait');
  var rotor = document.getElementById('portraitRotor');
  var portraitFront = document.querySelector('.portrait__side--front');
  var portraitBack = document.querySelector('.portrait__side--back');
  var reset = document.getElementById('portraitReset');
  var yaw = 0;
  var pitch = 0;
  var drag = null;

  function renderPortrait() {
    rotor.style.transform = 'rotateX(' + pitch + 'deg) rotateY(' + yaw + 'deg)';
    var angle = Math.round(((yaw + 180) % 360 + 360) % 360 - 180);
    var front = Math.cos(yaw * Math.PI / 180) * Math.cos(pitch * Math.PI / 180) >= 0;
    // Hide the far side explicitly: some GPU compositors paint filtered backfaces.
    portraitFront.hidden = !front;
    portraitBack.hidden = front;
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
    renderPortrait();
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
