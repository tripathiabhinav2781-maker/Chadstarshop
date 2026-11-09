// Cloudflare Pages Function: sends contact form messages to your Telegram.
// Uses the same variables as order.js: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'Invalid request.' }, 400); }
  if (body.website) return json({ ok: true });

  const name = clean(body.name, 80);
  const email = clean(body.email, 120);
  const message = clean(body.message, 2000);
  if (name.length < 2) return json({ ok: false, error: 'Please enter your name.' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'Enter a valid email address.' }, 400);
  if (message.length < 5) return json({ ok: false, error: 'Please write a short message.' }, 400);

  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return json({ ok: false, error: 'Contact form is not set up yet. Please email us directly.' }, 500);
  }

  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: `WEBSITE MESSAGE\n\nName: ${name}\nEmail: ${email}\n\n${message}`
    })
  });

  if (!res.ok) return json({ ok: false, error: 'Could not send your message. Please email us directly.' }, 502);
  return json({ ok: true });
}
