# Pre-Release Arachnid Landing

A single-page React landing page for the Pre-Release Arachnid program, built with Vite + React + SWC.

## Local development

```sh
npm install
npm run dev
```

## Cloudflare Pages deploy

- Deploy by Git push.
- Build command: `npm run build`
- Build output: `dist/client`

## Environment variables

Copy `.env.example` to `.env` and set the Worker URL used by the feedback form.

```sh
VITE_WORKER_URL=https://<your-worker-subdomain>/api/feedback
```

## Worker deploy

```sh
cd worker
npx wrangler login
npx wrangler deploy
```

Notes:
- Email Routing must be enabled on the Cloudflare account.
- The destination address (jeff@innovadiscs.com) must be verified.
