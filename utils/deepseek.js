import OpenAI from "openai";
import { mockAIResponse } from "./aiWrapper.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateCareerPlanFromAI(userChoice) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // ✅ Use a valid OpenAI model
      messages: [
        {
          role: "system",
          content:
            "You are an AI career coach. Based on the user's background, interests, and goals, return a detailed learning roadmap in valid JSON format. Keys must include: skills, projects, roadmap, resources.",
        },
        {
          role: "user",
          content: JSON.stringify(userChoice),
        },
      ],
    });

    const content = response.choices[0].message.content;

    // Attempt to parse JSON
    try {
      return JSON.parse(content);
    } catch (parseErr) {
      console.warn("⚠️ Failed to parse AI response, falling back to mock.");
      return mockAIResponse(userChoice);
    }
  } catch (err) {
    console.error("⚠️ AI Gen failed. Falling back to mock.", err.message);
    return mockAIResponse(userChoice);
  }
}

export default { generateCareerPlanFromAI };;
