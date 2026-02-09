// import express from "express";
// const router = express.Router();
//
// import * as  skillController from "../controllers/skillController.js";
// import requireAuth from "../../middleware/auth.js";
// // CRUD
// router.post("/",requireAuth, skillController.createSkill);
// router.get("/",requireAuth, skillController.getSkills);
// router.get("/:id",requireAuth, skillController.getSkill);
// router.put("/:id",requireAuth, skillController.updateSkill);
// router.delete("/:id",requireAuth, skillController.deleteSkill);
//
// // Progress tracking
// router.post("/progress",requireAuth, skillController.updateProgress);
//
// // AI content
// router.get("/:skillId/content",requireAuth, skillController.generateSkillContent);
// router.get("/:skillId/content/regen",requireAuth, skillController.regenerateSkillContent);
//export default router;;
//
import express from "express";
const router = express.Router();

import * as skillController from "../controllers/skillController.js";
import requireAuth from "../../middleware/auth.js";

/* ===========================
   CRUD
=========================== */

router.post("/", requireAuth, skillController.createSkill);
router.get("/", requireAuth, skillController.getSkills);
// Roadmap graph

/* ===========================
   AI CONTENT (specific routes FIRST)
=========================== */

router.get(
  "/:skillId/content",
  requireAuth,
  skillController.generateSkillContent,
);
// ⛔ removed regen route unless you re-add controller
router.get(
  "/:skillId/content/regen",
  requireAuth,
  skillController.regenerateSkillContent,
);
/* ===========================
   SINGLE SKILL
=========================== */

router.get("/:id", requireAuth, skillController.getSkill);
router.put("/:id", requireAuth, skillController.updateSkill);
router.delete("/:id", requireAuth, skillController.deleteSkill);

/* ===========================
   PROGRESS
=========================== */

router.post("/progress", requireAuth, skillController.updateProgress);

export default router;
