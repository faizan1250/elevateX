// import Skill from "../models/Skill.js";
// import SkillProgress from "../../models/SkillProgress.js";
// import Topic from "../models/Topic.js";
// import TopicProgress from "../models/TopicProgress.js";
// import { recomputeSkillProgress } from "../services/learningUtils.js";
// import * as  aiService from "../services/aiService.js";
// import { generateSkillMaterial, AIGenerationError } from "../services/aiService.js";
// import mongoose from "mongoose";
// // Create a new skill
// export const createSkill = async (req, res) => {
//   try {
//     const skill = new Skill(req.body);
//     await skill.save();
//     res.status(201).json(skill);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };;
//
// // Get only the current user's skills (plus progress merge)
// export const getSkills = async (req, res) => {
//   try {
//     const { moduleId, q, difficulty, sort = "-updatedAt" } = req.query;
//
//     // Prefer auth; fall back to explicit query param if provided
//     const userIdRaw = req.user?.id || req.query.userId || null;
//     const hasUser = !!(userIdRaw && mongoose.Types.ObjectId.isValid(userIdRaw));
//     const userId = hasUser ? new mongoose.Types.ObjectId(userIdRaw) : null;
//
//     // Build filter
//     const filter = {};
//     if (hasUser) {
//       // crucial: scope to this user so we don't leak other users' skills
//       filter.userId = userId;
//     }
//     if (moduleId && mongoose.Types.ObjectId.isValid(moduleId)) {
//       filter.moduleId = new mongoose.Types.ObjectId(moduleId);
//     } else if (moduleId) {
//       // if your moduleId is stored as string somewhere, fine, keep it
//       filter.moduleId = moduleId;
//     }
//     if (difficulty) filter.difficulty = difficulty;
//     if (q) filter.name = { $regex: q, $options: "i" };
//
//     // If no user is supplied, this is a user-scoped collection — don't leak everyone's skills
//     if (!hasUser) {
//       return res.json({ items: [] });
//     }
//
//     const skills = await Skill.find(filter).sort(sort).lean().exec();
//
//     if (!skills.length) {
//       return res.json({ items: [] });
//     }
//
//     // Merge per-skill progress/status for this user
//     const skillIds = skills.map(s => s._id);
//     const progressDocs = await SkillProgress.find({
//       userId,
//       skillId: { $in: skillIds },
//     })
//       .select("skillId progress status")
//       .lean();
//
//     const map = new Map(progressDocs.map(p => [String(p.skillId), p]));
//
//     const merged = skills.map(s => {
//       const p = map.get(String(s._id));
//       return {
//         ...s,
//         progress: typeof p?.progress === "number" ? p.progress : 0,
//         status: p?.status ?? "not_started",
//       };
//     });
//
//     return res.json({ items: merged });
//   } catch (err) {
//     console.error("getSkills error:", err);
//     return res
//       .status(500)
//       .json({ message: err.message || "Failed to fetch skills" });
//   }
// };;
//
//
//
// // controllers/skillController.js
//
//
// export const getSkill = async (req, res) => {
//   try {
//     const { id } = req.params;
//
//
//     // Validate skill id early
//     if (!id || !mongoose.Types.ObjectId.isValid(id)) {
//       return res.status(400).json({ message: "Invalid skill id" });
//     }
//
//     // Prefer auth; fall back to explicit query param if provided (still validate)
//     const userIdRaw = req.user?.id || req.query.userId || null;
//     const hasUser = !!(userIdRaw && mongoose.Types.ObjectId.isValid(userIdRaw));
//     if (!hasUser) {
//       // Single-resource endpoint: don't leak existence without a valid user scope
//       return res.status(404).json({ message: "Skill not found" });
//     }
//     const userId = new mongoose.Types.ObjectId(userIdRaw);
//
//     // Scope by user so we never return someone else's skill
//     const skill = await Skill.findOne({ _id: id, userId }).lean();
//     if (!skill) {
//       return res.status(404).json({ message: "Skill not found" });
//     }
//
//     // Merge per-skill progress/status for this user
//     const progressDoc = await SkillProgress.findOne({ userId, skillId: skill._id })
//       .select("progress status")
//       .lean();
//
//     const merged = {
//       ...skill,
//       progress: typeof progressDoc?.progress === "number" ? progressDoc.progress : 0,
//       status: progressDoc?.status ?? "not_started",
//     };
//
//     return res.json(merged);
//   } catch (err) {
//     console.error("getSkill error:", err);
//     return res.status(500).json({ message: err.message || "Failed to fetch skill" });
//   }
// };;
//
// // Update skill
// export const updateSkill = async (req, res) => {
//   try {
//     const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true });
//     if (!skill) return res.status(404).json({ message: 'Skill not found' });
//     res.json(skill);
//   } catch (err) {
//     res.status(400).json({ message: err.message });
//   }
// };;
//
// // Delete skill
// export const deleteSkill = async (req, res) => {
//   try {
//     const skill = await Skill.findByIdAndDelete(req.params.id);
//     if (!skill) return res.status(404).json({ message: 'Skill not found' });
//     res.json({ message: 'Skill deleted' });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };;
//
// // controllers/skillController.js (or wherever your progress lives)
//
//
//
// export const updateProgress = async (req, res) => {
//   try {
//     const { skillId, progress } = req.body;
//     const userId = req.user?.id;
//
//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }
//
//     // 🟢 Step 1: Get topics of this skill
//     const topics = await Topic.find({ skillId }).select("_id").lean();
//     const topicIds = topics.map((t) => t._id);
//
//     // 🟢 Step 2: Get user's progress for those topics
//     const topicProgressDocs = await TopicProgress.find({
//       userId,
//       topicId: { $in: topicIds },
//     })
//       .select("topicId status")
//       .lean();
//
//     // 🟢 Step 3: Check if all topics are done
//     const allDone =
//       topicIds.length > 0 &&
//       topicIds.every((tid) =>
//         topicProgressDocs.find(
//           (tp) =>
//             String(tp.topicId) === String(tid) &&
//             tp.status === "completed"
//         )
//       );
//
//     const derivedStatus = allDone
//       ? "completed"
//       : progress > 0
//       ? "in_progress"
//       : "not_started";
//
//     // 🟢 Step 4: Compute derived progress %
//     const completedCount = topicProgressDocs.filter(
//       (tp) => tp.status === "completed"
//     ).length;
//     const derivedProgress =
//       topicIds.length > 0
//         ? Math.round((completedCount / topicIds.length) * 100)
//         : progress || 0;
//
//     // 🟢 Step 5: Update SkillProgress
//     const updated = await SkillProgress.findOneAndUpdate(
//       { userId, skillId },
//       {
//         $set: {
//           progress: derivedProgress,
//           status: derivedStatus,
//           lastAccessed: new Date(),
//         },
//       },
//       { new: true, upsert: true, setDefaultsOnInsert: true }
//     );
//
//     // ✅ FIX: just call recompute with skillId, no parentSkill needed
//     await recomputeSkillProgress(userId, skillId);
//
//     res.json(updated);
//   } catch (err) {
//     console.error("updateSkillProgress error:", err);
//     res.status(500).json({ message: err.message });
//   }
// };;
//
//
//
//
//
// // Generate AI content for skill
// export const generateSkillContent = async (req, res) => {
//   try {
//     const { skillId } = req.params;
//     const skill = await Skill.findById(skillId);
//     if (!skill) return res.status(404).json({ message: "Skill not found" });
//
//     // cache hit if we already have normalized JSON
//     if (skill.generatedContent?.studyMaterialJson) {
//       return res.json({
//         cached: true,
//         skill: { id: skill.id, name: skill.name, difficulty: skill.difficulty || "intermediate" },
//         material: {
//           json: skill.generatedContent.studyMaterialJson,
//           text: skill.generatedContent.studyMaterialText || "", // optional
//         },
//       });
//     }
//
//     // generate fresh content (normalized JSON + raw)
//     const { normalized, rawText } = await generateSkillMaterial(
//       req.app.get("genAI"),
//       skill.name,
//       skill.difficulty || "intermediate"
//     );
//
//     skill.generatedContent = {
//       ...(skill.generatedContent || {}),
//       studyMaterialJson: normalized,
//       studyMaterialText: rawText
//     };
//     await skill.save();
//
//     return res.json({
//       cached: false,
//       skill: { id: skill.id, name: skill.name, difficulty: skill.difficulty || "intermediate" },
//       material: { json: normalized, text: rawText }
//     });
//   } catch (err) {
//     if (err instanceof AIGenerationError) {
//       return res.status(err.status || 502).json({
//         message: err.message,
//         code: err.code,
//         ...(err.meta ? { meta: err.meta } : {}),
//       });
//     }
//     console.error("generateSkillContent error:", err);
//     return res.status(500).json({ message: "Failed to generate AI content" });
//   }
// };;
//
// // DELETE + REGENERATE controller
// // Assumes you have: Skill, generateSkillMaterial(genAI, name, difficulty), AIGenerationError
//
// export const regenerateSkillContent = async (req, res) => {
//   try {
//     const { skillId } = req.params;
//     const skill = await Skill.findById(skillId);
//     if (!skill) return res.status(404).json({ message: "Skill not found" });
//
//     // 1) Generate new content first, so if generation fails you don't lose the old one.
//     const { normalized, rawText } = await generateSkillMaterial(
//       req.app.get("genAI"),
//       skill.name,
//       skill.difficulty || "intermediate"
//     );
//
//     // 2) Replace existing content atomically in one save.
//     // If you literally want the fields removed before setting, uncomment the $unset version below.
//     skill.generatedContent = {
//       ...(skill.generatedContent || {}),
//       studyMaterialJson: normalized,
//       studyMaterialText: rawText,
//     };
//     await skill.save();
//
//     return res.json({
//       regenerated: true,
//       cached: false,
//       skill: {
//         id: skill.id,
//         name: skill.name,
//         difficulty: skill.difficulty || "intermediate",
//       },
//       material: { json: normalized, text: rawText },
//     });
//   } catch (err) {
//     if (err instanceof AIGenerationError) {
//       // generation failed; old content is still intact because we generated before save
//       return res.status(err.status || 502).json({
//         message: err.message,
//         code: err.code,
//         ...(err.meta ? { meta: err.meta } : {}),
//       });
//     }
//     console.error("regenerateSkillContent error:", err);
//     return res.status(500).json({ message: "Failed to regenerate AI content" });
//   }
// };;
//
//

