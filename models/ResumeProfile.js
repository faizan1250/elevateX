import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: "" },
    url: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const experienceSchema = new mongoose.Schema(
  {
    company: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    startDate: { type: String, trim: true, default: "" },
    endDate: { type: String, trim: true, default: "" },
    current: { type: Boolean, default: false },
    summary: { type: String, trim: true, default: "" },
    achievements: [{ type: String, trim: true }],
    skills: [{ type: String, trim: true }],
  },
  { _id: false },
);

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    summary: { type: String, trim: true, default: "" },
    highlights: [{ type: String, trim: true }],
    technologies: [{ type: String, trim: true }],
    link: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const educationSchema = new mongoose.Schema(
  {
    school: { type: String, trim: true, default: "" },
    degree: { type: String, trim: true, default: "" },
    field: { type: String, trim: true, default: "" },
    startDate: { type: String, trim: true, default: "" },
    endDate: { type: String, trim: true, default: "" },
    grade: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    issuer: { type: String, trim: true, default: "" },
    issuedAt: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const skillSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    level: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "" },
    evidence: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const resumeProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    basics: {
      fullName: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      location: { type: String, trim: true, default: "" },
      headline: { type: String, trim: true, default: "" },
      summary: { type: String, trim: true, default: "" },
      links: [linkSchema],
    },
    targeting: {
      targetRoles: [{ type: String, trim: true }],
      targetCompanies: [{ type: String, trim: true }],
      careerGoal: { type: String, trim: true, default: "" },
      interestAreas: [{ type: String, trim: true }],
      yearsOfExperience: { type: String, trim: true, default: "" },
    },
    experience: [experienceSchema],
    projects: [projectSchema],
    education: [educationSchema],
    certifications: [certificationSchema],
    skillInventory: [skillSchema],
    meta: {
      source: { type: String, trim: true, default: "career-choice" },
      importedFromCareerChoice: { type: Boolean, default: false },
      importedFromCareerPlan: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

export default mongoose.model("ResumeProfile", resumeProfileSchema);
