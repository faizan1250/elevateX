import Application from "../models/Application.js";
import CareerChoice from "../models/CareerChoice.js";
import Certificate from "../models/Certificate.js";
import InterviewSession from "../models/InterviewSession.js";
import PortfolioAsset from "../models/PortfolioAsset.js";
import ProjectSubmission from "../models/ProjectSubmission.js";
import ResumeVersion from "../models/ResumeVersion.js";
import SkillProgress from "../models/SkillProgress.js";
import User from "../models/User.js";
import { buildPortfolioAnalytics } from "./analyticsService.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const PIPELINE_STAGES = ["wishlist", "applied", "oa", "interview", "offer", "rejected"];

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const average = (items = []) => {
  if (!items.length) return 0;
  return Math.round(items.reduce((sum, item) => sum + item, 0) / items.length);
};

const startOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const toDateKey = (value) => startOfDay(value).toISOString().slice(0, 10);

const buildDateSeries = (days) => {
  const today = startOfDay();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today.getTime() - ((days - index - 1) * DAY_MS));
    return {
      date: toDateKey(date),
      value: 0,
    };
  });
};

const fillSeries = (days, events = [], field = "updatedAt") => {
  const series = buildDateSeries(days);
  const indexMap = new Map(series.map((item, index) => [item.date, index]));

  events.forEach((event) => {
    const stamp = event?.[field];
    if (!stamp) return;
    const key = toDateKey(stamp);
    const index = indexMap.get(key);
    if (index === undefined) return;
    series[index].value += 1;
  });

  return series;
};

const cumulativeSeries = (days, events = [], field = "updatedAt") => {
  const series = fillSeries(days, events, field);
  let running = 0;
  return series.map((item) => {
    running += item.value;
    return { ...item, value: running };
  });
};

const inferTrendLabel = (series = []) => {
  if (series.length < 2) return "stable";
  const midpoint = Math.floor(series.length / 2);
  const firstHalf = series.slice(0, midpoint).reduce((sum, item) => sum + item.value, 0);
  const secondHalf = series.slice(midpoint).reduce((sum, item) => sum + item.value, 0);
  if (secondHalf > firstHalf) return "improving";
  if (secondHalf < firstHalf) return "slipping";
  return "stable";
};

const serializeApplication = (application) => ({
  id: String(application._id),
  company: application.company,
  role: application.role,
  status: application.status,
  source: application.source,
  jobUrl: application.jobUrl,
  notes: application.notes,
  priority: application.priority,
  lastActivityAt: application.lastActivityAt,
  updatedAt: application.updatedAt,
  resumeVersionId: application.resumeVersionId
    ? String(application.resumeVersionId._id || application.resumeVersionId)
    : null,
  resumeTitle: application.resumeVersionId?.title || "",
  portfolioAssetIds: Array.isArray(application.portfolioAssetIds)
    ? application.portfolioAssetIds.map((asset) => String(asset._id || asset))
    : [],
  portfolioTitles: Array.isArray(application.portfolioAssetIds)
    ? application.portfolioAssetIds.map((asset) => asset.title).filter(Boolean)
    : [],
});

const buildPipeline = (applications = []) => {
  const grouped = Object.fromEntries(
    PIPELINE_STAGES.map((stage) => [stage, []]),
  );

  applications.forEach((application) => {
    grouped[application.status]?.push(serializeApplication(application));
  });

  return {
    stages: PIPELINE_STAGES.map((stage) => ({
      key: stage,
      label: stage === "oa" ? "OA" : stage.charAt(0).toUpperCase() + stage.slice(1),
      count: grouped[stage].length,
      items: grouped[stage],
    })),
    totals: {
      all: applications.length,
      active: applications.filter((item) => !["offer", "rejected"].includes(item.status)).length,
      interviews: grouped.interview.length,
      offers: grouped.offer.length,
    },
  };
};

