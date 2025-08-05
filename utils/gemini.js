
const { GoogleGenAI } = require("@google/genai");
const { mockAIResponse } = require("./aiWrapper");

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateCareerPlan(userChoice) {
  try {
 const prompt = `
You're an AI career planner. Based on the user's input below, return a clean **JSON object** with the following structure, ensuring each field is non-empty and consistently formatted:

{
  "skills": {
    "technical": [string],
    "soft_skills": [string]
  },
  "roadmap": [
    {
      "phase": "string", // e.g., "Phase 1: Foundation"
      "description": "string",
      "tasks": [string]
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "focus_skills": [string]
    }
  ],
  "resources": {
    "online_courses": [string],
    "books": [string],
    "tools": [string],
    "communities": [string]
  }
}

🧠 Return only a properly structured JSON object. Avoid nesting arrays unnecessarily (e.g., do not use roadmap: { phases: [...] } – use roadmap: [...] directly).

📌 Ensure:
- All arrays are filled with at least 2-3 relevant entries.
- Use fallback suggestions if user input is vague or minimal.
- Avoid null/undefined/empty values – always return meaningful defaults.

Tailor the response to help the user become: **${userChoice.careergoal || 'a successful professional'}**

Input:
${JSON.stringify(userChoice, null, 2)}
`.trim();


    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No text response from Gemini");
    }

    console.log("🔍 Gemini raw response:", text);

    // 🧼 Clean Gemini markdown code block output
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')  // Remove opening ```
      .replace(/\s*```$/, '')           // Remove closing ```
      .trim();

    try {
      return typeof cleaned === "string" ? JSON.parse(cleaned) : cleaned;

    } catch {
      console.warn("⚠️ Gemini returned non-JSON. Falling back to mock.");
      return mockAIResponse(userChoice);
    }
  } catch (err) {
    console.error("❌ Gemini API failed. Falling back to mock.", err.message);
    return mockAIResponse(userChoice);
  }
}

module.exports = { generateCareerPlan };
