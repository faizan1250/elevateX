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
import TopicMasteryAttempt from "../models/TopicMasteryAttempt.js";
import CareerChoice from "../../models/CareerChoice.js";
import CareerPlan from "../../models/CareerPlan.js";
import { recomputeSkillProgress } from "../services/learningUtils.js";
import {
  generateTopicsForSkill,
  generateSkillMaterial,
  generateTopicMasteryCheck,
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

const startOfDayUtc = (date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const diffInDays = (left, right) =>
  Math.max(
    0,
    Math.ceil((startOfDayUtc(left) - startOfDayUtc(right)) / (1000 * 60 * 60 * 24)),
  );

const average = (values = []) =>
  values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;

const safeJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
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

export const getSkillInsights = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(404).json({ message: "Skill not found" });
    }

    const [skill, skillProgressDoc, topics, attempts, careerChoice, careerPlan] =
      await Promise.all([
        Skill.findOne({ _id: id, userId }).lean(),
        SkillProgress.findOne({ userId, skillId: id }).lean(),
        Topic.find({ skillId: id }).sort({ order: 1, createdAt: 1 }).lean(),
        TopicMasteryAttempt.find({ userId, skillId: id }).sort({ createdAt: -1 }).lean(),
        CareerChoice.findOne({ userId }).lean(),
        CareerPlan.findOne({ userId }).lean(),
      ]);

    if (!skill) return res.status(404).json({ message: "Skill not found" });

    const topicIds = topics.map((topic) => topic._id);
    const scopedTopicProgressDocs = topicIds.length
      ? await TopicProgress.find({ userId, topicId: { $in: topicIds } }).lean()
      : [];
    const topicProgressMap = new Map(
      scopedTopicProgressDocs.map((doc) => [String(doc.topicId), doc]),
    );

    const topicStats = topics.map((topic) => {
      const progress = topicProgressMap.get(String(topic._id));
      const topicAttempts = attempts.filter(
        (attempt) => String(attempt.topicId) === String(topic._id),
      );
      const latestAttempt = topicAttempts[0] || null;

      return {
        id: topic._id,
        title: topic.title,
        order: topic.order ?? 0,
        status: progress?.status || "not_started",
        progress: progress?.progress || 0,
        attempts: topicAttempts.length,
        latestScore: latestAttempt?.score ?? null,
        lastAttemptedAt: latestAttempt?.createdAt || null,
        weakAreas: latestAttempt?.weakAreas || [],
      };
    });

    const completedTopics = topicStats.filter((topic) => topic.status === "completed").length;
    const recentAttempts = attempts.slice(0, 8).map((attempt) => ({
      id: attempt._id,
      topicId: attempt.topicId,
      score: attempt.score,
      passed: attempt.passed,
      createdAt: attempt.createdAt,
      weakAreas: attempt.weakAreas || [],
      strengths: attempt.strengths || [],
    }));

    const dailyAttemptMap = new Map();
    attempts.forEach((attempt) => {
      const key = startOfDayUtc(new Date(attempt.createdAt)).toISOString().slice(0, 10);
      const current = dailyAttemptMap.get(key) || { date: key, attempts: 0, totalScore: 0, passes: 0 };
      current.attempts += 1;
      current.totalScore += attempt.score || 0;
      current.passes += attempt.passed ? 1 : 0;
      dailyAttemptMap.set(key, current);
    });

    const momentum = Array.from({ length: 14 }).map((_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (13 - index));
      const key = startOfDayUtc(date).toISOString().slice(0, 10);
      const bucket = dailyAttemptMap.get(key);
      return {
        date: key,
        attempts: bucket?.attempts || 0,
        averageScore: bucket?.attempts ? Math.round(bucket.totalScore / bucket.attempts) : 0,
        passes: bucket?.passes || 0,
      };
    });

    const recentWindow = momentum.slice(-7);
    const weeklyAttemptVelocity = recentWindow.reduce((sum, day) => sum + day.attempts, 0);
    const weeklyPassVelocity = recentWindow.reduce((sum, day) => sum + day.passes, 0);
    const averageScore = average(attempts.map((attempt) => attempt.score || 0));
    const passRate = attempts.length
      ? Math.round((attempts.filter((attempt) => attempt.passed).length / attempts.length) * 100)
      : 0;

    const weakTopicClusters = topicStats
      .filter((topic) => topic.status !== "completed")
      .sort((left, right) => {
        const leftScore = left.latestScore ?? -1;
        const rightScore = right.latestScore ?? -1;
        if (leftScore === rightScore) return (left.order ?? 0) - (right.order ?? 0);
        return leftScore - rightScore;
      })
      .slice(0, 3)
      .map((topic) => ({
        topicId: topic.id,
        title: topic.title,
        latestScore: topic.latestScore,
        attempts: topic.attempts,
        weakAreas: topic.weakAreas,
      }));

    const progress = skillProgressDoc?.progress ?? 0;
    const remainingProgress = Math.max(0, 100 - progress);
    const readinessVelocity = weeklyAttemptVelocity > 0 ? Math.max(3, Math.round((weeklyPassVelocity * 100) / Math.max(1, topics.length))) : 0;
    const predictedReadyInDays = readinessVelocity > 0
      ? Math.ceil((remainingProgress / readinessVelocity) * 7)
      : null;

    const estimatedWeeks = Number(careerChoice?.careerJourney?.estimatedTimeline) || 0;
    const planStartDate = careerPlan?.createdAt || careerChoice?.createdAt || new Date();
    const elapsedDays = diffInDays(new Date(), new Date(planStartDate));
    const daysRemainingToGoal = estimatedWeeks ? Math.max(0, estimatedWeeks * 7 - elapsedDays) : null;
    const readinessForecast = predictedReadyInDays == null
      ? "insufficient_data"
      : daysRemainingToGoal == null
        ? "no_deadline"
        : predictedReadyInDays <= daysRemainingToGoal
          ? "on_track"
          : "at_risk";

    const projectQueue = Array.isArray(careerPlan?.plan?.projects) ? careerPlan.plan.projects : [];
    const normalizedSkillName = String(skill.name || "").toLowerCase();
    const matchedProjects = projectQueue.filter((project) => {
      const haystack = JSON.stringify(project).toLowerCase();
      return haystack.includes(normalizedSkillName);
    });
    const primaryProject = matchedProjects[0] || projectQueue[0] || null;
    const latestFailedAttempt = attempts.find((attempt) => !attempt.passed) || null;
    const skillBrief = skill.generatedContent?.studyMaterialJson || null;
    const nextStudyTopic = topics.find((topic) => {
      const progress = topicProgressMap.get(String(topic._id));
      return progress?.status !== "completed";
    }) || topics[0] || null;
    const nextStudyPayload = safeJson(nextStudyTopic?.content);
    const studyGuide = nextStudyTopic
      ? {
          topicId: nextStudyTopic._id,
          topicTitle: nextStudyTopic.title,
          summary:
            nextStudyPayload.summary ||
            `This topic matters because it directly supports ${skill.name} readiness and shows up in proof-based evaluation.`,
          keyConcepts: [
            ...(nextStudyPayload.objectives || []).slice(0, 3),
            ...((skillBrief?.concepts || []).slice(0, 2).map((concept) => concept.term)),
          ].filter(Boolean).slice(0, 5),
          miniExercises: [
            ...(nextStudyPayload.objectives || []).slice(0, 2).map((objective) => `Explain and demonstrate: ${objective}`),
            `Write one practical example where ${skill.name} would be used under real constraints.`,
          ].slice(0, 3),
          commonMistakes: [
            ...(latestFailedAttempt?.weakAreas || []).slice(0, 2),
            ...((skillBrief?.pitfalls || []).slice(0, 2)),
          ].filter(Boolean).slice(0, 4),
        }
      : null;

    const proofLinkage = {
      portfolioArtifact: {
        title: primaryProject?.name || primaryProject?.title || `${skill.name} implementation artifact`,
        description:
          primaryProject?.description ||
          `Build a concrete artifact that demonstrates ${skill.name} under realistic constraints.`,
      },
      resumeBullet:
        `Built and validated ${skill.name} capability through hands-on implementation and repeated mastery checks inside ElevateX.`,
      interviewTalkingPoint:
        latestFailedAttempt?.weakAreas?.[0]
          ? `I improved ${skill.name} by identifying weakness in ${latestFailedAttempt.weakAreas[0]} and closing it through targeted retries.`
          : `I can explain how I learned ${skill.name}, proved it with assessments, and turned it into practical output.`,
    };

    return res.json({
      skill: {
        ...skill,
        progress,
        status: skillProgressDoc?.status ?? "not_started",
        topicCount: topics.length,
        completedTopics,
      },
      analytics: {
        averageScore,
        passRate,
        attemptCount: attempts.length,
        weeklyAttemptVelocity,
        weeklyPassVelocity,
        readinessVelocity,
        predictedReadyInDays,
        daysRemainingToGoal,
        readinessForecast,
      },
      topicStats,
      weakTopicClusters,
      momentum,
      recentAttempts,
      studyGuide,
      proofLinkage,
      recommendations: [
        weakTopicClusters[0]
          ? `Retake ${weakTopicClusters[0].title} and focus on ${weakTopicClusters[0].weakAreas?.[0] || "its weakest concept"}.`
          : "You have no failed clusters right now. Keep compounding on the next unlocked topic.",
        predictedReadyInDays == null
          ? "Build signal first: complete at least two mastery attempts this week to unlock a forecast."
          : `At the current pace, this skill projects to readiness in about ${predictedReadyInDays} days.`,
        averageScore >= 80
          ? "Your score quality is strong. Shift effort toward speed and completion."
          : "Your score quality is the constraint. Slow down and close concept gaps before rushing ahead.",
      ],
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to load skill insights" });
  }
};

