# iraady.com

Company site for Iraady Ltd plus an admin dashboard. A small Node server with no
dependencies renders the site from editable content, so changes made in the dashboard
are live straight away and search engines still get full HTML.

## Run

```sh
DATA_DIR=./data PORT=8080 ADMIN_PASSWORD='choose-a-long-one' node server.js
```

Open http://localhost:8080 and http://localhost:8080/admin.

## Configuration

| Variable | Purpose |
|---|---|
| `ADMIN_EMAIL` | Dashboard login email (default `info@iraady.com`). |
| `ADMIN_PASSWORD` | Dashboard password until one is changed in the dashboard (then the saved hash wins). At least 10 characters. |
| `SESSION_SECRET` | Signs session cookies (64 hex chars). If unset, one is generated and kept in `DATA_DIR`. |
| `DATA_DIR` | Where content, enquiries, orders and uploads live (default `/data`; a Docker volume in production). |

## Layout

- `server.js` — routes, admin API, public API (`/api/enquiries`, `/api/orders`)
- `lib/render.js` — server-rendered pages; `lib/store.js` — atomic JSON store; `lib/auth.js` — sign-in and sessions
- `seed/content.json` — content used on first boot (copied to `DATA_DIR/content.json`)
- `public/` — CSS, JS, images, and the dashboard app (`public/admin`)
- `pages/` — privacy, terms and thank-you pages (their `<main>` is shown inside the site frame)

## Notes

- The contact form stores each enquiry in the dashboard and still emails it through formsubmit.co.
- Checkout stays with Flutterwave; the existing delivery webhook is unchanged. Orders recorded in the
  dashboard come from the buyer's browser after Flutterwave's callback — confirm them in Flutterwave
  before delivering.
