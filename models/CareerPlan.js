const mongoose = require("mongoose");

const CareerPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  plan: Object, // Full AI-generated roadmap
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CareerPlan", CareerPlanSchema);
