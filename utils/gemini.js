// const { GoogleGenAI } = require("@google/genai");
// const { mockAIResponse } = require("./aiWrapper");

// const genAI = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// });

// async function generateCareerPlan(userChoice) {
//   try {
//     const prompt = `You're an AI career planner. Based on the user's input, return a JSON object with 'skills', 'roadmap', 'projects', and 'resources'. Input:\n${JSON.stringify(userChoice)}`;

//     const result = await genAI.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: [{ role: "user", parts: [{ text: prompt }] }],
//     });

//     // ✅ Extract output using new SDK format
//     const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

//     if (!text) {
//       throw new Error("No text response from Gemini");
//     }

//     console.log("🔍 Gemini raw response:", text);

//     const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

//     try {
//       return JSON.parse(cleaned);
//     } catch {
//       console.warn("⚠️ Gemini returned non-JSON. Falling back to mock.");
//       return mockAIResponse(userChoice);
//     }
//   } catch (err) {
//     console.error("❌ Gemini API failed. Falling back to mock.", err.message);
//     return mockAIResponse(userChoice);
//   }
// }

// module.exports = { generateCareerPlan };
const { GoogleGenAI } = require("@google/genai");
const { mockAIResponse } = require("./aiWrapper");

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function generateCareerPlan(userChoice) {
  try {
    const prompt = `You're an AI career planner. Based on the user's input, return a JSON object with 'skills', 'roadmap', 'projects', and 'resources'. Input:\n${JSON.stringify(userChoice)}`;

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
      return JSON.parse(cleaned);
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
