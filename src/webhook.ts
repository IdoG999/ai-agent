import "dotenv/config";
import http from "node:http";
import { URL } from "node:url";
import { runAgent } from "./agent.js";
import { parseInboundTextMessages, sendTelegramTextReply } from "./telegram.js";

const PORT = Number(process.env.PORT || 3000);
const SECRET_HEADER = "x-telegram-bot-api-secret-token";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function readRawBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function getPathname(req: http.IncomingMessage): string {
  const host = req.headers.host || "localhost";
  const url = new URL(req.url || "/", `http://${host}`);
  return url.pathname;
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = getPathname(req);

    if (pathname === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    if (pathname !== "/webhook") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("ok");
      return;
    }

    if (req.method !== "POST") {
      res.writeHead(405, { "Content-Type": "text/plain" });
      res.end("Method not allowed");
      return;
    }

    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (expectedSecret) {
      const got = (req.headers[SECRET_HEADER] as string | undefined)?.trim();
      if (got !== expectedSecret) {
        res.writeHead(401, { "Content-Type": "text/plain" });
        res.end("Unauthorized");
        return;
      }
    }

    const rawBody = await readRawBody(req);
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Bad JSON");
      return;
    }

    const botToken = requireEnv("TELEGRAM_BOT_TOKEN");
    const messages = parseInboundTextMessages(payload);

    for (const m of messages) {
      const reply = await runAgent(m.body);
      await sendTelegramTextReply({
        botToken,
        chatId: m.chatId,
        text: reply,
      });
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server error");
  }
});

server.listen(PORT, () => {
  console.log(`Telegram webhook listening on http://localhost:${PORT}/webhook`);
});
