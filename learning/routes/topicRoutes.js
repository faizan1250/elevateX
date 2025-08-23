import express from "express";
const router = express.Router();
import * as topicController from "../controllers/topicController.js";
import requireAuth from "../../middleware/auth.js";

// CRUD
router.post("/", requireAuth, topicController.createTopic);
router.get("/", requireAuth, topicController.getTopics);
router.get("/:id", requireAuth, topicController.getTopic);
router.put("/:id", requireAuth, topicController.updateTopic);
router.delete("/:id", requireAuth, topicController.deleteTopic);

// AI-generated summary
router.get("/:topicId/generate-summary", requireAuth, topicController.generateTopicSummary);

// Progress tracking
router.post("/progress", requireAuth, topicController.updateProgress);

export default router;;
