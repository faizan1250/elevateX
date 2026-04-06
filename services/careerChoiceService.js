const sanitizeString = (value = "") => (typeof value === "string" ? value.trim() : "");

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
};

const uniqStrings = (items = []) => [...new Set(items.map(sanitizeString).filter(Boolean))];

export const splitLooseList = (value) =>
  uniqStrings(
    String(value || "")
      .split(/[\n,|/]+/)
      .map((item) => item.trim()),
  );

const normalizeSkillEntry = (item) => {
  if (typeof item === "string") {
    return {
      name: item.trim(),
      proficiencyScore: 0,
      verifiedBy: "self_reported",
      lastAssessed: null,
      growthRate: 0,
    };
  }

  if (!item || typeof item !== "object") return null;

  const name = sanitizeString(item.name || item.skill);
  if (!name) return null;

  const proficiencyScore = Number.isFinite(Number(item.proficiencyScore))
    ? Math.max(0, Math.min(100, Number(item.proficiencyScore)))
    : 0;

  return {
    name,
    proficiencyScore,
    verifiedBy: sanitizeString(item.verifiedBy) || "self_reported",
    lastAssessed: item.lastAssessed ? new Date(item.lastAssessed) : null,
    growthRate: Number.isFinite(Number(item.growthRate)) ? Number(item.growthRate) : 0,
  };
};

export const normalizeSkillsDetailed = (input, fallbackSkills = "") => {
  const normalized = asArray(input)
    .map(normalizeSkillEntry)
    .filter(Boolean);

  if (normalized.length > 0) return normalized;
  return splitLooseList(fallbackSkills).map(normalizeSkillEntry).filter(Boolean);
};

export const getTargetRoles = (careerChoice = {}) => {
  const vectorTargets = careerChoice?.careerVector?.targetRoles;
  if (Array.isArray(vectorTargets) && vectorTargets.length) {
    return uniqStrings(vectorTargets);
  }

  const legacyTargets = [
    careerChoice?.careergoal,
    careerChoice?.careerPath,
    careerChoice?.goal,
    careerChoice?.interest,
  ];

  return uniqStrings(legacyTargets);
};

export const getPrimarySkills = (careerChoice = {}) => {
  if (Array.isArray(careerChoice?.skillsDetailed) && careerChoice.skillsDetailed.length) {
    return uniqStrings(careerChoice.skillsDetailed.map((skill) => skill?.name));
  }

  return splitLooseList(careerChoice?.skills);
};

export const buildCareerSnapshot = (careerChoice = {}) => {
  const targetRoles = getTargetRoles(careerChoice);

  return {
    interest: sanitizeString(careerChoice?.interest || careerChoice?.careerVector?.currentRole),
    skills: getPrimarySkills(careerChoice),
    education: sanitizeString(careerChoice?.education),
    experience: sanitizeString(careerChoice?.experience),
    careerGoal: sanitizeString(careerChoice?.careergoal || careerChoice?.careerJourney?.targetRole || targetRoles[0]),
    availability: sanitizeString(careerChoice?.availabilty),
    timeConstraint: sanitizeString(careerChoice?.timeconstraint),
    targetRoles,
    workStyleDNA: {
      learningStyle: sanitizeString(careerChoice?.workStyleDNA?.learningStyle),
      collaborationStyle: sanitizeString(careerChoice?.workStyleDNA?.collaborationStyle),
      riskAppetite: sanitizeString(careerChoice?.workStyleDNA?.riskAppetite),
      motivationDrivers: uniqStrings(careerChoice?.workStyleDNA?.motivationDrivers || []),
    },
  };
};

export const toCareerOSProfile = (careerChoice = {}) => {
  const snapshot = buildCareerSnapshot(careerChoice);

  return {
    userId: careerChoice.userId,
    legacyProfile: {
      interest: snapshot.interest,
      skills: snapshot.skills.join(", "),
      education: snapshot.education,
      experience: snapshot.experience,
      careergoal: snapshot.careerGoal,
      timeconstraint: snapshot.timeConstraint,
      availabilty: snapshot.availability,
      status: careerChoice.status || "submitted",
      journeyStarted: Boolean(careerChoice.journeyStarted),
    },
    userProfile: {
      skills: normalizeSkillsDetailed(careerChoice.skillsDetailed, careerChoice.skills),
      workStyleDNA: snapshot.workStyleDNA,
      careerVector: {
        currentRole: sanitizeString(careerChoice?.careerVector?.currentRole || careerChoice?.interest),
        targetRoles: snapshot.targetRoles,
        industryFit: Array.isArray(careerChoice?.careerVector?.industryFit)
          ? careerChoice.careerVector.industryFit
          : [],
        salaryBenchmark: careerChoice?.careerVector?.salaryBenchmark || {
          min: 0,
          max: 0,
          currency: "USD",
        },
      },
      resume: careerChoice?.resume || {
        raw: "",
        parsed: {},
        aiFeedbackScore: 0,
        lastOptimized: null,
      },
    },
    careerJourney: careerChoice?.careerJourney || {
      targetRole: snapshot.careerGoal,
      estimatedTimeline: 0,
      milestones: [],
      adaptationLog: [],
    },
    jobIntelligence: careerChoice?.jobIntelligence || {
      applications: [],
      marketPulse: {},
      networkGraph: [],
    },
    growthEngine: careerChoice?.growthEngine || {
      xpTotal: 0,
      level: 1,
      streakDays: 0,
      dailyActions: [],
      badges: [],
      weeklyAIBriefing: [],
    },
    meta: {
      lastActiveAt: careerChoice?.lastActiveAt || careerChoice?.updatedAt || careerChoice?.createdAt || null,
      createdAt: careerChoice?.createdAt || null,
      updatedAt: careerChoice?.updatedAt || null,
    },
  };
};

