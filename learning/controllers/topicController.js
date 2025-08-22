const Topic = require('../models/Topic');
const Skill = require('../models/Skill');
const aiService = require('../services/aiService');
const TopicProgress = require("../models/TopicProgress");
const mongoose = require("mongoose");
const { recomputeSkillProgress } = require("../services/learningUtils");
exports.createTopic = async (req, res) => {
  try {
    const topic = new Topic(req.body);
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateProgress = async (req, res) => {
  try {
    const { topicId, progress, status } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // 1) Load the topic to know its parent skill
    const topic = await Topic.findById(topicId).select("skillId").lean();
    if (!topic) return res.status(404).json({ message: "Topic not found" });

    // 2) Compute/normalize status
    const computedStatus =
      typeof status === "string"
        ? status
        : progress >= 100
        ? "completed"
        : progress > 0
        ? "in_progress"
        : "not_started";

    // 3) Upsert topic progress
    const updated = await TopicProgress.findOneAndUpdate(
      { userId, topicId },
      {
        $set: {
          progress: typeof progress === "number" ? progress : 0,
          status: computedStatus,
          lastAccessed: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // 4) Recompute parent skill progress from all topic statuses
    if (topic?.skillId) {
      await recomputeSkillProgress(userId, topic.skillId);
    }

    return res.json(updated);
  } catch (err) {
    console.error("updateProgress error:", err);
    return res.status(500).json({ message: err.message });
  }
};

// 🟢 Get Topics with User Progress
exports.getTopics = async (req, res) => {
  try {
    const { moduleId, q, difficulty, sort = "-updatedAt" } = req.query;

    const userIdRaw = req.user?.id || req.query.userId || null;
    const hasUser = !!(userIdRaw && mongoose.Types.ObjectId.isValid(userIdRaw));
    const userId = hasUser ? new mongoose.Types.ObjectId(userIdRaw) : null;

    const filter = {};
    if (moduleId && mongoose.Types.ObjectId.isValid(moduleId)) {
      filter.moduleId = new mongoose.Types.ObjectId(moduleId);
    }
    if (difficulty) filter.difficulty = difficulty;
    if (q) filter.name = { $regex: q, $options: "i" };

    const topics = await Topic.find(filter).sort(sort).lean().exec();

    if (!hasUser || !topics.length) {
      return res.json({
        items: topics.map((t) => ({ ...t, progress: 0, status: "not_started" })),
      });
    }

    const topicIds = topics.map((t) => t._id);
    const progressDocs = await TopicProgress.find({
      userId,
      topicId: { $in: topicIds },
    }).select("topicId progress status").lean();

    const map = new Map(progressDocs.map((p) => [String(p.topicId), p]));

    const merged = topics.map((t) => {
      const p = map.get(String(t._id));
      return {
        ...t,
        progress: typeof p?.progress === "number" ? p.progress : 0,
        status: p?.status ?? "not_started",
      };
    });

    return res.json({ items: merged });
  } catch (err) {
    console.error("getTopics error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch topics" });
  }
};

exports.getTopic = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id).populate('moduleId', 'name');
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const topic = await Topic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    res.json(topic);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findByIdAndDelete(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    res.json({ message: 'Topic deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// AI generate summary/learning material
// AI generate summary/learning material with caching
exports.generateTopicSummary = async (req, res) => {
  try {
    const { topicId } = req.params;
    const topic = await Topic.findById(topicId);
    if (!topic) return res.status(404).json({ message: "Topic not found" });

    // Check cache first
    if (topic.generatedContent?.summary) {
      return res.json({ topic, summary: topic.generatedContent.summary, cached: true });
    }

    // Call AI service if no cache
    const summary = await aiService.generateTopicSummary(topic.name, topic.difficulty);

    // Save into topic doc
    topic.generatedContent = {
      ...(topic.generatedContent || {}),
      summary,
    };
    await topic.save();

    res.json({ topic, summary, cached: false });
  } catch (err) {
    console.error("generateTopicSummary error:", err);
    res.status(500).json({ message: err.message || "Failed to generate topic summary" });
  }
};

