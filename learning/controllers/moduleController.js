// controllers/moduleController.js
const mongoose = require('mongoose');
const Module = require('../models/Module');
const Skill  = require('../models/Skill');
const aiService = require('../services/aiService');

exports.createModule = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const module = await Module.create({ ...req.body, userId });
    res.status(201).json(module);
  } catch (err) {
    console.log(err);
    
    res.status(400).json({ message: err.message });
  }
};

exports.getModules = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // lean + counts via $lookup
    const modules = await Module.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "skills",
          let: { mid: "$_id" },
          pipeline: [{ $match: { $expr: { $eq: ["$moduleId", "$$mid"] } } }, { $count: "count" }],
          as: "skillsCountArr",
        },
      },
      {
        $addFields: {
          skillsCount: { $ifNull: [{ $arrayElemAt: ["$skillsCountArr.count", 0] }, 0] },
        },
      },
      { $project: { skillsCountArr: 0 } },
      { $sort: { updatedAt: -1 } },
    ]);

    res.json(modules);
  } catch (err) {
    console.log(err);
    
    res.status(500).json({ message: err.message });
  }
};

exports.getModule = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const module = await Module.findOne({ _id: req.params.id, userId }).lean();
    if (!module) return res.status(404).json({ message: 'Module not found' });
    res.json(module);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const module = await Module.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true });
    if (!module) return res.status(404).json({ message: 'Module not found' });
    res.json(module);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const mod = await Module.findOneAndDelete({ _id: req.params.id, userId });
    if (!mod) return res.status(404).json({ message: 'Module not found' });
    // cascade delete skills (and optionally topics) for this user's module
    await Skill.deleteMany({ moduleId: mod._id, userId });
    res.json({ message: 'Module deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// AI generated learning path for module
exports.generateModulePath = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const module = await Module.findOne({ _id: req.params.moduleId, userId }).lean();
    if (!module) return res.status(404).json({ message: 'Module not found' });

    const skills = await Skill.find({ moduleId: module._id, userId }).lean();
    const path = await aiService.generateLearningPath(module.title, skills);
    res.json({ module, path });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
