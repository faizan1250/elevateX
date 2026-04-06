import mongoose from "mongoose";

const scoredSkillSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    proficiencyScore: { type: Number, min: 0, max: 100, default: 0 },
    verifiedBy: { type: String, trim: true, default: "self_reported" },
    lastAssessed: { type: Date, default: null },
    growthRate: { type: Number, default: 0 },
  },
  { _id: false },
);

const industryFitSchema = new mongoose.Schema(
  {
    industry: { type: String, trim: true, required: true },
    fitScore: { type: Number, min: 0, max: 100, default: 0 },
  },
  { _id: false },
);

const salaryBenchmarkSchema = new mongoose.Schema(
  {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    currency: { type: String, trim: true, default: "USD" },
  },
  { _id: false },
);

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, required: true },
    type: {
      type: String,
      enum: ["skill", "project", "application", "network", "resume", "interview", "custom"],
      default: "custom",
    },
    status: {
      type: String,
      enum: ["locked", "active", "completed"],
      default: "locked",
    },
    aiGenerated: { type: Boolean, default: true },
    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    xpReward: { type: Number, default: 0 },
  },
  { _id: false },
);

const adaptationLogSchema = new mongoose.Schema(
  {
    triggeredBy: { type: String, trim: true, required: true },
    changedAt: { type: Date, default: Date.now },
    previousPlan: { type: mongoose.Schema.Types.Mixed, default: {} },
    newPlan: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const applicationInsightSchema = new mongoose.Schema(
  {
    jobTitle: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    appliedAt: { type: Date, default: null },
    source: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["wishlist", "applied", "ghosted", "oa", "interview", "offer", "rejected"],
      default: "applied",
    },
    aiCoverLetter: { type: String, trim: true, default: "" },
    resumeVersionUsed: { type: mongoose.Schema.Types.ObjectId, ref: "ResumeVersion", default: null },
    interviewFeedback: { type: String, trim: true, default: "" },
    salaryOffered: { type: Number, default: 0 },
  },
  { _id: false },
);

const marketPulseSchema = new mongoose.Schema(
  {
    demandScore: { type: Number, min: 0, max: 100, default: 0 },
    avgTimeToHire: { type: Number, default: 0 },
    topHiringCompanies: [{ type: String, trim: true }],
    emergingSkillsNeeded: [{ type: String, trim: true }],
    lastUpdated: { type: Date, default: null },
  },
  { _id: false },
);

const networkConnectionSchema = new mongoose.Schema(
  {
    contactName: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "" },
    connectionStrength: { type: Number, min: 1, max: 10, default: 1 },
    linkedinUrl: { type: String, trim: true, default: "" },
    lastInteracted: { type: Date, default: null },
  },
  { _id: false },
);

const dailyActionSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    actionType: { type: String, trim: true, required: true },
    xpEarned: { type: Number, default: 0 },
    aiFeedback: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const badgeSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    earnedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const weeklyBriefingSchema = new mongoose.Schema(
  {
    week: { type: Date, required: true },
    summary: { type: String, trim: true, default: "" },
    topWin: { type: String, trim: true, default: "" },
    suggestedFocus: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const CareerChoiceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    // Legacy flat fields kept for backward compatibility with current routes and clients.
    interest: { type: String, trim: true, default: "" },
    skills: { type: String, trim: true, default: "" },
    education: { type: String, trim: true, default: "" },
    experience: { type: String, trim: true, default: "" },
    careergoal: { type: String, trim: true, default: "" },
    timeconstraint: { type: String, trim: true, default: "" },
    availabilty: { type: String, trim: true, default: "" },

    // Career OS profile
    skillsDetailed: [scoredSkillSchema],
    workStyleDNA: {
      learningStyle: { type: String, trim: true, default: "" },
      collaborationStyle: { type: String, trim: true, default: "" },
      riskAppetite: { type: String, trim: true, default: "" },
      motivationDrivers: [{ type: String, trim: true }],
    },
    careerVector: {
      currentRole: { type: String, trim: true, default: "" },
      targetRoles: [{ type: String, trim: true }],
      industryFit: [industryFitSchema],
      salaryBenchmark: { type: salaryBenchmarkSchema, default: () => ({}) },
    },
    resume: {
      raw: { type: String, trim: true, default: "" },
      parsed: { type: mongoose.Schema.Types.Mixed, default: {} },
      aiFeedbackScore: { type: Number, min: 0, max: 100, default: 0 },
      lastOptimized: { type: Date, default: null },
    },
    careerJourney: {
      targetRole: { type: String, trim: true, default: "" },
      estimatedTimeline: { type: Number, default: 0 },
      milestones: [milestoneSchema],
      adaptationLog: [adaptationLogSchema],
    },
    jobIntelligence: {
      applications: [applicationInsightSchema],
      marketPulse: { type: marketPulseSchema, default: () => ({}) },
      networkGraph: [networkConnectionSchema],
    },
    growthEngine: {
      xpTotal: { type: Number, default: 0 },
      level: { type: Number, default: 1 },
      streakDays: { type: Number, default: 0 },
      dailyActions: [dailyActionSchema],
      badges: [badgeSchema],
      weeklyAIBriefing: [weeklyBriefingSchema],
    },
    status: { type: String, trim: true, default: "submitted" },
    journeyStarted: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

CareerChoiceSchema.index({ userId: 1, updatedAt: -1 });
CareerChoiceSchema.index({ "careerVector.targetRoles": 1 });
CareerChoiceSchema.index({ "skillsDetailed.name": 1 });
CareerChoiceSchema.index({ "jobIntelligence.applications.status": 1 });

CareerChoiceSchema.pre("save", function syncLegacyAndActivity(next) {
  this.lastActiveAt = new Date();

  if ((!this.skills || !this.skills.trim()) && Array.isArray(this.skillsDetailed) && this.skillsDetailed.length) {
    this.skills = this.skillsDetailed
      .map((skill) => skill?.name?.trim())
      .filter(Boolean)
      .join(", ");
  }

  if ((!this.careergoal || !this.careergoal.trim()) && this.careerVector?.targetRoles?.length) {
    this.careergoal = this.careerVector.targetRoles.find(Boolean) || "";
  }

  if ((!this.interest || !this.interest.trim()) && this.careerVector?.currentRole) {
    this.interest = this.careerVector.currentRole;
  }

  if ((!this.careerJourney?.targetRole || !this.careerJourney.targetRole.trim()) && this.careergoal) {
    this.careerJourney.targetRole = this.careergoal;
  }

  next();
});

export default mongoose.models.CareerChoice || mongoose.model("CareerChoice", CareerChoiceSchema);
