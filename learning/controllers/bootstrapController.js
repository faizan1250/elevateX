
import CareerPlan from "../../models/CareerPlan.js";
import Module from "../models/Module.js";
import Skill from "../models/Skill.js";
import Topic from "../models/Topic.js";
import mongoose from "mongoose";
import { bootstrapFromPlanForUser } from "../services/bootstrapService.js";
import { generateTopicsForSkill as aiGenerateTopicsForSkill, AIGenerationError } from "../services/aiService.js";

const clean = (s) => (typeof s === 'string' ? s.trim() : '');
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

function extractSkillsByCategory(planObj = {}) {
  const plan = planObj.plan || planObj;

  const buckets = {
    foundation: [],
    intermediate: [],
    advanced: [],
    soft_skills: [],
    technical: [],
    other: [],
  };

  const tryFill = (src, key, destKey) => {
    const v = src?.[key];
    if (Array.isArray(v)) buckets[destKey || key].push(...v.map(clean));
  };

  if (plan?.skills && typeof plan.skills === 'object' && !Array.isArray(plan.skills)) {
    tryFill(plan.skills, 'foundation');
    tryFill(plan.skills, 'intermediate');
    tryFill(plan.skills, 'advanced');
    tryFill(plan.skills, 'soft_skills');
    tryFill(plan.skills, 'technical');
    Object.keys(plan.skills).forEach((k) => {
      if (!['foundation','intermediate','advanced','soft_skills','technical'].includes(k)) {
        const v = plan.skills[k];
        if (Array.isArray(v)) buckets.other.push(...v.map(clean));
      }
    });
  }

  if (Array.isArray(plan?.skills)) {
    buckets.other.push(...plan.skills.map(clean));
  }

  if (plan?.raw?.skills) {
    const raw = plan.raw.skills;
    if (Array.isArray(raw)) {
      buckets.other.push(...raw.map(clean));
    } else if (typeof raw === 'object') {
      Object.values(raw).forEach((arr) => {
        if (Array.isArray(arr)) buckets.other.push(...arr.map(clean));
      });
    }
  }

  Object.keys(buckets).forEach((k) => (buckets[k] = uniq(buckets[k])));

  const total =
    buckets.foundation.length +
    buckets.intermediate.length +
    buckets.advanced.length +
    buckets.soft_skills.length +
    buckets.technical.length +
    buckets.other.length;

  return { buckets, total };
}
async function upsertModuleByTitle(userId, title, description = '') {
  return Module.findOneAndUpdate(
    { userId, title },
    { $setOnInsert: { userId, title, description } },
    { new: true, upsert: true, collation: { locale: 'en', strength: 2 } }
  );
}

function bucketDifficultyFor(title) {
  if (/foundation/i.test(title)) return 'beginner';
  if (/advanced/i.test(title)) return 'advanced';
  return 'intermediate';
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isTransientTxnError(err) {
  return (
    err?.errorLabels?.includes?.('TransientTransactionError') ||
    err?.code === 112 || // WriteConflict
    err?.codeName === 'WriteConflict'
  );
}

async function withTransactionRetry(session, fn, {
  maxRetries = 5,
  baseDelayMs = 50,
  jitterMs = 50,
  txnOptions = {
    readPreference: 'primary',
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
  },
} = {}) {
  let attempt = 0;
  while (true) {
    try {
      // session.withTransaction will also retry commit on UnknownTransactionCommitResult,
      // but not user body errors — so we catch and retry here if transient.
      return await session.withTransaction(async () => fn(session), txnOptions);
    } catch (err) {
      attempt++;
      if (!isTransientTxnError(err) || attempt > maxRetries) throw err;
      const delay = baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * jitterMs);
      await sleep(delay);
    }
  }
}

/**
 * Sync helper: make module's skills exactly match the provided names.
 * - Upsert missing
 * - Update difficulty if bucket changed
 * - Remove skills not in the new list (and pull from Module.skills)
 * - Optionally delete topics for removed skills (toggle flag)
 */
