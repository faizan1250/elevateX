import express from "express";
const router = express.Router();
import * as testController from "../controllers/testController.js";

// CRUD
router.post("/", testController.createTest);
router.get("/", testController.getTests);
router.get("/:id", testController.getTest);
router.put("/:id", testController.updateTest);
router.delete("/:id", testController.deleteTest);

// AI-generated questions
router.get("/:testId/generate-questions", testController.generateTestQuestions);

export default router;;
