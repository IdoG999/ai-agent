import "dotenv/config";
import http from "node:http";
import { URL } from "node:url";
import crypto from "node:crypto";
import { runAgent } from "./agent.js";
import { parseInboundTextMessages, sendTextReply } from "./whatsapp.js";

const PORT = Number(process.env.PORT || 3000);

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function verifyMetaSignature(params: {
  appSecret: string;
  rawBody: string;
  signatureHeader: string | undefined;
}): boolean {
  const sig = params.signatureHeader;
  if (!sig?.startsWith("sha256=")) return false;
  const expectedHex = sig.slice("sha256=".length);
  const mac = crypto.createHmac("sha256", params.appSecret).update(params.rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(mac, "hex"));
  } catch {
    return false;
  }
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

    if (pathname !== "/webhook") {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }

    if (req.method === "GET") {
      const host = req.headers.host || "localhost";
      const url = new URL(req.url || "/", `http://${host}`);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      const verifyToken = requireEnv("META_WEBHOOK_VERIFY_TOKEN");
      if (mode === "subscribe" && token === verifyToken && challenge) {
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(challenge);
        return;
      }

      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
      return;
    }

    if (req.method === "POST") {
      const rawBody = await readRawBody(req);
      const appSecret = process.env.META_APP_SECRET;
      const sig = req.headers["x-hub-signature-256"] as string | undefined;

      if (appSecret) {
        const ok = verifyMetaSignature({ appSecret, rawBody, signatureHeader: sig });
        if (!ok) {
          res.writeHead(401, { "Content-Type": "text/plain" });
          res.end("Invalid signature");
          return;
        }
      }

      let payload: unknown;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad JSON");
        return;
      }

      const accessToken = requireEnv("META_ACCESS_TOKEN");
      const phoneNumberId = requireEnv("META_PHONE_NUMBER_ID");

      const messages = parseInboundTextMessages(payload);
      for (const m of messages) {
        const reply = await runAgent(m.body);
        await sendTextReply({
          accessToken,
          phoneNumberId,
          to: m.from,
          body: reply,
        });
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method not allowed");
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Server error");
  }
});

server.listen(PORT, () => {
  console.log(`WhatsApp webhook listening on http://localhost:${PORT}/webhook`);
});
