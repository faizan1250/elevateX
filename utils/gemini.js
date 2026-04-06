import { buildCareerSnapshot, normalizeSkillsDetailed } from "../services/careerChoiceService.js";
import { generateJson, getAiProviderSummary, isAiAvailable } from "../services/aiService.js";

const uniq = (items = []) => [...new Set(items.filter(Boolean))];

const defaultPlan = (userChoice) => {
  const snapshot = buildCareerSnapshot(userChoice);
  const topSkills = snapshot.skills.length ? snapshot.skills : ["Communication", "Execution"];
  const targetRole = snapshot.careerGoal || "Career Accelerator Track";

  return {
    version: "career-os-v2",
    generatedAt: new Date().toISOString(),
    provider: isAiAvailable() ? "ai-fallback" : "local-fallback",
    targetRole,
    archetype: {
      label: "Emerging builder",
      rationale: "Early profile signal set with room to specialize through execution.",
    },
    executiveSummary: {
      headline: `A focused plan to move toward ${targetRole}.`,
      opportunityNarrative:
        "This plan emphasizes compounding skill depth, visible proof of work, and concrete market readiness.",
      primaryConstraints: [
        snapshot.timeConstraint || "Timeline is still broad",
        snapshot.availability || "Weekly availability is still flexible",
      ],
      strategicAdvantage: topSkills[0] || "Execution",
    },
    skills: {
      foundation: topSkills.slice(0, 3),
      intermediate: uniq([topSkills[1], "Applied Problem Solving", "Portfolio Execution"]).slice(0, 3),
      advanced: uniq([`${targetRole} Systems Thinking`, "Performance Optimization"]).slice(0, 3),
      soft_skills: ["Communication", "Decision Making", "Stakeholder Alignment"],
    },
    roadmap: [
      {
        phase: "Phase 1: Baseline and positioning",
        duration_weeks: 3,
        description: "Clarify target role, establish fundamentals, and create a measurable baseline.",
        milestones: [
          "Define target roles and success metrics",
          "Assess current strengths and weaknesses",
          "Publish first proof-of-work artifact",
        ],
        tools_to_focus: topSkills.slice(0, 3),
      },
      {
        phase: "Phase 2: Build public evidence",
        duration_weeks: 6,
        description: "Ship visible projects and convert learning into recruiter-readable signals.",
        milestones: [
          "Complete one portfolio-grade project",
          "Document tradeoffs and outcomes",
          "Improve resume and outreach assets",
        ],
        tools_to_focus: uniq([...topSkills, "GitHub"]).slice(0, 4),
      },
      {
        phase: "Phase 3: Market conversion",
        duration_weeks: 4,
        description: "Move from preparation to targeted applications, networking, and interview execution.",
        milestones: [
          "Build target company list",
          "Run outreach and application cadence",
          "Practice interviews with feedback loops",
        ],
        tools_to_focus: ["LinkedIn", "Resume", "Mock Interviews"],
      },
    ],
    milestones: [
      {
        title: "Baseline profile scored",
        type: "skill",
        status: "active",
        aiGenerated: true,
        xpReward: 80,
      },
      {
        title: "Portfolio proof shipped",
        type: "project",
        status: "locked",
        aiGenerated: true,
        xpReward: 180,
      },
      {
        title: "First 20 targeted applications",
        type: "application",
        status: "locked",
        aiGenerated: true,
        xpReward: 220,
      },
    ],
    projects: [
      {
        name: `${targetRole} showcase project`,
        difficulty: "Intermediate",
        description: "A portfolio asset designed to prove role-fit, judgment, and execution quality.",
        focus_skills: topSkills.slice(0, 4),
        expected_outcome: "A public case study plus deployable artifact.",
      },
      {
        name: "Metrics and optimization sprint",
        difficulty: "Advanced",
        description: "Improve an existing project using instrumentation, performance, and user-facing iteration.",
        focus_skills: uniq([...topSkills, "Analytics"]),
        expected_outcome: "A stronger portfolio narrative with measurable before/after results.",
      },
    ],
    resources: {
      online_courses: ["Role-specific deep dive", "Applied portfolio workshop"],
      books: ["Designing Data-Intensive Applications", "The Pragmatic Programmer"],
      tools: uniq([...topSkills, "GitHub", "Notion"]),
      communities: ["LinkedIn niche communities", "Discord builders group", "Local meetup circles"],
    },
    job_search_strategy: {
      applicationTargetsPerWeek: 8,
      networkingTouchesPerWeek: 5,
      portfolioPriority: "Ship one high-quality, deeply explained project before scaling applications.",
      interviewFocusAreas: uniq([...topSkills, "Storytelling", "System tradeoffs"]).slice(0, 5),
    },
    market_signals: {
      hiringHeat: "medium",
      demandDrivers: ["AI adoption", "Cost-efficient builders", "Full-stack execution"],
      emergingSkills: uniq([...topSkills, "AI-assisted workflows"]).slice(0, 5),
      riskFlags: ["Crowded entry-level funnel", "Weak proof-of-work signals"],
    },
    analytics: {
      readinessScore: 56,
      executionRisk: "medium",
      estimatedWeeksToMarketReady: 12,
      strengths: topSkills.slice(0, 3),
      gaps: ["Portfolio signal density", "Interview repetition", "Network depth"],
      momentumLevers: [
        "Ship publicly every two weeks",
        "Convert learning into artifacts",
        "Track applications and feedback loops",
      ],
    },
    career_outlook: {
      roles: uniq([targetRole, ...snapshot.targetRoles]).slice(0, 4),
      salary_range: "$70k-$140k depending on region, evidence, and role seniority",
      industry_trends: ["AI-native tooling", "Lean teams valuing end-to-end builders", "Measured portfolio proof"],
    },
    weekly_briefing_seed: {
      summary: `This week should focus on converting ${topSkills[0] || "your strengths"} into visible proof-of-work.`,
      topWin: "A completed artifact that demonstrates applied ability.",
      suggestedFocus: "Execution quality over broad exploration.",
    },
    note: "Fallback plan used because the primary AI response was unavailable or invalid.",
  };
};

