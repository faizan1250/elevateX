import CareerChoice from "../models/CareerChoice.js";
import CareerPlan from "../models/CareerPlan.js";
import ResumeProfile from "../models/ResumeProfile.js";
import ResumeVersion from "../models/ResumeVersion.js";
import User from "../models/User.js";
import {
  analyzeResumeVersion,
  buildProfileSeed,
  buildResumePdfBuffer,
  buildWorkspaceResponse,
  createVersionSeed,
  tailorResumeVersion,
} from "../services/resumeBuilderService.js";

const ensureProfile = async (userId) => {
  let profile = await ResumeProfile.findOne({ userId });
  if (profile) return profile;

  const [user, careerChoice, careerPlan] = await Promise.all([
    User.findById(userId).lean(),
    CareerChoice.findOne({ userId }).lean(),
    CareerPlan.findOne({ userId }).lean(),
  ]);

  profile = await ResumeProfile.create({
    userId,
    ...buildProfileSeed({ user, careerChoice, careerPlan }),
  });

  return profile;
};

const normalizeVersionPayload = (body = {}) => ({
  title: body.title,
  targetRole: body.targetRole,
  targetCompany: body.targetCompany,
  templateId: body.templateId,
  theme: body.theme,
  layout: body.layout,
  jobDescription: body.jobDescription,
  status: body.status,
  sections: body.sections,
});

export const getWorkspace = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await ensureProfile(userId);
    const versions = await ResumeVersion.find({ userId }).sort({ updatedAt: -1 }).limit(25);

    if (versions.length === 0) {
      const seededVersion = await ResumeVersion.create({
        userId,
        resumeProfileId: profile._id,
        ...createVersionSeed(profile, {}),
      });
      return res.status(200).json(buildWorkspaceResponse({ profile, versions: [seededVersion] }));
    }

    return res.status(200).json(buildWorkspaceResponse({ profile, versions }));
  } catch (error) {
    console.error("resume workspace error", error);
    return res.status(500).json({ message: "Failed to load resume workspace" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user.id);
    return res.status(200).json(profile);
  } catch (error) {
    console.error("resume profile error", error);
    return res.status(500).json({ message: "Failed to load resume profile" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user.id);
    const allowedFields = [
      "basics",
      "targeting",
      "experience",
      "projects",
      "education",
      "certifications",
      "skillInventory",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        profile[field] = req.body[field];
      }
    }

    await profile.save();
    return res.status(200).json(profile);
  } catch (error) {
    console.error("resume profile update error", error);
    return res.status(500).json({ message: "Failed to update resume profile" });
  }
};

export const listVersions = async (req, res) => {
  try {
    const versions = await ResumeVersion.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    return res.status(200).json(versions);
  } catch (error) {
    console.error("resume versions error", error);
    return res.status(500).json({ message: "Failed to load resume versions" });
  }
};

export const createVersion = async (req, res) => {
  try {
    const userId = req.user.id;
    const profile = await ensureProfile(userId);
    const version = await ResumeVersion.create({
      userId,
      resumeProfileId: profile._id,
      ...createVersionSeed(profile, req.body),
    });
    return res.status(201).json(version);
  } catch (error) {
    console.error("resume create version error", error);
    return res.status(500).json({ message: "Failed to create resume version" });
  }
};

export const getVersion = async (req, res) => {
  try {
    const version = await ResumeVersion.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!version) {
      return res.status(404).json({ message: "Resume version not found" });
    }
    return res.status(200).json(version);
  } catch (error) {
    console.error("resume get version error", error);
    return res.status(500).json({ message: "Failed to load resume version" });
  }
};

export const updateVersion = async (req, res) => {
  try {
    const version = await ResumeVersion.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!version) {
      return res.status(404).json({ message: "Resume version not found" });
    }

    const payload = normalizeVersionPayload(req.body);
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined) {
        version[key] = value;
      }
    });

    await version.save();
    return res.status(200).json(version);
  } catch (error) {
    console.error("resume update version error", error);
    return res.status(500).json({ message: "Failed to update resume version" });
  }
};

export const analyzeVersion = async (req, res) => {
  try {
    const [profile, version] = await Promise.all([
      ensureProfile(req.user.id),
      ResumeVersion.findOne({ _id: req.params.id, userId: req.user.id }),
    ]);

    if (!version) {
      return res.status(404).json({ message: "Resume version not found" });
    }

    const analysisPayload = analyzeResumeVersion(profile, version);
    version.analysis = analysisPayload.analysis;
    version.scorecard = analysisPayload.scorecard;
    version.insights = analysisPayload.insights;
    version.lastAnalyzedAt = new Date();
    await version.save();

    return res.status(200).json(version);
  } catch (error) {
    console.error("resume analyze error", error);
    return res.status(500).json({ message: "Failed to analyze resume version" });
  }
};

export const generateVersion = async (req, res) => {
  try {
    const [profile, version] = await Promise.all([
      ensureProfile(req.user.id),
      ResumeVersion.findOne({ _id: req.params.id, userId: req.user.id }),
    ]);

    if (!version) {
      return res.status(404).json({ message: "Resume version not found" });
    }

    const nextPayload = tailorResumeVersion(profile, version);
    version.sections = nextPayload.sections;
    version.analysis = nextPayload.analysis;
    version.scorecard = nextPayload.scorecard;
    version.insights = nextPayload.insights;
    version.status = nextPayload.status;
    version.lastAnalyzedAt = nextPayload.lastAnalyzedAt;
    await version.save();

    return res.status(200).json(version);
  } catch (error) {
    console.error("resume generate error", error);
    return res.status(500).json({ message: "Failed to generate tailored resume content" });
  }
};

export const exportPdf = async (req, res) => {
  try {
    const [profile, version] = await Promise.all([
      ensureProfile(req.user.id),
      ResumeVersion.findOne({ _id: req.params.id, userId: req.user.id }),
    ]);

    if (!version) {
      return res.status(404).json({ message: "Resume version not found" });
    }

    const buffer = await buildResumePdfBuffer({ profile, version });
    const fileName = `${(version.title || "resume").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("resume export error", error);
    return res.status(500).json({ message: "Failed to export resume PDF" });
  }
};
