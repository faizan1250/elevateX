// models/Skill.js
const mongoose = require("mongoose");
const skillSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, index: true },
  description: { type: String, default: "" },
  difficulty: { type: String, enum: ["beginner", "intermediate", "advanced"], required: true, index: true },
  moduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true, index: true },
  topics: [{ type: mongoose.Schema.Types.ObjectId, ref: "Topic" }],
}, { timestamps: true });

// unique skill per user per module (case-insensitive)
skillSchema.index(
  { userId: 1, moduleId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model("Skill", skillSchema);