export const startSkillFlow = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(404).json({ message: "Skill not found" });
    }

    const skill = await Skill.findOne({ _id: id, userId });
    if (!skill) return res.status(404).json({ message: "Skill not found" });

    const flow = {
      generatedTopics: 0,
      generatedSkillBrief: false,
      generatedAssessments: 0,
      reusedTopics: 0,
      reusedSkillBrief: false,
      reusedAssessments: 0,
    };

    await SkillProgress.findOneAndUpdate(
      { userId, skillId: skill._id },
      {
        $set: {
          progress: skill.generatedContent?.studyMaterialJson ? 10 : 5,
          status: "in_progress",
          lastAccessed: new Date(),
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    let topics = await Topic.find({ skillId: skill._id }).sort({ order: 1, createdAt: 1 });

    if (!topics.length) {
      const generatedTopicSet = await generateTopicsForSkill(skill.name, skill.difficulty);
      const docs = (generatedTopicSet?.topics || [])
        .map((topic, index) => ({
          title: String(topic.title || topic.name || "").trim(),
          content: JSON.stringify({
            objectives: Array.isArray(topic.objectives) ? topic.objectives : [],
            difficulty: topic.difficulty || skill.difficulty,
            estimated_hours: topic.estimated_hours ?? 2,
          }),
          moduleId: skill.moduleId,
          skillId: skill._id,
          order: index,
        }))
        .filter((topic) => topic.title);

      if (docs.length) {
        topics = await Topic.insertMany(docs);
        skill.topics = topics.map((topic) => topic._id);
        flow.generatedTopics = topics.length;
      }
    } else {
      flow.reusedTopics = topics.length;
    }

    if (!skill.generatedContent?.studyMaterialJson) {
      const { normalized, rawText } = await generateSkillMaterial(skill.name, skill.difficulty);
      skill.generatedContent = {
        ...(skill.generatedContent || {}),
        studyMaterialJson: normalized,
        studyMaterialText: rawText,
      };
      flow.generatedSkillBrief = true;
    } else {
      flow.reusedSkillBrief = true;
    }

    for (const topic of topics) {
      if (!topic.generatedContent?.masteryCheck?.questions?.length) {
        const masteryCheck = await generateTopicMasteryCheck({
          topicTitle: topic.title,
          topicContent:
            typeof topic.content === "string" ? topic.content : JSON.stringify(topic.content || {}),
          skillName: skill.name,
          difficulty: skill.difficulty || "intermediate",
        });

        topic.generatedContent = {
          ...(topic.generatedContent || {}),
          masteryCheck,
        };
        await topic.save();
        flow.generatedAssessments += 1;
      } else {
        flow.reusedAssessments += 1;
      }
    }

    await skill.save();

    const nextTopic = topics[0] || null;
    return res.json({
      started: true,
      skillId: skill._id,
      status: "in_progress",
      progress: 10,
      flow,
      nextTopic: nextTopic
        ? {
            id: nextTopic._id,
            title: nextTopic.title,
            order: nextTopic.order ?? 0,
          }
        : null,
    });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return res.status(err.status || 502).json({
        message: err.message,
        code: err.code,
        ...(err.meta ? { meta: err.meta } : {}),
      });
    }
    return res.status(500).json({ message: err.message || "Failed to start skill flow" });
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
    const { skillId, progress: requestedProgress, status: requestedStatus } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const topics = await Topic.find({ skillId }).select("_id").lean();
    const topicIds = topics.map((t) => t._id);

    const topicProgressDocs = await TopicProgress.find({
      userId,
      topicId: { $in: topicIds },
    }).lean();

    const completedCount = topicProgressDocs.filter(
      (tp) => tp.status === "completed",
    ).length;
    const inProgressCount = topicProgressDocs.filter(
      (tp) => tp.status === "in_progress",
    ).length;

    const derivedProgress =
      topicIds.length > 0
        ? Math.round((completedCount / topicIds.length) * 100)
        : typeof requestedProgress === "number"
          ? requestedProgress
          : 0;

    const derivedStatus =
      derivedProgress === 100
        ? "completed"
        : derivedProgress > 0 || inProgressCount > 0
          ? "in_progress"
          : "not_started";

    const hasTopicSignal = completedCount > 0 || inProgressCount > 0;
    const progress = hasTopicSignal
      ? derivedProgress
      : typeof requestedProgress === "number"
        ? requestedProgress
        : derivedProgress;
    const status = hasTopicSignal
      ? derivedStatus
      : requestedStatus || (progress > 0 ? "in_progress" : derivedStatus);

    const updated = await SkillProgress.findOneAndUpdate(
      { userId, skillId },
      { progress, status, lastAccessed: new Date() },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    if (hasTopicSignal) {
      await recomputeSkillProgress(userId, skillId);
    }

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

    const topics = await Topic.find({
      skillId: { $in: skills.map((s) => s._id) },
    }).select("_id title skillId order").lean();

    const topicProgressDocs = await TopicProgress.find({
      userId,
      topicId: { $in: topics.map((t) => t._id) },
    }).lean();

    const progressMap = new Map(
      progressDocs.map((p) => [String(p.skillId), p]),
    );
    const topicProgressMap = new Map(
      topicProgressDocs.map((p) => [String(p.topicId), p]),
    );
    const topicsBySkill = topics.reduce((acc, topic) => {
      const key = String(topic.skillId);
      if (!acc[key]) acc[key] = [];
      acc[key].push(topic);
      return acc;
    }, {});

    const nodes = skills.map((s) => {
      const p = progressMap.get(String(s._id));
      const topicList = (topicsBySkill[String(s._id)] || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const completedTopics = topicList.filter((topic) => topicProgressMap.get(String(topic._id))?.status === "completed").length;
      const nextTopic = topicList.find((topic) => {
        const status = topicProgressMap.get(String(topic._id))?.status || "not_started";
        return status !== "completed";
      });

      return {
        id: String(s._id),
        label: s.name,
        difficulty: s.difficulty,
        progress: p?.progress ?? 0,
        status: p?.status ?? "not_started",
        order: s.order ?? 0,
        topicCount: topicList.length,
        completedTopics,
        nextTopicLabel: nextTopic?.title || null,
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

    const nextSkill = nodes
      .filter((node) => node.status !== "completed")
      .sort((a, b) => a.order - b.order || a.progress - b.progress)[0] || null;

    return res.json({
      nodes,
      edges,
      meta: {
        totalSkills: nodes.length,
        completedSkills: nodes.filter((node) => node.status === "completed").length,
        nextSkillId: nextSkill?.id || null,
        nextSkillLabel: nextSkill?.label || null,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message || "Failed to load module roadmap",
    });
  }
};
