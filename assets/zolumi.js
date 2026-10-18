/* ZOLUMI — wspólny skrypt motywu */
(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');

  var Z = (window.Zolumi = window.Zolumi || {});
  var root = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || '/';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ================= DATA DOSTAWY =================
     Dzień zamówienia -> dzień dostawy (czas polski):
     pon -> śr, wt -> czw, śr -> pt, czw -> pon, pt -> pon, sob -> wt, nd -> wt */
  var OFFSET = { 0: 2, 1: 2, 2: 2, 3: 2, 4: 4, 5: 3, 6: 3 };
  var DAY_ACC = ['niedzielę', 'poniedziałek', 'wtorek', 'środę', 'czwartek', 'piątek', 'sobotę'];
  var DAY_NOM = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
  var DAY_SHORT = ['nd.', 'pon.', 'wt.', 'śr.', 'czw.', 'pt.', 'sob.'];
  var MONTH_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

  function warsawNow() {
    var parts = {};
    try {
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
      }).formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
    } catch (e) {
      var d = new Date();
      parts = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds() };
    }
    return {
      y: +parts.year, m: +parts.month, d: +parts.day,
      h: +parts.hour % 24, min: +parts.minute, s: +parts.second
    };
  }

  function prep(day) { return day === 2 ? 'we' : 'w'; }

  Z.delivery = function () {
    var n = warsawNow();
    var today = new Date(Date.UTC(n.y, n.m - 1, n.d));
    var wd = today.getUTCDay();
    var eta = new Date(today.getTime() + OFFSET[wd] * 86400000);
    var ed = eta.getUTCDay();
    var secondsLeft = 86400 - (n.h * 3600 + n.min * 60 + n.s);
    return {
      todayWeekday: wd,
      todayLabel: DAY_NOM[wd] + ', ' + today.getUTCDate() + ' ' + MONTH_GEN[today.getUTCMonth()],
      day: prep(ed) + ' ' + DAY_ACC[ed],
      dayName: DAY_ACC[ed],
      date: eta.getUTCDate() + ' ' + MONTH_GEN[eta.getUTCMonth()],
      label: prep(ed) + ' ' + DAY_ACC[ed] + ', ' + eta.getUTCDate() + ' ' + MONTH_GEN[eta.getUTCMonth()],
      short: DAY_SHORT[ed] + ' ' + eta.getUTCDate() + '.' + String(eta.getUTCMonth() + 1).padStart(2, '0'),
      secondsLeft: secondsLeft
    };
  };

  function pad(v) { return String(v).padStart(2, '0'); }
  var lastLabel = '';
  function paintDelivery() {
    var info = Z.delivery();
    if (info.label !== lastLabel) {
      lastLabel = info.label;
      document.querySelectorAll('[data-z-delivery]').forEach(function (el) {
        var k = el.getAttribute('data-z-delivery') || 'label';
        if (k === 'today') el.textContent = info.todayLabel;
        else if (info[k] != null) el.textContent = info[k];
      });
    }
    var s = info.secondsLeft, h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    document.querySelectorAll('[data-z-countdown]').forEach(function (el) {
      var mode = el.getAttribute('data-z-countdown');
      if (mode === 'parts') {
        var hh = el.querySelector('[data-h]'), mm = el.querySelector('[data-m]'), ss = el.querySelector('[data-s]');
        if (hh) hh.textContent = pad(h);
        if (mm) mm.textContent = pad(m);
        if (ss) ss.textContent = pad(sec);
      } else if (mode === 'words') {
        el.textContent = h > 0 ? h + ' godz. ' + m + ' min' : m + ' min ' + sec + ' s';
      } else {
        el.textContent = pad(h) + ':' + pad(m) + ':' + pad(sec);
      }
    });
  }
  Z.paintDelivery = paintDelivery;

  /* ================= KONFETTI + TOAST ================= */
  var COLORS = ['#ff4d5e', '#ff8a1f', '#ffc93c', '#1fbf75', '#2f8bff', '#6d3bef', '#ff4fa3'];
  Z.confetti = function (originEl, amount) {
    if (reduceMotion) return;
    var box = document.createElement('div');
    box.className = 'z-confetti';
    document.body.appendChild(box);
    var r = originEl && originEl.getBoundingClientRect ? originEl.getBoundingClientRect() : null;
    var ox = r ? r.left + r.width / 2 : window.innerWidth / 2;
    var oy = r ? r.top + r.height / 2 : window.innerHeight / 3;
    var n = amount || 90, pieces = [];
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      p.style.background = COLORS[i % COLORS.length];
      if (i % 3 === 0) p.style.borderRadius = '50%';
      box.appendChild(p);
      var ang = Math.random() * Math.PI * 2, sp = 6 + Math.random() * 10;
      pieces.push({ el: p, x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 9, rot: Math.random() * 360, vr: (Math.random() - .5) * 24 });
    }
    var t0 = performance.now();
    (function frame(t) {
      var life = (t - t0) / 1000;
      pieces.forEach(function (q) {
        q.vy += 0.42; q.vx *= 0.985; q.x += q.vx; q.y += q.vy; q.rot += q.vr;
        q.el.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px) rotate(' + q.rot + 'deg)';
        q.el.style.opacity = Math.max(0, 1 - life / 2.2);
      });
      if (life < 2.3) requestAnimationFrame(frame); else box.remove();
    })(t0);
  };

  var toastEl, toastTimer;
  Z.toast = function (msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'z-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  };

  /* ================= PIENIĄDZE ================= */
  var fmt;
  try { fmt = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: (window.Shopify && Shopify.currency && Shopify.currency.active) || 'PLN' }); } catch (e) { fmt = null; }
  Z.money = function (cents) { return fmt ? fmt.format(cents / 100) : (cents / 100).toFixed(2).replace('.', ',') + ' zł'; };

  /* ================= KOSZYK (drawer) ================= */
  function json(url, body) {
    return fetch(root + url, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().then(function (d) { if (!r.ok) throw new Error(d && (d.description || d.message) || 'Coś poszło nie tak.'); return d; });
    });
  }

  var drawer = document.getElementById('z-cart');
  var upgrades = [];
  try { upgrades = JSON.parse((document.getElementById('z-cart-variants') || {}).textContent || '[]'); } catch (e) { upgrades = []; }

  function setCount(n) {
    document.querySelectorAll('[data-z-cart-count]').forEach(function (el) {
      el.textContent = n;
      el.hidden = n < 1;
      el.classList.remove('is-pop'); void el.offsetWidth; el.classList.add('is-pop');
    });
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function render(cart) {
    setCount(cart.item_count);
    if (!drawer) return;
    var list = drawer.querySelector('[data-z-cart-items]');
    var empty = drawer.querySelector('[data-z-cart-empty]');
    var foot = drawer.querySelector('[data-z-cart-foot]');
    var up = drawer.querySelector('[data-z-cart-upsell]');
    empty.hidden = cart.item_count > 0;
    foot.hidden = cart.item_count === 0;
    list.innerHTML = cart.items.map(function (it, i) {
      var img = it.image ? '<img src="' + esc(it.image + (it.image.indexOf('?') > -1 ? '&' : '?') + 'width=200') + '" alt="" width="80" height="80" loading="lazy">' : '<span class="z-ci__ph">🎨</span>';
      var variant = it.variant_title && it.variant_title !== 'Default Title' ? '<span class="z-ci__var">' + esc(it.variant_title) + '</span>' : '';
      var save = it.original_line_price > it.final_line_price ? '<s>' + Z.money(it.original_line_price) + '</s>' : '';
      return '<li class="z-ci" data-line="' + (i + 1) + '">' + '<div class="z-ci__img">' + img + '</div>' +
        '<div class="z-ci__body"><a class="z-ci__title" href="' + esc(it.url) + '">' + esc(it.product_title) + '</a>' + variant +
        '<div class="z-ci__row"><div class="z-qty" role="group" aria-label="Ilość">' +
        '<button type="button" data-z-qty="' + (it.quantity - 1) + '" aria-label="Zmniejsz">−</button><span>' + it.quantity + '</span>' +
        '<button type="button" data-z-qty="' + (it.quantity + 1) + '" aria-label="Zwiększ">+</button></div>' +
        '<span class="z-ci__price">' + save + Z.money(it.final_line_price) + '</span></div>' +
        '<button type="button" class="z-ci__rm" data-z-qty="0">Usuń</button></div></li>';
    }).join('');
    drawer.querySelector('[data-z-cart-total]').textContent = Z.money(cart.total_price);
    var savings = cart.items.reduce(function (s, it) { return s + Math.max(0, it.original_line_price - it.final_line_price); }, 0);
    var savEl = drawer.querySelector('[data-z-cart-savings]');
    if (savEl) { savEl.hidden = savings <= 0; savEl.querySelector('span').textContent = Z.money(savings); }

    /* upsell: zamiana zestawu na większy */
    if (up) {
      up.hidden = true;
      if (upgrades.length > 1) {
        var lineIdx = -1, cur = -1;
        cart.items.forEach(function (it, i) { upgrades.forEach(function (v, j) { if (v.id === it.variant_id && it.quantity === 1 && j < upgrades.length - 1) { lineIdx = i; cur = j; } }); });
        if (lineIdx > -1) {
          var nxt = upgrades[cur + 1], base = upgrades[0];
          var pct = Math.round((1 - nxt.price / (base.price * nxt.qty)) * 100);
          up.querySelector('[data-z-up-title]').textContent = 'Zamień na ' + nxt.title + ' i oszczędź ' + pct + '%';
          up.querySelector('[data-z-up-text]').textContent = Z.money(Math.round(nxt.price / nxt.qty)) + ' za sztukę · idealne dla rodzeństwa i na prezent 🎁';
          up.querySelector('[data-z-up-price]').textContent = '+' + Z.money(nxt.price - cart.items[lineIdx].final_line_price);
          var btn = up.querySelector('button');
          btn.onclick = function () {
            btn.setAttribute('aria-busy', 'true');
            json('cart/change.js', { line: lineIdx + 1, quantity: 0 })
              .then(function () { return json('cart/add.js', { items: [{ id: nxt.id, quantity: 1 }] }); })
              .then(function () { return Z.cart.refresh(); })
              .then(function () { Z.confetti(btn, 70); Z.toast('Super wybór! 🎉'); })
              .catch(function (e) { Z.toast(e.message); })
              .then(function () { btn.removeAttribute('aria-busy'); });
          };
          up.hidden = false;
        }
      }
    }
  }

  Z.cart = {
    refresh: function () { return json('cart.js').then(function (c) { render(c); return c; }); },
    open: function () {
      if (!drawer) { window.location.href = root + 'cart'; return; }
      drawer.hidden = false;
      requestAnimationFrame(function () { drawer.classList.add('is-open'); });
      document.documentElement.classList.add('z-lock');
      var c = drawer.querySelector('[data-z-cart-close]'); if (c) c.focus({ preventScroll: true });
    },
    close: function () {
      if (!drawer) return;
      drawer.classList.remove('is-open');
      document.documentElement.classList.remove('z-lock');
      setTimeout(function () { drawer.hidden = true; }, 350);
    },
    add: function (items, sourceEl) {
      return json('cart/add.js', { items: items }).then(function () {
        return Z.cart.refresh();
      }).then(function (c) {
        Z.confetti(sourceEl, 110);
        Z.cart.open();
        return c;
      });
    }
  };

  if (drawer) {
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('[data-z-cart-close]')) { Z.cart.close(); return; }
      var q = e.target.closest('[data-z-qty]');
      if (q) {
        var li = q.closest('[data-line]');
        li.classList.add('is-busy');
        json('cart/change.js', { line: +li.getAttribute('data-line'), quantity: +q.getAttribute('data-z-qty') })
          .then(render).catch(function (err) { Z.toast(err.message); li.classList.remove('is-busy'); });
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('is-open')) Z.cart.close(); });
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-z-cart-open]');
    if (t && drawer) { e.preventDefault(); Z.cart.refresh(); Z.cart.open(); }
  });

  /* ================= REVEAL ================= */
  function initReveal(scope) {
    var els = (scope || document).querySelectorAll('.z-reveal:not(.is-in)');
    if (!('IntersectionObserver' in window) || reduceMotion) { els.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el, i) { el.style.transitionDelay = (el.getAttribute('data-delay') || 0) + 'ms'; io.observe(el); });
  }
  Z.initReveal = initReveal;

  function boot() {
    paintDelivery();
    setInterval(paintDelivery, 1000);
    initReveal();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  document.addEventListener('shopify:section:load', function (e) { lastLabel = ''; paintDelivery(); initReveal(e.target); });
})();
