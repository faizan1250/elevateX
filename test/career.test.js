import { jest } from "@jest/globals";
import dotenv from "dotenv";
import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import testUtils from "./testUtils.js";
import CareerChoice from "../models/CareerChoice.js";
import CareerPlan from "../models/CareerPlan.js";
import SkillProgress from "../models/SkillProgress.js";
import ProjectSubmission from "../models/ProjectSubmission.js";

jest.setTimeout(60000);
dotenv.config({ path: "env.test" });

const { token, user } = testUtils.generateTestToken();

describe("Career OS API", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await CareerChoice.deleteMany({ userId: user._id });
    await CareerPlan.deleteMany({ userId: user._id });
    await SkillProgress.deleteMany({ userId: user._id });
    await ProjectSubmission.deleteMany({ userId: user._id });
  });

  it("POST /api/career/chooseCareer saves a platform profile and legacy compatibility fields", async () => {
    const res = await request(app)
      .post("/api/career/chooseCareer")
      .set("Authorization", token)
      .send({
        interest: "Software Engineer",
        education: "B.Tech Computer Science",
        experience: "Beginner",
        careergoal: "AI Product Engineer",
        timeconstraint: "12 weeks",
        availabilty: "2 hours/day",
        skills: [
          { name: "JavaScript", proficiencyScore: 72, verifiedBy: "project", growthRate: 8 },
          { name: "Node.js", proficiencyScore: 65, verifiedBy: "quiz", growthRate: 6 },
        ],
        workStyleDNA: {
          learningStyle: "hands-on",
          collaborationStyle: "hybrid",
          riskAppetite: "growth",
          motivationDrivers: ["impact", "money"],
        },
        careerVector: {
          currentRole: "Student Builder",
          targetRoles: ["AI Product Engineer", "Backend Engineer"],
          industryFit: [{ industry: "B2B SaaS", fitScore: 84 }],
          salaryBenchmark: { min: 120000, max: 180000, currency: "USD" },
        },
        careerJourney: {
          targetRole: "AI Product Engineer",
          estimatedTimeline: 20,
          milestones: [{ title: "Ship first AI workflow", type: "project", status: "active" }],
        },
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.choice.skills).toContain("JavaScript");
    expect(res.body.profile.userProfile.skills[0].proficiencyScore).toBe(72);
    expect(res.body.profile.userProfile.careerVector.targetRoles).toContain("AI Product Engineer");
  });

  it("GET /api/career/status returns normalized Career OS profile for legacy data", async () => {
    await CareerChoice.create({
      userId: user._id,
      interest: "Backend Developer",
      skills: "Node.js, MongoDB",
      education: "BCA",
      experience: "Intermediate",
      careergoal: "Platform Engineer",
      timeconstraint: "16 weeks",
      availabilty: "Evenings",
    });

    const res = await request(app)
      .get("/api/career/status")
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("chosen");
    expect(res.body.profile.userProfile.skills.map((skill) => skill.name)).toContain("Node.js");
    expect(res.body.profile.careerJourney.targetRole).toBe("Platform Engineer");
  });

  it("POST /api/career/plan generates a roadmap from the saved profile", async () => {
    await CareerChoice.create({
      userId: user._id,
      interest: "Machine Learning",
      skills: "Python, SQL",
      education: "B.Tech",
      experience: "Beginner",
      careergoal: "ML Engineer",
      timeconstraint: "24 weeks",
      availabilty: "3 hours/day",
    });

    const res = await request(app)
      .post("/api/career/plan")
      .set("Authorization", token);

    expect(res.statusCode).toBe(201);
    expect(res.body.plan).toBeDefined();
    expect(res.body.plan.skills).toBeDefined();
  });

  it("GET /api/career/plan returns a saved plan", async () => {
    await CareerPlan.create({
      userId: user._id,
      plan: {
        skills: ["JS", "Node"],
        roadmap: [],
        projects: [],
        resources: [],
      },
    });

    const res = await request(app)
      .get("/api/career/plan")
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.skills).toContain("JS");
  });

  it("PATCH /api/career/skill/update updates skill progress", async () => {
    const res = await request(app)
      .patch("/api/career/skill/update")
      .set("Authorization", token)
      .send({ skillName: "React", status: "completed" });

    expect(res.statusCode).toBe(200);
    expect(res.body.skill.status).toBe("completed");
  });

  it("POST /api/career/project/submit stores a project", async () => {
    const res = await request(app)
      .post("/api/career/project/submit")
      .set("Authorization", token)
      .send({
        projectTitle: "To-Do API",
        githubLink: "https://github.com/user/todo-api",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.submission.projectTitle).toBe("To-Do API");
  });

  it("PATCH /api/career/skill/update rejects invalid status", async () => {
    const res = await request(app)
      .patch("/api/career/skill/update")
      .set("Authorization", token)
      .send({ skillName: "React", status: "done" });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/invalid skill status/i);
  });

  it("POST /api/career/project/submit rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/career/project/submit")
      .set("Authorization", token)
      .send({ projectTitle: "" });

    expect(res.statusCode).toBe(400);
  });

  it("DELETE /api/career/plan/delete deletes the career plan", async () => {
    await CareerPlan.create({
      userId: user._id,
      plan: {
        skills: ["React", "Node"],
        roadmap: [],
        projects: [],
        resources: [],
      },
    });

    const res = await request(app)
      .delete("/api/career/plan/delete")
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("DELETE /api/career/project/delete deletes a submitted project", async () => {
    await ProjectSubmission.create({
      userId: user._id,
      projectTitle: "To-Do API",
      githubLink: "https://github.com/user/todo-api",
    });

    const res = await request(app)
      .delete("/api/career/project/delete")
      .set("Authorization", token)
      .send({ projectTitle: "To-Do API" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("GET /api/career/progress computes progress even when plan skills are grouped", async () => {
    await CareerPlan.create({
      userId: user._id,
      plan: {
        skills: {
          foundation: ["React"],
          intermediate: ["Node"],
        },
        roadmap: [],
        projects: ["To-Do API"],
        resources: [],
      },
    });

    await SkillProgress.create([
      { userId: user._id, skillName: "React", status: "completed" },
      { userId: user._id, skillName: "Node", status: "completed" },
    ]);

    await ProjectSubmission.create({
      userId: user._id,
      projectTitle: "To-Do API",
      githubLink: "https://github.com/user/todo-api",
    });

    const res = await request(app)
      .get("/api/career/progress")
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.skillProgress).toBe(100);
    expect(res.body.projectProgress).toBe(100);
    expect(res.body.overallProgress).toBe(100);
  });
});