export const buildCareerChoiceUpdate = (payload = {}, options = {}) => {
  const interest = sanitizeString(payload.interest || payload.currentRole || payload.careerPath);
  const skillsDetailed = normalizeSkillsDetailed(payload.skillsDetailed || payload.skillsGraph || payload.skills, payload.skills);
  const targetRoles = uniqStrings(
    payload?.careerVector?.targetRoles ||
      payload?.targetRoles ||
      payload?.goals ||
      [payload.careergoal, payload.goal, payload.targetRole],
  );

  const education = sanitizeString(payload.education || payload.degree);
  const experience = sanitizeString(payload.experience || payload.experienceLevel);
  const timeconstraint = sanitizeString(payload.timeconstraint || payload.timeConstraint || payload.timePerDay);
  const availabilty = sanitizeString(payload.availabilty || payload.availability);
  const careergoal = sanitizeString(
    payload.careergoal ||
      payload.goal ||
      payload?.careerJourney?.targetRole ||
      payload?.careerVector?.targetRoles?.[0] ||
      targetRoles[0],
  );

  return {
    interest,
    skills: skillsDetailed.map((skill) => skill.name).join(", "),
    education,
    experience,
    careergoal,
    timeconstraint,
    availabilty,
    skillsDetailed,
    workStyleDNA: {
      learningStyle: sanitizeString(
        payload?.workStyleDNA?.learningStyle || payload.learningStyle,
      ),
      collaborationStyle: sanitizeString(
        payload?.workStyleDNA?.collaborationStyle || payload.collaborationStyle,
      ),
      riskAppetite: sanitizeString(
        payload?.workStyleDNA?.riskAppetite || payload.riskAppetite,
      ),
      motivationDrivers: uniqStrings(
        payload?.workStyleDNA?.motivationDrivers || payload.motivationDrivers || [],
      ),
    },
    careerVector: {
      currentRole: sanitizeString(payload?.careerVector?.currentRole || interest),
      targetRoles,
      industryFit: asArray(payload?.careerVector?.industryFit).filter(
        (entry) => entry && sanitizeString(entry.industry),
      ),
      salaryBenchmark: {
        min: Number(payload?.careerVector?.salaryBenchmark?.min) || 0,
        max: Number(payload?.careerVector?.salaryBenchmark?.max) || 0,
        currency: sanitizeString(payload?.careerVector?.salaryBenchmark?.currency) || "USD",
      },
    },
    resume: {
      raw: sanitizeString(payload?.resume?.raw),
      parsed:
        payload?.resume?.parsed && typeof payload.resume.parsed === "object"
          ? payload.resume.parsed
          : {},
      aiFeedbackScore: Number(payload?.resume?.aiFeedbackScore) || 0,
      lastOptimized: payload?.resume?.lastOptimized ? new Date(payload.resume.lastOptimized) : null,
    },
    careerJourney: {
      targetRole: sanitizeString(payload?.careerJourney?.targetRole || careergoal),
      estimatedTimeline: Number(payload?.careerJourney?.estimatedTimeline) || 0,
      milestones: asArray(payload?.careerJourney?.milestones).filter(
        (item) => item && sanitizeString(item.title),
      ),
      adaptationLog: asArray(payload?.careerJourney?.adaptationLog).filter(
        (item) => item && sanitizeString(item.triggeredBy),
      ),
    },
    jobIntelligence: {
      applications: asArray(payload?.jobIntelligence?.applications).filter(
        (item) => item && (sanitizeString(item.jobTitle) || sanitizeString(item.company)),
      ),
      marketPulse:
        payload?.jobIntelligence?.marketPulse && typeof payload.jobIntelligence.marketPulse === "object"
          ? payload.jobIntelligence.marketPulse
          : {},
      networkGraph: asArray(payload?.jobIntelligence?.networkGraph).filter(
        (item) => item && sanitizeString(item.contactName),
      ),
    },
    growthEngine: {
      xpTotal: Number(payload?.growthEngine?.xpTotal) || 0,
      level: Number(payload?.growthEngine?.level) || 1,
      streakDays: Number(payload?.growthEngine?.streakDays) || 0,
      dailyActions: asArray(payload?.growthEngine?.dailyActions).filter(
        (item) => item && sanitizeString(item.actionType),
      ),
      badges: asArray(payload?.growthEngine?.badges).filter(
        (item) => item && sanitizeString(item.name),
      ),
      weeklyAIBriefing: asArray(payload?.growthEngine?.weeklyAIBriefing).filter(
        (item) => item && item.week,
      ),
    },
    status: sanitizeString(payload.status) || "submitted",
    journeyStarted: options.resetJourney ? false : Boolean(payload.journeyStarted),
    lastActiveAt: new Date(),
  };
};
