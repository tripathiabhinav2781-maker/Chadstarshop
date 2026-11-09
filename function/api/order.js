// Cloudflare Pages Function: receives a cash-on-delivery order and sends it to your Telegram.
// Required environment variables (Cloudflare Pages → Settings → Environment variables):
//   TELEGRAM_BOT_TOKEN - token from @BotFather
//   TELEGRAM_CHAT_ID   - your chat id (see README)
// Optional:
//   SHIPPING_CHARGE     - delivery charge in rupees (default 0)
//   FREE_SHIPPING_ABOVE - waive delivery above this amount (default 0 = no rule)

const PRICE = 499;
const MAX_QTY = 10;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const normalizePhone = (p) => {
  let d = String(p ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  return d;
};
const money = (n) => '₹' + Number(n).toLocaleString('en-IN');

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }

  if (body.website) return json({ ok: true, orderId: 'IC-0000' }); // honeypot: pretend success for bots

  const c = body.customer || {};
  const customer = {
    name: clean(c.name, 80),
    phone: normalizePhone(c.phone),
    email: clean(c.email, 120),
    line1: clean(c.line1, 160),
    line2: clean(c.line2, 120),
    landmark: clean(c.landmark, 120),
    city: clean(c.city, 60),
    state: clean(c.state, 60),
    pincode: clean(c.pincode, 6)
  };

  if (customer.name.length < 2) return json({ ok: false, error: 'Please enter your full name.' }, 400);
  if (!/^[6-9]\d{9}$/.test(customer.phone)) return json({ ok: false, error: 'Enter a valid 10-digit mobile number.' }, 400);
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return json({ ok: false, error: 'Enter a valid email address.' }, 400);
  if (customer.line1.length < 5 || customer.city.length < 2 || customer.state.length < 2 || !/^\d{6}$/.test(customer.pincode)) {
    return json({ ok: false, error: 'Please check your address and PIN code.' }, 400);
  }

  const qty = parseInt(body.items?.[0]?.qty, 10);
  if (!(qty >= 1 && qty <= MAX_QTY)) return json({ ok: false, error: 'Invalid quantity.' }, 400);

  // Price is set on the server, so the browser cannot change it.
  const subtotal = qty * PRICE;
  const freeAbove = Number(env.FREE_SHIPPING_ABOVE || 0);
  const shipping = freeAbove && subtotal >= freeAbove ? 0 : Number(env.SHIPPING_CHARGE || 0);
  const total = subtotal + shipping;

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return json({ ok: false, error: 'Order service is not set up yet. Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Cloudflare.' }, 500);
  }

  const orderId = 'IC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  const address = [customer.line1, customer.line2, customer.landmark, customer.city, customer.state, customer.pincode]
    .filter(Boolean).join(', ');

  const text = [
    `NEW CASH ON DELIVERY ORDER ${orderId}`,
    '',
    `Product: Glass Dip Pen with Ink Bottle`,
    `Quantity: ${qty}`,
    `Delivery: ${shipping ? money(shipping) : 'Free'}`,
    `Collect in cash: ${money(total)}`,
    '',
    `Name: ${customer.name}`,
    `Phone: ${customer.phone}`,
    `Email: ${customer.email || 'not given'}`,
    '',
    `Address: ${address}`,
    '',
    `Placed: ${new Date().toISOString()}`
  ].join('\n');

  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text })
  });

  if (!res.ok) {
    // Explain the likely cause so the owner can fix the settings quickly.
    const hint = res.status === 401 ? 'The bot token is wrong. Check TELEGRAM_BOT_TOKEN.'
      : res.status === 400 ? 'The chat ID is wrong. Check TELEGRAM_CHAT_ID.'
      : res.status === 403 ? 'Open your bot in Telegram and tap Start, then try again.'
      : 'Please try again.';
    return json({ ok: false, error: 'Your order could not be sent. ' + hint }, 502);
  }
  return json({ ok: true, orderId });
}
