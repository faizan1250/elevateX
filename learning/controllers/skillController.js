const Skill = require('../models/Skill');
const SkillProgress = require('../../models/SkillProgress');
const aiService = require('../services/aiService');

// Create a new skill
exports.createSkill = async (req, res) => {
  try {
    const skill = new Skill(req.body);
    await skill.save();
    res.status(201).json(skill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Get all skills
exports.getSkills = async (req, res) =>{
  try {
    const { moduleId, q, difficulty, sort = '-updatedAt' } = req.query;

    const filter = {};
    if (moduleId) filter.moduleId = moduleId;
    if (difficulty) filter.difficulty = difficulty;
    if (q) {
      // simple name search; add index/collation below
      filter.name = { $regex: q, $options: 'i' };
    }

    // Always query Skill collection (don't rely on Module.skills array)
    const skills = await Skill.find(filter)
      .sort(sort)            // e.g. -updatedAt or name
      .lean()                 // return plain objects (no Mongoose doc caching)
      .exec();

    return res.json({ items: skills });
  } catch (err) {
    console.error('getSkills error:', err);
    return res.status(500).json({ message: err.message || 'Failed to fetch skills' });
  }
}

exports.getSkill = async (req, res)=> {
  try {
    const { id } = req.params;
    const skill = await Skill.findById(id).lean();
    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    return res.json(skill);
  } catch (err) {
    console.error('getSkillById error:', err);
    return res.status(500).json({ message: err.message || 'Failed to fetch skill' });
  }
}

// Update skill
exports.updateSkill = async (req, res) => {
  try {
    const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    res.json(skill);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// Delete skill
exports.deleteSkill = async (req, res) => {
  try {
    const skill = await Skill.findByIdAndDelete(req.params.id);
    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    res.json({ message: 'Skill deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Track progress for user
exports.updateProgress = async (req, res) => {
  try {
    const { userId, skillId, progress } = req.body;
    const updated = await SkillProgress.findOneAndUpdate(
      { userId, skillId },
      { progress },
      { new: true, upsert: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Generate AI content for skill
exports.generateSkillContent = async (req, res) => {
  try {
    const { skillId } = req.params;
    const skill = await Skill.findById(skillId).lean();
    if (!skill) return res.status(404).json({ message: "Skill not found" });

    const content = await aiService.generateSkillMaterial(skill.name, skill.difficulty || "intermediate");
    return res.json({ skill, content });
  } catch (err) {
    if (err instanceof AIGenerationError) {
      return res
        .status(err.status || 502)
        .json({ message: err.message, code: err.code, ...(err.meta ? { meta: err.meta } : {}) });
    }
    console.error("generateSkillContent error:", err);
    return res.status(500).json({ message: err.message || "Failed to generate AI content" });
  }
};
