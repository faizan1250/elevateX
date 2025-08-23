import mongoose from "mongoose";

const testSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true, index: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", index: true },
    questions: [
      {
        question: { type: String, required: true },
        options: [{ type: String }],
        correctAnswer: { type: String },
        explanation: { type: String },
      },
    ],
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
      index: true,
    },
    duration: { type: Number, default: 10 }, // in minutes
  },
  { timestamps: true }
);

// text search for tests
testSchema.index({ title: "text" });

// 🔥 Virtual: question count
testSchema.virtual("questionCount").get(function () {
  return this.questions?.length || 0;
});


export default mongoose.model("Test", testSchema);;
