import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    company: { type: String, trim: true, required: true },
    role: { type: String, trim: true, required: true },
    status: {
      type: String,
      enum: ["wishlist", "applied", "oa", "interview", "offer", "rejected"],
      default: "wishlist",
      index: true,
    },
    source: { type: String, trim: true, default: "" },
    jobUrl: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
    resumeVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResumeVersion",
      default: null,
    },
    portfolioAssetIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PortfolioAsset",
      },
    ],
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

applicationSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model("Application", applicationSchema);
