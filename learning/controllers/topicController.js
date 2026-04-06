import Topic from "../models/Topic.js";
import Skill from "../models/Skill.js";
import * as aiService from "../services/aiService.js";
import TopicProgress from "../models/TopicProgress.js";
import TopicMasteryAttempt from "../models/TopicMasteryAttempt.js";
import mongoose from "mongoose";
import { recomputeSkillProgress } from "../services/learningUtils.js";
export const createTopic = async (req, res) => {
  try {
    const topic = new Topic(req.body);
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const updateProgress = async (req, res) => {
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
      { new: true, upsert: true, setDefaultsOnInsert: true },
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
export const getTopics = async (req, res) => {
  try {
    const { moduleId, skillId, q, difficulty, sort = "-updatedAt" } = req.query;

    const userIdRaw = req.user?.id || req.query.userId || null;
    const hasUser = !!(userIdRaw && mongoose.Types.ObjectId.isValid(userIdRaw));
    const userId = hasUser ? new mongoose.Types.ObjectId(userIdRaw) : null;

    const filter = {};
    if (moduleId && mongoose.Types.ObjectId.isValid(moduleId)) {
      filter.moduleId = new mongoose.Types.ObjectId(moduleId);
    }
    if (skillId && mongoose.Types.ObjectId.isValid(skillId)) {
      filter.skillId = new mongoose.Types.ObjectId(skillId);
    }
    if (difficulty) filter.difficulty = difficulty;
    if (q) filter.name = { $regex: q, $options: "i" };

    const topics = await Topic.find(filter).sort(sort).lean().exec();

    if (!hasUser || !topics.length) {
      return res.json({
        items: topics.map((t) => ({
          ...t,
          progress: 0,
          status: "not_started",
        })),
      });
    }

    const topicIds = topics.map((t) => t._id);
    const progressDocs = await TopicProgress.find({
      userId,
      topicId: { $in: topicIds },
    })
      .select("topicId progress status")
      .lean();

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
    return res
      .status(500)
      .json({ message: err.message || "Failed to fetch topics" });
  }
};

export const getTopic = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id).populate(
      "moduleId",
      "name",
    );
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateTopic = async (req, res) => {
  try {
    const topic = await Topic.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    res.json(topic);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findByIdAndDelete(req.params.id);
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    res.json({ message: "Topic deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// AI generate summary/learning material
// AI generate summary/learning material with caching
export const generateTopicSummary = async (req, res) => {
  try {
    const { topicId } = req.params;
    const topic = await Topic.findById(topicId);
    if (!topic) return res.status(404).json({ message: "Topic not found" });

    // Check cache first
    if (topic.generatedContent?.summary) {
      return res.json({
        topic,
        summary: topic.generatedContent.summary,
        cached: true,
      });
    }

    // Call AI service if no cache
    const summary = await aiService.generateTopicSummary(
      topic.name,
      topic.difficulty,
    );

    // Save into topic doc
    topic.generatedContent = {
      ...(topic.generatedContent || {}),
      summary,
    };
    await topic.save();

    res.json({ topic, summary, cached: false });
  } catch (err) {
    console.error("generateTopicSummary error:", err);
    res
      .status(500)
      .json({ message: err.message || "Failed to generate topic summary" });
  }
};

export const getTopicMasteryCheck = async (req, res) => {
  try {
    const { topicId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const topic = await Topic.findById(topicId).lean();
    if (!topic) return res.status(404).json({ message: "Topic not found" });

    const attempts = await TopicMasteryAttempt.find({ userId, topicId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    if (topic.generatedContent?.masteryCheck?.questions?.length) {
      return res.json({
        topicId,
        masteryCheck: topic.generatedContent.masteryCheck,
        attempts,
        latestAttempt: attempts[0] || null,
        cached: true,
      });
    }

    const skill = topic.skillId ? await Skill.findById(topic.skillId).lean() : null;

    const generated = await aiService.generateTopicMasteryCheck({
      topicTitle: topic.title,
      topicContent:
        typeof topic.content === "string" ? topic.content : JSON.stringify(topic.content || {}),
      skillName: skill?.name || "",
      difficulty: skill?.difficulty || "intermediate",
    });

    await Topic.findByIdAndUpdate(topicId, {
      $set: {
        "generatedContent.masteryCheck": generated,
      },
    });

    return res.json({
      topicId,
      masteryCheck: generated,
      attempts,
      latestAttempt: attempts[0] || null,
      cached: false,
    });
  } catch (err) {
    console.error("getTopicMasteryCheck error:", err);
    return res.status(500).json({ message: err.message || "Failed to generate mastery check" });
  }
};

export const submitTopicMasteryCheck = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { answers = [] } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const topic = await Topic.findById(topicId).lean();
    if (!topic) return res.status(404).json({ message: "Topic not found" });

    let masteryCheck = topic.generatedContent?.masteryCheck;
    if (!masteryCheck?.questions?.length) {
      const skill = topic.skillId ? await Skill.findById(topic.skillId).lean() : null;
      masteryCheck = await aiService.generateTopicMasteryCheck({
        topicTitle: topic.title,
        topicContent:
          typeof topic.content === "string" ? topic.content : JSON.stringify(topic.content || {}),
        skillName: skill?.name || "",
        difficulty: skill?.difficulty || "intermediate",
      });

      await Topic.findByIdAndUpdate(topicId, {
        $set: {
          "generatedContent.masteryCheck": masteryCheck,
        },
      });
    }

    const result = aiService.evaluateTopicMasteryCheck(masteryCheck, answers);
    const normalizedSubmittedAnswers = Array.isArray(answers) ? answers : [];

    const nextStatus = result.passed ? "completed" : "in_progress";
    const nextProgress = result.passed ? 100 : Math.max(20, Math.min(95, result.score));

    await TopicProgress.findOneAndUpdate(
      { userId, topicId },
      {
        $set: {
          progress: nextProgress,
          status: nextStatus,
          lastAccessed: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    const attempt = await TopicMasteryAttempt.create({
      userId,
      topicId,
      skillId: topic.skillId || null,
      score: result.score,
      passingScore: result.passingScore,
      passed: result.passed,
      correctCount: result.correctCount,
      totalQuestions: result.totalQuestions,
      weakAreas: result.weakAreas || [],
      strengths: result.strengths || [],
      submittedAnswers: normalizedSubmittedAnswers,
      details: result.details || [],
    });

    if (topic.skillId) {
      await recomputeSkillProgress(userId, topic.skillId);
    }

    const attempts = await TopicMasteryAttempt.find({ userId, topicId })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const missedDetails = (result.details || []).filter((item) => !item.isCorrect);
    const personalizedRetrySet = missedDetails.slice(0, 3).map((item, index) => ({
      id: `${item.id || index}-retry`,
      prompt: item.prompt,
      conceptTags: (result.weakAreas || []).slice(index, index + 2),
      whyMissed: item.explanation || "The concept was not applied correctly under pressure.",
      nextAction: `Retry this after reviewing ${result.weakAreas?.[index] || "the underlying concept"}.`,
    }));
    const spacedRepetition = {
      shouldReviewAgain: !result.passed || result.score < 85,
      nextReviewInDays: result.passed ? (result.score >= 90 ? 7 : 3) : 1,
      queueLabel: result.passed ? "Retention queue" : "Urgent retry queue",
    };

    return res.json({
      topicId,
      result,
      attempt,
      attempts,
      unlockedCompletion: result.passed,
      reviewIntelligence: {
        whyYouMissedThis: missedDetails.map((item) => ({
          id: item.id,
          prompt: item.prompt,
          explanation: item.explanation || "The answer did not match the required concept or decision rule.",
        })),
        conceptTags: result.weakAreas || [],
        personalizedRetrySet,
        spacedRepetition,
      },
    });
  } catch (err) {
    console.error("submitTopicMasteryCheck error:", err);
    return res.status(500).json({ message: err.message || "Failed to submit mastery check" });
  }
};
