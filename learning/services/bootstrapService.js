// learning/services/bootstrapService.js
const mongoose = require("mongoose");
const CareerPlan = require("../../models/CareerPlan");
const Module = require("../models/Module");
const Skill = require("../models/Skill");
// const Topic = require("../models/Topic"); // only if you want topic deletions

const clean = (s) => (typeof s === "string" ? s.trim() : "");
const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

function extractSkillsByCategory(planObj = {}) {
  const plan = planObj.plan || planObj;
  const buckets = {
    foundation: [], intermediate: [], advanced: [],
    soft_skills: [], technical: [], other: []
  };

  const tryFill = (src, key, destKey) => {
    const v = src?.[key];
    if (Array.isArray(v)) buckets[destKey || key].push(...v.map(clean));
  };

  if (plan?.skills && typeof plan.skills === "object" && !Array.isArray(plan.skills)) {
    tryFill(plan.skills, "foundation");
    tryFill(plan.skills, "intermediate");
    tryFill(plan.skills, "advanced");
    tryFill(plan.skills, "soft_skills");
    tryFill(plan.skills, "technical");
    Object.keys(plan.skills).forEach((k) => {
      if (!["foundation","intermediate","advanced","soft_skills","technical"].includes(k)) {
        const v = plan.skills[k];
        if (Array.isArray(v)) buckets.other.push(...v.map(clean));
      }
    });
  }
  if (Array.isArray(plan?.skills)) buckets.other.push(...plan.skills.map(clean));

  if (plan?.raw?.skills) {
    const raw = plan.raw.skills;
    if (Array.isArray(raw)) buckets.other.push(...raw.map(clean));
    else if (typeof raw === "object") {
      Object.values(raw).forEach((arr) => {
        if (Array.isArray(arr)) buckets.other.push(...arr.map(clean));
      });
    }
  }

  Object.keys(buckets).forEach((k) => (buckets[k] = uniq(buckets[k])));
  const total = Object.values(buckets).reduce((a, arr) => a + arr.length, 0);
  return { buckets, total };
}

async function upsertModuleByTitle(userId, title, description = "") {
  return Module.findOneAndUpdate(
    { userId, title },
    { $setOnInsert: { userId, title, description } },
    { new: true, upsert: true, collation: { locale: "en", strength: 2 } }
  );
}

const bucketDifficultyFor = (title) =>
   /soft/i.test(title)        ? "soft_skills" :
  /foundation/i.test(title)  ? "beginner"    :
  /advanced/i.test(title)    ? "advanced"    : "intermediate";

async function syncModuleSkills(userId, moduleTitle, desiredNames, { deleteRemovedTopics = false } = {}) {
  if (!desiredNames.length) return { mod: null, added: 0, removed: 0, updated: 0 };

  const mod = await upsertModuleByTitle(userId, moduleTitle, "Generated from career plan");
  const existing = await Skill.find({ userId, moduleId: mod._id }).lean();
  const existingByName = new Map(existing.map((s) => [s.name, s]));
  const desiredSet = new Set(desiredNames.map(clean).filter(Boolean));

  let added = 0, updated = 0;
  const targetDifficulty = bucketDifficultyFor(moduleTitle);

  for (const name of desiredSet) {
    const hit = existingByName.get(name);
    if (!hit) {
      await Skill.create({ userId, name, moduleId: mod._id, difficulty: targetDifficulty, description: "" });
      added++;
    } else if (hit.difficulty !== targetDifficulty) {
      await Skill.updateOne({ _id: hit._id, userId }, { $set: { difficulty: targetDifficulty } });
      updated++;
    }
  }

  const toRemove = existing.filter((s) => !desiredSet.has(s.name));
  let removed = 0;
  if (toRemove.length) {
    const removeIds = toRemove.map((s) => s._id);
    // if (deleteRemovedTopics) await Topic.deleteMany({ userId, skillId: { $in: removeIds } });
    await Skill.deleteMany({ _id: { $in: removeIds }, userId });
    removed = removeIds.length;
  }

  return { mod, added, updated, removed };
}

async function pruneUnusedModules(userId, keepTitles) {
  const keepSet = new Set(keepTitles);
  const stale = await Module.find({ userId, title: { $nin: Array.from(keepSet) } }).lean();
  if (!stale.length) return 0;
  const staleIds = stale.map((m) => m._id);
  await Skill.deleteMany({ userId, moduleId: { $in: staleIds } });
  // optionally: await Topic.deleteMany({ userId, moduleId: { $in: staleIds } });
  await Module.deleteMany({ userId, _id: { $in: staleIds } });
  return staleIds.length;
}

async function bootstrapFromPlanForUser(userId, { mode = "sync" } = {}) {
  if (!userId) throw new Error("Missing userId for bootstrap");
  const planDoc = await CareerPlan.findOne({ userId }).lean();
  if (!planDoc) throw new Error("No career plan found for user");

  const { buckets, total } = extractSkillsByCategory(planDoc);
  if (!total) return { ok: false, message: "No skills in plan to bootstrap" };

  const titlesProcessed = [];
  const run = async (title, arr) => {
    if (!arr.length) return;
    titlesProcessed.push({ title, count: arr.length });

    if (mode === "sync") {
      await syncModuleSkills(userId, title, arr);
    } else {
      const mod = await upsertModuleByTitle(userId, title, "Generated from career plan");
      const diff = bucketDifficultyFor(title);
      for (const raw of arr) {
        const name = clean(raw);
        if (!name) continue;
        const exists = await Skill.findOne({ userId, moduleId: mod._id, name });
        if (!exists) await Skill.create({ userId, name, moduleId: mod._id, difficulty: diff, description: "" });
      }
    }
  };

  const hasBuckets = ["foundation","intermediate","advanced","soft_skills","technical"]
    .some((k) => buckets[k].length);

  if (hasBuckets) {
    await run("Foundation Skills", buckets.foundation);
    await run("Intermediate Skills", buckets.intermediate);
    await run("Advanced Skills", buckets.advanced);
    await run("Soft Skills", buckets.soft_skills);
    await run("Technical Skills", buckets.technical);
    if (buckets.other.length) await run("Core Skills", buckets.other);
  } else {
    await run("Core Skills", buckets.other);
  }

  if (mode === "sync") {
    await pruneUnusedModules(userId, titlesProcessed.map((t) => t.title));
  }

  return { ok: true, mode, processed: titlesProcessed };
}

module.exports = { bootstrapFromPlanForUser };