const systemPrompt = `
You are the strategy engine for ElevateX CareerOS.
Your output powers the user's core product experience, analytics dashboard, and recurring engagement loops.

You must think like:
- a world-class career strategist
- a startup product operator obsessed with retention
- a recruiter who understands proof-of-work
- a YC founder designing a data flywheel

Always return strict JSON only.
Do not use markdown.
Do not include commentary outside the JSON object.
`.trim();

const buildPrompt = (userChoice) => {
  const snapshot = buildCareerSnapshot(userChoice);
  const detailedSkills = normalizeSkillsDetailed(userChoice?.skillsDetailed, userChoice?.skills).slice(0, 10);
  const provider = getAiProviderSummary();

  return `
Generate a premium AI career operating plan for this user.

Return STRICT JSON with this shape:
{
  "version": "career-os-v2",
  "generatedAt": "ISO date",
  "provider": "groq|gemini|fallback",
  "targetRole": "string",
  "archetype": {
    "label": "string",
    "rationale": "string"
  },
  "executiveSummary": {
    "headline": "string",
    "opportunityNarrative": "string",
    "primaryConstraints": ["string"],
    "strategicAdvantage": "string"
  },
  "skills": {
    "foundation": ["string"],
    "intermediate": ["string"],
    "advanced": ["string"],
    "soft_skills": ["string"]
  },
  "roadmap": [
    {
      "phase": "string",
      "duration_weeks": number,
      "description": "string",
      "milestones": ["string"],
      "tools_to_focus": ["string"]
    }
  ],
  "milestones": [
    {
      "title": "string",
      "type": "skill|project|application|network|resume|interview|custom",
      "status": "locked|active|completed",
      "aiGenerated": true,
      "xpReward": number
    }
  ],
  "projects": [
    {
      "name": "string",
      "difficulty": "Beginner|Intermediate|Advanced",
      "description": "string",
      "focus_skills": ["string"],
      "expected_outcome": "string"
    }
  ],
  "resources": {
    "online_courses": ["string"],
    "books": ["string"],
    "tools": ["string"],
    "communities": ["string"]
  },
  "job_search_strategy": {
    "applicationTargetsPerWeek": number,
    "networkingTouchesPerWeek": number,
    "portfolioPriority": "string",
    "interviewFocusAreas": ["string"]
  },
  "market_signals": {
    "hiringHeat": "low|medium|high",
    "demandDrivers": ["string"],
    "emergingSkills": ["string"],
    "riskFlags": ["string"]
  },
  "analytics": {
    "readinessScore": number,
    "executionRisk": "low|medium|high",
    "estimatedWeeksToMarketReady": number,
    "strengths": ["string"],
    "gaps": ["string"],
    "momentumLevers": ["string"]
  },
  "career_outlook": {
    "roles": ["string"],
    "salary_range": "string",
    "industry_trends": ["string"]
  },
  "weekly_briefing_seed": {
    "summary": "string",
    "topWin": "string",
    "suggestedFocus": "string"
  },
  "note": "string"
}

Rules:
- The plan must be specific, practical, and ambitious.
- Assume this JSON will directly drive UI cards, charts, weekly briefings, and milestone tracking.
- Keep every array populated with meaningful entries.
- Skills should escalate logically from foundation to advanced.
- Roadmap must contain 3 to 5 phases.
- Projects must be portfolio-grade, not toy ideas.
- Analytics must be honest and non-generic.
- Make the strategy reflect the user's constraints, current profile, and target role.
- If the target role is vague, infer the strongest realistic role path from the profile.

User profile:
${JSON.stringify(
    {
      snapshot,
      skillsDetailed: detailedSkills,
      workStyleDNA: userChoice?.workStyleDNA || {},
      careerVector: userChoice?.careerVector || {},
      careerJourney: userChoice?.careerJourney || {},
      growthEngine: userChoice?.growthEngine || {},
    },
    null,
    2,
  )}

Available providers:
${JSON.stringify(provider, null, 2)}
`.trim();
};

const validatePlan = (plan) =>
  Boolean(
    plan &&
      plan.skills &&
      plan.roadmap &&
      plan.projects &&
      plan.resources &&
      plan.analytics &&
      plan.job_search_strategy,
  );

export const generateCareerPlan = async (userChoice) => {
  const fallback = defaultPlan(userChoice);

  if (!isAiAvailable()) {
    return fallback;
  }

  try {
    const plan = await generateJson(
      buildPrompt(userChoice),
      (rawText) => ({
        ...fallback,
        rawModelText: rawText,
      }),
      { systemPrompt },
    );

    if (!validatePlan(plan)) {
      return fallback;
    }

    return {
      ...fallback,
      ...plan,
      version: plan.version || "career-os-v2",
      generatedAt: plan.generatedAt || new Date().toISOString(),
      provider: plan.provider || "groq",
    };
  } catch (error) {
    console.error("❌ Career plan generation failed, using fallback:", error.message);
    return fallback;
  }
};
