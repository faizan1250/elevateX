import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const evaluateAnswerAI = async (question, answer) => {
  const prompt = `
Evaluate the candidate answer.

Return JSON:
{
  "score": number,
  "dimensions": {
    "clarity": number,
    "depth": number,
    "correctness": number,
    "communication": number
  },
  "feedback": "...",
  "nextFocus": "..."
}

Question: ${question}
Answer: ${answer}
`;

  const res = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const text = res?.candidates?.[0]?.content?.parts?.[0]?.text;

  try {
    return JSON.parse(text);
  } catch {
    return {
      score: 5,
      dimensions: {},
      feedback: text,
      nextFocus: "",
    };
  }
};
