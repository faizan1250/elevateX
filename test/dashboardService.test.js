import { jest } from "@jest/globals";

const userModel = { findById: jest.fn() };
const careerChoiceModel = { findOne: jest.fn() };
const skillProgressModel = { find: jest.fn() };
const resumeVersionModel = { find: jest.fn() };
const applicationModel = { find: jest.fn() };
const projectSubmissionModel = { find: jest.fn() };
const certificateModel = { find: jest.fn() };
const portfolioAssetModel = { find: jest.fn() };
const interviewSessionModel = { find: jest.fn() };

jest.unstable_mockModule("../models/User.js", () => ({
  __esModule: true,
  default: userModel,
}));
jest.unstable_mockModule("../models/CareerChoice.js", () => ({
  __esModule: true,
  default: careerChoiceModel,
}));
jest.unstable_mockModule("../models/SkillProgress.js", () => ({
  __esModule: true,
  default: skillProgressModel,
}));
jest.unstable_mockModule("../models/ResumeVersion.js", () => ({
  __esModule: true,
  default: resumeVersionModel,
}));
jest.unstable_mockModule("../models/Application.js", () => ({
  __esModule: true,
  default: applicationModel,
}));
jest.unstable_mockModule("../models/ProjectSubmission.js", () => ({
  __esModule: true,
  default: projectSubmissionModel,
}));
jest.unstable_mockModule("../models/Certificate.js", () => ({
  __esModule: true,
  default: certificateModel,
}));
jest.unstable_mockModule("../models/PortfolioAsset.js", () => ({
  __esModule: true,
  default: portfolioAssetModel,
}));
jest.unstable_mockModule("../models/InterviewSession.js", () => ({
  __esModule: true,
  default: interviewSessionModel,
}));

const { buildDashboardWorkspace } = await import("../services/dashboardService.js");

const withSort = (items) => ({
  sort: jest.fn().mockReturnValue({
    limit: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(items),
    }),
    lean: jest.fn().mockResolvedValue(items),
  }),
  lean: jest.fn().mockResolvedValue(items),
});

describe("dashboardService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("builds a YC-style dashboard workspace from product signals", async () => {
    userModel.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ username: "Faizan" }),
    });
    careerChoiceModel.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        careergoal: "Backend Engineer",
        interest: "Backend Engineering",
      }),
    });
    skillProgressModel.find.mockReturnValue(
      withSort([
        { status: "completed", updatedAt: new Date() },
        { status: "in_progress", updatedAt: new Date() },
      ]),
    );
    resumeVersionModel.find.mockReturnValue(
      withSort([
        {
          _id: "resume-1",
          title: "Backend Resume",
          targetRole: "Backend Engineer",
          targetCompany: "Stripe",
          status: "ready",
          templateId: "modern",
          scorecard: { overall: 82 },
          analysis: {
            recommendations: ["Add distributed systems proof"],
            gaps: ["Missing proof"],
          },
          updatedAt: new Date(),
        },
      ]),
    );
    applicationModel.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                _id: "app-1",
                company: "Stripe",
                role: "Backend Engineer",
                status: "interview",
                source: "LinkedIn",
                jobUrl: "",
                notes: "",
                priority: "high",
                lastActivityAt: new Date(),
                updatedAt: new Date(),
                resumeVersionId: { _id: "resume-1", title: "Backend Resume" },
                portfolioAssetIds: [{ _id: "asset-1", title: "Queue Case Study" }],
              },
            ]),
          }),
        }),
      }),
    });
    projectSubmissionModel.find.mockReturnValue(
      withSort([
        {
          _id: "project-1",
          projectTitle: "Realtime Queue",
          githubLink: "https://github.com/demo",
          submittedAt: new Date(),
        },
      ]),
    );
    certificateModel.find.mockReturnValue(
      withSort([
        {
          _id: "cert-1",
          score: 92,
          issuedAt: new Date(),
          certificateUrl: "/cert.pdf",
        },
      ]),
    );
    portfolioAssetModel.find.mockReturnValue(
      withSort([
        {
          _id: "asset-1",
          title: "Queue Case Study",
          type: "case_study",
          description: "Realtime queue scaling writeup",
          link: "https://portfolio.dev/queue",
          metrics: ["Cut processing latency 34%"],
          updatedAt: new Date(),
        },
      ]),
    );
    interviewSessionModel.find.mockReturnValue(
      withSort([
        {
          _id: "session-1",
          status: "completed",
          targetRole: "Backend Engineer",
          completedAt: new Date(),
          finalReport: {
            overallScore: 74,
            readiness: "developing",
            improvementAreas: ["Explain tradeoffs faster"],
          },
        },
      ]),
    );

    const workspace = await buildDashboardWorkspace("user-1");

    expect(workspace.spec.sections).toContain("hero");
    expect(workspace.hero.targetRole).toBe("Backend Engineer");
    expect(workspace.focus.tasks.length).toBeGreaterThan(0);
    expect(workspace.pipeline.stages.length).toBe(6);
    expect(workspace.readiness.items.length).toBe(5);
    expect(workspace.assets.resumeVersions.length).toBe(1);
    expect(workspace.assets.portfolioAssets.length).toBe(1);
    expect(workspace.assets.attribution.resumeVersions.length).toBeGreaterThan(0);
    expect(workspace.analytics.sevenDayMovement.length).toBe(7);
  });
});
