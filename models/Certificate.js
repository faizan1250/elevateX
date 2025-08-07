// models/Certificate.js
const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  score: { type: Number, required: true },
  issuedAt: { type: Date, default: Date.now },
  certificateUrl: { type: String }, // Optional: link to generated PDF
});

module.exports = mongoose.model("Certificate", certificateSchema);
