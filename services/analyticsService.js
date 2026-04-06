import { generateJson, isAiAvailable } from "./aiService.js";

const average = (values) => {
  if (!values.length) {
    return 0;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
};

const pickTopItems = (items = [], count = 3) =>
  [...new Set(items.filter(Boolean))].slice(0, count);

const inferReadiness = (score) => {
  if (score >= 85) return "strong";
  if (score >= 70) return "nearly_ready";
  if (score >= 55) return "developing";
  return "needs_foundation";
};

const inferTrend = (sessions) => {
  if (sessions.length < 2) {
    return "insufficient_data";
  }

  const [latest, previous] = sessions;
  const delta = (latest?.finalReport?.overallScore || 0) - (previous?.finalReport?.overallScore || 0);

  if (delta >= 5) return "improving";
  if (delta <= -5) return "declining";
  return "stable";
};

const sanitizeSessionAnalytics = (result, fallback) => ({
  overallScore: Number.isFinite(Number(result?.overallScore))
    ? Math.max(0, Math.min(100, Math.round(Number(result.overallScore))))
    : fallback.overallScore,
  technicalAccuracy: Number.isFinite(Number(result?.technicalAccuracy))
    ? Math.max(0, Math.min(100, Math.round(Number(result.technicalAccuracy))))
    : fallback.technicalAccuracy,
  problemSolving: Number.isFinite(Number(result?.problemSolving))
    ? Math.max(0, Math.min(100, Math.round(Number(result.problemSolving))))
    : fallback.problemSolving,
  communication: Number.isFinite(Number(result?.communication))
    ? Math.max(0, Math.min(100, Math.round(Number(result.communication))))
    : fallback.communication,
  strengths: Array.isArray(result?.strengths) && result.strengths.length
    ? result.strengths.slice(0, 4)
    : fallback.strengths,
  improvementAreas: Array.isArray(result?.improvementAreas) && result.improvementAreas.length
    ? result.improvementAreas.slice(0, 4)
    : fallback.improvementAreas,
  readiness:
    ["strong", "nearly_ready", "developing", "needs_foundation"].includes(result?.readiness)
      ? result.readiness
      : fallback.readiness,
  trend: result?.trend || fallback.trend,
  summary: result?.summary || fallback.summary,
  recommendation: result?.recommendation || fallback.recommendation,
});

export const buildSessionAnalytics = async (session) => {
  const transcript = session.transcript || [];
  const overallScore = average(transcript.map((entry) => entry.evaluation.overallScore));
  const technicalAccuracy = average(
    transcript.map((entry) => entry.evaluation.technicalAccuracy),
  );
  const problemSolving = average(transcript.map((entry) => entry.evaluation.problemSolving));
  const communication = average(transcript.map((entry) => entry.evaluation.communication));
  const strengths = pickTopItems(
    transcript.flatMap((entry) => entry.evaluation.strengths || []),
  );
  const improvementAreas = pickTopItems(
    transcript.flatMap((entry) => entry.evaluation.improvementAreas || []),
    4,
  );

  const fallback = {
    overallScore,
    technicalAccuracy,
    problemSolving,
    communication,
    strengths,
    improvementAreas,
    readiness: inferReadiness(overallScore),
    trend: "stable",
    summary:
      overallScore >= 70
        ? "The candidate shows promising interview readiness with clear areas to sharpen."
        : "The candidate needs more structured practice before high-stakes interviews.",
    recommendation:
      improvementAreas[0] ||
      "Practice concise technical explanations and use concrete examples in answers.",
  };

  if (!isAiAvailable() || !transcript.length) {
    return fallback;
  }

  const result = await generateJson(
    `
You are generating a final interview report for a technical interview platform.

Return STRICT JSON:
{
  "overallScore": number,
  "technicalAccuracy": number,
  "problemSolving": number,
  "communication": number,
  "strengths": ["..."],
  "improvementAreas": ["..."],
  "readiness": "strong|nearly_ready|developing|needs_foundation",
  "trend": "stable",
  "summary": "...",
  "recommendation": "..."
}

Role: ${session.targetRole}
Skills: ${(session.primarySkills || []).join(", ")}
Transcript:
${transcript
  .map(
    (entry) => `
Question ${entry.order}: ${entry.question}
Topic: ${entry.topic}
Answer: ${entry.answer}
Evaluation: ${entry.evaluation.feedback}
Score: ${entry.evaluation.overallScore}
Strengths: ${(entry.evaluation.strengths || []).join(", ")}
Improvement Areas: ${(entry.evaluation.improvementAreas || []).join(", ")}
`,
  )
  .join("\n")}
`,
    () => fallback,
  );

  return sanitizeSessionAnalytics(result, fallback);
};

export const buildPortfolioAnalytics = (sessions) => {
  const completedSessions = sessions.filter((session) => session.status === "completed");
  const scores = completedSessions.map((session) => session.finalReport?.overallScore || 0);

  return {
    totalSessions: completedSessions.length,
    averageOverallScore: average(scores),
    latestScore: scores[0] || 0,
    bestScore: scores.length ? Math.max(...scores) : 0,
    trend: inferTrend(completedSessions),
    recentSessions: completedSessions.slice(0, 10).map((session) => ({
      id: session._id,
      targetRole: session.targetRole,
      completedAt: session.completedAt,
      overallScore: session.finalReport?.overallScore || 0,
      readiness: session.finalReport?.readiness || "developing",
      improvementAreas: session.finalReport?.improvementAreas || [],
    })),
  };
};
