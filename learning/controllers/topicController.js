const Topic = require('../models/Topic');
const aiService = require('../services/aiService');

exports.createTopic = async (req, res) => {
  try {
    const topic = new Topic(req.body);
    await topic.save();
    res.status(201).json(topic);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getTopics = async (req, res) => {
  try {
    const topics = await Topic.find().populate('moduleId', 'name');
    res.json(topics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getTopic = async (req, res) => {
  try {
    const topic = await Topic.findById(req.params.id).populate('moduleId', 'name');
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    res.json(topic);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateTopic = async (req, res) => {
  try {
    const topic = await Topic.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    res.json(topic);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteTopic = async (req, res) => {
  try {
    const topic = await Topic.findByIdAndDelete(req.params.id);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    res.json({ message: 'Topic deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// AI generate summary/learning material
exports.generateTopicSummary = async (req, res) => {
  try {
    const { topicId } = req.params;
    const topic = await Topic.findById(topicId);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });

    const summary = await aiService.generateTopicSummary(topic.name);
    res.json({ topic, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
