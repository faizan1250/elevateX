import mongoose from "mongoose";

const topicProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
    progress: { type: Number, default: 0 }, // 0–100
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    lastAccessed: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

topicProgressSchema.index({ userId: 1, topicId: 1 }, { unique: true });

export default mongoose.model("TopicProgress", topicProgressSchema);;