const buildReadiness = ({
  careerChoice,
  skillProgress,
  interviewAnalytics,
  resumeVersions,
  projects,
  certificates,
  applications,
  portfolioAssets,
}) => {
  const completedSkills = skillProgress.filter((item) => item.status === "completed").length;
  const inProgressSkills = skillProgress.filter((item) => item.status === "in_progress").length;
  const totalSkills = skillProgress.length || Math.max(completedSkills + inProgressSkills, 1);
  const skillsScore = clamp(Math.round(((completedSkills * 1) + (inProgressSkills * 0.55)) / totalSkills * 100));
  const resumeBest = resumeVersions.length
    ? Math.max(...resumeVersions.map((item) => item.scorecard?.overall || 0))
    : 0;
  const interviewScore = interviewAnalytics.averageOverallScore || 0;
  const portfolioScore = clamp(
    Math.min(100, (projects.length * 16) + (portfolioAssets.length * 18) + (resumeBest >= 70 ? 12 : 0)),
  );
  const proofScore = clamp(
    Math.min(100, (certificates.length * 18) + (projects.length * 10) + (portfolioAssets.length * 12) + (applications.length >= 3 ? 10 : 0)),
  );

  return {
    targetRole: careerChoice?.careergoal || careerChoice?.interest || "Not set",
    items: [
      {
        key: "resume",
        label: "Resume",
        score: resumeBest,
        detail: resumeVersions.length
          ? `${resumeVersions.length} versions, best score ${resumeBest}`
          : "No resume versions yet",
      },
      {
        key: "interview",
        label: "Interview",
        score: interviewScore,
        detail: interviewAnalytics.totalSessions
          ? `${interviewAnalytics.totalSessions} completed sessions`
          : "No interview sessions yet",
      },
      {
        key: "skills",
        label: "Skills",
        score: skillsScore,
        detail: `${completedSkills} completed, ${inProgressSkills} in progress`,
      },
      {
        key: "portfolio",
        label: "Portfolio",
        score: portfolioScore,
        detail: portfolioAssets.length || projects.length
          ? `${portfolioAssets.length} portfolio assets, ${projects.length} shipped projects`
          : "No portfolio proof linked yet",
      },
      {
        key: "proof",
        label: "Proof",
        score: proofScore,
        detail: `${certificates.length} certificates, ${projects.length} projects`,
      },
    ],
  };
};

const buildHero = ({ user, readiness, applications, momentumScore, focusTasks }) => {
  const hireabilityScore = clamp(
    Math.round(
      (readiness.items.find((item) => item.key === "resume")?.score || 0) * 0.3 +
        (readiness.items.find((item) => item.key === "interview")?.score || 0) * 0.2 +
        (readiness.items.find((item) => item.key === "skills")?.score || 0) * 0.2 +
        (readiness.items.find((item) => item.key === "portfolio")?.score || 0) * 0.15 +
        (readiness.items.find((item) => item.key === "proof")?.score || 0) * 0.15,
    ),
  );

  return {
    welcomeName: user?.username || "Builder",
    hireabilityScore,
    targetRole: readiness.targetRole,
    nextBestAction: focusTasks[0] || {
      title: "Create your first application target",
      detail: "Pick one company and start a focused prep loop.",
      category: "momentum",
      impact: "high",
    },
    momentum: {
      score: momentumScore,
      activeApplications: applications.filter((item) => !["offer", "rejected"].includes(item.status)).length,
      interviewsInFlight: applications.filter((item) => item.status === "interview").length,
    },
  };
};

const buildFocusTasks = ({
  readiness,
  applications,
  interviewAnalytics,
  resumeVersions,
  projects,
  portfolioAssets,
}) => {
  const tasks = [];
  const resumeScore = readiness.items.find((item) => item.key === "resume")?.score || 0;
  const interviewScore = readiness.items.find((item) => item.key === "interview")?.score || 0;
  const skillsScore = readiness.items.find((item) => item.key === "skills")?.score || 0;
  const portfolioScore = readiness.items.find((item) => item.key === "portfolio")?.score || 0;

  if (!applications.length) {
    tasks.push({
      title: "Start your first target pipeline",
      detail: "Add 3 companies to wishlist so the dashboard can prioritize prep against real opportunities.",
      category: "applications",
      impact: "high",
    });
  }

  if (resumeScore < 75) {
    tasks.push({
      title: "Raise your best resume version above 75",
      detail: "Your resume is still below a strong recruiter-ready threshold. Tighten bullets and analyze again.",
      category: "resume",
      impact: "high",
    });
  }

  if (interviewScore < 70) {
    tasks.push({
      title: "Run one mock interview session",
      detail: interviewAnalytics.totalSessions
        ? `Your current interview average is ${interviewScore}. Push one more role-specific session today.`
        : "No interview baseline yet. Create one completed session to unlock meaningful coaching.",
      category: "interview",
      impact: "high",
    });
  }

  if (skillsScore < 65) {
    tasks.push({
      title: "Close one blocked skill gap",
      detail: "Complete one in-progress skill so your readiness score starts compounding.",
      category: "skills",
      impact: "medium",
    });
  }

  if (portfolioScore < 60) {
    tasks.push({
      title: "Add one proof-driven project",
      detail: portfolioAssets.length || projects.length
        ? "You have some proof, but not enough case-study density yet. Add another asset or strengthen one with metrics."
        : "Your dashboard needs at least one portfolio asset to support applications.",
      category: "portfolio",
      impact: "high",
    });
  }

  const recentResume = resumeVersions[0];
  if (recentResume?.analysis?.recommendations?.length) {
    tasks.push({
      title: "Resolve the top resume recommendation",
      detail: recentResume.analysis.recommendations[0],
      category: "resume",
      impact: "medium",
    });
  }

  return tasks.slice(0, 3);
};

