/** Telegram Bot API text handling; https://core.telegram.org/bots/api */

export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;

export type InboundTextMessage = {
  chatId: number;
  body: string;
};

type TelegramMessage = {
  chat?: { id?: number };
  text?: string;
};

type Update = {
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

export function parseInboundTextMessages(payload: unknown): InboundTextMessage[] {
  const u = payload as Update;
  const msg = u.message ?? u.edited_message;
  const chatId = msg?.chat?.id;
  const text = msg?.text?.trim();
  if (chatId === undefined || !text) return [];
  return [{ chatId, body: text }];
}

export function truncateForTelegram(text: string, maxLen = TELEGRAM_MAX_MESSAGE_LENGTH): string {
  if (text.length <= maxLen) return text;
  const suffix = "…";
  return text.slice(0, maxLen - suffix.length) + suffix;
}

export async function deleteTelegramWebhook(botToken: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drop_pending_updates: false }),
  });
  const data = (await res.json()) as { ok?: boolean; description?: string };
  if (!res.ok || !data.ok) {
    throw new Error(`deleteWebhook failed: ${res.status} ${JSON.stringify(data)}`);
  }
}

type GetUpdatesResult = { update_id: number; message?: TelegramMessage; edited_message?: TelegramMessage };

export async function fetchTelegramUpdates(
  botToken: string,
  params: { offset: number; timeout: number }
): Promise<GetUpdatesResult[]> {
  const url = `https://api.telegram.org/bot${botToken}/getUpdates`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      offset: params.offset,
      timeout: params.timeout,
      allowed_updates: ["message", "edited_message"],
    }),
  });
  const data = (await res.json()) as { ok?: boolean; result?: GetUpdatesResult[]; description?: string };
  if (!res.ok || !data.ok || !Array.isArray(data.result)) {
    throw new Error(`getUpdates failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data.result;
}

export async function sendTelegramTextReply(params: {
  botToken: string;
  chatId: number;
  text: string;
}): Promise<void> {
  const body = truncateForTelegram(params.text);
  const url = `https://api.telegram.org/bot${params.botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: params.chatId,
      text: body,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Telegram sendMessage failed: ${res.status} ${errText}`);
  }
}
