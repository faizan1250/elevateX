import { GoogleGenAI } from "@google/genai";
import CareerChoice from "../models/CareerChoice.js";

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ���������������������������������������������
// Helper: Build profile context
// ���������������������������������������������
const buildProfileContext = (choice) => {
  if (!choice) return "No profile available.";

  const skills = choice.skills
    ? choice.skills
        .split("/")
        .map((s) => s.trim())
        .join(", ")
    : "Not specified";

  return `
Candidate Profile:
- Username: ${choice.userId?.username || "User"}
- Skills: ${skills}
- Career Goal: ${choice.careergoal || "Not specified"}
- Experience: ${choice.experience || "Not specified"}
- Education: ${choice.education || "Not specified"}
- Interest: ${choice.interest || "Not specified"}
- Availability: ${choice.availabilty || "Not specified"}
- Time Constraint: ${choice.timeconstraint || "Not specified"}
`;
};

// ���������������������������������������������
// GET /api/interview/profile
// ���������������������������������������������
export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const choice = await CareerChoice.findOne({ userId }).populate({
      path: "userId",
      select: "username",
    });

    if (!choice) {
      return res.status(200).json({
        status: "not_chosen",
        profile: null,
      });
    }

    const profile = {
      username: choice.userId?.username || "User",
      skills: choice.skills
        ? choice.skills.split("/").map((s) => s.trim())
        : [],
      careerGoal: choice.careergoal || "",
      experience: choice.experience || "",
      education: choice.education || "",
      interest: choice.interest || "",
      availability: choice.availabilty || "",
      timeConstraint: choice.timeconstraint || "",
    };

    return res.status(200).json({
      status: "chosen",
      profile,
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
};

// ���������������������������������������������
// POST /api/interview/chat
// ���������������������������������������������
export const interviewChat = async (req, res) => {
  const { messages } = req.body;
  const userId = req.user.id;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  if (messages.length > 40) {
    return res.status(400).json({ error: "Conversation too long" });
  }

  try {
    // �� Fetch user profile automatically ��
    const choice = await CareerChoice.findOne({ userId }).populate({
      path: "userId",
      select: "username",
    });

    const profileContext = buildProfileContext(choice);

    // �� Strong system prompt ��
    const systemPrompt = `
You are a strict senior technical interviewer.

Rules:
- Ask ONE question at a time
- Do NOT explain unless asked
- Increase difficulty gradually
- Focus on practical + real-world problems
- If candidate is weak  ask fundamentals
- If strong  ask advanced/system design

${profileContext}
`;

    // �� Convert messages  Gemini format ��
    const formattedMessages = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        ...formattedMessages,
      ],
    });

    const text =
      response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response generated";

    return res.json({ response: text });
  } catch (err) {
    console.error("Gemini API error:", err);

    if (err.status === 429) {
      return res.status(429).json({ error: "AI rate limit hit, please wait." });
    }

    res.status(500).json({ error: "AI request failed" });
  }
};
export const interviewChatStream = async (req, res) => {
  const { messages } = req.body;
  const userId = req.user.id;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  try {
    // ── Fetch profile ──
    const choice = await CareerChoice.findOne({ userId }).populate({
      path: "userId",
      select: "username",
    });

    const profileContext = buildProfileContext(choice);

    const systemPrompt = `
You are a strict senior technical interviewer.

Rules:
- Ask ONE question at a time
- Be concise
- Adapt difficulty
- Focus on real-world

${profileContext}
`;

    const formattedMessages = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // ── Setup SSE ──
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await genAI.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        ...formattedMessages,
      ],
    });

    for await (const chunk of stream) {
      const text = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error("Streaming error:", err);
    res.end();
  }
};
export const evaluateAnswer = async (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ error: "Missing question or answer" });
  }

  try {
    const prompt = `
You are a senior technical interviewer.

Evaluate the candidate's answer.

Return STRICT JSON:
{
  "score": number (0-10),
  "strengths": ["..."],
  "weaknesses": ["..."],
  "improvement": "..."
}

Question:
${question}

Answer:
${answer}
`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {
        score: 5,
        strengths: [],
        weaknesses: [],
        improvement: text,
      };
    }

    return res.json(parsed);
  } catch (err) {
    console.error("Evaluation error:", err);
    res.status(500).json({ error: "Evaluation failed" });
  }
};
