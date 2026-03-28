import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateInterviewResponse = async (context) => {
  const response = await genAI.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [{ text: context }],
      },
    ],
  });

  return response?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
};