import mongoose from "mongoose";
import Skill from "../models/Skill.js";
import SkillProgress from "../../models/SkillProgress.js";
import Topic from "../models/Topic.js";
import TopicProgress from "../models/TopicProgress.js";
import { recomputeSkillProgress } from "../services/learningUtils.js";
import {
  generateSkillMaterial,
  AIGenerationError,
} from "../services/aiService.js";

/* =========================================================
   GRAPH / CYCLE DETECTION HELPERS
========================================================= */

const hasCycleFrom = (graph, node, visited, stack) => {
  if (!visited.has(node)) {
    visited.add(node);
    stack.add(node);

    const deps = graph.get(node) || [];
    for (const dep of deps) {
      if (!visited.has(dep) && hasCycleFrom(graph, dep, visited, stack)) {
        return true;
      }
      if (stack.has(dep)) {
        return true;
      }
    }
  }
  stack.delete(node);
  return false;
};

const graphHasCycle = (graph) => {
  const visited = new Set();
  const stack = new Set();

  for (const node of graph.keys()) {
    if (hasCycleFrom(graph, node, visited, stack)) {
      return true;
    }
  }
  return false;
};

const validatePrerequisites = async ({
  prereqIds,
  moduleId,
  skillId = null,
  userId,
}) => {
  if (!Array.isArray(prereqIds)) return;

  // 1️⃣ Basic validation
  for (const id of prereqIds) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid prerequisite skill id");
    }
    if (skillId && String(id) === String(skillId)) {
      throw new Error("Skill cannot depend on itself");
    }
  }

  // 2️⃣ Same-module + same-user validation
  const prereqSkills = await Skill.find({
    _id: { $in: prereqIds },
    moduleId,
    userId,
  }).select("_id prerequisites");

  if (prereqSkills.length !== prereqIds.length) {
    throw new Error("Invalid prerequisites (must belong to same module)");
  }

  // 3️⃣ Build full dependency graph
  const allSkills = await Skill.find({
    moduleId,
    userId,
  }).select("_id prerequisites");

  const graph = new Map(
    allSkills.map((s) => [String(s._id), s.prerequisites?.map(String) || []]),
  );

  // Inject updated edges (for update case)
  if (skillId) {
    graph.set(String(skillId), prereqIds.map(String));
  }

  // 4️⃣ Cycle detection (DAG enforcement)
  if (graphHasCycle(graph)) {
    throw new Error("Cyclic dependency detected in skill prerequisites");
  }
};

