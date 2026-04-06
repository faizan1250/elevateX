import {
  buildPortfolioAnalytics,
  buildSessionAnalytics,
} from "../services/analyticsService.js";
import {
  evaluateQuestionAnswer,
  generateInterviewPlan,
} from "../services/scoringService.js";

describe("Interview service fallbacks", () => {
  const careerSnapshot = {
    interest: "Distributed systems",
    skills: ["Node.js", "Express", "PostgreSQL", "System Design"],
    education: "B.Tech",
    experience: "Beginner",
    careerGoal: "Backend Engineer",
    availability: "2 hours daily",
    timeConstraint: "3 months",
  };

  it("builds a limited role-specific interview plan without AI", async () => {
    const plan = await generateInterviewPlan({
      careerSnapshot,
      questionLimit: 4,
      interviewType: "technical_screen",
    });

    expect(plan.targetRole).toBe("Backend Engineer");
    expect(plan.interviewType).toBe("technical_screen");
    expect(plan.questions).toHaveLength(4);
    expect(plan.questions[0].prompt).toMatch(/Backend Engineer/i);
  });

  it("evaluates answers with a deterministic fallback rubric", async () => {
    const evaluation = await evaluateQuestionAnswer({
      careerSnapshot,
      targetRole: "Backend Engineer",
      question: {
        questionId: "q-1",
        prompt: "How would you scale a Node.js API?",
        topic: "Node.js",
        competency: "backend fundamentals",
        difficulty: "medium",
        expectedSignals: ["tradeoffs", "caching", "observability"],
      },
      answer:
        "I would scale horizontally behind a load balancer, add caching, make handlers stateless, and monitor p95 latency and errors to validate the design in production.",
    });

    expect(evaluation.overallScore).toBeGreaterThan(0);
    expect(evaluation.technicalAccuracy).toBeGreaterThan(0);
    expect(evaluation.feedback).toMatch(/answer/i);
  });

  it("aggregates a final report and cross-session analytics", async () => {
    const sessionReport = await buildSessionAnalytics({
      targetRole: "Backend Engineer",
      primarySkills: ["Node.js", "System Design"],
      transcript: [
        {
          order: 1,
          question: "How would you design retries?",
          topic: "Reliability",
          answer: "Use idempotency and exponential backoff.",
          evaluation: {
            overallScore: 80,
            technicalAccuracy: 82,
            problemSolving: 78,
            communication: 79,
            strengths: ["Understands reliability basics"],
            improvementAreas: ["Go deeper on observability"],
            feedback: "Solid answer.",
          },
        },
        {
          order: 2,
          question: "How would you profile DB latency?",
          topic: "PostgreSQL",
          answer: "Start with slow-query logs and execution plans.",
          evaluation: {
            overallScore: 74,
            technicalAccuracy: 76,
            problemSolving: 72,
            communication: 75,
            strengths: ["Good debugging instinct"],
            improvementAreas: ["Add indexing tradeoffs"],
            feedback: "Good baseline.",
          },
        },
      ],
    });

    expect(sessionReport.overallScore).toBe(77);
    expect(sessionReport.readiness).toBe("nearly_ready");

    const portfolioAnalytics = buildPortfolioAnalytics([
      {
        _id: "a1",
        status: "completed",
        targetRole: "Backend Engineer",
        completedAt: new Date("2026-04-06T10:00:00.000Z"),
        finalReport: { overallScore: 77, readiness: "nearly_ready", improvementAreas: [] },
      },
      {
        _id: "a0",
        status: "completed",
        targetRole: "Backend Engineer",
        completedAt: new Date("2026-04-05T10:00:00.000Z"),
        finalReport: { overallScore: 68, readiness: "developing", improvementAreas: [] },
      },
    ]);

    expect(portfolioAnalytics.totalSessions).toBe(2);
    expect(portfolioAnalytics.averageOverallScore).toBe(73);
    expect(portfolioAnalytics.trend).toBe("improving");
  });
});
