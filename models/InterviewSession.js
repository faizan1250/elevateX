import mongoose from "mongoose";

const questionPlanSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    prompt: { type: String, required: true },
    topic: { type: String, required: true },
    competency: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    expectedSignals: [{ type: String }],
  },
  { _id: false },
);

const evaluationSchema = new mongoose.Schema(
  {
    overallScore: { type: Number, min: 0, max: 100, required: true },
    technicalAccuracy: { type: Number, min: 0, max: 100, required: true },
    problemSolving: { type: Number, min: 0, max: 100, required: true },
    communication: { type: Number, min: 0, max: 100, required: true },
    strengths: [{ type: String }],
    improvementAreas: [{ type: String }],
    feedback: { type: String, default: "" },
    idealAnswer: { type: String, default: "" },
    nextStepAdvice: { type: String, default: "" },
  },
  { _id: false },
);

const transcriptEntrySchema = new mongoose.Schema(
  {
    order: { type: Number, required: true },
    questionId: { type: String, required: true },
    question: { type: String, required: true },
    topic: { type: String, required: true },
    competency: { type: String, required: true },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
    answer: { type: String, required: true },
    evaluation: { type: evaluationSchema, required: true },
    askedAt: { type: Date, default: Date.now },
    answeredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const finalReportSchema = new mongoose.Schema(
  {
    overallScore: { type: Number, min: 0, max: 100, default: 0 },
    technicalAccuracy: { type: Number, min: 0, max: 100, default: 0 },
    problemSolving: { type: Number, min: 0, max: 100, default: 0 },
    communication: { type: Number, min: 0, max: 100, default: 0 },
    strengths: [{ type: String }],
    improvementAreas: [{ type: String }],
    readiness: { type: String, default: "developing" },
    trend: { type: String, default: "stable" },
    summary: { type: String, default: "" },
    recommendation: { type: String, default: "" },
  },
  { _id: false },
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
      index: true,
    },
    targetRole: { type: String, required: true, trim: true },
    interviewType: {
      type: String,
      enum: ["technical_screen", "problem_solving", "mixed"],
      default: "technical_screen",
    },
    experienceLevel: { type: String, default: "unspecified", trim: true },
    questionLimit: { type: Number, min: 1, max: 12, required: true },
    currentQuestionIndex: { type: Number, min: 0, default: 0 },
    primarySkills: [{ type: String }],
    focusAreas: [{ type: String }],
    careerSnapshot: {
      interest: { type: String, default: "" },
      skills: [{ type: String }],
      education: { type: String, default: "" },
      experience: { type: String, default: "" },
      careerGoal: { type: String, default: "" },
      availability: { type: String, default: "" },
      timeConstraint: { type: String, default: "" },
    },
    planMeta: {
      title: { type: String, default: "" },
      interviewerStyle: { type: String, default: "" },
      rubric: [{ type: String }],
    },
    questionPlan: [questionPlanSchema],
    transcript: [transcriptEntrySchema],
    finalReport: finalReportSchema,
    startedAt: { type: Date, default: Date.now, index: true },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

interviewSessionSchema.index({ userId: 1, completedAt: -1 });

export default mongoose.model("InterviewSession", interviewSessionSchema);