/* =========================================================
   CREATE SKILL
========================================================= */

export const createSkill = async (req, res) => {
  try {
    const {
      name,
      description,
      difficulty,
      moduleId,
      order = 0,
      prerequisites = [],
    } = req.body;

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      return res.status(400).json({ message: "Invalid moduleId" });
    }

    await validatePrerequisites({
      prereqIds: prerequisites,
      moduleId,
      userId,
    });

    const skill = await Skill.create({
      userId,
      name,
      description,
      difficulty,
      moduleId,
      order,
      prerequisites,
    });

    return res.status(201).json(skill);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

/* =========================================================
   GET USER SKILLS (WITH PROGRESS)
========================================================= */

export const getSkills = async (req, res) => {
  try {
    const { moduleId, q, difficulty, sort = "-updatedAt" } = req.query;

    const userIdRaw = req.user?.id || req.query.userId;
    if (!mongoose.Types.ObjectId.isValid(userIdRaw)) {
      return res.json({ items: [] });
    }

    const userId = new mongoose.Types.ObjectId(userIdRaw);
    const filter = { userId };

    if (moduleId && mongoose.Types.ObjectId.isValid(moduleId)) {
      filter.moduleId = new mongoose.Types.ObjectId(moduleId);
    }
    if (difficulty) filter.difficulty = difficulty;
    if (q) filter.name = { $regex: q, $options: "i" };

    const skills = await Skill.find(filter).sort(sort).lean();
    if (!skills.length) return res.json({ items: [] });

    const progressDocs = await SkillProgress.find({
      userId,
      skillId: { $in: skills.map((s) => s._id) },
    }).lean();

    const map = new Map(progressDocs.map((p) => [String(p.skillId), p]));

    const merged = skills.map((s) => {
      const p = map.get(String(s._id));
      return {
        ...s,
        progress: p?.progress ?? 0,
        status: p?.status ?? "not_started",
      };
    });

    return res.json({ items: merged });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch skills" });
  }
};

/* =========================================================
   GET SINGLE SKILL
========================================================= */

export const getSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(404).json({ message: "Skill not found" });
    }

    const skill = await Skill.findOne({ _id: id, userId }).lean();
    if (!skill) return res.status(404).json({ message: "Skill not found" });

    const progressDoc = await SkillProgress.findOne({
      userId,
      skillId: id,
    }).lean();

    return res.json({
      ...skill,
      progress: progressDoc?.progress ?? 0,
      status: progressDoc?.status ?? "not_started",
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch skill" });
  }
};

