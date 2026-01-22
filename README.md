# Pre-Release Arachnid Mission Briefing

Single-page landing page for Arachnid pre-release testers. The page collects a three-mission log and emails submissions via Cloudflare Email Routing.

## Local development

```sh
npm install
npm run dev
```

## Cloudflare Pages deploy

- Deploy by Git push.
- Build command: `npm run build`
- Build output: `dist`

## Feedback endpoint

`/api/feedback` is implemented as a Worker in `worker/src/index.ts` and stores progress in KV.

KV setup:
- Create a KV namespace in the Cloudflare dashboard (Workers → KV).
- Copy the namespace ID into `worker/wrangler.toml` at `ARACHNID_KV`.

Worker deploy:
- `cd worker`
- `npx wrangler login`
- `npx wrangler deploy`

Test:
- `/api/status?token=TK_test&first=Test&last=User`

Email Routing notes:
- Enable Email Routing on the Cloudflare account.
- Add a send_email binding named `EMAIL` for the Worker.
- Verify the destination address `jeff@innovadiscs.com`.
