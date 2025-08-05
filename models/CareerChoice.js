const mongoose = require("mongoose");

const CareerChoiceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  interest: { type: String, required: true },
  skills: { type: String, required: true },
  education: { type: String, required: true },
  experience: { type: String, required: true },
  careergoal: { type: String, required: true },
  timeconstraint: { type: String, required: true },
  availabilty: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: "submitted" }
});

module.exports = mongoose.model("CareerChoice", CareerChoiceSchema);
