import mongoose from "mongoose";

const portfolioAssetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, trim: true, required: true },
    type: {
      type: String,
      enum: ["case_study", "project", "landing_page", "github_repo", "writeup"],
      default: "project",
    },
    description: { type: String, trim: true, default: "" },
    link: { type: String, trim: true, default: "" },
    metrics: [{ type: String, trim: true }],
    tags: [{ type: String, trim: true }],
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

portfolioAssetSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model("PortfolioAsset", portfolioAssetSchema);
