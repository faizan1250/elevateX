const express = require("express");
const router = express.Router();
const testController = require("../controllers/testController");

// CRUD
router.post("/", testController.createTest);
router.get("/", testController.getTests);
router.get("/:id", testController.getTest);
router.put("/:id", testController.updateTest);
router.delete("/:id", testController.deleteTest);

// AI-generated questions
router.get("/:testId/generate-questions", testController.generateTestQuestions);

module.exports = router;
