import mongoose from "mongoose";

const ProjectSubmissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  projectTitle: { type: String, required: true },
  githubLink: { type: String, required: true },
  submittedAt: { type: Date, default: Date.now },
});

export default mongoose.model("ProjectSubmission", ProjectSubmissionSchema);;
