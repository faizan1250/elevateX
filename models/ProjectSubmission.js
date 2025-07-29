const mongoose = require("mongoose");

const ProjectSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  projectTitle: { type: String, required: true },
  githubLink: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ProjectSubmission", ProjectSubmissionSchema);
