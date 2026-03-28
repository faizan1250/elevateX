import { generateInterviewResponse } from "./aiService.js";

export const compressMemory = async (messages) => {
  const text = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

  const prompt = `
Summarize this interview conversation:
- strengths
- weaknesses
- topics covered
- candidate level
`;

  const summary = await generateInterviewResponse(prompt + "\n\n" + text);

  return summary;
};
