// models/Module.js
const mongoose = require("mongoose");
const moduleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  skills: [{ type: mongoose.Schema.Types.ObjectId, ref: "Skill" }],
  topics: [{ type: mongoose.Schema.Types.ObjectId, ref: "Topic" }],
  tests:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Test"  }],
}, { timestamps: true });

// unique per user (case-insensitive)
moduleSchema.index({ userId: 1, title: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

module.exports = mongoose.model("Module", moduleSchema);
