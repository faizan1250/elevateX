import mongoose from "mongoose";

const CareerPlanSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  plan: Object, // Full AI-generated roadmap
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("CareerPlan", CareerPlanSchema);;
