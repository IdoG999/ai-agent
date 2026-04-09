# AI agent (WhatsApp / Meta Cloud API)

WhatsApp webhook server that receives messages, runs a small LLM-backed agent, and replies via the [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api).

## Prerequisites

- Node.js 20+
- A [Meta app](https://developers.facebook.com/) with **WhatsApp** product added (Cloud API)
- **Permanent access token**, **Phone number ID**, **WhatsApp Business Account ID** (from Meta Developer Console → WhatsApp → API setup)
- **Verify token** — any secret string you choose; must match `META_WEBHOOK_VERIFY_TOKEN` in `.env`
- **App secret** — for validating `X-Hub-Signature-256` on incoming webhooks (recommended)
- **OpenAI API key** (or change `src/agent.ts` to another provider)

## Environment

Copy `.env.example` to `.env` and fill in values.

| Variable | Purpose |
|----------|---------|
| `META_ACCESS_TOKEN` | Graph API user/system token with `whatsapp_business_messaging` |
| `META_PHONE_NUMBER_ID` | Send API path: `/PHONE_NUMBER_ID/messages` |
| `META_WEBHOOK_VERIFY_TOKEN` | Same string you enter in Meta webhook configuration |
| `META_APP_SECRET` | Used to verify webhook signatures |
| `OPENAI_API_KEY` | For the agent (optional if you only echo — see `USE_LLM`) |
| `PORT` | Local HTTP port (default 3000) |
| `USE_LLM` | `true` to call OpenAI; `false` to echo user text (testing) |
| `AGENT_SYSTEM_PROMPT` | Optional override for the assistant system message |

## Local development

1. `npm install`
2. `cp .env.example .env` and edit
3. Expose HTTPS for Meta webhooks using [ngrok](https://ngrok.com/) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/):

   ```bash
   ngrok http 3000
   ```

4. In Meta Developer Console → WhatsApp → Configuration, set **Callback URL** to `https://<your-host>/webhook` and **Verify token** to your `META_WEBHOOK_VERIFY_TOKEN`.
5. Subscribe to `messages` (and optionally `message_template_status_update`) for the webhook fields Meta lists for your app.

6. Run:

   ```bash
   npm run dev
   ```

7. Send a WhatsApp message to your test number from the WhatsApp → API setup screen.

## Production

- Deploy to any host with a **stable public HTTPS URL** (Fly.io, Railway, Render, VPS, etc.).
- Set the same env vars as secrets; rotate tokens if exposed.
- Keep `META_APP_SECRET` set and signature verification on (already implemented in `src/webhook.ts`).

## Project layout

- `src/webhook.ts` — HTTP server, GET verify, POST events, signature check
- `src/whatsapp.ts` — parse inbound Cloud API payloads; send text replies
- `src/agent.ts` — LLM call + strict system prompt (or echo when `USE_LLM=false`)

## Git / GitHub

This folder is intended to track [github.com/IdoG999/ai-agent](https://github.com/IdoG999/ai-agent).

If `git` is not initialized yet:

```bash
cd "$(dirname "$0")"
git init -b main
git remote add origin https://github.com/IdoG999/ai-agent.git
git add .
git commit -m "Initial WhatsApp webhook and agent scaffold"
git push -u origin main
```

Feature work for webhooks lives on branch `feat/whatsapp-webhook-and-echo` (create with `git checkout -b feat/whatsapp-webhook-and-echo`).

## Limitations

- **Groups**: WhatsApp Cloud API is oriented around business messaging and templates; do not assume full “bot in any group” behavior without checking current Meta policy and API capabilities.
- **Media**: This scaffold handles **text** only; extend `whatsapp.ts` for media IDs if needed.

## License

MIT