const isCallbackStage = (status = "") => ["oa", "interview", "offer"].includes(status);

const buildAttribution = ({ applications, resumeVersions, portfolioAssets }) => {
  const resumeMap = new Map(
    resumeVersions.map((version) => [
      String(version._id),
      {
        id: String(version._id),
        title: version.title,
        callbacks: 0,
        uses: 0,
      },
    ]),
  );
  const portfolioMap = new Map(
    portfolioAssets.map((asset) => [
      String(asset._id),
      {
        id: String(asset._id),
        title: asset.title,
        callbacks: 0,
        uses: 0,
      },
    ]),
  );

  applications.forEach((application) => {
    const callback = isCallbackStage(application.status);
    if (application.resumeVersionId) {
      const id = String(application.resumeVersionId._id || application.resumeVersionId);
      const entry = resumeMap.get(id);
      if (entry) {
        entry.uses += 1;
        if (callback) entry.callbacks += 1;
      }
    }
    (application.portfolioAssetIds || []).forEach((asset) => {
      const id = String(asset._id || asset);
      const entry = portfolioMap.get(id);
      if (entry) {
        entry.uses += 1;
        if (callback) entry.callbacks += 1;
      }
    });
  });

  const decorate = (entry) => ({
    ...entry,
    callbackRate: entry.uses ? Math.round((entry.callbacks / entry.uses) * 100) : 0,
  });

  return {
    resumeVersions: [...resumeMap.values()]
      .map(decorate)
      .sort((a, b) => b.callbackRate - a.callbackRate || b.callbacks - a.callbacks)
      .slice(0, 5),
    portfolioAssets: [...portfolioMap.values()]
      .map(decorate)
      .sort((a, b) => b.callbackRate - a.callbackRate || b.callbacks - a.callbacks)
      .slice(0, 5),
  };
};

const buildInsights = ({ readiness, interviewAnalytics, applications, resumeVersions }) => {
  const weakest = [...readiness.items].sort((a, b) => a.score - b.score)[0];
  const bestResume = [...resumeVersions].sort(
    (a, b) => (b.scorecard?.overall || 0) - (a.scorecard?.overall || 0),
  )[0];
  const risks = [];
  const blockers = [];
  const guidance = [];

  if (weakest) {
    risks.push(`${weakest.label} is your weakest readiness surface at ${weakest.score}/100.`);
  }

  if (!applications.length) {
    blockers.push("No live applications means the system cannot optimize prep against real targets.");
  }

  if (!interviewAnalytics.totalSessions) {
    blockers.push("Interview analytics are missing because no completed sessions exist yet.");
  } else if (interviewAnalytics.trend === "declining") {
    risks.push("Interview trend is slipping. Practice before adding more live interviews.");
  }

  if (bestResume?.analysis?.gaps?.length) {
    risks.push(bestResume.analysis.gaps[0]);
  }

  guidance.push(
    bestResume?.analysis?.recommendations?.[0] ||
      "Tighten your resume narrative so it mirrors the role and proves impact.",
  );
  guidance.push(
    interviewAnalytics.recentSessions?.[0]?.improvementAreas?.[0] ||
      "Use mock interview feedback to improve one repeated communication gap.",
  );

  return {
    guidance: guidance.filter(Boolean).slice(0, 3),
    risks: risks.slice(0, 3),
    blockers: blockers.slice(0, 3),
    trends: [
      `Interview trend: ${interviewAnalytics.trend || "insufficient_data"}`,
      `Application momentum: ${applications.length ? "active" : "not_started"}`,
      `Best resume score: ${bestResume?.scorecard?.overall || 0}`,
    ],
  };
};

