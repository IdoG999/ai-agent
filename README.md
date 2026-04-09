# AI agent (Telegram bot)

Telegram [Bot API](https://core.telegram.org/bots/api) bot: **`getUpdates` long polling** (no tunnel) or **webhook** + HTTPS tunnel. Both use [`src/agent.ts`](src/agent.ts) and reply with `sendMessage`.

## Easiest on public Wi‑Fi / library (no URL, no `setWebhook`)

Your laptop calls Telegram (**outbound** HTTPS). You do **not** paste any `https://…` host. **Do not copy placeholder text** from docs; there is no tunnel URL in this mode.

1. **`npm install`** and configure **`.env`** (`TELEGRAM_BOT_TOKEN`, LLM or `USE_LLM=false`).
2. **`npm run telegram:getme`** — confirm **`"ok": true`**.
3. Run:

   ```bash
   npm run dev:poll
   ```

4. Message your bot on Telegram. On startup the app **removes any old webhook** so polling works.

Stop with **Ctrl+C**. Production: **`npm run build`** then **`npm run start:poll`**.

Optional: **`TELEGRAM_POLL_TIMEOUT`** — long-poll seconds (max 50, default 50).

See [`src/poll.ts`](src/poll.ts).

## Prerequisites (webhook mode)

- Node.js 20+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- A **public HTTPS URL** (ngrok, Cloudflare tunnel, or deployed host) if you use **webhook** mode — [Run from scratch](#run-from-scratch-step-by-step). Prefer **[polling](#easiest-on-public-wi-fi--library-no-url-no-setwebhook)** when tunnels are blocked.
- **LLM**: OpenAI in the cloud, **local Ollama** (see Environment), or **`USE_LLM=false`** to echo while testing.

## Environment

Copy `.env.example` to `.env` and fill in values.

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | Optional. If set, incoming requests must include header `X-Telegram-Bot-Api-Secret-Token` with this value (match `secret_token` in `setWebhook`) |
| `OPENAI_API_KEY` | OpenAI cloud key, or any dummy string (e.g. `ollama`) when using `OPENAI_BASE_URL` |
| `OPENAI_BASE_URL` | Optional. Set to Ollama OpenAI root, e.g. `http://127.0.0.1:11434/v1` |
| `OPENAI_MODEL` | Model id (`gpt-4o-mini` for cloud default; for Ollama use a pulled name like `llama3.2`) |
| `PORT` | Local HTTP port (default 3000) |
| `USE_LLM` | `true` to call the configured LLM; `false` to echo user text (testing) |
| `AGENT_SYSTEM_PROMPT` | Optional override for the assistant system message |
| `TELEGRAM_POLL_TIMEOUT` | Optional. Long polling timeout in seconds for **`npm run dev:poll`** (max **50**, default **50**) |

### Bot name vs API token

- **Bot name** (e.g. `AIAgentBot`) is only what you see in Telegram. **You cannot use it in API URLs.**
- The **API token** is the long string BotFather sends (digits, `:`, letters), e.g. `7234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxx`. It must be the whole value in **`TELEGRAM_BOT_TOKEN`** in `.env`.
- **Never** paste `<placeholders>` or `YOUR_BOT_TOKEN` literally into `curl`; those are instructions, not real values.
- If you see **`401 Unauthorized`**, the token is wrong, revoked, or has a typo/extra space. Get a fresh token from BotFather (`/mybots` → your bot → API Token) or create a new bot.

### Helper commands (recommended)

From the project root (reads `.env` automatically):

```bash
npm run telegram:getme          # must show "ok": true and your bot "username"
npm run telegram:set-webhook -- "https://YOUR_TUNNEL_URL_HERE"
npm run telegram:webhook           # shows current webhook URL and last_error_message
```

Pass only the tunnel **origin** (scheme + host, e.g. `https://abc.trycloudflare.com`); **`/webhook` is appended automatically** by the script. If `TELEGRAM_WEBHOOK_SECRET` is set in `.env`, `secret_token` is sent on `setWebhook` automatically.

## Run from scratch (step by step)

Do everything from your **project root** (the folder that contains `package.json`), e.g. `cd …/ai-agent`. The helper scripts load **`.env` from the current working directory**.

**1. Install Node dependencies (once)**

```bash
npm install
```

**2. Create `.env`**

```bash
cp .env.example .env
```

Edit `.env`:

- Set **`TELEGRAM_BOT_TOKEN=`** to your full token from **@BotFather** (numbers, `:`, letters — not the bot’s display name).
- **LLM:** either run **Ollama** and keep `OPENAI_BASE_URL` + `OPENAI_MODEL`, or set **`USE_LLM=false`** to echo your messages while testing.
- Leave **`TELEGRAM_WEBHOOK_SECRET`** commented out unless you know you need it (if it is set, it must match Telegram’s `secret_token`; the npm helper sends it when set).

**3. Confirm the bot token**

```bash
npm run telegram:getme
```

You need **`"ok": true`** and a **`username`** (open the bot in Telegram as **`@that_username`**).

**4. Start the app — terminal 1 (leave open)**

```bash
npm run dev
```

Wait until you see: `Telegram webhook listening on http://localhost:3000/webhook` (or another port if you changed **`PORT`** in `.env`).

Quick check in a browser: [http://localhost:3000/health](http://localhost:3000/health) should show **`ok`**.

**5. Public HTTPS — terminal 2 (leave open)**

Telegram only sends webhooks to **https://** addresses on the public internet. Your PC is not reachable directly, so you run a **tunnel** that forwards public **HTTPS** to **`http://localhost:3000`**.

If you see **`zsh: command not found: ngrok`**, ngrok is not installed — use **Cloudflare quick tunnel** (below). **Do not rely on localtunnel** for Telegram (Telegram often fails TLS; you get **SSL** errors in `getWebhookInfo`).

**Cloudflare (works without ngrok; recommended when ngrok is missing)**

1. One-time: install **`cloudflared`** from [Cloudflare — Downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/). On macOS, download, unpack, and either add `cloudflared` to your **`PATH`** or run it as `./cloudflared` from the folder where it lives.
2. With **terminal 1** still running **`npm run dev`**, run:

   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

   If you changed **`PORT`** in `.env`, use that port instead of `3000`.

3. **`cloudflared`** prints a **`https://` … `trycloudflare.com`** URL. Copy only that origin, e.g. `https://random-words.trycloudflare.com` (**no** `/webhook`).

**Optional — ngrok (only after you install it):** [ngrok download](https://ngrok.com/download), then `ngrok http 3000` and use the printed **https** “Forwarding” URL the same way (origin only).

**6. Tell Telegram your server URL — terminal 3 (or any new shell)**

From the **project root**:

```bash
npm run telegram:set-webhook -- "https://YOUR-TRYCLOUDFLARE-HOST.trycloudflare.com"
```

Replace the quoted string with **your** real tunnel URL (**https**, no trailing slash, **no** `/webhook` — the script adds `/webhook`).

**7. Confirm Telegram can reach you**

```bash
npm run telegram:webhook
```

- **`result.url`** should end with **`/webhook`**.
- **`last_error_message`** should be **empty**.
- Send a test message in Telegram; **`pending_update_count`** should not stay high.

**8. Chat with the bot**

In Telegram (app or web), open **`@username`** from `getMe` and send **text**.

**Whenever you restart the tunnel**, the **`https://` host changes** — repeat **steps 6–7** with the new URL.

**Health check:** `GET http://localhost:3000/health` and `GET http://localhost:3000/webhook` return `ok`. Ensure **Ollama** is running if **`USE_LLM=true`** and you use Ollama.

## Troubleshooting: bot never replies

1. **`zsh: command not found: ngrok`** — ngrok is not installed. Use **`cloudflared tunnel --url http://localhost:3000`** instead (see [Run from scratch](#run-from-scratch-step-by-step), step 5), then **`npm run telegram:set-webhook`** with the **`trycloudflare.com`** URL.

2. **Check Telegram’s view of your webhook** (after you send a test message from the app):

   ```bash
   npm run telegram:webhook
   ```

3. **SSL / certificate errors** — If `result.last_error_message` contains something like `SSL error` or `certificate verify failed`:

   - Telegram **never reaches** your [`src/webhook.ts`](src/webhook.ts); `pending_update_count` may grow.
   - **Fix:** use **ngrok** or **Cloudflare Tunnel** (or deploy to a host with a normal public cert), then:

     ```bash
     npm run telegram:set-webhook -- "https://your-new-trusted-host"
     npm run telegram:webhook   # last_error_message should be empty; pending_update_count should drop
     ```

4. **Wrong or placeholder webhook URL** — `result.url` must be your **real** tunnel hostname (not example text). **`npm run dev`** and the tunnel must both be running when you test.

5. **401 on your server** — If you set `TELEGRAM_WEBHOOK_SECRET` in `.env`, you must have registered the same value via `setWebhook`’s `secret_token` (the helper script does this when the variable is set). If you clear the secret in `.env`, register the webhook again without `secret_token` or Telegram will not send the header your server expects.

6. **Server errors after webhook works** — Watch the terminal running `npm run dev` for stack traces (e.g. Ollama down, `sendMessage` failures).

## Production

- Deploy behind a **stable HTTPS URL**.
- Set env vars as secrets; rotate the bot token if exposed ([`revoke`](https://core.telegram.org/bots/api#revoke-api-key) / new token via BotFather as needed).
- Prefer setting `TELEGRAM_WEBHOOK_SECRET` and the same `secret_token` on `setWebhook`.

## Project layout

- [`src/webhook.ts`](src/webhook.ts) — HTTP server, Telegram POST `/webhook`, optional secret header
- [`src/poll.ts`](src/poll.ts) — long polling (`getUpdates`), no tunnel; calls `deleteWebhook` on startup
- [`src/telegram.ts`](src/telegram.ts) — parse `Update`, `sendMessage`, `getUpdates`, `deleteWebhook`
- [`src/agent.ts`](src/agent.ts) — LLM (OpenAI or Ollama) or echo when `USE_LLM=false`

## Limitations

- **Text only** in this scaffold (`message` / `edited_message` with `text`).
- Replies longer than **4096** characters are **truncated** before send.

## Git / GitHub

Remote: [github.com/IdoG999/ai-agent](https://github.com/IdoG999/ai-agent).

```bash
git clone https://github.com/IdoG999/ai-agent.git
cd ai-agent
```

## License

MIT