async function syncModuleSkills(userId, moduleTitle, desiredNames, { deleteRemovedTopics = false } = {}) {
  if (!desiredNames.length) return { mod: null, added: 0, removed: 0, updated: 0 };

  const mod = await upsertModuleByTitle(userId, moduleTitle, 'Generated from career plan');

  const existing = await Skill.find({ userId, moduleId: mod._id }).lean();
  const existingByName = new Map(existing.map((s) => [s.name, s]));
  const desiredSet = new Set(desiredNames.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean));

  let added = 0, updated = 0;
  const targetDifficulty =
    /foundation/i.test(moduleTitle) ? 'beginner' :
    /advanced/i.test(moduleTitle)   ? 'advanced' : 'intermediate';

  // upsert/update
  for (const name of desiredSet) {
    const hit = existingByName.get(name);
    if (!hit) {
      await Skill.create({ userId, name, moduleId: mod._id, difficulty: targetDifficulty, description: '' });
      added++;
    } else if (hit.difficulty !== targetDifficulty) {
      await Skill.updateOne({ _id: hit._id, userId }, { $set: { difficulty: targetDifficulty } });
      updated++;
    }
  }

  // remove no-longer-desired
  const removeIds = existing.filter((s) => !desiredSet.has(s.name)).map((s) => s._id);
  let removed = 0;
  if (removeIds.length) {
    // optional: await Topic.deleteMany({ userId, skillId: { $in: removeIds } });
    await Skill.deleteMany({ _id: { $in: removeIds }, userId });
    removed = removeIds.length;
  }

  return { mod, added, updated, removed };
}
async function pruneUnusedModules(userId, keepTitles) {
  const keepSet = new Set(keepTitles);
  const stale = await Module.find({ userId, title: { $nin: Array.from(keepSet) } });
  if (!stale.length) return 0;
  const staleIds = stale.map(m => m._id);
  await Skill.deleteMany({ userId, moduleId: { $in: staleIds } });
  // optional: await Topic.deleteMany({ userId, moduleId: { $in: staleIds } });
  await Module.deleteMany({ userId, _id: { $in: staleIds } });
  return staleIds.length;
}

// ---------- controllers ----------

async function bootstrapSkillsFromPlan(req, res) {
  try {
    const userId = req.body.userId || req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const mode = (req.body.mode || req.query.mode || "append").toLowerCase();
    const result = await bootstrapFromPlanForUser(userId, { mode });
    const code = result.ok ? 200 : 400;
    return res.status(code).json(result);
  } catch (err) {
    console.error("bootstrapSkillsFromPlan error:", err);
    return res.status(500).json({ message: err.message || "Bootstrap failed" });
  }
}

// generate topics for a single skill (unchanged)
async function generateTopicsForSkill(req, res) {
  const userId = req.user?.id || req.body.userId || req.query.userId;
  const { skillId } = req.params;
  const difficulty = req.body?.difficulty || 'intermediate';

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!skillId) return res.status(400).json({ message: 'Missing skillId' });

  let session;
  try {
    // 1) Load skill (scoped to user) + module
    const skill = await Skill.findOne({ _id: skillId, userId })
      .populate('moduleId')
      .lean();
    if (!skill) return res.status(404).json({ message: 'Skill not found for this user' });
    if (!skill.moduleId?._id) return res.status(400).json({ message: 'Skill has no moduleId' });

    // 2) Ask AI outside txn
    const ai = await aiGenerateTopicsForSkill(skill.name, difficulty);
    const list = Array.isArray(ai?.topics) ? ai.topics : [];
    if (!list.length) {
      return res.status(502).json({ message: 'AI returned no topics', code: 'AI_EMPTY' });
    }

    const moduleId = skill.moduleId._id;

    // 3) Build docs before txn
    const docs = list
      .map((t, i) => ({
        title: clean(t.title || t.name),
        content: JSON.stringify({
          objectives: t.objectives || [],
          difficulty: t.difficulty || difficulty,
          estimated_hours: t.estimated_hours ?? 2, // keep 0 if provided
        }),
        moduleId,
        skillId: skill._id,
        order: i,
      }))
      .filter(d => d.title);

    if (!docs.length) {
      return res.status(400).json({ message: 'No valid topics after cleaning', code: 'NO_VALID_TOPICS' });
    }

    // 4) Transaction with retry
    session = await mongoose.startSession();
    const { insertedCount, replacedCount, inserted } = await withTransactionRetry(session, async (sesh) => {
      // collect old topic ids for this skill in this module
      const oldTopics = await Topic.find(
        { skillId: skill._id, moduleId },
        { _id: 1 },
        { session: sesh }
      );
      const oldIds = oldTopics.map(t => t._id);

      // delete old
      if (oldIds.length) {
        await Topic.deleteMany({ _id: { $in: oldIds } }, { session: sesh });
      }

      // insert new (ordered to preserve `order`)
      const insertedDocs = await Topic.insertMany(docs, { session: sesh /*, ordered: true (default) */ });
      const newIds = insertedDocs.map(t => t._id);

      // reset Skill.topics exactly
      await Skill.updateOne(
        { _id: skill._id, userId },
        { $set: { topics: newIds } },
        { session: sesh }
      );

      // Module.topics: pull old, add new
      if (oldIds.length) {
        await Module.updateOne(
          { _id: moduleId, userId },
          { $pullAll: { topics: oldIds } },
          { session: sesh }
        );
      }
      await Module.updateOne(
        { _id: moduleId, userId },
        { $addToSet: { topics: { $each: newIds } } },
        { session: sesh }
      );

      return { insertedCount: insertedDocs.length, replacedCount: oldIds.length, inserted: insertedDocs };
    });

    return res.status(201).json({
      message: `Topics regenerated for skill: ${skill.name}`,
      count: insertedCount,
      replaced: replacedCount,
      topics: inserted.map(t => ({ _id: t._id, title: t.title, order: t.order })),
    });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      console.warn('[AI] generateTopicsForSkill error:', err.code, err.message);
      return res.status(err.status || 502).json({
        message: err.message,
        code: err.code || 'AI_ERROR',
        ...(err.meta ? { meta: err.meta } : {} ),
      });
    }
    console.error('generateTopicsForSkill error:', err);
    return res.status(500).json({ message: err.message || 'Failed to regenerate topics' });
  } finally {
    if (session) session.endSession();
  }
}


