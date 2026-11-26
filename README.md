# Motion Showcase

design this, let it look impressive, nice and cool pre-loaders, transitions and animations.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8e86ce8c-f414-4416-bf5f-8b12c4b3668a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Public site configuration

- `VITE_WAITLIST_URL` (optional): public endpoint that accepts pilot waitlist submissions as JSON
  via `POST`. If unset, submissions are saved only in the current browser's local storage.
- `VITE_WHATSAPP_NUMBER` (optional): WhatsApp phone number with country code, for example
  `+256774413516`. Defaults to the Propatiz contact number.

Vite exposes `VITE_*` values to browser code. Do not put credentials or other secrets in these
variables.

## Demo vs production

`VITE_DEMO_MODE` is read at build time. It defaults to the sample-data demo in every environment.
The demo banner links to the pilot waitlist; `/tenant`, `/landlord`, and `/admin` remain accessible
without login. For local configuration, copy `.env.example` to `.env`.

Set `VITE_DEMO_MODE=false` explicitly in a production build that handles real users or payments.
The app then selects the API data source without loading sample fixtures. API methods currently
throw `Not connected yet`, so connect the production API before enabling production use.

## Progressive web app

The PWA manifest, icons, offline page, and service worker live in `public/` and are served from
the site root, including on Cloudflare Workers. The worker caches only same-origin static assets
and the offline page; it never caches API responses or navigated HTML. Complaint forms explicitly
queued while offline are stored in the browser's IndexedDB outbox and retried when connectivity
returns. Connect `/api/forms/complaints` to the production API before relying on delivery.
