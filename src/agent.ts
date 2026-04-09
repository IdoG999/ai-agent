import OpenAI from "openai";

const DEFAULT_SYSTEM = `You are a careful customer-support assistant on Telegram.
Rules:
- Stay within common retail/service support: order status, shipping, returns, hours, and product FAQs.
- If you do not know, say you are not sure and offer to connect the user with a human.
- Keep replies short (max ~6 bullets or 1200 characters). No markdown headings.
- Never ask for full payment card numbers, passwords, or government IDs.
- If the user is abusive or requests illegal help, refuse briefly and offer human help.`;

function envBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name];
  if (v === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(v.toLowerCase());
}

export async function runAgent(userText: string): Promise<string> {
  const useLlm = envBool("USE_LLM", true);

  if (!useLlm) {
    return `Echo: ${userText}`;
  }

  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  const apiKey =
    process.env.OPENAI_API_KEY?.trim() || (baseURL ? "ollama" : "");
  if (!apiKey) {
    return "Agent is misconfigured: set OPENAI_API_KEY (cloud) or OPENAI_BASE_URL (e.g. Ollama at http://127.0.0.1:11434/v1), or USE_LLM=false to echo.";
  }

  const model =
    process.env.OPENAI_MODEL?.trim() ||
    (baseURL ? "llama3.2" : "gpt-4o-mini");

  const system = process.env.AGENT_SYSTEM_PROMPT?.trim() || DEFAULT_SYSTEM;
  const client = new OpenAI(baseURL ? { apiKey, baseURL } : { apiKey });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 500,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userText },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim();
  return text && text.length > 0 ? text : "Sorry — I could not generate a reply. A human will follow up.";
}
