const express = require("express");
const router = express.Router();
const topicController = require("../controllers/topicController");

// CRUD
router.post("/", topicController.createTopic);
router.get("/", topicController.getTopics);
router.get("/:id", topicController.getTopic);
router.put("/:id", topicController.updateTopic);
router.delete("/:id", topicController.deleteTopic);

// AI-generated summary
router.get("/:topicId/generate-summary", topicController.generateTopicSummary);

module.exports = router;
