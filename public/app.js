(function () {
  'use strict';

  // ---- Settings you can change ----
  var CONFIG = {
    currency: '₹',
    product: { id: 'glass-pen-ink', name: 'Glass Dip Pen with Ink Bottle', price: 499, maxQty: 10 },
    // Product photos, in the order they should appear. Upload each one to the images folder with exactly this name.
    photos: ['pen-1.jpg', 'pen-2.jpg', 'pen-3.jpg', 'pen-4.jpg', 'pen-5.jpg', 'pen-6.jpg'],
    shippingCharge: 0,        // delivery charge in rupees (0 = free)
    freeShippingAbove: 0      // set e.g. 499 to waive delivery above this amount (0 = no rule)
  };

  var QTY_KEY = 'ic_qty';          // bag quantity (localStorage)
  var DRAFT_KEY = 'ic_draft';      // form values while typing (sessionStorage)
  var CUSTOMER_KEY = 'ic_customer';// confirmed details (sessionStorage)
  var ORDER_KEY = 'ic_last_order'; // last placed order (sessionStorage)

  var app = document.getElementById('app');
  var formErrors = {};

  function money(n) { return CONFIG.currency + Number(n).toLocaleString('en-IN'); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function getJSON(store, key) { try { return JSON.parse(store.getItem(key)) || null; } catch (e) { return null; } }
  function setJSON(store, key, value) { store.setItem(key, JSON.stringify(value)); }

  // ---- Bag ----
  function getQty() {
    var n = parseInt(localStorage.getItem(QTY_KEY) || '0', 10);
    return isNaN(n) ? 0 : Math.max(0, Math.min(CONFIG.product.maxQty, n));
  }
  function setQty(n) {
    localStorage.setItem(QTY_KEY, String(Math.max(0, Math.min(CONFIG.product.maxQty, n))));
    updateBadge();
  }
  function totals() {
    var qty = getQty();
    var subtotal = qty * CONFIG.product.price;
    var shipping = 0;
    if (qty > 0) {
      var waived = CONFIG.freeShippingAbove && subtotal >= CONFIG.freeShippingAbove;
      shipping = waived ? 0 : CONFIG.shippingCharge;
    }
    return { qty: qty, subtotal: subtotal, shipping: shipping, total: subtotal + shipping };
  }
  function updateBadge() {
    var el = document.getElementById('bag-count');
    if (el) el.textContent = getQty();
  }

  // ---- Customer details ----
  function normalizePhone(p) {
    var d = String(p || '').replace(/\D/g, '');
    if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
    return d;
  }
  function validateCustomer(c) {
    var e = {};
    if ((c.name || '').length < 2) e.name = 'Please enter your full name.';
    if (!/^[6-9]\d{9}$/.test(c.phone || '')) e.phone = 'Enter a valid 10-digit mobile number.';
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) e.email = 'Enter a valid email address.';
    if ((c.line1 || '').length < 5) e.line1 = 'Enter your house number, street and area.';
    if ((c.city || '').length < 2) e.city = 'Enter your city or town.';
    if ((c.state || '').length < 2) e.state = 'Enter your state.';
    if (!/^\d{6}$/.test(c.pincode || '')) e.pincode = 'Enter a valid 6-digit PIN code.';
    return e;
  }
  function draft() { return getJSON(sessionStorage, DRAFT_KEY) || {}; }
  function confirmed() { return getJSON(sessionStorage, CUSTOMER_KEY) || {}; }
  function fullAddress(c) {
    return [c.line1, c.line2, c.landmark, c.city, c.state, c.pincode].filter(Boolean).join(', ');
  }

  // ---- Views ----
  function summaryHtml(t) {
    return '<div class="summary">' +
      '<p><span>Subtotal</span><span>' + money(t.subtotal) + '</span></p>' +
      '<p><span>Delivery</span><span>' + (t.shipping ? money(t.shipping) : 'Free') + '</span></p>' +
      '<p class="total"><span>Total, pay in cash on delivery</span><span>' + money(t.total) + '</span></p>' +
      '</div>';
  }
  function emptyBag() {
    return '<section class="narrow"><h1>Your bag is empty</h1><p>Add the pen to your bag to continue.</p>' +
      '<a class="btn" href="#/">Shop the pen</a></section>';
  }
  function gallery() {
    var list = CONFIG.photos;
    var thumbs = list.map(function (f, i) {
      return '<button class="thumb" type="button" data-thumb="/images/' + f + '" aria-label="Show photo ' + (i + 1) + '">' +
        '<img data-hide-missing src="/images/' + f + '" alt="" loading="lazy"></button>';
    }).join('');
    return '<div class="gallery">' +
      '<img class="main-photo" id="main-photo" src="/images/' + list[0] + '" alt="' + esc(CONFIG.product.name) + '">' +
      '<div class="thumbs">' + thumbs + '</div>' +
      '</div>';
  }
  function homeView() {
    return '<section class="product" id="buy">' +
      '<div>' + gallery() + '</div>' +
      '<div>' +
        '<p class="eyebrow">THE PEN</p>' +
        '<h1>' + esc(CONFIG.product.name) + '</h1>' +
        '<p class="price">' + money(CONFIG.product.price) + '</p>' +
        '<p>A handcrafted glass dip pen with a smooth, elegant finish, packed in a gift box with a bottle of ink. Ideal for calligraphy, journaling, sketching and gifting.</p>' +
        '<ul class="bullets">' +
          '<li>Glass dip pen with a twisted, colourful body</li>' +
          '<li>Includes one bottle of ink</li>' +
          '<li>Presented in a gift box</li>' +
        '</ul>' +
        '<p class="stock"><strong>In stock</strong></p>' +
        '<button class="btn" data-action="buy">Buy now</button>' +
        '<button class="btn-outline" data-action="add">Add to bag</button>' +
        '<p class="muted" style="margin-top:20px">Cash on delivery. Pay in cash when your order arrives.</p>' +
      '</div></section>' +
      '<section class="features">' +
        '<div><h3>Handmade</h3><p>Each pen is made by hand, so no two are exactly alike.</p></div>' +
        '<div><h3>Ink included</h3><p>Every set comes with a bottle of ink, ready to write.</p></div>' +
        '<div><h3>Gift ready</h3><p>Packed in a gift box, ready to give.</p></div>' +
      '</section>' +
      '<section class="faq"><h2>Questions</h2>' +
        '<details class="fold"><summary>What is in the box?</summary><p>One glass dip pen, one bottle of ink, and a gift box.</p></details>' +
        '<details class="fold"><summary>How do I use it?</summary><p>Dip the glass tip into the ink, then write on paper. Dip again when the ink runs low.</p></details>' +
        '<details class="fold"><summary>How do I look after it?</summary><p>Store it in the gift box away from direct sunlight. Clean the tip gently with a soft dry cloth after each use.</p></details>' +
        '<details class="fold"><summary>How do I pay?</summary><p>We accept cash on delivery only. You pay the delivery person in cash when the order arrives.</p></details>' +
        '<details class="fold"><summary>Shipping and returns</summary><p>See our <a href="#/policy/shipping">shipping policy</a> and <a href="#/policy/returns">returns policy</a>.</p></details>' +
      '</section>';
  }
  function cartView() {
    var t = totals();
    if (t.qty === 0) return emptyBag();
    return '<section class="narrow wide"><h1>Your bag</h1>' +
      '<div class="cart-row">' +
        '<img src="/images/' + CONFIG.photos[0] + '" alt="Glass Dip Pen" style="width:110px;aspect-ratio:1/1;object-fit:cover">' +
        '<div><p><strong>' + esc(CONFIG.product.name) + '</strong></p><p class="muted">' + money(CONFIG.product.price) + ' each</p></div>' +
        '<div class="qty">' +
          '<button data-action="dec" aria-label="Decrease quantity">&minus;</button>' +
          '<span aria-live="polite">' + t.qty + '</span>' +
          '<button data-action="inc" aria-label="Increase quantity">+</button>' +
        '</div>' +
        '<div class="cart-end"><p><strong>' + money(t.subtotal) + '</strong></p><button class="link" data-action="remove">Remove</button></div>' +
      '</div>' +
      summaryHtml(t) +
      '<a class="btn" href="#/checkout">Continue to delivery details</a>' +
      '<a class="btn-outline" href="#/">Keep shopping</a>' +
      '</section>';
  }
  function field(name, label, type, opts) {
    opts = opts || {};
    var value = esc(draft()[name] || '');
    var err = formErrors[name];
    return '<div class="field' + (opts.full ? ' full' : '') + '">' +
      '<label for="f-' + name + '">' + label + (opts.optional ? ' <span class="muted">(optional)</span>' : '') + '</label>' +
      '<input id="f-' + name + '" name="' + name + '" type="' + (type || 'text') + '" value="' + value + '"' +
        ' autocomplete="' + (opts.autocomplete || 'off') + '"' +
        (opts.required ? ' required' : '') +
        (err ? ' aria-invalid="true" aria-describedby="e-' + name + '"' : '') + '>' +
      (err ? '<span class="err" id="e-' + name + '">' + esc(err) + '</span>' : '') +
      '</div>';
  }
  function checkoutView() {
    if (getQty() === 0) return emptyBag();
    return '<section class="narrow wide">' +
      '<p class="steps"><span class="on">1. Details</span> &middot; <span>2. Payment</span></p>' +
      '<h1>Delivery details</h1>' +
      '<form id="checkout-form" novalidate>' +
        '<div class="grid2">' +
          field('name', 'Full name', 'text', { required: true, autocomplete: 'name' }) +
          field('phone', 'Mobile number', 'tel', { required: true, autocomplete: 'tel-national' }) +
          field('email', 'Email', 'email', { optional: true, autocomplete: 'email' }) +
          field('line1', 'House no., street and area', 'text', { required: true, autocomplete: 'address-line1', full: true }) +
          field('line2', 'Flat, floor or building', 'text', { optional: true, autocomplete: 'address-line2', full: true }) +
          field('landmark', 'Landmark', 'text', { optional: true, full: true }) +
          field('city', 'City or town', 'text', { required: true, autocomplete: 'address-level2' }) +
          field('state', 'State', 'text', { required: true, autocomplete: 'address-level1' }) +
          field('pincode', 'PIN code', 'text', { required: true, autocomplete: 'postal-code' }) +
        '</div>' +
        '<div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>' +
        '<button class="btn" type="submit" style="margin-top:20px">Continue to payment</button>' +
      '</form>' +
      '<p class="muted" style="margin-top:20px">Your details are used only to deliver your order and contact you about it.</p>' +
      '</section>';
  }
  function paymentView() {
    var t = totals();
    if (t.qty === 0) return emptyBag();
    var c = confirmed();
    if (!c.name || !c.phone || !c.line1) { location.hash = '#/checkout'; return ''; }
    return '<section class="narrow wide">' +
      '<p class="steps"><span>1. Details</span> &middot; <span class="on">2. Payment</span></p>' +
      '<h1>Payment</h1>' +
      '<div class="card-box"><h2>Order summary</h2>' +
        '<p>' + esc(CONFIG.product.name) + ' &times; ' + t.qty + '</p>' + summaryHtml(t) +
      '</div>' +
      '<div class="card-box"><h2>Deliver to</h2>' +
        '<p>' + esc(c.name) + '<br>' + esc(c.phone) + (c.email ? '<br>' + esc(c.email) : '') + '<br>' + esc(fullAddress(c)) + '</p>' +
        '<a href="#/checkout">Edit details</a>' +
      '</div>' +
      '<form id="payment-form" class="card-box">' +
        '<h2>Payment method</h2>' +
        '<label class="pay-option"><input type="radio" name="payment" value="cod" checked>' +
          '<span><strong>Cash on delivery</strong><br><span class="muted">Pay in cash when your order arrives. This is the only payment method available.</span></span>' +
        '</label>' +
        '<button class="btn" id="place-order" type="submit">Place order, pay on delivery</button>' +
        '<p class="err" id="order-error" role="alert"></p>' +
      '</form>' +
      '</section>';
  }
  function successView(orderId) {
    var o = getJSON(sessionStorage, ORDER_KEY);
    if (!o || o.id !== orderId) return '<section class="narrow"><h1>Thank you</h1><p>Your order is placed.</p><a class="btn" href="#/">Back to the shop</a></section>';
    return '<section class="narrow">' +
      '<h1>Thank you, ' + esc(o.name) + '</h1>' +
      '<p>Your order <strong>' + esc(o.id) + '</strong> is placed.</p>' +
      '<p>Please keep <strong>' + money(o.total) + '</strong> ready in cash for the delivery person.</p>' +
      '<a class="btn" href="#/">Back to the shop</a>' +
      '</section>';
  }
  function contactView() {
    return '<section class="narrow">' +
      '<h1>Contact us</h1>' +
      '<p>Questions about your order or the pen? Send us a message, or email <a href="mailto:indianchadstars@gmail.com">indianchadstars@gmail.com</a>.</p>' +
      '<form id="contact-form" novalidate>' +
        '<div class="field"><label for="c-name">Name</label><input id="c-name" name="name" required autocomplete="name"></div>' +
        '<div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" required autocomplete="email"></div>' +
        '<div class="field"><label for="c-msg">Message</label><textarea id="c-msg" name="message" required></textarea></div>' +
        '<div class="hp" aria-hidden="true"><input name="website" tabindex="-1" autocomplete="off"></div>' +
        '<button class="btn" type="submit">Send message</button>' +
        '<p id="contact-status" role="status" class="muted"></p>' +
      '</form></section>';
  }
  function aboutView() {
    return '<section class="narrow">' +
      '<h1>Our story</h1>' +
      '<p>IndianChadstars sells handmade glass dip pens with ink, for people who love writing, art and thoughtful gifts.</p>' +
      '<p>[Write your story here. Tell customers who you are and why you sell glass pens.]</p>' +
      '</section>';
  }
  var POLICIES = {
    shipping: { title: 'Shipping policy', body: '<p>[Your delivery timelines and the areas you deliver to.]</p><p>[Delivery charges, if any.]</p>' },
    returns: { title: 'Returns and refunds', body: '<p>[Your return window and conditions.]</p><p>[How refunds work for cash on delivery orders.]</p>' },
    privacy: { title: 'Privacy policy', body: '<p>We collect your name, phone number, email (optional) and delivery address to process and deliver your order and to contact you about it.</p><p>[Add your full privacy policy, and confirm how you store and share customer details.]</p>' },
    terms: { title: 'Terms of sale', body: '<p>[Your terms of sale.]</p>' }
  };
  function policyView(name) {
    var p = POLICIES[name];
    if (!p) return notFoundView();
    return '<section class="narrow"><h1>' + esc(p.title) + '</h1>' + p.body + '</section>';
  }
  function notFoundView() {
    return '<section class="narrow"><h1>Page not found</h1><p>The page you were looking for does not exist.</p><a class="btn" href="#/">Back to the shop</a></section>';
  }

  // ---- Actions ----
  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function submitCheckout(form) {
    var fd = new FormData(form);
    if (fd.get('website')) return; // honeypot filled by a bot
    var c = {};
    ['name', 'phone', 'email', 'line1', 'line2', 'landmark', 'city', 'state', 'pincode'].forEach(function (k) {
      c[k] = String(fd.get(k) || '').trim();
    });
    c.phone = normalizePhone(c.phone);
    formErrors = validateCustomer(c);
    if (Object.keys(formErrors).length) {
      setJSON(sessionStorage, DRAFT_KEY, c);
      render();
      var first = app.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }
    formErrors = {};
    setJSON(sessionStorage, CUSTOMER_KEY, c);
    location.hash = '#/payment';
  }
  function placeOrder() {
    var btn = document.getElementById('place-order');
    var err = document.getElementById('order-error');
    btn.disabled = true;
    btn.textContent = 'Placing order...';
    err.textContent = '';
    var t = totals();
    var c = confirmed();
    var payload = {
      customer: c,
      items: [{ id: CONFIG.product.id, name: CONFIG.product.name, qty: t.qty }],
      payment: 'cod',
      website: ''
    };
    fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok || !data.ok) throw new Error(data.error || 'We could not place your order. Please try again.');
        return data;
      });
    }).then(function (data) {
      setJSON(sessionStorage, ORDER_KEY, { id: data.orderId, total: t.total, name: c.name });
      localStorage.removeItem(QTY_KEY);
      sessionStorage.removeItem(CUSTOMER_KEY);
      sessionStorage.removeItem(DRAFT_KEY);
      updateBadge();
      location.hash = '#/success/' + encodeURIComponent(data.orderId);
    }).catch(function (ex) {
      err.textContent = ex.message || 'Something went wrong. Please try again.';
      btn.disabled = false;
      btn.textContent = 'Place order, pay on delivery';
    });
  }
  function sendForm(form, url, statusId) {
    var status = document.getElementById(statusId);
    var fd = new FormData(form);
    var body = {};
    fd.forEach(function (v, k) { body[k] = String(v).trim(); });
    if (body.website) return;
    status.textContent = 'Sending...';
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok && d.ok, error: d.error }; }); })
      .then(function (res) {
        if (res.ok) { form.reset(); status.textContent = 'Thank you. We will reply soon.'; }
        else { status.textContent = res.error || 'Could not send your message. Please email us instead.'; }
      })
      .catch(function () { status.textContent = 'Could not send your message. Please email us instead.'; });
  }

  // ---- Routing ----
  function route() {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h.split('/');
    return { name: parts[0] || '', arg: decodeURIComponent(parts.slice(1).join('/') || '') };
  }
  function render() {
    var r = route();
    if (r.name !== 'checkout') formErrors = {};
    var html;
    switch (r.name) {
      case '': html = homeView(); break;
      case 'cart': html = cartView(); break;
      case 'checkout': html = checkoutView(); break;
      case 'payment': html = paymentView(); break;
      case 'success': html = successView(r.arg); break;
      case 'contact': html = contactView(); break;
      case 'about': html = aboutView(); break;
      case 'policy': html = policyView(r.arg); break;
      default: html = notFoundView();
    }
    app.innerHTML = html;
    app.querySelectorAll('img[data-hide-missing]').forEach(function (img) {
      img.addEventListener('error', function () {
        var holder = img.closest('.thumb');
        if (holder) holder.remove();
      });
    });
    updateBadge();
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-thumb]');
    if (t) {
      var main = document.getElementById('main-photo');
      if (main) main.src = t.getAttribute('data-thumb');
      return;
    }
    var b = e.target.closest('[data-action]');
    if (!b) return;
    var a = b.getAttribute('data-action');
    if (a === 'add') { setQty(getQty() + 1); toast('Added to your bag'); render(); }
    else if (a === 'buy') { if (getQty() === 0) setQty(1); location.hash = '#/checkout'; }
    else if (a === 'inc') { setQty(getQty() + 1); render(); }
    else if (a === 'dec') { setQty(getQty() - 1); render(); }
    else if (a === 'remove') { setQty(0); render(); }
  });

  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f.id === 'checkout-form') { e.preventDefault(); submitCheckout(f); }
    else if (f.id === 'payment-form') { e.preventDefault(); placeOrder(); }
    else if (f.id === 'contact-form') { e.preventDefault(); sendForm(f, '/api/contact', 'contact-status'); }
  });

  // Save what the customer types so nothing is lost if they leave the page
  document.addEventListener('input', function (e) {
    var f = e.target.form;
    if (!f || f.id !== 'checkout-form') return;
    var d = {};
    new FormData(f).forEach(function (v, k) { d[k] = String(v); });
    setJSON(sessionStorage, DRAFT_KEY, d);
  });

  window.addEventListener('hashchange', render);
  render();
})();
