import CareerChoice from "../models/CareerChoice.js";
import InterviewSession from "../models/InterviewSession.js";
import { buildSessionAnalytics, buildPortfolioAnalytics } from "./analyticsService.js";
import { evaluateQuestionAnswer, generateInterviewPlan } from "./scoringService.js";

const DEFAULT_QUESTION_LIMIT = 5;

const splitSkills = (skills = "") =>
  String(skills)
    .split(/[\/,|]/)
    .map((skill) => skill.trim())
    .filter(Boolean);

const normalizeText = (value, fallback = "") =>
  typeof value === "string" ? value.trim() || fallback : fallback;

const deriveQuestionLimit = (experience = "") => {
  const normalized = experience.toLowerCase();

  if (normalized.includes("senior") || normalized.includes("5")) {
    return 6;
  }

  if (normalized.includes("intern") || normalized.includes("beginner")) {
    return 4;
  }

  return DEFAULT_QUESTION_LIMIT;
};

export const buildCareerSnapshot = (choice) => ({
  interest: normalizeText(choice?.interest),
  skills: splitSkills(choice?.skills),
  education: normalizeText(choice?.education),
  experience: normalizeText(choice?.experience),
  careerGoal: normalizeText(choice?.careergoal),
  availability: normalizeText(choice?.availabilty),
  timeConstraint: normalizeText(choice?.timeconstraint),
});

export const getCareerChoiceForInterview = async (userId) => {
  const choice = await CareerChoice.findOne({ userId }).lean();

  if (!choice) {
    const error = new Error("Career choice not found");
    error.statusCode = 404;
    throw error;
  }

  const snapshot = buildCareerSnapshot(choice);

  if (!snapshot.careerGoal) {
    const error = new Error("Career goal is required to start an interview");
    error.statusCode = 400;
    throw error;
  }

  return { choice, snapshot };
};

export const createInterviewSession = async (userId, options = {}) => {
  const { snapshot } = await getCareerChoiceForInterview(userId);
  const questionLimit = Math.min(
    Math.max(Number(options.questionLimit) || deriveQuestionLimit(snapshot.experience), 3),
    7,
  );

  await InterviewSession.updateMany(
    { userId, status: "active" },
    { status: "abandoned", completedAt: new Date() },
  );

  const plan = await generateInterviewPlan({
    careerSnapshot: snapshot,
    questionLimit,
    interviewType: options.interviewType || "technical_screen",
  });

  const session = await InterviewSession.create({
    userId,
    status: "active",
    targetRole: plan.targetRole,
    interviewType: plan.interviewType,
    experienceLevel: snapshot.experience || "unspecified",
    questionLimit: plan.questionLimit,
    currentQuestionIndex: 0,
    primarySkills: plan.primarySkills,
    focusAreas: plan.focusAreas,
    careerSnapshot: snapshot,
    planMeta: {
      title: plan.title,
      interviewerStyle: plan.interviewerStyle,
      rubric: plan.rubric,
    },
    questionPlan: plan.questions,
  });

  return session;
};

export const getCurrentQuestion = (session) =>
  session.questionPlan?.[session.currentQuestionIndex] || null;

export const answerInterviewQuestion = async (session, answer) => {
  const currentQuestion = getCurrentQuestion(session);

  if (!currentQuestion) {
    const error = new Error("No remaining questions in this session");
    error.statusCode = 400;
    throw error;
  }

  const evaluation = await evaluateQuestionAnswer({
    careerSnapshot: session.careerSnapshot,
    targetRole: session.targetRole,
    question: currentQuestion,
    answer,
  });

  session.transcript.push({
    order: session.currentQuestionIndex + 1,
    questionId: currentQuestion.questionId,
    question: currentQuestion.prompt,
    topic: currentQuestion.topic,
    competency: currentQuestion.competency,
    difficulty: currentQuestion.difficulty,
    answer,
    evaluation,
    askedAt: new Date(),
    answeredAt: new Date(),
  });

  session.currentQuestionIndex += 1;

  if (session.currentQuestionIndex >= session.questionLimit) {
    session.status = "completed";
    session.completedAt = new Date();
    session.finalReport = await buildSessionAnalytics(session);
  }

  await session.save();

  return {
    evaluation,
    completed: session.status === "completed",
    nextQuestion: session.status === "completed" ? null : getCurrentQuestion(session),
    finalReport: session.status === "completed" ? session.finalReport : null,
  };
};

export const completeInterviewSession = async (session) => {
  if (session.status !== "completed") {
    session.status = "completed";
    session.completedAt = new Date();
    session.finalReport = await buildSessionAnalytics(session);
    await session.save();
  }

  return session.finalReport;
};

export const getInterviewOverview = async (userId) => {
  const sessions = await InterviewSession.find({ userId, status: "completed" })
    .sort({ completedAt: -1 })
    .lean();

  return buildPortfolioAnalytics(sessions);
};
