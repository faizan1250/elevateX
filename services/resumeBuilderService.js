import PDFDocument from "pdfkit";
import { buildCareerSnapshot, getPrimarySkills, getTargetRoles } from "./careerChoiceService.js";

export const RESUME_TEMPLATES = [
  {
    id: "classic",
    name: "Classic",
    description: "Single-column, recruiter-safe, ATS-friendly structure.",
    accent: "#1f4b99",
    previewTone: "Conservative",
    theme: { accent: "#1f4b99", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", density: "balanced" },
    layout: {
      columns: 1,
      showSidebar: false,
      compact: false,
      sectionOrder: ["summary", "experience", "projects", "skills", "education", "certifications"],
    },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Two-column layout with a skills rail and crisp hierarchy.",
    accent: "#0f766e",
    previewTone: "Product",
    theme: { accent: "#0f766e", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", density: "balanced" },
    layout: {
      columns: 2,
      showSidebar: true,
      compact: false,
      sectionOrder: ["summary", "experience", "projects", "skills", "education", "certifications"],
    },
  },
  {
    id: "compact",
    name: "Compact",
    description: "Dense one-page layout for early-career or high-volume application runs.",
    accent: "#7c2d12",
    previewTone: "ATS",
    theme: { accent: "#7c2d12", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", density: "compact" },
    layout: {
      columns: 1,
      showSidebar: false,
      compact: true,
      sectionOrder: ["summary", "skills", "experience", "projects", "education", "certifications"],
    },
  },
  {
    id: "executive",
    name: "Executive",
    description: "Leadership-first layout emphasizing narrative, scope, and business impact.",
    accent: "#6b21a8",
    previewTone: "Leadership",
    theme: { accent: "#6b21a8", headingFont: "Helvetica-Bold", bodyFont: "Helvetica", density: "comfortable" },
    layout: {
      columns: 1,
      showSidebar: false,
      compact: false,
      sectionOrder: ["summary", "experience", "skills", "projects", "education", "certifications"],
    },
  },
];

const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "build", "by", "for", "from",
  "has", "have", "help", "in", "into", "is", "job", "looking", "of", "on",
  "or", "our", "partner", "responsible", "role", "that", "the", "their",
  "this", "through", "to", "we", "with", "you", "your", "will",
]);

const uniq = (items = []) => [...new Set(items.filter(Boolean))];

const sanitizeString = (value = "") => String(value).trim();

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const getTemplateById = (templateId = "classic") =>
  RESUME_TEMPLATES.find((template) => template.id === templateId) || RESUME_TEMPLATES[0];

const splitLooseList = (value) =>
  uniq(
    String(value || "")
      .split(/[\n,|/]+/)
      .map((item) => sanitizeString(item))
      .filter(Boolean),
  );

const titleCase = (value = "") =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9+\s#.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractSentences = (text = "", limit = 6) =>
  String(text)
    .split(/[\n.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30)
    .slice(0, limit);

const flattenPlanSkills = (plan) => {
  if (!plan) return [];
  if (Array.isArray(plan)) {
    return plan.flatMap(flattenPlanSkills);
  }
  if (typeof plan === "string") {
    return splitLooseList(plan);
  }
  if (typeof plan === "object") {
    if (Array.isArray(plan.skills)) {
      return flattenPlanSkills(plan.skills);
    }
    return Object.values(plan).flatMap(flattenPlanSkills);
  }
  return [];
};

const extractKeywords = (jobDescription = "", extra = []) => {
  const text = normalize(`${jobDescription} ${extra.join(" ")}`);
  const words = text.split(" ").filter(Boolean);
  const counts = new Map();

  for (const word of words) {
    if (word.length < 4 || STOP_WORDS.has(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  const singleTerms = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([word]) => titleCase(word));

  const bigramCounts = new Map();
  for (let index = 0; index < words.length - 1; index += 1) {
    const first = words[index];
    const second = words[index + 1];
    if (
      first.length < 4 ||
      second.length < 4 ||
      STOP_WORDS.has(first) ||
      STOP_WORDS.has(second)
    ) {
      continue;
    }
    const pair = `${first} ${second}`;
    bigramCounts.set(pair, (bigramCounts.get(pair) || 0) + 1);
  }

  const bigrams = [...bigramCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([phrase]) => titleCase(phrase));

  return uniq([...extra.filter(Boolean), ...bigrams, ...singleTerms]).slice(0, 14);
};

const countMetricBullets = (items = []) =>
  items.filter((item) => /\d|%|\$|x\b|million|kpi|roi|revenue|growth/i.test(item)).length;

const hasActionVerb = (text = "") =>
  /^(built|led|shipped|owned|launched|designed|scaled|grew|drove|optimized|reduced|improved|implemented|created|architected|managed|delivered|increased)\b/i.test(
    String(text).trim(),
  );

const isWeakBullet = (text = "") => {
  const normalized = String(text).trim();
  if (!normalized) return true;
  return normalized.length < 45 || (!hasActionVerb(normalized) && !/\d|%|\$|roi|growth/i.test(normalized));
};

const findDuplicateBullets = (items = []) => {
  const counts = new Map();
  items.forEach((item) => {
    const key = normalize(item);
    if (!key) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return items.filter((item) => counts.get(normalize(item)) > 1);
};

const percent = (numerator, denominator) =>
  denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

const pickFitLabel = (overall) => {
  if (overall >= 85) return "Ready to ship";
  if (overall >= 70) return "Strong draft";
  if (overall >= 55) return "Needs revision";
  return "Needs work";
};

const mapLinks = (links = []) =>
  links
    .map((item) => ({
      label: sanitizeString(item.platform || item.label),
      url: sanitizeString(item.url),
    }))
    .filter((item) => item.label || item.url);

export const buildProfileSeed = ({ user, careerChoice, careerPlan }) => {
  const snapshot = buildCareerSnapshot(careerChoice || {});
  const careerSkills = getPrimarySkills(careerChoice || {});
  const planSkills = flattenPlanSkills(careerPlan?.plan || careerPlan);
  const targetRoles = uniq([
    ...getTargetRoles(careerChoice || {}),
    sanitizeString(snapshot.interest),
  ]).filter(Boolean);
  const fullName = sanitizeString(user?.username || user?.name || "");
  const interest = sanitizeString(snapshot.interest);
  const careerGoal = sanitizeString(snapshot.careerGoal);
  const skills = uniq([...careerSkills, ...planSkills]).slice(0, 18);

  return {
    basics: {
      fullName,
      email: sanitizeString(user?.email),
      phone: "",
      location: "",
      headline: interest
        ? `${interest} candidate focused on measurable outcomes and strong execution`
        : "Ambitious candidate focused on measurable outcomes and strong execution",
      summary: careerGoal
        ? `Building toward ${careerGoal} with a resume narrative centered on impact, execution, and role-fit.`
        : "Building a resume narrative centered on impact, execution, and role-fit.",
      links: mapLinks(user?.links),
    },
    targeting: {
      targetRoles,
      targetCompanies: [],
      careerGoal,
      interestAreas: splitLooseList(interest),
      yearsOfExperience: sanitizeString(snapshot.experience),
    },
    experience: [],
    projects: [],
    education: snapshot.education
      ? [
          {
            school: "",
            degree: sanitizeString(snapshot.education),
            field: interest,
            startDate: "",
            endDate: "",
            grade: "",
          },
        ]
      : [],
    certifications: [],
    skillInventory: skills.map((skill) => ({
      name: skill,
      level: "",
      category: "career",
      evidence: "",
    })),
    meta: {
      source: "career-choice",
      importedFromCareerChoice: Boolean(careerChoice),
      importedFromCareerPlan: Boolean(careerPlan),
    },
  };
};

export const createVersionSeed = (profile, payload = {}) => {
  const targetRole = sanitizeString(payload.targetRole || profile?.targeting?.targetRoles?.[0]);
  const targetCompany = sanitizeString(payload.targetCompany);
  const template = getTemplateById(payload.templateId);

  return {
    title: sanitizeString(payload.title) || `${targetRole || "General"} Resume`,
    targetRole,
    targetCompany,
    templateId: template.id,
    theme: { ...template.theme, ...(payload.theme || {}) },
    layout: { ...template.layout, ...(payload.layout || {}) },
    jobDescription: sanitizeString(payload.jobDescription),
    status: "draft",
    sections: {
      summary: sanitizeString(profile?.basics?.summary),
      experience: Array.isArray(profile?.experience) ? profile.experience : [],
      projects: Array.isArray(profile?.projects) ? profile.projects : [],
      education: Array.isArray(profile?.education) ? profile.education : [],
      skills: uniq((profile?.skillInventory || []).map((skill) => skill.name)).slice(0, 18),
      certifications: (profile?.certifications || [])
        .map((certification) => sanitizeString(certification.name))
        .filter(Boolean),
    },
    analysis: {
      keywords: [],
      responsibilities: [],
      matchedKeywords: [],
      missingKeywords: [],
      strengths: [],
      gaps: [],
      recommendations: [],
      diagnostics: [],
      suggestedSectionOrder: template.layout.sectionOrder,
      fitLabel: "Needs work",
    },
    scorecard: {
      overall: 0,
      keywordCoverage: 0,
      impactScore: 0,
      completenessScore: 0,
      atsScore: 0,
      bulletQualityScore: 0,
      roleAlignmentScore: 0,
    },
    insights: [],
  };
};

export const analyzeResumeVersion = (profile, version) => {
  const template = getTemplateById(version.templateId);
  const keywords = extractKeywords(version.jobDescription, [
    version.targetRole,
    version.targetCompany,
  ]);
  const responsibilities = extractSentences(version.jobDescription, 5);
  const resumeText = normalize(
    [
      profile?.basics?.headline,
      profile?.basics?.summary,
      version.sections?.summary,
      ...(version.sections?.skills || []),
      ...(version.sections?.certifications || []),
      ...(version.sections?.experience || []).flatMap((item) => [
        item.company,
        item.title,
        item.summary,
        ...(item.achievements || []),
      ]),
      ...(version.sections?.projects || []).flatMap((item) => [
        item.name,
        item.summary,
        ...(item.highlights || []),
        ...(item.technologies || []),
      ]),
      ...(version.sections?.education || []).flatMap((item) => [
        item.school,
        item.degree,
        item.field,
      ]),
    ].join(" "),
  );

  const matchedKeywords = keywords.filter((keyword) => resumeText.includes(normalize(keyword)));
  const missingKeywords = keywords.filter((keyword) => !matchedKeywords.includes(keyword));

  const experienceBullets = (version.sections?.experience || []).flatMap(
    (item) => item.achievements || [],
  );
  const projectBullets = (version.sections?.projects || []).flatMap(
    (item) => item.highlights || [],
  );
  const allBullets = [...experienceBullets, ...projectBullets];
  const metricBullets = countMetricBullets([...experienceBullets, ...projectBullets]);
  const totalBullets = allBullets.length;
  const weakBullets = allBullets.filter((item) => isWeakBullet(item));
  const duplicateBullets = uniq(findDuplicateBullets(allBullets));
  const missingEvidence = missingKeywords
    .filter((keyword) => !allBullets.some((bullet) => normalize(bullet).includes(normalize(keyword))))
    .slice(0, 4);

  const completenessSignals = [
    profile?.basics?.fullName,
    profile?.basics?.email,
    profile?.basics?.headline,
    version.sections?.summary,
    (version.sections?.skills || []).length > 0,
    (version.sections?.experience || []).length > 0,
    (version.sections?.projects || []).length > 0,
    (version.sections?.education || []).length > 0,
  ];
  const completenessScore = percent(
    completenessSignals.filter(Boolean).length,
    completenessSignals.length,
  );
  const keywordCoverage = percent(matchedKeywords.length, keywords.length || 1);
  const impactScore = Math.min(100, percent(metricBullets, Math.max(totalBullets, 3)) + 25);
  const bulletQualityScore = clamp(
    Math.round((percent(totalBullets - weakBullets.length, Math.max(totalBullets, 1)) * 0.65) + (percent(metricBullets, Math.max(totalBullets, 1)) * 0.35)),
  );
  const roleAlignmentScore = clamp(
    Math.round((keywordCoverage * 0.6) + (percent(matchedKeywords.length + (version.targetRole ? 1 : 0), keywords.length + 1) * 0.4)),
  );
  const atsScore = Math.min(
    100,
    Math.round((keywordCoverage * 0.45) + (completenessScore * 0.2) + (impactScore * 0.15) + (bulletQualityScore * 0.2)),
  );
  const overall = Math.round(
    (keywordCoverage * 0.4) +
      (impactScore * 0.2) +
      (completenessScore * 0.15) +
      (atsScore * 0.1) +
      (bulletQualityScore * 0.05) +
      (roleAlignmentScore * 0.1),
  );

  const strengths = [];
  const gaps = [];
  const recommendations = [];
  const insights = [];
  const diagnostics = [];

  if (matchedKeywords.length >= Math.max(3, Math.ceil(keywords.length / 2))) {
    strengths.push("Resume language is already aligned with the target role.");
    insights.push({
      type: "strong",
      title: "Strong keyword alignment",
      body: "The draft already reflects a meaningful share of the job description language.",
    });
  } else {
    gaps.push("Keyword coverage is below a strong ATS-safe threshold.");
    recommendations.push("Bring missing JD terms into summary, skills, and top impact bullets.");
    insights.push({
      type: "gap",
      title: "Coverage is thin",
      body: "Important job-description terms are still missing from the draft.",
    });
  }

  if (metricBullets >= 3) {
    strengths.push("Impact bullets include measurable outcomes.");
    insights.push({
      type: "strong",
      title: "Good proof of impact",
      body: "The resume includes quantified achievements, which strengthens recruiter trust quickly.",
    });
  } else {
    gaps.push("Too few bullets demonstrate quantified impact.");
    recommendations.push("Rewrite at least three bullets with scope, metric, and business outcome.");
    insights.push({
      type: "fix",
      title: "Add metrics",
      body: "YC-level product polish means every key bullet should prove an outcome, not just an activity.",
    });
  }

  if (weakBullets.length > 0) {
    weakBullets.slice(0, 3).forEach((bullet) => {
      diagnostics.push({
        section: "experience",
        severity: "warning",
        bullet,
        message: "Bullet is too vague. Lead with action, scope, and a measurable outcome.",
      });
    });
    recommendations.push("Tighten vague bullets so each one states action, scope, and outcome.");
  }

  if (duplicateBullets.length > 0) {
    duplicateBullets.slice(0, 2).forEach((bullet) => {
      diagnostics.push({
        section: "experience",
        severity: "warning",
        bullet,
        message: "This bullet is duplicated or nearly duplicated. Consolidate it.",
      });
    });
    gaps.push("Some bullets repeat the same signal instead of adding new proof.");
  }

  if (missingEvidence.length > 0) {
    missingEvidence.forEach((keyword) => {
      diagnostics.push({
        section: "summary",
        severity: "info",
        bullet: keyword,
        message: `The JD emphasizes "${keyword}" but the resume does not show proof for it yet.`,
      });
    });
  }

  if ((version.sections?.projects || []).length === 0 && normalize(version.targetRole).includes("engineer")) {
    gaps.push("Projects section is missing for a technical role.");
    recommendations.push("Add 1 to 2 shipped projects with stack, scope, and measurable result.");
  }

  if (!version.sections?.summary) {
    recommendations.push("Open with a targeted summary that mirrors the role and business context.");
  }

  recommendations.push(
    ...missingKeywords.slice(0, 4).map(
      (keyword) => `Find a truthful place to mention "${keyword}" in summary, skills, or impact bullets.`,
    ),
  );

  if (template.id === "executive" && (version.sections?.summary || "").length < 140) {
    recommendations.push("Executive template works best with a stronger leadership narrative at the top.");
  }

  const suggestedSectionOrder = template.layout.sectionOrder;

  return {
    analysis: {
      keywords,
      responsibilities,
      matchedKeywords,
      missingKeywords,
      strengths: uniq(strengths),
      gaps: uniq(gaps),
      diagnostics: diagnostics.slice(0, 8),
      suggestedSectionOrder,
      recommendations: uniq(recommendations).slice(0, 7),
      fitLabel: pickFitLabel(overall),
    },
    scorecard: {
      overall,
      keywordCoverage,
      impactScore,
      completenessScore,
      atsScore,
      bulletQualityScore,
      roleAlignmentScore,
    },
    insights: insights.slice(0, 4),
  };
};

export const tailorResumeVersion = (profile, version) => {
  const analysis = analyzeResumeVersion(profile, version);
  const topKeywords = analysis.analysis.keywords.slice(0, 5);
  const targetRole = sanitizeString(version.targetRole || profile?.targeting?.targetRoles?.[0] || "candidate");
  const targetCompany = sanitizeString(version.targetCompany);
  const companyClause = targetCompany ? ` for ${targetCompany}` : "";
  const summaryKeywords = topKeywords.length ? `Special focus on ${topKeywords.join(", ")}.` : "";

  const summary = [
    `${targetRole} candidate with a resume narrative shaped around execution, ownership, and business outcomes${companyClause}.`,
    sanitizeString(profile?.basics?.summary),
    summaryKeywords,
  ]
    .filter(Boolean)
    .join(" ");

  const skills = uniq([
    ...(version.sections?.skills || []),
    ...analysis.analysis.missingKeywords.slice(0, 4),
  ]).slice(0, 20);

  return {
    ...analysis,
    sections: {
      ...version.sections,
      summary,
      skills,
    },
    status: analysis.scorecard.overall >= 80 ? "ready" : "review",
    lastAnalyzedAt: new Date(),
  };
};

export const buildWorkspaceResponse = ({ profile, versions }) => ({
  profile,
  templates: RESUME_TEMPLATES,
  versions: versions.map((version) => ({
    id: version._id,
    title: version.title,
    targetRole: version.targetRole,
    targetCompany: version.targetCompany,
    templateId: version.templateId,
    theme: version.theme,
    layout: version.layout,
    status: version.status,
    updatedAt: version.updatedAt,
    scorecard: version.scorecard,
  })),
  activeVersion: versions[0] || null,
});

const writeSectionTitle = (doc, title, accent, compact = false) => {
  doc.moveDown(compact ? 0.5 : 0.8);
  doc.fontSize(compact ? 10 : 12).fillColor(accent).text(String(title).toUpperCase(), { underline: false });
  doc.moveDown(compact ? 0.15 : 0.25);
  doc.fillColor("#111111");
};

const writeBulletList = (doc, items = [], options = {}) => {
  items.filter(Boolean).forEach((item) => {
    doc.fontSize(options.fontSize || 10.5).text(`• ${item}`, { lineGap: options.lineGap ?? 2 });
  });
};

const renderClassicPdf = (doc, profile, version, template) => {
  doc.font(template.theme.headingFont).fontSize(22).fillColor("#111111").text(profile.basics.fullName || "ElevateX Candidate");
  doc.moveDown(0.2);
  doc.font(template.theme.bodyFont).fontSize(10.5).fillColor("#555555").text(
    [profile.basics.email, profile.basics.phone, profile.basics.location].filter(Boolean).join(" | "),
  );
  if (profile.basics.headline) {
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor(template.theme.accent).text(profile.basics.headline);
  }

  const order = version.layout?.sectionOrder?.length ? version.layout.sectionOrder : template.layout.sectionOrder;
  order.forEach((section) => {
    if (section === "summary" && version.sections.summary) {
      writeSectionTitle(doc, "Summary", template.theme.accent);
      doc.font(template.theme.bodyFont).fontSize(10.5).fillColor("#111111").text(version.sections.summary);
    }
    if (section === "experience" && version.sections.experience?.length) {
      writeSectionTitle(doc, "Experience", template.theme.accent);
      version.sections.experience.forEach((item) => {
        doc.font(template.theme.headingFont).fontSize(11).text(`${item.title}${item.company ? `, ${item.company}` : ""}`);
        if (item.summary) doc.font(template.theme.bodyFont).fontSize(10).fillColor("#333333").text(item.summary);
        writeBulletList(doc, item.achievements);
        doc.moveDown(0.3);
      });
    }
    if (section === "projects" && version.sections.projects?.length) {
      writeSectionTitle(doc, "Projects", template.theme.accent);
      version.sections.projects.forEach((item) => {
        doc.font(template.theme.headingFont).fontSize(11).fillColor("#111111").text(item.name);
        if (item.summary) doc.font(template.theme.bodyFont).fontSize(10).fillColor("#333333").text(item.summary);
        writeBulletList(doc, item.highlights);
        doc.moveDown(0.3);
      });
    }
    if (section === "skills" && version.sections.skills?.length) {
      writeSectionTitle(doc, "Skills", template.theme.accent);
      doc.font(template.theme.bodyFont).fontSize(10.5).fillColor("#111111").text(version.sections.skills.join(" | "));
    }
    if (section === "education" && version.sections.education?.length) {
      writeSectionTitle(doc, "Education", template.theme.accent);
      version.sections.education.forEach((item) => {
        doc.font(template.theme.headingFont).fontSize(11).text([item.school, item.degree, item.field].filter(Boolean).join(" | "));
      });
    }
    if (section === "certifications" && version.sections.certifications?.length) {
      writeSectionTitle(doc, "Certifications", template.theme.accent);
      version.sections.certifications.forEach((item) => doc.font(template.theme.bodyFont).fontSize(10.5).text(item));
    }
  });
};

const renderModernPdf = (doc, profile, version, template) => {
  const leftWidth = 150;
  doc.rect(42, 42, leftWidth, doc.page.height - 84).fill(template.theme.accent);
  doc.fillColor("#ffffff").font(template.theme.headingFont).fontSize(20).text(profile.basics.fullName || "ElevateX Candidate", 56, 58, { width: leftWidth - 28 });
  doc.font(template.theme.bodyFont).fontSize(9.5).text([profile.basics.email, profile.basics.phone, profile.basics.location].filter(Boolean).join("\n"), 56, 120, { width: leftWidth - 28 });
  doc.font(template.theme.headingFont).fontSize(10).text("SKILLS", 56, 190);
  doc.font(template.theme.bodyFont).fontSize(9).text((version.sections.skills || []).join("\n"), 56, 208, { width: leftWidth - 28 });
  doc.font(template.theme.headingFont).fontSize(10).text("CERTIFICATIONS", 56, 360);
  doc.font(template.theme.bodyFont).fontSize(9).text((version.sections.certifications || []).join("\n"), 56, 378, { width: leftWidth - 28 });

  doc.fillColor("#111111");
  const contentX = 220;
  doc.font(template.theme.bodyFont).fontSize(12).fillColor(template.theme.accent).text(profile.basics.headline || version.targetRole || "", contentX, 56);
  doc.fillColor("#111111");
  writeSectionTitle(doc, "Summary", template.theme.accent);
  doc.text(version.sections.summary || "", contentX, 96, { width: 330 });
  writeSectionTitle(doc, "Experience", template.theme.accent);
  doc.x = contentX;
  version.sections.experience?.forEach((item) => {
    doc.font(template.theme.headingFont).fontSize(11).text(`${item.title}${item.company ? `, ${item.company}` : ""}`, contentX);
    if (item.summary) doc.font(template.theme.bodyFont).fontSize(10).text(item.summary, contentX, undefined, { width: 330 });
    writeBulletList(doc, item.achievements, { fontSize: 9.8 });
    doc.moveDown(0.2);
  });
  if (version.sections.projects?.length) {
    writeSectionTitle(doc, "Projects", template.theme.accent);
    version.sections.projects.forEach((item) => {
      doc.font(template.theme.headingFont).fontSize(11).text(item.name, contentX);
      if (item.summary) doc.font(template.theme.bodyFont).fontSize(10).text(item.summary, contentX, undefined, { width: 330 });
      writeBulletList(doc, item.highlights, { fontSize: 9.8 });
    });
  }
};

const renderCompactPdf = (doc, profile, version, template) => {
  doc.font(template.theme.headingFont).fontSize(18).fillColor("#111111").text(profile.basics.fullName || "ElevateX Candidate", { continued: true });
  doc.font(template.theme.bodyFont).fontSize(9).fillColor("#666666").text(`  |  ${profile.basics.email || ""}  |  ${profile.basics.location || ""}`);
  doc.moveDown(0.2);
  if (version.sections.summary) {
    doc.font(template.theme.bodyFont).fontSize(9.5).fillColor("#111111").text(version.sections.summary, { lineGap: 1 });
  }
  ["skills", "experience", "projects", "education", "certifications"].forEach((section) => {
    const content = version.sections?.[section];
    if (!content || content.length === 0) return;
    writeSectionTitle(doc, section, template.theme.accent, true);
    if (section === "skills" || section === "certifications") {
      doc.font(template.theme.bodyFont).fontSize(9).text(content.join(" | "), { lineGap: 1 });
    } else if (section === "education") {
      content.forEach((item) => doc.font(template.theme.bodyFont).fontSize(9).text([item.school, item.degree, item.field].filter(Boolean).join(" | ")));
    } else {
      content.forEach((item) => {
        doc.font(template.theme.headingFont).fontSize(9.5).text(section === "experience" ? `${item.title}${item.company ? `, ${item.company}` : ""}` : item.name);
        if (item.summary) doc.font(template.theme.bodyFont).fontSize(8.8).text(item.summary, { lineGap: 1 });
        writeBulletList(doc, section === "experience" ? item.achievements : item.highlights, { fontSize: 8.8, lineGap: 1 });
      });
    }
  });
};

const renderExecutivePdf = (doc, profile, version, template) => {
  doc.rect(42, 42, doc.page.width - 84, 76).fill(template.theme.accent);
  doc.fillColor("#ffffff").font(template.theme.headingFont).fontSize(24).text(profile.basics.fullName || "ElevateX Candidate", 58, 58);
  doc.font(template.theme.bodyFont).fontSize(11).text(profile.basics.headline || version.targetRole || "", 58, 88);
  doc.fillColor("#111111");
  doc.font(template.theme.bodyFont).fontSize(10).text([profile.basics.email, profile.basics.phone, profile.basics.location].filter(Boolean).join(" | "), 58, 128);
  writeSectionTitle(doc, "Executive Summary", template.theme.accent);
  doc.font(template.theme.bodyFont).fontSize(11).text(version.sections.summary || "", { lineGap: 3 });
  writeSectionTitle(doc, "Leadership Experience", template.theme.accent);
  version.sections.experience?.forEach((item) => {
    doc.font(template.theme.headingFont).fontSize(11.5).text(`${item.title}${item.company ? `, ${item.company}` : ""}`);
    if (item.summary) doc.font(template.theme.bodyFont).fontSize(10.5).text(item.summary);
    writeBulletList(doc, item.achievements, { fontSize: 10.2, lineGap: 2 });
    doc.moveDown(0.3);
  });
  if (version.sections.skills?.length) {
    writeSectionTitle(doc, "Core Competencies", template.theme.accent);
    doc.font(template.theme.bodyFont).fontSize(10.5).text(version.sections.skills.join(" | "));
  }
  if (version.sections.projects?.length) {
    writeSectionTitle(doc, "Selected Initiatives", template.theme.accent);
    version.sections.projects.forEach((item) => {
      doc.font(template.theme.headingFont).fontSize(11).text(item.name);
      if (item.summary) doc.font(template.theme.bodyFont).fontSize(10).text(item.summary);
      writeBulletList(doc, item.highlights, { fontSize: 10 });
    });
  }
};

export const buildResumePdfBuffer = async ({ profile, version }) =>
  new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 42 });
      const chunks = [];
      const template = getTemplateById(version.templateId);

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      if (template.id === "modern") {
        renderModernPdf(doc, profile, version, template);
      } else if (template.id === "compact") {
        renderCompactPdf(doc, profile, version, template);
      } else if (template.id === "executive") {
        renderExecutivePdf(doc, profile, version, template);
      } else {
        renderClassicPdf(doc, profile, version, template);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
