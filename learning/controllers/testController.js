const Test = require('../models/Test');
const aiService = require('../services/aiService');

exports.createTest = async (req, res) => {
  try {
    const test = new Test(req.body);
    await test.save();
    res.status(201).json(test);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getTests = async (req, res) => {
  try {
    const tests = await Test.find().populate('moduleId topicId');
    res.json(tests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('moduleId topicId');
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json({ message: 'Test deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// AI generate test questions
exports.generateTestQuestions = async (req, res) => {
  try {
    const { testId } = req.params;
    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const questions = await aiService.generateTestQuestions(test.name, test.type);
    res.json({ test, questions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
