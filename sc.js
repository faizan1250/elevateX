// sc.js  (CommonJS)
const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

// 👇 IMPORTANT: .default since the model file uses ESM default export
const SkillProgress = require("./learning/models/SkillProgress").default; // adjust the path!

const MONGODB_URI = process.env.MONGO_URI;
const TARGET_USER_ID = "68a323d4d08c5f47b5692ff1";

const statusFromProgress = (p) => (p >= 100 ? "completed" : p > 0 ? "in_progress" : "not_started");

(async () => {
  if (!mongoose.Types.ObjectId.isValid(TARGET_USER_ID)) {
    console.error("Invalid TARGET_USER_ID");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("✅ connected");

  // sanity check
  console.log("Model ok? ", typeof SkillProgress?.find === "function");

  const targetUserId = new mongoose.Types.ObjectId(TARGET_USER_ID);
  const cursor = SkillProgress.find({ userId: null }).cursor();

  let moved = 0, merged = 0, deleted = 0;
  for await (const doc of cursor) {
    const { skillId, progress = 0, lastAccessed } = doc;
    const existing = await SkillProgress.findOne({ userId: targetUserId, skillId });

    if (existing) {
      const newProgress = Math.max(existing.progress ?? 0, progress ?? 0);
      existing.progress = newProgress;
      existing.status = statusFromProgress(newProgress);
      existing.lastAccessed = new Date(
        Math.max(new Date(existing.lastAccessed || 0), new Date(lastAccessed || 0))
      );
      await existing.save();
      await SkillProgress.deleteOne({ _id: doc._id });
      merged++; deleted++;
    } else {
      doc.userId = targetUserId;
      doc.status = typeof doc.status === "string" ? doc.status : statusFromProgress(progress || 0);
      await doc.save();
      moved++;
    }
  }

  console.log({ moved, merged, deleted });
  await mongoose.disconnect();
  process.exit(0);
})().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
