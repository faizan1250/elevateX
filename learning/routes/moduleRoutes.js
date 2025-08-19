const express = require("express");
const router = express.Router();
const moduleController = require("../controllers/moduleController");
const requireAuth = require('../../middleware/auth');
// CRUD
router.post("/",requireAuth, moduleController.createModule);
router.get("/", requireAuth, moduleController.getModules);
router.get("/:id",requireAuth, moduleController.getModule);
router.put("/:id",requireAuth, moduleController.updateModule);
router.delete("/:id",requireAuth, moduleController.deleteModule);

// AI-generated path
router.get("/:moduleId/generate-path",requireAuth, moduleController.generateModulePath);

module.exports = router;
