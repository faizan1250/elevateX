import InterviewSession from "../models/InterviewSession.js";
import {
  answerInterviewQuestion,
  completeInterviewSession,
  createInterviewSession,
  getCareerChoiceForInterview,
  getCurrentQuestion,
  getInterviewOverview,
} from "../services/interviewService.js";

const buildProfileResponse = (snapshot) => ({
  skills: snapshot.skills,
  careerGoal: snapshot.careerGoal,
  experience: snapshot.experience,
  education: snapshot.education,
  interest: snapshot.interest,
  availability: snapshot.availability,
  timeConstraint: snapshot.timeConstraint,
});

const serializeSession = (session) => ({
  id: session._id,
  status: session.status,
  targetRole: session.targetRole,
  interviewType: session.interviewType,
  experienceLevel: session.experienceLevel,
  questionLimit: session.questionLimit,
  currentQuestionIndex: session.currentQuestionIndex,
  primarySkills: session.primarySkills,
  focusAreas: session.focusAreas,
  startedAt: session.startedAt,
  completedAt: session.completedAt,
  planMeta: session.planMeta,
  currentQuestion: session.status === "active" ? getCurrentQuestion(session) : null,
  transcript: session.transcript,
  finalReport: session.finalReport || null,
});

const getOwnedSession = async (req) => {
  const session = await InterviewSession.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });

  if (!session) {
    const error = new Error("Interview session not found");
    error.statusCode = 404;
    throw error;
  }

  return session;
};

const handleInterviewError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);
  return res.status(error.statusCode || 500).json({
    message: error.message || fallbackMessage,
  });
};

export const getProfile = async (req, res) => {
  try {
    const { snapshot } = await getCareerChoiceForInterview(req.user.id);

    res.status(200).json({
      status: "chosen",
      profile: buildProfileResponse(snapshot),
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(200).json({
        status: "not_chosen",
        profile: null,
      });
    }

    return handleInterviewError(res, error, "Failed to load interview profile");
  }
};

export const startInterviewSession = async (req, res) => {
  try {
    const session = await createInterviewSession(req.user.id, req.body || {});

    res.status(201).json({
      message: "Interview session started",
      session: serializeSession(session),
    });
  } catch (error) {
    return handleInterviewError(res, error, "Failed to start interview session");
  }
};

export const submitInterviewAnswer = async (req, res) => {
  try {
    const rawAnswer =
      typeof req.body?.answer === "string"
        ? req.body.answer
        : typeof req.body?.message === "string"
          ? req.body.message
          : "";
    const answer = rawAnswer.trim();

    if (!answer) {
      return res.status(400).json({ message: "Answer is required" });
    }

    const session = await getOwnedSession(req);

    if (session.status !== "active") {
      return res.status(400).json({ message: "Interview session is not active" });
    }

    const result = await answerInterviewQuestion(session, answer);

    res.status(200).json({
      message: result.completed
        ? "Interview completed"
        : "Answer evaluated and next question generated",
      evaluation: result.evaluation,
      nextQuestion: result.nextQuestion,
      completed: result.completed,
      finalReport: result.finalReport,
    });
  } catch (error) {
    return handleInterviewError(res, error, "Failed to evaluate interview answer");
  }
};

export const completeSession = async (req, res) => {
  try {
    const session = await getOwnedSession(req);
    const finalReport = await completeInterviewSession(session);

    res.status(200).json({
      message: "Interview session completed",
      finalReport,
    });
  } catch (error) {
    return handleInterviewError(res, error, "Failed to complete interview session");
  }
};

export const getSession = async (req, res) => {
  try {
    const session = await getOwnedSession(req);
    res.status(200).json({ session: serializeSession(session) });
  } catch (error) {
    return handleInterviewError(res, error, "Failed to load interview session");
  }
};

export const getInterviewHistory = async (req, res) => {
  try {
    const sessions = await InterviewSession.find({
      userId: req.user.id,
      status: "completed",
    })
      .sort({ completedAt: -1 })
      .limit(20);

    res.status(200).json({
      sessions: sessions.map((session) => ({
        id: session._id,
        targetRole: session.targetRole,
        interviewType: session.interviewType,
        completedAt: session.completedAt,
        overallScore: session.finalReport?.overallScore || 0,
        readiness: session.finalReport?.readiness || "developing",
        improvementAreas: session.finalReport?.improvementAreas || [],
      })),
    });
  } catch (error) {
    return handleInterviewError(res, error, "Failed to load interview history");
  }
};

export const getInterviewAnalytics = async (req, res) => {
  try {
    const analytics = await getInterviewOverview(req.user.id);
    res.status(200).json({ analytics });
  } catch (error) {
    return handleInterviewError(res, error, "Failed to load interview analytics");
  }
};