// bulk: generate topics for all skills (unchanged)
async function generateTopicsForAllSkills(req, res) {
  const difficulty = req.body?.difficulty || 'intermediate';
  const { moduleId: filterModuleId } = req.body;

  const results = [];
  try {
    const skillQuery = filterModuleId ? { moduleId: filterModuleId } : {};
    const skills = await Skill.find(skillQuery).populate('moduleId').lean();
    if (!skills.length) return res.status(404).json({ message: 'No skills found' });

    for (const skill of skills) {
      const modId = skill.moduleId?._id || skill.moduleId;
      if (!modId) {
        results.push({ skill: skill.name, error: 'Skill has no moduleId' });
        continue;
      }

      // AI call outside txn
      let ai;
      try {
        ai = await aiGenerateTopicsForSkill(skill.name, difficulty);
      } catch (e) {
        const msg = e instanceof AIGenerationError ? e.message : (e?.message || 'AI call failed');
        const code = e instanceof AIGenerationError ? (e.code || 'AI_ERROR') : undefined;
        results.push({ skill: skill.name, error: msg, ...(code ? { code } : {}) });
        continue;
      }
      const list = Array.isArray(ai?.topics) ? ai.topics : [];
      if (!list.length) {
        results.push({ skill: skill.name, error: 'AI returned no topics', code: 'AI_EMPTY' });
        continue;
      }

      const docs = list
        .map((t, i) => ({
          title: clean(t.title || t.name),
          content: JSON.stringify({
            objectives: t.objectives || [],
            difficulty: t.difficulty || difficulty,
            estimated_hours: t.estimated_hours ?? 2,
          }),
          moduleId: modId,
          skillId: skill._id,
          order: i,
        }))
        .filter(d => d.title);

      if (!docs.length) {
        results.push({ skill: skill.name, error: 'No valid topics after cleaning', code: 'NO_VALID_TOPICS' });
        continue;
      }

      // Per-skill txn with retry
      let session;
      try {
        session = await mongoose.startSession();
        const { insertedCount, replacedCount } = await withTransactionRetry(session, async (sesh) => {
          const oldTopics = await Topic.find(
            { skillId: skill._id, moduleId: modId },
            { _id: 1 },
            { session: sesh }
          );
          const oldIds = oldTopics.map(t => t._id);

          if (oldIds.length) {
            await Topic.deleteMany({ _id: { $in: oldIds } }, { session: sesh });
          }

          const insertedDocs = await Topic.insertMany(docs, { session: sesh });
          const newIds = insertedDocs.map(t => t._id);

          await Skill.updateOne(
            { _id: skill._id },
            { $set: { topics: newIds } },
            { session: sesh }
          );

          if (oldIds.length) {
            await Module.updateOne(
              { _id: modId },
              { $pullAll: { topics: oldIds } },
              { session: sesh }
            );
          }
          await Module.updateOne(
            { _id: modId },
            { $addToSet: { topics: { $each: newIds } } },
            { session: sesh }
          );

          return { insertedCount: insertedDocs.length, replacedCount: oldIds.length };
        });

        results.push({
          skill: skill.name,
          topicsCreated: insertedCount,
          replaced: replacedCount,
        });
      } catch (txErr) {
        results.push({ skill: skill.name, error: txErr?.message || 'Transaction failed' });
      } finally {
        if (session) session.endSession();
      }
    }

    return res.status(201).json({ message: 'Topics regenerated (destructive) for all skills', results });
  } catch (err) {
    console.error('generateTopicsForAllSkills (destructive) error:', err);
    return res.status(500).json({ message: err.message || 'Failed bulk topic regeneration' });
  }
}


export {
  bootstrapSkillsFromPlan,
  generateTopicsForSkill,
  generateTopicsForAllSkills,
};
