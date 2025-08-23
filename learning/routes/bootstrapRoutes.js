import express from "express";
const router = express.Router();

import {
  bootstrapSkillsFromPlan,
  generateTopicsForSkill,
  generateTopicsForAllSkills,
} from "../controllers/bootstrapController.js";

import requireAuth from "../../middleware/auth.js";

// Convert saved plan -> Modules + Skills
router.post("/skills", requireAuth, bootstrapSkillsFromPlan);

// Generate topics for a single skill
router.post("/skills/:skillId/generate-topics", requireAuth, generateTopicsForSkill);

// Generate topics for all skills (bulk)
router.post("/generate-topics-for-user",requireAuth, generateTopicsForAllSkills);

export default router;;
