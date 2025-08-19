const express = require("express");
const router = express.Router();
const {
  bootstrapSkillsFromPlan,
  generateTopicsForSkill,
  generateTopicsForAllSkills,
} = require("../controllers/bootstrapController");
const requireAuth = require('../../middleware/auth');

// Convert saved plan -> Modules + Skills
router.post("/skills", requireAuth, bootstrapSkillsFromPlan);

// Generate topics for a single skill
router.post("/skills/:skillId/generate-topics", requireAuth, generateTopicsForSkill);

// Generate topics for all skills (bulk)
router.post("/generate-topics-for-user",requireAuth, generateTopicsForAllSkills);

module.exports = router;
