const mongoose = require("mongoose");

const CareerChoiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  careerPath: String,
  goal: String,
  interests: [String],
  experience: String,
  learningStyle: String,
  timePerDay: String,
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: "submitted" },
});

module.exports = mongoose.model("CareerChoice", CareerChoiceSchema);
