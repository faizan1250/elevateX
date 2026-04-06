import mongoose from "mongoose";

const versionExperienceSchema = new mongoose.Schema(
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

const versionProjectSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    summary: { type: String, trim: true, default: "" },
    highlights: [{ type: String, trim: true }],
    technologies: [{ type: String, trim: true }],
    link: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const versionEducationSchema = new mongoose.Schema(
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

const analysisInsightSchema = new mongoose.Schema(
  {
    type: { type: String, trim: true, default: "info" },
    title: { type: String, trim: true, default: "" },
    body: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const bulletDiagnosticSchema = new mongoose.Schema(
  {
    section: { type: String, trim: true, default: "" },
    message: { type: String, trim: true, default: "" },
    severity: { type: String, trim: true, default: "info" },
    bullet: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const themeSchema = new mongoose.Schema(
  {
    accent: { type: String, trim: true, default: "#c2612d" },
    headingFont: { type: String, trim: true, default: "Helvetica-Bold" },
    bodyFont: { type: String, trim: true, default: "Helvetica" },
    density: { type: String, trim: true, default: "balanced" },
  },
  { _id: false },
);

const layoutSchema = new mongoose.Schema(
  {
    columns: { type: Number, default: 1 },
    showSidebar: { type: Boolean, default: false },
    sectionOrder: [{ type: String, trim: true }],
    compact: { type: Boolean, default: false },
  },
  { _id: false },
);

const resumeVersionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resumeProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResumeProfile",
      required: true,
      index: true,
    },
    title: { type: String, trim: true, default: "Untitled Resume" },
    targetRole: { type: String, trim: true, default: "" },
    targetCompany: { type: String, trim: true, default: "" },
    templateId: { type: String, trim: true, default: "classic" },
    theme: { type: themeSchema, default: () => ({}) },
    layout: { type: layoutSchema, default: () => ({}) },
    jobDescription: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["draft", "review", "ready"],
      default: "draft",
      index: true,
    },
    sections: {
      summary: { type: String, trim: true, default: "" },
      experience: [versionExperienceSchema],
      projects: [versionProjectSchema],
      education: [versionEducationSchema],
      skills: [{ type: String, trim: true }],
      certifications: [{ type: String, trim: true }],
    },
    analysis: {
      keywords: [{ type: String, trim: true }],
      responsibilities: [{ type: String, trim: true }],
      matchedKeywords: [{ type: String, trim: true }],
      missingKeywords: [{ type: String, trim: true }],
      strengths: [{ type: String, trim: true }],
      gaps: [{ type: String, trim: true }],
      recommendations: [{ type: String, trim: true }],
      diagnostics: [bulletDiagnosticSchema],
      suggestedSectionOrder: [{ type: String, trim: true }],
      fitLabel: { type: String, trim: true, default: "Needs work" },
    },
    scorecard: {
      overall: { type: Number, default: 0 },
      keywordCoverage: { type: Number, default: 0 },
      impactScore: { type: Number, default: 0 },
      completenessScore: { type: Number, default: 0 },
      atsScore: { type: Number, default: 0 },
      bulletQualityScore: { type: Number, default: 0 },
      roleAlignmentScore: { type: Number, default: 0 },
    },
    insights: [analysisInsightSchema],
    lastAnalyzedAt: { type: Date },
  },
  { timestamps: true },
);

resumeVersionSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.model("ResumeVersion", resumeVersionSchema);
