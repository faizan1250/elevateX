
import Topic from "../models/Topic.js";
import TopicProgress from "../models/TopicProgress.js";
import SkillProgress from "../../models/SkillProgress.js";

async function recomputeSkillProgress(userId, skillId) {
  // 1. Get all topic IDs for this skill
  const topics = await Topic.find({ skillId }).select("_id").lean();
  const topicIds = topics.map((t) => t._id);

  if (!topicIds.length) {
    // No topics → leave it as manual progress (or reset)
    await SkillProgress.findOneAndUpdate(
      { userId, skillId },
      { progress: 0, status: "not_started" },
      { upsert: true }
    );
    return;
  }

  // 2. Get progress docs for those topics
  const topicDocs = await TopicProgress.find({
    userId,
    topicId: { $in: topicIds },
  }).lean();

  // 3. Compute stats
  const completedCount = topicDocs.filter((t) => t.status === "completed").length;
  const inProgressCount = topicDocs.filter((t) => t.status === "in_progress").length;
  const total = topicIds.length;

  let status = "not_started";
  let progress = Math.round((completedCount / total) * 100);

  if (completedCount === total) {
    status = "completed";
    progress = 100;
  } else if (completedCount > 0 || inProgressCount > 0) {
    status = "in_progress";
    if (progress === 0) progress = 1; // minimal nonzero if started
  }

  // 4. Update
  await SkillProgress.findOneAndUpdate(
    { userId, skillId },
    { progress, status, lastAccessed: new Date() },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

export  { recomputeSkillProgress };;
