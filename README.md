# IndianChadstars website

A static store with cash-on-delivery checkout, deployed on Cloudflare Pages from GitHub.

## Files
- `public/`: everything visitors see. Upload photos into `public/images/`.
  - `public/index.html`: page shell
  - `public/css/style.css`: styling (black and white)
  - `public/js/app.js`: shop pages, bag, delivery details, payment step, order flow. Edit `CONFIG` at the top for price and delivery charges.
  - `public/images/`: product photos (`pen-1.jpg` to `pen-6.jpg`)
  - `public/_headers`: basic security headers
- `functions/api/order.js`: receives orders and emails them to you
- `functions/api/contact.js`: receives contact form messages and emails them to you

## 1. Put the code on GitHub
1. Create a new repository on github.com, for example `indianchadstars-site`.
2. Upload all these files and folders (or use `git push`). Keep the folder structure.

## 2. Set up email (Resend)
Orders are emailed to you. This is your order record.
1. Sign up at resend.com and create an API key.
2. Add and verify your domain (for example, yourdomain.com) in Resend, so emails can be sent from `orders@yourdomain.com`. Until then, Resend only sends test emails to the address you signed up with.

## 3. Deploy on Cloudflare Pages
1. In Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**.
2. Select your GitHub repository.
3. Build settings: leave **Framework preset** as None, leave **Build command** empty, and set **Build output directory** to `public`.
4. Under **Settings → Environment variables**, add:
   - `RESEND_API_KEY`: your Resend key
   - `ORDER_EMAIL`: where you want order emails (for example, your Gmail)
   - `FROM_EMAIL`: a sender address on your verified domain
   - Optional: `SHIPPING_CHARGE` (for example, `50`) and `FREE_SHIPPING_ABOVE` (for example, `499`)
5. Deploy. Cloudflare gives you a `.pages.dev` address. Add your own domain under **Custom domains**.

## 4. Test the order flow
1. Open the site, tap **Buy now**, fill in the details, and place a test order.
2. Check your order email.

## 5. Before going live
- Replace the placeholder text in the About, Shipping, Returns, Privacy and Terms pages in `js/app.js` (search for `[`).
- Photos: put them in `public/images/` named `pen-1.jpg` to `pen-6.jpg`. Missing photos are skipped automatically.
- Check the delivery charge in `CONFIG` and in the Cloudflare environment variables. They should match.
- Your privacy page must match how you actually store and use customer details.

## Limits to know about
- Orders are stored as emails only. If you want an order database or dashboard later, add Cloudflare D1 or KV.
- There's no online payment. Cash on delivery is the only option, as you asked.
- Stock is not tracked automatically.
