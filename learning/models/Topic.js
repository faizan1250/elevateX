import mongoose from "mongoose";

const topicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, index: true },
    content: { type: String, required: true },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true, index: true },
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", index: true },
    order: { type: Number, default: 0, index: true },
     generatedContent: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

// 🔥 Virtual: shortPreview (first 100 chars of content)
topicSchema.virtual("shortPreview").get(function () {
  return this.content?.substring(0, 100) + "...";
});

// compound index for ordering inside module
topicSchema.index({ moduleId: 1, order: 1 });



export default mongoose.model("Topic", topicSchema);;
