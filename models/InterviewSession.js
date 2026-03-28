import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: String,
  timestamp: { type: Date, default: Date.now },
});

const scoreSchema = new mongoose.Schema({
  question: String,
  answer: String,
  score: Number,
  dimensions: {
    clarity: Number,
    depth: Number,
    correctness: Number,
    communication: Number,
  },
  feedback: String,
  nextFocus: String,
});

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  role: { type: String, default: "general" },
  mode: { type: String, default: "normal" },

  status: {
    type: String,
    enum: ["active", "completed"],
    default: "active",
  },

  messages: [messageSchema],
  scores: [scoreSchema],

  difficulty: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },

  summary: String,

  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
});

export default mongoose.model("InterviewSession", sessionSchema);
