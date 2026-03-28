import InterviewSession from "../models/InterviewSession.js";
import { generateInterviewResponse } from "../services/aiService.js";
import { compressMemory } from "../services/memoryService.js";
import { evaluateAnswerAI } from "../services/scoringService.js";
import { computeAnalytics } from "../services/analyticsService.js";

// �����������������������������
// Start Session
// �����������������������������
export const startSession = async (req, res) => {
  const { role, mode } = req.body;

  const session = await InterviewSession.create({
    userId: req.user.id,
    role,
    mode,
  });

  res.json({ sessionId: session._id });
};

// �����������������������������
// Send Message
// �����������������������������
export const sendMessage = async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;

  const session = await InterviewSession.findById(id);

  session.messages.push({ role: "user", content: message });

  // memory compression
  if (session.messages.length > 12) {
    const summary = await compressMemory(session.messages);
    session.summary = summary;
    session.messages = session.messages.slice(-6);
  }

  const context = `
You are an interviewer.

Difficulty: ${session.difficulty}
Mode: ${session.mode}

Summary: ${session.summary || ""}

Conversation:
${session.messages.map((m) => `${m.role}: ${m.content}`).join("\n")}
`;

  const aiResponse = await generateInterviewResponse(context);

  session.messages.push({ role: "assistant", content: aiResponse });

  await session.save();

  res.json({ response: aiResponse });
};

// �����������������������������
// Evaluate Answer
// �����������������������������
export const evaluateAnswer = async (req, res) => {
  const { id } = req.params;
  const { question, answer } = req.body;

  const session = await InterviewSession.findById(id);

  const result = await evaluateAnswerAI(question, answer);

  session.scores.push({
    question,
    answer,
    score: result.score,
    dimensions: result.dimensions,
    feedback: result.feedback,
    nextFocus: result.nextFocus,
  });

  // adaptive difficulty
  if (result.score >= 8) {
    session.streak += 1;
    if (session.streak >= 2) session.difficulty += 1;
  } else if (result.score <= 4) {
    session.difficulty = Math.max(1, session.difficulty - 1);
    session.streak = 0;
  }

  await session.save();

  res.json(result);
};

// �����������������������������
// Complete Session
// �����������������������������
export const completeSession = async (req, res) => {
  const session = await InterviewSession.findById(req.params.id);

  session.status = "completed";
  session.completedAt = new Date();

  const analytics = computeAnalytics(session);

  await session.save();

  res.json({ analytics });
};

// �����������������������������
// Get Session
// �����������������������������
export const getSession = async (req, res) => {
  const session = await InterviewSession.findById(req.params.id);
  res.json(session);
};
