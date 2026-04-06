import { GoogleGenAI } from "@google/genai";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const groqApiKeys = [
  process.env.GROQ_API_KEY1,
  process.env.GROQ_API_KEY2,
  process.env.GROQ_API_KEY3,
  process.env.GROQ_API_KEY4,
  process.env.GROQ_API_KEY,
].filter(Boolean);

const stripCodeFence = (text = "") =>
  String(text)
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

const buildGroqMessages = ({ prompt, systemPrompt }) => {
  const messages = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: prompt });
  return messages;
};

const generateWithGroq = async ({ prompt, systemPrompt }) => {
  if (!groqApiKeys.length) {
    throw new Error("No Groq API keys configured");
  }

  let lastError;

  for (const apiKey of groqApiKeys) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: buildGroqMessages({ prompt, systemPrompt }),
          temperature: 0.35,
          max_tokens: 2800,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Groq request failed (${response.status}): ${body}`);
      }

      const payload = await response.json();
      const text = payload?.choices?.[0]?.message?.content?.trim();

      if (!text) {
        throw new Error("Groq returned an empty response");
      }

      return text;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Groq generation failed");
};

const generateWithGemini = async ({ prompt, systemPrompt }) => {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const fullPrompt = systemPrompt
    ? `${systemPrompt.trim()}\n\n${prompt.trim()}`
    : prompt;

  const response = await genAI.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
  });

  return response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
};

export const isAiAvailable = () => Boolean(groqApiKeys.length || genAI);

export const getAiProviderSummary = () => ({
  groqEnabled: groqApiKeys.length > 0,
  groqKeyCount: groqApiKeys.length,
  groqModel: GROQ_MODEL,
  geminiEnabled: Boolean(genAI),
  geminiModel: GEMINI_MODEL,
});

export const generateText = async (prompt, options = {}) => {
  const request = {
    prompt,
    systemPrompt: options.systemPrompt || "",
  };

  if (groqApiKeys.length) {
    try {
      return await generateWithGroq(request);
    } catch (groqError) {
      if (!genAI) {
        throw groqError;
      }
    }
  }

  return generateWithGemini(request);
};

export const generateJson = async (
  prompt,
  fallbackFactory = () => ({}),
  options = {},
) => {
  const text = await generateText(prompt, options);

  try {
    return JSON.parse(stripCodeFence(text));
  } catch (error) {
    return fallbackFactory(text, error);
  }
};
