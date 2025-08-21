const express = require("express");
const router = express.Router();
const topicController = require("../controllers/topicController");
const requireAuth = require("../../middleware/auth");

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

module.exports = router;