const buildAssets = ({ resumeVersions, projects, certificates, portfolioAssets, attribution }) => ({
  resumeVersions: resumeVersions
    .slice(0, 4)
    .map((version) => ({
      id: String(version._id),
      title: version.title,
      targetRole: version.targetRole,
      targetCompany: version.targetCompany,
      score: version.scorecard?.overall || 0,
      status: version.status,
      templateId: version.templateId,
      updatedAt: version.updatedAt,
    })),
  projects: projects.slice(0, 4).map((project) => ({
    id: String(project._id),
    title: project.projectTitle,
    link: project.githubLink,
    submittedAt: project.submittedAt,
  })),
  certificates: certificates.slice(0, 4).map((certificate) => ({
    id: String(certificate._id),
    score: certificate.score,
    issuedAt: certificate.issuedAt,
    certificateUrl: certificate.certificateUrl || "",
  })),
  portfolioAssets: portfolioAssets.slice(0, 4).map((asset) => ({
    id: String(asset._id),
    title: asset.title,
    type: asset.type,
    description: asset.description,
    link: asset.link,
    metrics: asset.metrics || [],
    updatedAt: asset.updatedAt,
  })),
  attribution,
});

const buildAnalytics = ({ skills, resumes, interviews, applications }) => {
  const sevenDayEvents = [...skills, ...resumes, ...interviews, ...applications];
  const thirtyDayEvents = sevenDayEvents;

  return {
    sevenDayMovement: fillSeries(7, sevenDayEvents),
    thirtyDayMovement: fillSeries(30, thirtyDayEvents),
    applicationTrend: cumulativeSeries(30, applications, "updatedAt"),
    resumeTrend: cumulativeSeries(30, resumes, "updatedAt"),
    labels: {
      sevenDay: inferTrendLabel(fillSeries(7, sevenDayEvents)),
      thirtyDay: inferTrendLabel(fillSeries(30, thirtyDayEvents)),
    },
  };
};

export const buildDashboardWorkspace = async (userId) => {
  const [
    user,
    careerChoice,
    skillProgress,
    resumeVersions,
    applications,
    projects,
    certificates,
    portfolioAssets,
    interviewSessions,
  ] = await Promise.all([
    User.findById(userId).lean(),
    CareerChoice.findOne({ userId }).lean(),
    SkillProgress.find({ userId }).sort({ updatedAt: -1 }).lean(),
    ResumeVersion.find({ userId }).sort({ updatedAt: -1 }).limit(12).lean(),
    Application.find({ userId })
      .populate("resumeVersionId", "title")
      .populate("portfolioAssetIds", "title")
      .sort({ updatedAt: -1 })
      .limit(40),
    ProjectSubmission.find({ userId }).sort({ submittedAt: -1 }).lean(),
    Certificate.find({ userId }).sort({ issuedAt: -1 }).lean(),
    PortfolioAsset.find({ userId }).sort({ updatedAt: -1 }).limit(20).lean(),
    InterviewSession.find({ userId, status: "completed" }).sort({ completedAt: -1 }).lean(),
  ]);

  const interviewAnalytics = buildPortfolioAnalytics(interviewSessions);
  const readiness = buildReadiness({
    careerChoice,
    skillProgress,
    interviewAnalytics,
    resumeVersions,
    projects,
    certificates,
    applications,
    portfolioAssets,
  });
  const momentumScore = clamp(
    Math.round(
      (applications.length * 8) +
        (interviewAnalytics.totalSessions * 6) +
        (skillProgress.filter((item) => item.status === "completed").length * 5) +
        (resumeVersions.length ? Math.max(...resumeVersions.map((item) => item.scorecard?.overall || 0)) * 0.15 : 0),
    ),
  );
  const focusTasks = buildFocusTasks({
    readiness,
    applications,
    interviewAnalytics,
    resumeVersions,
    projects,
    portfolioAssets,
  });
  const attribution = buildAttribution({
    applications,
    resumeVersions,
    portfolioAssets,
  });

  return {
    spec: {
      version: "dashboard-v1",
      sections: [
        "hero",
        "focus",
        "pipeline",
        "readiness",
        "insights",
        "assets",
        "analytics",
      ],
    },
    hero: buildHero({ user, readiness, applications, momentumScore, focusTasks }),
    focus: {
      tasks: focusTasks,
    },
    pipeline: buildPipeline(applications),
    readiness,
    insights: buildInsights({
      readiness,
      interviewAnalytics,
      applications,
      resumeVersions,
    }),
    assets: buildAssets({ resumeVersions, projects, certificates, portfolioAssets, attribution }),
    analytics: buildAnalytics({
      skills: skillProgress,
      resumes: resumeVersions,
      portfolioAssets,
      interviews: interviewSessions,
      applications,
    }),
  };
};
