const GRAPH_API_VERSION = "v21.0";

export type InboundTextMessage = {
  from: string;
  messageId: string;
  body: string;
};

type CloudApiPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        messages?: Array<{
          from?: string;
          id?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
};

export function parseInboundTextMessages(payload: unknown): InboundTextMessage[] {
  const p = payload as CloudApiPayload;
  const out: InboundTextMessage[] = [];
  if (p.object !== "whatsapp_business_account") return out;

  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value?.messages ?? []) {
        if (msg.type !== "text" || !msg.from || !msg.id || !msg.text?.body) continue;
        out.push({ from: msg.from, messageId: msg.id, body: msg.text.body });
      }
    }
  }
  return out;
}

export async function sendTextReply(params: {
  accessToken: string;
  phoneNumberId: string;
  to: string;
  body: string;
}): Promise<void> {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${params.phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.to,
      type: "text",
      text: { preview_url: false, body: params.body },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatsApp send failed: ${res.status} ${text}`);
  }
}
