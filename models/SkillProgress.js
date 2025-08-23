import mongoose from "mongoose";

/**
 * Unified SkillProgress model (backward + forward compatible)
 * - Keeps legacy fields: userId, skillName, status
 * - Adds modern fields: skillId, progress, lastAccessed, timestamps
 * - Adds partial unique indexes (userId+skillId) and (userId+skillName)
 * - Adds virtuals + pre-save sync between progress and status
 */

const SkillProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // ✅ New preferred linkage (use this going forward)
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", index: true },

    // ✅ Legacy support (do not remove; old code may use it)
    skillName: { type: String, trim: true, index: true },

    // % completion (0–100)
    progress: { type: Number, default: 0, min: 0, max: 100 },

    // coarse status
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
      index: true,
    },

    // last opened / interacted
    lastAccessed: { type: Date, default: Date.now },
  },
  { timestamps: true } // gives createdAt, updatedAt
);

/** 🔒 Uniqueness:
 * We support either skillId (new) OR skillName (legacy). Use two partial unique indexes:
 *  - (userId, skillId) unique when skillId exists
 *  - (userId, skillName) unique when skillName exists
 * This prevents duplicates without breaking legacy records.
 */
SkillProgressSchema.index(
  { userId: 1, skillId: 1 },
  { unique: true, partialFilterExpression: { skillId: { $exists: true, $type: "objectId" } } }
);

SkillProgressSchema.index(
  { userId: 1, skillName: 1 },
  { unique: true, partialFilterExpression: { skillName: { $exists: true, $type: "string" } } }
);

// helpful query index
SkillProgressSchema.index({ userId: 1, status: 1 });

/** 🌟 Virtuals */
SkillProgressSchema.virtual("isCompleted").get(function () {
  return this.status === "completed" || this.progress === 100;
});

/** 🧠 Pre-save: keep progress & status in sync */
SkillProgressSchema.pre("save", function (next) {
  // normalize status based on progress if mismatched
  if (this.progress >= 100 && this.status !== "completed") {
    this.status = "completed";
  } else if (this.progress > 0 && this.progress < 100 && this.status === "not_started") {
    this.status = "in_progress";
  } else if (this.progress === 0 && this.status !== "not_started") {
    this.status = "not_started";
  }

  // bump lastAccessed on any change
  this.lastAccessed = new Date();
  next();
});

/** 🛠️ Statics (nice helpers for controllers/services) */
SkillProgressSchema.statics.upsertProgress = async function ({
  userId,
  skillId,
  skillName,
  progress, // set absolute %
  inc,      // or increment by value
  status,   // optional override
}) {
  const filter = skillId ? { userId, skillId } : { userId, skillName };
  const update = { $set: {}, $inc: {} };

  if (typeof progress === "number") update.$set.progress = Math.max(0, Math.min(100, progress));
  if (typeof inc === "number") update.$inc.progress = inc;
  if (status) update.$set.status = status;

  // always touch lastAccessed
  update.$set.lastAccessed = new Date();

  // clean empty operators
  if (!Object.keys(update.$inc).length) delete update.$inc;

  const doc = await this.findOneAndUpdate(filter, update, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true,
  });

  // ensure pre-save rules apply after findOneAndUpdate
  return doc.save();
};

SkillProgressSchema.statics.markCompleted = function ({ userId, skillId, skillName }) {
  const filter = skillId ? { userId, skillId } : { userId, skillName };
  return this.findOneAndUpdate(
    filter,
    { $set: { progress: 100, status: "completed", lastAccessed: new Date() } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

// Prevent OverwriteModelError in dev/hot-reload
export default mongoose.models.SkillProgress || mongoose.model("SkillProgress", SkillProgressSchema);;
