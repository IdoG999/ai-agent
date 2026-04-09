#!/usr/bin/env node
import "dotenv/config";

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

function apiPath(method) {
  if (!token) {
    console.error("Missing TELEGRAM_BOT_TOKEN in .env (copy the token from @BotFather, not the bot name).");
    process.exit(1);
  }
  return `https://api.telegram.org/bot${token}/${method}`;
}

async function call(method, params = undefined) {
  let url = apiPath(method);
  const init = { method: params ? "POST" : "GET" };
  if (params) {
    const body = new URLSearchParams(params);
    init.headers = { "Content-Type": "application/x-www-form-urlencoded" };
    init.body = body;
  }
  const res = await fetch(url, init);
  const data = await res.json();
  return data;
}

function normalizeWebhookUrl(userInput) {
  const trimmed = userInput.replace(/\/+$/, "");
  if (trimmed.endsWith("/webhook")) return trimmed;
  return `${trimmed}/webhook`;
}

const [, , cmd, arg] = process.argv;

async function main() {
  switch (cmd) {
    case "getMe": {
      const data = await call("getMe");
      console.log(JSON.stringify(data, null, 2));
      if (!data.ok) process.exit(1);
      break;
    }
    case "webhookInfo": {
      const data = await call("getWebhookInfo");
      console.log(JSON.stringify(data, null, 2));
      if (!data.ok) process.exit(1);
      break;
    }
    case "setWebhook": {
      if (!arg) {
        console.error('Usage: npm run telegram:set-webhook -- "https://your-tunnel.loca.lt"');
        process.exit(1);
      }
      const url = normalizeWebhookUrl(arg);
      /** @type Record<string, string> */
      const params = { url };
      if (secret) params.secret_token = secret;
      const data = await call("setWebhook", params);
      console.log(JSON.stringify(data, null, 2));
      if (!data.ok) process.exit(1);
      break;
    }
    default:
      console.error(`Usage:
  npm run telegram:getme
  npm run telegram:webhook
  npm run telegram:set-webhook -- "https://YOUR_TUNNEL_HOST"`);
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
