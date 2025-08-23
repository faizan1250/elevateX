import { GoogleGenAI } from "@google/genai";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/**
 * Generate MCQ-style certification questions from skills
 * @param {Array} skills - List of skill strings
 * @returns {Array} - List of questions with options and correct answers
 */
export const generateQuestionsFromSkills = async (skills) => {
  try {
    const prompt = `
You're an AI exam generator. Based on the following technical and soft skills, generate **5 MCQ questions** to test the user's understanding.

📌 Format the output as a JSON array with this structure (strictly):

[
  {
    "id": "q1",
    "question": "What is ...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option B" // exact match from options
  },
  ...
]

📎 Rules:
- Keep it beginner to intermediate level
- Mix technical and soft skills
- Vary topics across the provided skills
- Ensure clear, unambiguous questions and answers

Skills:
${JSON.stringify(skills, null, 2)}

ONLY return the JSON array. No explanations, markdown, or text.
    `.trim();

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error("No response from Gemini");

    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    const questions = JSON.parse(cleaned);
    return questions;
  } catch (err) {
    console.error("❌ Failed to generate questions:", err.message);
    return []; // fallback to empty
  }
};;

/**
 * Evaluate submitted answers against correct ones
 * @param {Array} questions - Original generated questions
 * @param {Object} answers - User answers in format { [questionId]: "selected option" }
 * @returns {Object} - score, passed, total, correctCount
 */
export const evaluateAnswers = async (questions, answers) => {
  try {
    let correctCount = 0;

    questions.forEach((q) => {
      const userAnswer = answers[q.id];
      if (userAnswer && userAnswer.trim() === q.answer.trim()) {
        correctCount++;
      }
    });

    const total = questions.length;
    const score = Math.round((correctCount / total) * 100);
    const passed = score >= 70;

    return { score, passed, correctCount, total };
  } catch (err) {
    console.error("❌ Error evaluating answers:", err.message);
    return { score: 0, passed: false, correctCount: 0, total: 0 };
  }
};;
