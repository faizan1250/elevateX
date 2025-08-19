import mongoose from "mongoose";

const skillProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", required: true, index: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
      index: true,
    },
    lastAccessed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// compound index to prevent duplicates
skillProgressSchema.index({ userId: 1, skillId: 1 }, { unique: true });

// 🔥 Virtual: isCompleted boolean
skillProgressSchema.virtual("isCompleted").get(function () {
  return this.status === "completed" || this.progress === 100;
});

export default mongoose.model("SkillProgress", skillProgressSchema);