/* =========================================================
   UPDATE SKILL
========================================================= */

export const updateSkill = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid skill id" });
    }

    const skill = await Skill.findById(id);
    if (!skill) return res.status(404).json({ message: "Skill not found" });

    const { prerequisites, order } = req.body;

    if (prerequisites) {
      await validatePrerequisites({
        prereqIds: prerequisites,
        moduleId: skill.moduleId,
        skillId: skill._id,
        userId: skill.userId,
      });
      skill.prerequisites = prerequisites;
    }

    if (typeof order === "number") skill.order = order;

    ["name", "description", "difficulty"].forEach((f) => {
      if (req.body[f] !== undefined) skill[f] = req.body[f];
    });

    await skill.save();
    return res.json(skill);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

/* =========================================================
   DELETE SKILL
========================================================= */

export const deleteSkill = async (req, res) => {
  try {
    const skill = await Skill.findByIdAndDelete(req.params.id);
    if (!skill) return res.status(404).json({ message: "Skill not found" });
    return res.json({ message: "Skill deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   UPDATE SKILL PROGRESS
========================================================= */

export const updateProgress = async (req, res) => {
  try {
    const { skillId } = req.body;
    const userId = req.user?.id;

    const topics = await Topic.find({ skillId }).select("_id").lean();
    const topicIds = topics.map((t) => t._id);

    const topicProgressDocs = await TopicProgress.find({
      userId,
      topicId: { $in: topicIds },
    }).lean();

    const completedCount = topicProgressDocs.filter(
      (tp) => tp.status === "completed",
    ).length;

    const progress =
      topicIds.length > 0
        ? Math.round((completedCount / topicIds.length) * 100)
        : 0;

    const status =
      progress === 100
        ? "completed"
        : progress > 0
          ? "in_progress"
          : "not_started";

    const updated = await SkillProgress.findOneAndUpdate(
      { userId, skillId },
      { progress, status, lastAccessed: new Date() },
      { new: true, upsert: true },
    );

    await recomputeSkillProgress(userId, skillId);
    return res.json(updated);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/* =========================================================
   AI CONTENT
========================================================= */

export const generateSkillContent = async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.skillId);
    if (!skill) return res.status(404).json({ message: "Skill not found" });

    if (skill.generatedContent?.studyMaterialJson) {
      return res.json({ cached: true, material: skill.generatedContent });
    }

    const { normalized, rawText } = await generateSkillMaterial(
      req.app.get("genAI"),
      skill.name,
      skill.difficulty,
    );

    skill.generatedContent = {
      studyMaterialJson: normalized,
      studyMaterialText: rawText,
    };
    await skill.save();

    return res.json({ cached: false, material: skill.generatedContent });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return res.status(err.status).json({ message: err.message });
    }
    return res.status(500).json({ message: "AI generation failed" });
  }
};

export const regenerateSkillContent = async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.skillId);
    if (!skill) return res.status(404).json({ message: "Skill not found" });

    const { normalized, rawText } = await generateSkillMaterial(
      req.app.get("genAI"),
      skill.name,
      skill.difficulty,
    );

    skill.generatedContent = {
      studyMaterialJson: normalized,
      studyMaterialText: rawText,
    };
    await skill.save();

    return res.json({ regenerated: true, material: skill.generatedContent });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return res.status(err.status || 502).json({ message: err.message });
    }
    return res.status(500).json({ message: "Failed to regenerate AI content" });
  }
};

/* =========================================================
   MODULE ROADMAP (GRAPH-FRIENDLY)
========================================================= */

export const getModuleRoadmap = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = req.user?.id;

    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      return res.status(400).json({ message: "Invalid moduleId" });
    }

    const skills = await Skill.find({
      moduleId: new mongoose.Types.ObjectId(moduleId),
      userId: new mongoose.Types.ObjectId(userId),
    })
      .populate("prerequisites", "_id")
      .lean();

    const progressDocs = await SkillProgress.find({
      userId,
      skillId: { $in: skills.map((s) => s._id) },
    }).lean();

    const progressMap = new Map(
      progressDocs.map((p) => [String(p.skillId), p]),
    );

    const nodes = skills.map((s) => {
      const p = progressMap.get(String(s._id));
      return {
        id: String(s._id),
        label: s.name,
        difficulty: s.difficulty,
        progress: p?.progress ?? 0,
        status: p?.status ?? "not_started",
        order: s.order ?? 0,
      };
    });

    const edges = [];
    skills.forEach((s) => {
      (s.prerequisites || []).forEach((pre) => {
        edges.push({
          source: String(pre._id),
          target: String(s._id),
        });
      });
    });

    return res.json({ nodes, edges });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to load module roadmap",
    });
  }
};
