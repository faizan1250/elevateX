// lib/tokens.js
exports.countTokens = (text = "") => {
  // Cheap heuristic. Replace with real tokenizer when you feel ambitious.
  return Math.ceil(text.split(/\s+/).length * 1.3);
};
