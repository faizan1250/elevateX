import Application from "../models/Application.js";
import PortfolioAsset from "../models/PortfolioAsset.js";
import { buildDashboardWorkspace } from "../services/dashboardService.js";

const serializeApplication = (application) => ({
  id: String(application._id),
  company: application.company,
  role: application.role,
  status: application.status,
  source: application.source,
  jobUrl: application.jobUrl,
  notes: application.notes,
  priority: application.priority,
  lastActivityAt: application.lastActivityAt,
  updatedAt: application.updatedAt,
  resumeVersionId: application.resumeVersionId ? String(application.resumeVersionId) : null,
  portfolioAssetIds: Array.isArray(application.portfolioAssetIds)
    ? application.portfolioAssetIds.map((asset) => String(asset))
    : [],
});

const serializePortfolioAsset = (asset) => ({
  id: String(asset._id),
  title: asset.title,
  type: asset.type,
  description: asset.description,
  link: asset.link,
  metrics: asset.metrics || [],
  tags: asset.tags || [],
  featured: Boolean(asset.featured),
  updatedAt: asset.updatedAt,
});

export const getDashboardWorkspace = async (req, res) => {
  try {
    const workspace = await buildDashboardWorkspace(req.user.id);
    return res.status(200).json(workspace);
  } catch (error) {
    console.error("dashboard workspace error", error);
    return res.status(500).json({ message: "Failed to load dashboard workspace" });
  }
};

export const createApplication = async (req, res) => {
  try {
    const application = await Application.create({
      userId: req.user.id,
      company: req.body.company,
      role: req.body.role,
      status: req.body.status || "wishlist",
      source: req.body.source || "",
      jobUrl: req.body.jobUrl || "",
      notes: req.body.notes || "",
      resumeVersionId: req.body.resumeVersionId || null,
      portfolioAssetIds: req.body.portfolioAssetIds || [],
      priority: req.body.priority || "medium",
      lastActivityAt: new Date(),
    });

    return res.status(201).json(serializeApplication(application));
  } catch (error) {
    console.error("create application error", error);
    return res.status(500).json({ message: "Failed to create application" });
  }
};

export const updateApplication = async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const allowed = [
      "company",
      "role",
      "status",
      "source",
      "jobUrl",
      "notes",
      "resumeVersionId",
      "portfolioAssetIds",
      "priority",
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        application[field] = req.body[field];
      }
    });
    application.lastActivityAt = new Date();

    await application.save();

    return res.status(200).json(serializeApplication(application));
  } catch (error) {
    console.error("update application error", error);
    return res.status(500).json({ message: "Failed to update application" });
  }
};

export const deleteApplication = async (req, res) => {
  try {
    const deleted = await Application.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Application not found" });
    }

    return res.status(200).json({ message: "Application deleted" });
  } catch (error) {
    console.error("delete application error", error);
    return res.status(500).json({ message: "Failed to delete application" });
  }
};

export const createPortfolioAsset = async (req, res) => {
  try {
    const asset = await PortfolioAsset.create({
      userId: req.user.id,
      title: req.body.title,
      type: req.body.type || "project",
      description: req.body.description || "",
      link: req.body.link || "",
      metrics: req.body.metrics || [],
      tags: req.body.tags || [],
      featured: Boolean(req.body.featured),
    });

    return res.status(201).json(serializePortfolioAsset(asset));
  } catch (error) {
    console.error("create portfolio asset error", error);
    return res.status(500).json({ message: "Failed to create portfolio asset" });
  }
};

export const updatePortfolioAsset = async (req, res) => {
  try {
    const asset = await PortfolioAsset.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!asset) {
      return res.status(404).json({ message: "Portfolio asset not found" });
    }

    const allowed = ["title", "type", "description", "link", "metrics", "tags", "featured"];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        asset[field] = req.body[field];
      }
    });

    await asset.save();

    return res.status(200).json(serializePortfolioAsset(asset));
  } catch (error) {
    console.error("update portfolio asset error", error);
    return res.status(500).json({ message: "Failed to update portfolio asset" });
  }
};

export const deletePortfolioAsset = async (req, res) => {
  try {
    const deleted = await PortfolioAsset.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!deleted) {
      return res.status(404).json({ message: "Portfolio asset not found" });
    }

    await Application.updateMany(
      { userId: req.user.id, portfolioAssetIds: deleted._id },
      { $pull: { portfolioAssetIds: deleted._id } },
    );

    return res.status(200).json({ message: "Portfolio asset deleted" });
  } catch (error) {
    console.error("delete portfolio asset error", error);
    return res.status(500).json({ message: "Failed to delete portfolio asset" });
  }
};
