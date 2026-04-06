import mongoose from "mongoose";

const attemptQuestionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, default: "mcq" },
    prompt: { type: String, default: "" },
    selectedAnswer: { type: mongoose.Schema.Types.Mixed, default: null },
    correctAnswer: { type: mongoose.Schema.Types.Mixed, default: null },
    isCorrect: { type: Boolean, default: false },
    explanation: { type: String, default: "" },
  },
  { _id: false },
);

const topicMasteryAttemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true, index: true },
    skillId: { type: mongoose.Schema.Types.ObjectId, ref: "Skill", default: null, index: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    passingScore: { type: Number, default: 70, min: 0, max: 100 },
    passed: { type: Boolean, required: true, index: true },
    correctCount: { type: Number, default: 0, min: 0 },
    totalQuestions: { type: Number, default: 0, min: 0 },
    weakAreas: [{ type: String }],
    strengths: [{ type: String }],
    submittedAnswers: { type: mongoose.Schema.Types.Mixed, default: [] },
    details: { type: [attemptQuestionSchema], default: [] },
  },
  { timestamps: true },
);

topicMasteryAttemptSchema.index({ userId: 1, topicId: 1, createdAt: -1 });
topicMasteryAttemptSchema.index({ userId: 1, skillId: 1, createdAt: -1 });

export default mongoose.models.TopicMasteryAttempt ||
  mongoose.model("TopicMasteryAttempt", topicMasteryAttemptSchema);
