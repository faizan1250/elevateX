jest.setTimeout(60000); // 20 seconds timeout instead of 5s
require("dotenv").config({ path: "env.test" });

import request from "supertest";
import mongoose from "mongoose";
import app from "../app.js";
import { generateTestToken } from "./testUtils.js";
import CareerChoice from "../models/CareerChoice.js";
import CareerPlan from "../models/CareerPlan.js";
import SkillProgress from "../models/SkillProgress.js";
import ProjectSubmission from "../models/ProjectSubmission.js";

const { token, user } = generateTestToken();

describe("Career OS API", () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
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

  it("POST /api/career/choose - should save career choice", async () => {
    const res = await request(app)
      .post("/api/career/choose")
      .set("Authorization", token)
      .send({
        careerPath: "Full Stack Developer",
        goal: "FAANG",
        interests: ["Web Dev", "AI"],
        experience: "Beginner",
        learningStyle: "Projects",
        timePerDay: "2 hours",
      });

    expect(res.statusCode).toBe(201);
  });

  it("GET /api/career/status - should return chosen status", async () => {
    await CareerChoice.create({
      userId: user._id,
      careerPath: "Backend Developer",
      goal: "MAANG",
    });

    const res = await request(app)
      .get("/api/career/status")
      .set("Authorization", token);

    expect(res.body.status).toBe("chosen");
  });

  it("POST /api/career/generate-plan - should generate a roadmap", async () => {
    await CareerChoice.create({
      userId: user._id,
      careerPath: "ML Engineer",
      goal: "Top MLOps",
    });

    const res = await request(app)
      .post("/api/career/generate-plan")
      .set("Authorization", token);

    expect(res.statusCode).toBe(201);
    expect(res.body.plan).toBeDefined();
  });

  it("GET /api/career/roadmap - should return plan", async () => {
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
      .get("/api/career/roadmap")
      .set("Authorization", token);

    expect(res.statusCode).toBe(200);
    expect(res.body.skills).toContain("JS");
  });

  it("PATCH /api/career/skill/update - should update skill", async () => {
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
      .patch("/api/career/skill/update")
      .set("Authorization", token)
      .send({ skillName: "React", status: "completed" });

    expect(res.statusCode).toBe(200);
    expect(res.body.skill.status).toBe("completed");
  });

  it("POST /api/career/project/submit - should submit project", async () => {
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
 it("PATCH /api/career/skill/update - invalid status", async () => {
  await CareerPlan.create({
    userId: user._id,
    plan: {
      skills: ["React"],
      roadmap: [],
      projects: [],
      resources: [],
    },
  });

  const res = await request(app)
    .patch("/api/career/skill/update")
    .set("Authorization", token) // ✅ ADD THIS
    .send({ skillName: "React", status: "done" });

  expect(res.statusCode).toBe(400);
  expect(res.body.message).toMatch(/Invalid skill status/i);
});
it("POST /api/project/submit - missing fields", async () => {
  const res = await request(app)
    .post("/api/career/project/submit")
    .set("Authorization", token) // ✅ ADD THIS
    .send({ projectTitle: "" }); // Missing GitHub link

  expect(res.statusCode).toBe(400);
});
it("DELETE /api/career/plan - should delete the career plan", async () => {
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

it("DELETE /api/career/project/delete - should delete a submitted project", async () => {
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

it("GET /api/career/progress - should return 100% progress if all complete", async () => {
  await CareerPlan.create({
    userId: user._id,
    plan: {
      skills: ["React", "Node"],
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
