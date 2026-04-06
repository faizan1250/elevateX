import {
  RESUME_TEMPLATES,
  analyzeResumeVersion,
  buildProfileSeed,
  createVersionSeed,
  tailorResumeVersion,
} from "../services/resumeBuilderService.js";

describe("resumeBuilderService", () => {
  it("builds a seeded profile from user and career context", () => {
    const profile = buildProfileSeed({
      user: {
        username: "faizan",
        email: "faizan@example.com",
        links: [{ platform: "GitHub", url: "https://github.com/faizan" }],
      },
      careerChoice: {
        interest: "Backend Engineering",
        skills: "Node.js, Express, MongoDB",
        education: "B.Tech Computer Science",
        experience: "2 years",
        careergoal: "Founding Engineer",
      },
      careerPlan: {
        plan: {
          skills: ["System Design", "APIs"],
        },
      },
    });

    expect(profile.basics.email).toBe("faizan@example.com");
    expect(profile.targeting.targetRoles).toContain("Founding Engineer");
    expect(profile.skillInventory.map((item) => item.name)).toContain("Node.js");
    expect(profile.skillInventory.map((item) => item.name)).toContain("System Design");
  });

  it("analyzes keyword coverage and scoring for a version", () => {
    const profile = buildProfileSeed({
      user: { username: "faizan", email: "faizan@example.com", links: [] },
      careerChoice: { interest: "Product Engineering", skills: "Node.js, React", careergoal: "Product Engineer" },
      careerPlan: null,
    });

    const version = createVersionSeed(profile, {
      title: "Product Engineer Resume",
      targetRole: "Product Engineer",
      targetCompany: "Stripe",
      jobDescription:
        "We need a product engineer who ships experiments, owns analytics, works cross functional, and improves growth metrics.",
    });

    version.sections.experience = [
      {
        company: "ElevateX",
        title: "Software Engineer",
        summary: "Built growth systems across the product.",
        achievements: [
          "Shipped onboarding experiments that increased activation by 21%",
          "Owned analytics instrumentation across product and marketing",
        ],
      },
    ];
    version.sections.projects = [
      {
        name: "Resume Builder",
        summary: "Built a JD-aware tailoring workflow.",
        highlights: ["Improved draft completion rate by 34%"],
      },
    ];

    const analysis = analyzeResumeVersion(profile, version);

    expect(analysis.analysis.keywords.length).toBeGreaterThan(0);
    expect(analysis.scorecard.overall).toBeGreaterThan(0);
    expect(analysis.analysis.fitLabel).toBeTruthy();
    expect(analysis.scorecard.bulletQualityScore).toBeGreaterThan(0);
  });

  it("tailors summary and expands skills with missing keywords", () => {
    const profile = buildProfileSeed({
      user: { username: "faizan", email: "faizan@example.com", links: [] },
      careerChoice: { interest: "Backend Engineering", skills: "Node.js", careergoal: "Backend Engineer" },
      careerPlan: null,
    });

    const version = createVersionSeed(profile, {
      targetRole: "Backend Engineer",
      jobDescription: "Need an engineer with APIs, distributed systems, platform reliability, and ownership.",
    });

    const tailored = tailorResumeVersion(profile, version);

    expect(tailored.sections.summary).toMatch(/Backend Engineer/);
    expect(tailored.sections.skills.length).toBeGreaterThan(0);
  });

  it("applies template metadata when creating a version", () => {
    const profile = buildProfileSeed({
      user: { username: "faizan", email: "faizan@example.com", links: [] },
      careerChoice: { interest: "Leadership", skills: "Strategy", careergoal: "VP Product" },
      careerPlan: null,
    });

    const version = createVersionSeed(profile, {
      targetRole: "VP Product",
      templateId: "executive",
    });

    expect(version.templateId).toBe("executive");
    expect(version.layout.sectionOrder).toEqual(
      RESUME_TEMPLATES.find((template) => template.id === "executive").layout.sectionOrder,
    );
  });

  it("returns diagnostics for weak or duplicated bullets", () => {
    const profile = buildProfileSeed({
      user: { username: "faizan", email: "faizan@example.com", links: [] },
      careerChoice: { interest: "Backend Engineering", skills: "Node.js", careergoal: "Backend Engineer" },
      careerPlan: null,
    });

    const version = createVersionSeed(profile, {
      targetRole: "Backend Engineer",
      jobDescription: "Need APIs, ownership, distributed systems, and platform reliability.",
    });

    version.sections.experience = [
      {
        company: "ElevateX",
        title: "Engineer",
        summary: "Worked on backend tasks.",
        achievements: ["Worked on backend", "Worked on backend"],
      },
    ];

    const analysis = analyzeResumeVersion(profile, version);

    expect(analysis.analysis.diagnostics.length).toBeGreaterThan(0);
    expect(analysis.analysis.recommendations.length).toBeGreaterThan(0);
  });
});
