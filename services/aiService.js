import { GoogleGenAI } from "@google/genai";

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const stripCodeFence = (text = "") =>
  text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

export const isAiAvailable = () => Boolean(genAI);

export const generateText = async (prompt) => {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await genAI.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
};

export const generateJson = async (prompt, fallbackFactory = () => ({})) => {
  const text = await generateText(prompt);

  try {
    return JSON.parse(stripCodeFence(text));
  } catch (error) {
    return fallbackFactory(text, error);
  }
};
