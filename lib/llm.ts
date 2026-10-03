export type LlmProvider = "groq" | "gemini" | "ollama" | "openai" | "local";

export function getLlmProvider(): LlmProvider {
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) return "ollama";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "local";
}

export function llmConfigured(): boolean {
  return getLlmProvider() !== "local";
}

export function llmLabel(): string {
  switch (getLlmProvider()) {
    case "groq":
      return "Groq (free tier)";
    case "gemini":
      return "Google Gemini (free tier)";
    case "ollama":
      return "Ollama (local, free)";
    case "openai":
      return "OpenAI (paid)";
    default:
      return "Built-in parser (no API key)";
  }
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() || trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("LLM did not return JSON.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

async function chatOpenAiCompat(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
  system: string,
  user: string,
  jsonMode: boolean,
): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const body: Record<string, unknown> = {
    model,
    temperature: 0.3,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${text.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned an empty response.");
  return content;
}

async function chatGemini(system: string, user: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY!;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${text.slice(0, 500)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!content) throw new Error("Gemini returned an empty response.");
  return content;
}

export async function chatJson<T>(system: string, user: string): Promise<T> {
  const provider = getLlmProvider();
  let content: string;

  if (provider === "groq") {
    content = await chatOpenAiCompat(
      "https://api.groq.com/openai/v1",
      process.env.GROQ_API_KEY,
      process.env.GROQ_MODEL || "llama-3.1-8b-instant",
      system,
      user,
      true,
    );
  } else if (provider === "gemini") {
    content = await chatGemini(system, user);
  } else if (provider === "ollama") {
    content = await chatOpenAiCompat(
      process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1",
      "ollama",
      process.env.OLLAMA_MODEL || "llama3.2",
      system,
      user,
      false,
    );
  } else if (provider === "openai") {
    content = await chatOpenAiCompat(
      process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_MODEL || "gpt-4o-mini",
      system,
      user,
      true,
    );
  } else {
    throw new Error("No free LLM configured. Using local parser instead.");
  }

  return extractJson(content) as T;
}
