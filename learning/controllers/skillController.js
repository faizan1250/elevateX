const Skill = require('../models/Skill');
const SkillProgress = require('../../models/SkillProgress');
const Topic = require('../models/Topic')
const TopicProgress = require("../models/TopicProgress");
const { recomputeSkillProgress } = require("../services/learningUtils");
const aiService = require('../services/aiService');
const { generateSkillMaterial, AIGenerationError } = require('../services/aiService');
const mongoose = require("mongoose");
// Create a new skill
exports.createSkill = async (req, res) => {
  try {
    const skill = new Skill(req.body);
    await skill.save();
    res.status(201).json(skill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get all skills
// exports.getSkills = async (req, res) => {
//   try {
//     const { moduleId, q, difficulty, sort = "-updatedAt" } = req.query;

//     // userId comes from auth or query
//     const userIdRaw = req.user?.id || req.query.userId || null;
//     const hasUser = !!(userIdRaw && mongoose.Types.ObjectId.isValid(userIdRaw));
//     const userId = hasUser ? new mongoose.Types.ObjectId(userIdRaw) : null;

//     const filter = {};
//     if (moduleId && mongoose.Types.ObjectId.isValid(moduleId)) {
//       filter.moduleId = new mongoose.Types.ObjectId(moduleId);
//     } else if (moduleId) {
//       filter.moduleId = moduleId;
//     }
//     if (difficulty) filter.difficulty = difficulty;
//     if (q) filter.name = { $regex: q, $options: "i" };

//     const skills = await Skill.find(filter).sort(sort).lean().exec();

//     if (!hasUser || !skills.length) {
//       return res.json({
//         items: skills.map((s) => ({ ...s, progress: 0, status: "not_started" })),
//       });
//     }

//     const skillIds = skills.map((s) => s._id);
//     const progressDocs = await SkillProgress.find({
//       userId,
//       skillId: { $in: skillIds },
//     }).select("skillId progress status").lean();

//     const map = new Map(progressDocs.map((p) => [String(p.skillId), p]));

//     const merged = skills.map((s) => {
//       const p = map.get(String(s._id));
//       return {
//         ...s,
//         progress: typeof p?.progress === "number" ? p.progress : 0,
//         status: p?.status ?? "not_started",
//       };
//     });

//     return res.json({ items: merged });
//   } catch (err) {
//     console.error("getSkills error:", err);
//     return res.status(500).json({ message: err.message || "Failed to fetch skills" });
//   }
// };
// Get only the current user's skills (plus progress merge)
exports.getSkills = async (req, res) => {
  try {
    const { moduleId, q, difficulty, sort = "-updatedAt" } = req.query;

    // Prefer auth; fall back to explicit query param if provided
    const userIdRaw = req.user?.id || req.query.userId || null;
    const hasUser = !!(userIdRaw && mongoose.Types.ObjectId.isValid(userIdRaw));
    const userId = hasUser ? new mongoose.Types.ObjectId(userIdRaw) : null;

    // Build filter
    const filter = {};
    if (hasUser) {
      // crucial: scope to this user so we don't leak other users' skills
      filter.userId = userId;
    }
    if (moduleId && mongoose.Types.ObjectId.isValid(moduleId)) {
      filter.moduleId = new mongoose.Types.ObjectId(moduleId);
    } else if (moduleId) {
      // if your moduleId is stored as string somewhere, fine, keep it
      filter.moduleId = moduleId;
    }
    if (difficulty) filter.difficulty = difficulty;
    if (q) filter.name = { $regex: q, $options: "i" };

    // If no user is supplied, this is a user-scoped collection — don't leak everyone's skills
    if (!hasUser) {
      return res.json({ items: [] });
    }

    const skills = await Skill.find(filter).sort(sort).lean().exec();

    if (!skills.length) {
      return res.json({ items: [] });
    }

    // Merge per-skill progress/status for this user
    const skillIds = skills.map(s => s._id);
    const progressDocs = await SkillProgress.find({
      userId,
      skillId: { $in: skillIds },
    })
      .select("skillId progress status")
      .lean();

    const map = new Map(progressDocs.map(p => [String(p.skillId), p]));

    const merged = skills.map(s => {
      const p = map.get(String(s._id));
      return {
        ...s,
        progress: typeof p?.progress === "number" ? p.progress : 0,
        status: p?.status ?? "not_started",
      };
    });

    return res.json({ items: merged });
  } catch (err) {
    console.error("getSkills error:", err);
    return res
      .status(500)
      .json({ message: err.message || "Failed to fetch skills" });
  }
};



// controllers/skillController.js


exports.getSkill = async (req, res) => {
  try {
    const { id } = req.params;
    
     
    // Validate skill id early
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid skill id" });
    }

    // Prefer auth; fall back to explicit query param if provided (still validate)
    const userIdRaw = req.user?.id || req.query.userId || null;
    const hasUser = !!(userIdRaw && mongoose.Types.ObjectId.isValid(userIdRaw));
    if (!hasUser) {
      // Single-resource endpoint: don't leak existence without a valid user scope
      return res.status(404).json({ message: "Skill not found" });
    }
    const userId = new mongoose.Types.ObjectId(userIdRaw);

    // Scope by user so we never return someone else's skill
    const skill = await Skill.findOne({ _id: id, userId }).lean();
    if (!skill) {
      return res.status(404).json({ message: "Skill not found" });
    }

    // Merge per-skill progress/status for this user
    const progressDoc = await SkillProgress.findOne({ userId, skillId: skill._id })
      .select("progress status")
      .lean();

    const merged = {
      ...skill,
      progress: typeof progressDoc?.progress === "number" ? progressDoc.progress : 0,
      status: progressDoc?.status ?? "not_started",
    };

    return res.json(merged);
  } catch (err) {
    console.error("getSkill error:", err);
    return res.status(500).json({ message: err.message || "Failed to fetch skill" });
  }
};

// Update skill
exports.updateSkill = async (req, res) => {
  try {
    const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    res.json(skill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete skill
exports.deleteSkill = async (req, res) => {
  try {
    const skill = await Skill.findByIdAndDelete(req.params.id);
    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    res.json({ message: 'Skill deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// controllers/skillController.js (or wherever your progress lives)



exports.updateProgress = async (req, res) => {
  try {
    const { skillId, progress } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 🟢 Step 1: Get topics of this skill
    const topics = await Topic.find({ skillId }).select("_id").lean();
    const topicIds = topics.map((t) => t._id);

    // 🟢 Step 2: Get user's progress for those topics
    const topicProgressDocs = await TopicProgress.find({
      userId,
      topicId: { $in: topicIds },
    })
      .select("topicId status")
      .lean();

    // 🟢 Step 3: Check if all topics are done
    const allDone =
      topicIds.length > 0 &&
      topicIds.every((tid) =>
        topicProgressDocs.find(
          (tp) =>
            String(tp.topicId) === String(tid) &&
            tp.status === "completed"
        )
      );

    const derivedStatus = allDone
      ? "completed"
      : progress > 0
      ? "in_progress"
      : "not_started";

    // 🟢 Step 4: Compute derived progress %
    const completedCount = topicProgressDocs.filter(
      (tp) => tp.status === "completed"
    ).length;
    const derivedProgress =
      topicIds.length > 0
        ? Math.round((completedCount / topicIds.length) * 100)
        : progress || 0;

    // 🟢 Step 5: Update SkillProgress
    const updated = await SkillProgress.findOneAndUpdate(
      { userId, skillId },
      {
        $set: {
          progress: derivedProgress,
          status: derivedStatus,
          lastAccessed: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // ✅ FIX: just call recompute with skillId, no parentSkill needed
    await recomputeSkillProgress(userId, skillId);

    res.json(updated);
  } catch (err) {
    console.error("updateSkillProgress error:", err);
    res.status(500).json({ message: err.message });
  }
};





// Generate AI content for skill
exports.generateSkillContent = async (req, res) => {
  try {
    const { skillId } = req.params;
    const skill = await Skill.findById(skillId);
    if (!skill) return res.status(404).json({ message: "Skill not found" });

    // cache hit if we already have normalized JSON
    if (skill.generatedContent?.studyMaterialJson) {
      return res.json({
        cached: true,
        skill: { id: skill.id, name: skill.name, difficulty: skill.difficulty || "intermediate" },
        material: {
          json: skill.generatedContent.studyMaterialJson,
          text: skill.generatedContent.studyMaterialText || "", // optional
        },
      });
    }

    // generate fresh content (normalized JSON + raw)
    const { normalized, rawText } = await generateSkillMaterial(
      req.app.get("genAI"),
      skill.name,
      skill.difficulty || "intermediate"
    );

    skill.generatedContent = {
      ...(skill.generatedContent || {}),
      studyMaterialJson: normalized,
      studyMaterialText: rawText
    };
    await skill.save();

    return res.json({
      cached: false,
      skill: { id: skill.id, name: skill.name, difficulty: skill.difficulty || "intermediate" },
      material: { json: normalized, text: rawText }
    });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return res.status(err.status || 502).json({
        message: err.message,
        code: err.code,
        ...(err.meta ? { meta: err.meta } : {}),
      });
    }
    console.error("generateSkillContent error:", err);
    return res.status(500).json({ message: "Failed to generate AI content" });
  }
};