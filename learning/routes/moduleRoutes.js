import express from "express";
const router = express.Router();
import * as  moduleController from "../controllers/moduleController.js";
import requireAuth from "../../middleware/auth.js";
// CRUD
router.post("/",requireAuth, moduleController.createModule);
router.get("/", requireAuth, moduleController.getModules);
router.get("/:id",requireAuth, moduleController.getModule);
router.put("/:id",requireAuth, moduleController.updateModule);
router.delete("/:id",requireAuth, moduleController.deleteModule);

// AI-generated path
router.get("/:moduleId/generate-path",requireAuth, moduleController.generateModulePath);

export default router;;
