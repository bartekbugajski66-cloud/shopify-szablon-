/* VEXON — theme scripts */
(function () {
  'use strict';
  var VX = window.VX || (window.VX = {});
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- money ---------- */
  function formatMoney(cents) {
    var fmt = VX.money || '{{amount_with_comma_separator}} zł';
    var n = (cents || 0) / 100;
    function fmtNum(num, dec, th, sep) {
      var parts = num.toFixed(dec).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, th);
      return parts.join(sep);
    }
    return fmt.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, k) {
      switch (k) {
        case 'amount': return fmtNum(n, 2, ',', '.');
        case 'amount_no_decimals': return fmtNum(n, 0, ',', '.');
        case 'amount_with_comma_separator': return fmtNum(n, 2, ' ', ',');
        case 'amount_no_decimals_with_comma_separator': return fmtNum(n, 0, ' ', ',');
        case 'amount_with_space_separator': return fmtNum(n, 2, ' ', ',');
        case 'amount_with_period_and_space_separator': return fmtNum(n, 2, ' ', '.');
        default: return fmtNum(n, 2, ' ', ',');
      }
    });
  }
  VX.formatMoney = formatMoney;

  /* ---------- car colour ---------- */
  var mixTimer = null;
  var MIX = ['#FF3B4E', '#2F8BFF', '#2B3140'];
  function setCarColor(c) {
    clearInterval(mixTimer);
    var root = document.documentElement;
    if (c === 'mix') {
      var i = 0;
      root.style.setProperty('--car', MIX[0]);
      mixTimer = setInterval(function () { i = (i + 1) % MIX.length; root.style.setProperty('--car', MIX[i]); }, 900);
    } else if (c) {
      root.style.setProperty('--car', c === '#2B3140' ? '#5B6B8C' : c);
    }
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    var els = $$('[data-reveal]');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------- mobile menu ---------- */
  function initMenu() {
    var m = $('[data-vx-menu]');
    if (!m) return;
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-vx-menu-open]')) { m.classList.add('is-open'); document.body.style.overflow = 'hidden'; }
      else if (e.target.closest('[data-vx-menu-close]')) { m.classList.remove('is-open'); document.body.style.overflow = ''; }
    });
  }

  /* ---------- scroll to buy box ---------- */
  function scrollToBuy(e) {
    var buy = document.getElementById('vx-buy');
    if (!buy) return false;
    if (e) e.preventDefault();
    buy.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-vx-scroll-buy]');
    if (a) {
      closeDrawer();
      if (!scrollToBuy(e) && a.tagName === 'BUTTON') window.location.href = VX.routes.root;
    }
  });

  /* ---------- gallery ---------- */
  function initGallery(root) {
    var slides = $$('.vx-gallery__slide', root);
    if (slides.length < 2) return;
    var thumbs = $$('[data-vx-thumb]', root);
    var idx = 0;
    function go(i) {
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === idx); });
      thumbs.forEach(function (t, k) { t.classList.toggle('is-active', k === idx); });
      if (thumbs[idx]) thumbs[idx].scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-vx-prev]')) go(idx - 1);
      else if (e.target.closest('[data-vx-next]')) go(idx + 1);
      else { var t = e.target.closest('[data-vx-thumb]'); if (t) go(+t.getAttribute('data-vx-thumb')); }
    });
    var x0 = null, main = $('.vx-gallery__main', root);
    main.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    main.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    root.vxGoToMedia = function (mediaId) {
      for (var k = 0; k < slides.length; k++) if (slides[k].getAttribute('data-media-id') == mediaId) { go(k); return; }
    };
  }

  /* ---------- product form ---------- */
  function initProduct(section) {
    var form = $('[data-vx-form]', section);
    if (!form) return;
    var product;
    try { product = JSON.parse($('[data-vx-product-json]', form).textContent); } catch (e) { return; }
    VX.product = product;
    var input = $('[data-vx-variant-input]', form);
    var gallery = $('[data-vx-gallery]', section);
    if (gallery) initGallery(gallery);

    var packInput = $('[data-vx-pack] input', form);
    var colorInput = $('[data-vx-swatch] input', form);
    VX.packPos = packInput ? +packInput.getAttribute('data-vx-opt') : 0;
    VX.colorPos = colorInput ? +colorInput.getAttribute('data-vx-opt') : 0;

    function selected() {
      var opts = {};
      $$('input[data-vx-opt]:checked', form).forEach(function (i) { opts[i.getAttribute('data-vx-opt')] = i.value; });
      return opts;
    }
    function findVariant(opts) {
      return product.variants.find(function (v) {
        return Object.keys(opts).every(function (pos) { return v['option' + pos] === opts[pos]; });
      });
    }
    function syncSwatches(opts) {
      if (!VX.packPos || !VX.colorPos) return;
      $$('[data-vx-swatch]', form).forEach(function (sw) {
        var val = $('input', sw).value;
        var exists = product.variants.some(function (v) { return v['option' + VX.packPos] === opts[VX.packPos] && v['option' + VX.colorPos] === val; });
        sw.hidden = !exists;
      });
      var cur = $('[data-vx-swatch] input:checked', form);
      if (cur && cur.closest('[data-vx-swatch]').hidden) {
        var first = $$('[data-vx-swatch]', form).filter(function (s) { return !s.hidden; })[0];
        if (first) { $('input', first).checked = true; }
      }
    }
    function update(fromColor) {
      var opts = selected();
      syncSwatches(opts);
      opts = selected();
      $$('[data-vx-pack]', form).forEach(function (l) { l.classList.toggle('is-active', $('input', l).checked); });
      $$('[data-vx-swatch]', form).forEach(function (l) { l.classList.toggle('is-active', $('input', l).checked); });
      var activeSw = $('[data-vx-swatch].is-active', form);
      if (activeSw) {
        setCarColor(activeSw.getAttribute('data-color'));
        var cn = $('[data-vx-color-name]', section);
        if (cn) cn.textContent = $('input', activeSw).value;
      }
      var v = findVariant(opts);
      var btn = $('[data-vx-atc]', form);
      if (!v) { btn.disabled = true; $('[data-vx-atc-label]', btn).textContent = 'Niedostępne'; return; }
      VX.variant = v;
      input.value = v.id;
      btn.disabled = !v.available;
      $('[data-vx-atc-label]', btn).textContent = v.available ? btn.getAttribute('data-label') : 'Wyprzedane';
      $('[data-vx-atc-price]', btn).textContent = '· ' + formatMoney(v.price);
      var priceEl = $('[data-vx-price]', section);
      priceEl.textContent = formatMoney(v.price);
      priceEl.animate && priceEl.animate([{ transform: 'scale(1.12)', color: '#7CF3FF' }, { transform: 'scale(1)' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
      var cmp = $('[data-vx-compare]', section), save = $('[data-vx-save]', section);
      if (v.compare_at_price && v.compare_at_price > v.price) {
        cmp.hidden = false; cmp.textContent = formatMoney(v.compare_at_price);
        save.hidden = false; save.textContent = 'Oszczędzasz ' + formatMoney(v.compare_at_price - v.price);
      } else { cmp.hidden = true; save.hidden = true; }
      var st = $('[data-vx-sticky-title]'), sp = $('[data-vx-sticky-price]');
      if (st) st.textContent = v.title;
      if (sp) sp.textContent = formatMoney(v.price);
      if (!fromColor && v.featured_media && gallery && gallery.vxGoToMedia) gallery.vxGoToMedia(v.featured_media.id);
      if (fromColor && v.featured_media && gallery && gallery.vxGoToMedia) gallery.vxGoToMedia(v.featured_media.id);
      if (window.history.replaceState && /\/products\//.test(location.pathname)) {
        var url = new URL(location.href); url.searchParams.set('variant', v.id); history.replaceState({}, '', url);
      }
    }
    var atcBtn = $('[data-vx-atc]', form);
    atcBtn.setAttribute('data-label', $('[data-vx-atc-label]', atcBtn).textContent);
    form.addEventListener('change', function (e) {
      if (e.target.matches('[data-vx-opt]')) update(!!e.target.closest('[data-vx-swatch]'));
    });
    update(false);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      addToCart(+input.value, 1, atcBtn);
    });

    /* sticky bar */
    var sticky = $('[data-vx-sticky]');
    if (sticky && 'IntersectionObserver' in window) {
      var footer = $('.vx-footer');
      var atcVisible = true, footVisible = false;
      var refresh = function () { sticky.classList.toggle('is-on', !atcVisible && !footVisible); };
      new IntersectionObserver(function (en) { atcVisible = en[0].isIntersecting || en[0].boundingClientRect.top > 0; refresh(); }).observe(atcBtn);
      if (footer) new IntersectionObserver(function (en) { footVisible = en[0].isIntersecting; refresh(); }).observe(footer);
      $('[data-vx-sticky-btn]', sticky).addEventListener('click', function () { addToCart(+input.value, 1, this); });
    }
  }

  /* ---------- countdown (resets daily at local midnight) ---------- */
  function initCountdown() {
    $$('[data-vx-timer]').forEach(function (el) {
      var spans = $$('span', el);
      function tick() {
        var now = new Date(), end = new Date(now); end.setHours(24, 0, 0, 0);
        var s = Math.max(0, Math.floor((end - now) / 1000));
        var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
        spans[0].textContent = String(h).padStart(2, '0');
        spans[1].textContent = String(m).padStart(2, '0');
        spans[2].textContent = String(sec).padStart(2, '0');
      }
      tick(); setInterval(tick, 1000);
    });
  }

  /* ---------- modes showcase ---------- */
  function initModes() {
    $$('[data-vx-modes]').forEach(function (root) {
      var stage = $('[data-vx-stage]', root), tabs = $$('[data-vx-mode]', root), panes = $$('[data-mode-pane]', root);
      var hud = $('[data-vx-mode-hud]', root), bar = $('[data-vx-mode-progress]', root);
      if (!stage || !tabs.length) return;
      var i = 0, auto = true, timer;
      function show(k) {
        i = k;
        var mode = tabs[k].getAttribute('data-vx-mode');
        stage.setAttribute('data-mode', mode);
        var car = $('.vx-stage__car', stage); car.style.animation = 'none'; void car.offsetWidth; car.style.animation = '';
        tabs.forEach(function (t, n) { t.classList.toggle('is-active', n === k); t.setAttribute('aria-selected', n === k); });
        panes.forEach(function (p, n) { p.classList.toggle('is-active', n === k); });
        if (hud) hud.textContent = tabs[k].textContent.trim();
        if (bar) { bar.classList.remove('is-run'); void bar.offsetWidth; if (auto) bar.classList.add('is-run'); }
      }
      function loop() { clearTimeout(timer); if (!auto) return; timer = setTimeout(function () { show((i + 1) % tabs.length); loop(); }, 4500); }
      tabs.forEach(function (t, k) { t.addEventListener('click', function () { auto = false; clearTimeout(timer); show(k); burst(t, 18); }); });
      var started = false;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { if (en[0].isIntersecting && !started) { started = true; show(0); loop(); } }, { threshold: .35 }).observe(stage);
      } else { show(0); loop(); }
    });
  }

  /* ---------- confetti ---------- */
  var COLORS = ['#7CF3FF', '#2F8BFF', '#3A3DFF', '#FFC94D', '#ffffff', '#8B5CFF'];
  function burst(origin, count) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var r = origin ? origin.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var c = document.createElement('canvas'); c.className = 'vx-confetti';
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr; c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
    document.body.appendChild(c);
    var ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
    var parts = [];
    for (var k = 0; k < (count || 120); k++) {
      var a = Math.random() * Math.PI * 2, s = 4 + Math.random() * 9;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, w: 5 + Math.random() * 6, h: 8 + Math.random() * 8, rot: Math.random() * 6, vr: (Math.random() - .5) * .4, col: COLORS[k % COLORS.length], life: 0 });
    }
    var t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach(function (p) {
        p.vy += .32; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col;
        ctx.globalAlpha = Math.max(0, 1 - (t - t0) / 1800);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (t - t0 < 1800) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }
  VX.burst = burst;

  /* ---------- cart ---------- */
  var drawer, linesEl;
  function api(url, body) {
    return fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw j; return j; }); });
  }
  function getCart() { return api(VX.routes.cart + '.js'); }

  function addToCart(id, qty, btn) {
    if (btn) btn.classList.add('is-loading');
    return api(VX.routes.cartAdd, { items: [{ id: id, quantity: qty || 1 }] })
      .then(function () {
        burst(btn, 140);
        if (VX.cartType === 'page' || !drawer) { window.location.href = VX.routes.cart; return; }
        return refreshCart(true);
      })
      .catch(function (err) { alert((err && (err.description || err.message)) || 'Nie udało się dodać do koszyka.'); })
      .then(function () { if (btn) btn.classList.remove('is-loading'); });
  }
  VX.addToCart = addToCart;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function upsellFor(cart) {
    var p = VX.product;
    if (!p || !VX.packPos || !VX.colorPos) return '';
    var packs = [];
    p.variants.forEach(function (v) { var o = v['option' + VX.packPos]; if (packs.indexOf(o) < 0) packs.push(o); });
    if (packs.length < 2) return '';
    for (var k = 0; k < cart.items.length; k++) {
      var it = cart.items[k];
      if (it.product_id !== p.id) continue;
      var cv = p.variants.find(function (v) { return v.id === it.variant_id; });
      if (!cv) continue;
      var pi = packs.indexOf(cv['option' + VX.packPos]);
      if (pi < 0 || pi >= packs.length - 1) continue;
      var next = packs[pi + 1];
      var nv = p.variants.find(function (v) { return v['option' + VX.packPos] === next && v['option' + VX.colorPos] === cv['option' + VX.colorPos] && v.available; });
      if (!nv) continue;
      var single = p.variants.find(function (v) { return v['option' + VX.packPos] === packs[0]; });
      var nQty = parseInt(next, 10) || (pi + 2);
      var saving = single ? single.price * nQty - nv.price : 0;
      var extra = nv.price - cv.price;
      return '<div class="vx-upsell"><div class="vx-upsell__t">⚡ Zmień na <b>' + esc(next.split(' (')[0]) + '</b> — tylko +' + formatMoney(extra) +
        (saving > 0 ? '<small>Oszczędzasz ' + formatMoney(saving) + ' względem zakupu osobno</small>' : '') +
        '</div><button type="button" class="vx-btn" data-vx-upgrade="' + esc(it.key) + '" data-to="' + nv.id + '" data-qty="' + it.quantity + '">Zmień</button></div>';
    }
    return '';
  }

  function renderCart(cart) {
    $$('[data-vx-count]').forEach(function (c) { c.textContent = cart.item_count; c.setAttribute('data-count', cart.item_count); c.classList.remove('is-bump'); void c.offsetWidth; c.classList.add('is-bump'); });
    if (!drawer) return;
    $('[data-vx-drawer-count]', drawer).textContent = cart.item_count ? '(' + cart.item_count + ')' : '';
    var empty = cart.item_count === 0;
    $('[data-vx-drawer-empty]', drawer).hidden = !empty;
    $('[data-vx-drawer-foot]', drawer).hidden = empty;
    $('.vx-drawer__ship', drawer).hidden = empty;
    var carSvg = $('.vx-scene__car svg, .vx-stage__car svg');
    linesEl.innerHTML = cart.items.map(function (it) {
      var img = it.image ? '<img src="' + esc(it.image.replace(/(\.[a-z]+)(\?|$)/i, '_200x$1$2')) + '" alt="">' : (carSvg ? carSvg.outerHTML : '');
      var variant = it.product_has_only_default_variant ? '' : (it.variant_title || '');
      var old = it.original_line_price > it.final_line_price ? '<s>' + formatMoney(it.original_line_price) + '</s>' : '';
      return '<div class="vx-line">' +
        '<div class="vx-line__img">' + img + '</div>' +
        '<div><div class="vx-line__t">' + esc(it.product_title) + '</div><div class="vx-line__v">' + esc(variant) + '</div>' +
        '<div class="vx-qty"><button type="button" data-vx-qty="' + esc(it.key) + '" data-q="' + (it.quantity - 1) + '" aria-label="Mniej">−</button><span>' + it.quantity + '</span><button type="button" data-vx-qty="' + esc(it.key) + '" data-q="' + (it.quantity + 1) + '" aria-label="Więcej">+</button></div></div>' +
        '<div class="vx-line__r"><div class="vx-line__p">' + old + formatMoney(it.final_line_price) + '</div><button type="button" class="vx-line__rm" data-vx-qty="' + esc(it.key) + '" data-q="0">Usuń</button></div>' +
        '</div>';
    }).join('');
    $('[data-vx-upsell]', drawer).innerHTML = upsellFor(cart);
    var compareTotal = 0;
    var p = VX.product;
    cart.items.forEach(function (it) {
      var v = p && p.variants.find(function (x) { return x.id === it.variant_id; });
      var cmp = v && v.compare_at_price > v.price ? v.compare_at_price * it.quantity : it.original_line_price;
      compareTotal += cmp;
    });
    var savings = compareTotal - cart.total_price;
    $('[data-vx-savings-row]', drawer).hidden = savings <= 0;
    $('[data-vx-savings]', drawer).textContent = '−' + formatMoney(savings);
    $('[data-vx-sub]', drawer).textContent = formatMoney(cart.total_price);
    $('[data-vx-total]', drawer).textContent = formatMoney(cart.total_price);
  }

  function refreshCart(open) {
    return getCart().then(function (cart) { renderCart(cart); if (open) openDrawer(); return cart; });
  }
  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = '';
  }

  function initDrawer() {
    drawer = $('[data-vx-drawer]');
    if (!drawer) return;
    linesEl = $('[data-vx-lines]', drawer);
    document.addEventListener('click', function (e) {
      var open = e.target.closest('[data-vx-cart-open]');
      if (open && VX.cartType !== 'page' && !/\/cart/.test(location.pathname)) { e.preventDefault(); refreshCart(true); return; }
      if (e.target.closest('[data-vx-cart-close]')) { closeDrawer(); return; }
      var q = e.target.closest('[data-vx-qty]');
      if (q) {
        q.disabled = true;
        api(VX.routes.cartChange, { id: q.getAttribute('data-vx-qty'), quantity: +q.getAttribute('data-q') }).then(renderCart).catch(function () { refreshCart(); });
        return;
      }
      var up = e.target.closest('[data-vx-upgrade]');
      if (up) {
        up.classList.add('is-loading');
        api(VX.routes.cartChange, { id: up.getAttribute('data-vx-upgrade'), quantity: 0 })
          .then(function () { return api(VX.routes.cartAdd, { items: [{ id: +up.getAttribute('data-to'), quantity: +up.getAttribute('data-qty') }] }); })
          .then(function () { burst(up, 100); return refreshCart(); })
          .catch(function () { refreshCart(); });
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  }

  /* ---------- boot ---------- */
  function boot() {
    initReveal();
    initMenu();
    initDrawer();
    $$('[data-vx-product-section]').forEach(initProduct);
    initCountdown();
    initModes();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
