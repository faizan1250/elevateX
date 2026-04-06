import express from "express";
import auth from "../middleware/auth.js";
import * as resumeController from "../controllers/resumeController.js";

const router = express.Router();

router.get("/workspace", auth, resumeController.getWorkspace);
router.get("/profile", auth, resumeController.getProfile);
router.put("/profile", auth, resumeController.updateProfile);
router.get("/versions", auth, resumeController.listVersions);
router.post("/versions", auth, resumeController.createVersion);
router.get("/versions/:id", auth, resumeController.getVersion);
router.put("/versions/:id", auth, resumeController.updateVersion);
router.post("/versions/:id/analyze", auth, resumeController.analyzeVersion);
router.post("/versions/:id/generate", auth, resumeController.generateVersion);
router.get("/versions/:id/export/pdf", auth, resumeController.exportPdf);

export default router;
