import mongoose from "mongoose";

const RoadmapProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  stepTitle: { type: String, required: true },
  status: {
    type: String,
    enum: ["not_started", "in_progress", "completed"],
    default: "not_started"
  },
  updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model("RoadmapProgress", RoadmapProgressSchema);;
