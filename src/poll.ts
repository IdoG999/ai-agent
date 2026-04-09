/**
 * Telegram long polling — no public URL, no cloudflared/ngrok, no setWebhook.
 * Use on restricted networks (e.g. public Wi‑Fi) where tunnels fail.
 * Deletes any existing webhook on startup (required before getUpdates works).
 */
import "dotenv/config";
import { runAgent } from "./agent.js";
import {
  deleteTelegramWebhook,
  fetchTelegramUpdates,
  parseInboundTextMessages,
  sendTelegramTextReply,
} from "./telegram.js";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const POLL_TIMEOUT_SEC = Math.min(50, Number(process.env.TELEGRAM_POLL_TIMEOUT || 50) || 50);

async function main(): Promise<void> {
  const botToken = requireEnv("TELEGRAM_BOT_TOKEN");
  await deleteTelegramWebhook(botToken);
  console.log("Telegram: webhook removed; long polling (getUpdates) started.");
  console.log(`Poll timeout: ${POLL_TIMEOUT_SEC}s. Press Ctrl+C to stop.`);

  let offset = 0;
  for (;;) {
    try {
      const updates = await fetchTelegramUpdates(botToken, { offset, timeout: POLL_TIMEOUT_SEC });
      for (const u of updates) {
        offset = u.update_id + 1;
        const messages = parseInboundTextMessages(u);
        for (const m of messages) {
          const reply = await runAgent(m.body);
          await sendTelegramTextReply({ botToken, chatId: m.chatId, text: reply });
        }
      }
    } catch (e) {
      console.error(e);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
