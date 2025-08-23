const express = require("express");
const router = express.Router();

const skillController = require("../controllers/skillController");
const requireAuth = require('../../middleware/auth');
// CRUD
router.post("/",requireAuth, skillController.createSkill);
router.get("/",requireAuth, skillController.getSkills);
router.get("/:id",requireAuth, skillController.getSkill);
router.put("/:id",requireAuth, skillController.updateSkill);
router.delete("/:id",requireAuth, skillController.deleteSkill);

// Progress tracking
router.post("/progress",requireAuth, skillController.updateProgress);

// AI content
router.get("/:skillId/content",requireAuth, skillController.generateSkillContent);
router.get("/:skillId/content/regen",requireAuth, skillController.regenerateSkillContent);

module.exports = router;
