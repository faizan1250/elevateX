const mongoose = require("mongoose");

const SkillProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  skillName: { type: String, required: true },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed"],
    default: "not_started",
  },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SkillProgress", SkillProgressSchema);
