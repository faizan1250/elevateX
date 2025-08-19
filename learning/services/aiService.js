// // learning/services/aiService.js
// const { GoogleGenAI } = require("@google/genai");

// class AIGenerationError extends Error {
//   constructor(message, code = "AI_ERROR", status = 502, meta = {}) {
//     super(message);
//     this.name = "AIGenerationError";
//     this.code = code;
//     this.status = status;
//     this.meta = meta;
//   }
// }

// const API_KEY = process.env.GEMINI_API_KEY;
// if (!API_KEY) {
//   console.warn("⚠️ GEMINI_API_KEY not set. Topic generation will fail with AI_KEY_MISSING.");
// }
// const genAI = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// // ---------- helpers ----------
// const stripFences = (s = "") =>
//   s.replace(/^[\s\n]*```(?:json)?\s*/i, "").replace(/\s*```[\s\n]*$/i, "").trim();

// const normalizeQuotes = (s = "") =>
//   s.replace(/\u201c|\u201d/g, '"').replace(/\u2018|\u2019/g, "'");

// const removeTrailingCommas = (s = "") =>
//   s
//     // trailing comma in objects: {"a":1,}
//     .replace(/,\s*}/g, "}")
//     // trailing comma in arrays: [1,2,]
//     .replace(/,\s*]/g, "]");

// const safeParseJSON = (text) => {
//   try {
//     return JSON.parse(text);
//   } catch {
//     return null;
//   }
// };

// /**
//  * Try very hard to extract a valid JSON object from mixed text.
//  * We still FAIL if we can't get a clean parse after reasonable fixes.
//  */
// const extractJson = (raw = "") => {
//   if (!raw || typeof raw !== "string") return null;

//   // 1) quick path: direct parse
//   const direct = safeParseJSON(raw);
//   if (direct) return direct;

//   // 2) strip code fences
//   const unfenced = stripFences(raw);
//   const p2 = safeParseJSON(unfenced);
//   if (p2) return p2;

//   // 3) find the outermost {...} block (handles accidental pre/post text)
//   const first = unfenced.indexOf("{");
//   const last = unfenced.lastIndexOf("}");
//   if (first !== -1 && last !== -1 && last > first) {
//     const core = unfenced.slice(first, last + 1);
//     const p3 = safeParseJSON(core);
//     if (p3) return p3;

//     // 3a) attempt light fixes: normalize quotes & trailing commas
//     const fixed = removeTrailingCommas(normalizeQuotes(core));
//     const p4 = safeParseJSON(fixed);
//     if (p4) return p4;
//   }

//   // 4) as a final attempt, normalize + remove trailing commas on whole string
//   const fixedAll = removeTrailingCommas(normalizeQuotes(unfenced));
//   const p5 = safeParseJSON(fixedAll);
//   if (p5) return p5;

//   return null;
// };

// // ---------- core ----------
// async function generateTopicsForSkill(skillName, difficulty = "intermediate") {
//   if (!genAI) {
//     throw new AIGenerationError("Missing GEMINI_API_KEY env", "AI_KEY_MISSING", 502);
//   }

//   const prompt = `
// You are an expert curriculum designer.
// Return ONLY JSON. Do not include any prose or code fences.
// Start with "{" and end with "}". No comments.

// Skill: "${skillName}"
// Difficulty: "${difficulty}"

// Required shape:
// {
//   "skill": "string",
//   "topics": [
//     {
//       "title": "string",
//       "difficulty": "beginner|intermediate|advanced",
//       "objectives": ["string"],
//       "estimated_hours": number
//     }
//   ]
// }
// `.trim();

//   // First attempt: JSON mode + loose schema
//   try {
//     const result = await genAI.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: [{ role: "user", parts: [{ text: prompt }] }],
//       generationConfig: {
//         responseMimeType: "application/json",
//         responseSchema: {
//           type: "object",
//           properties: {
//             skill: { type: "string" },
//             topics: { type: "array" }
//           },
//           required: ["skill", "topics"]
//         },
//         maxOutputTokens: 2048,
//         temperature: 0.4
//       }
//     });

    

//     const text = typeof result?.response?.text === "function"
//       ? result.response.text()
//       : result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
//         result?.candidates?.[0]?.content?.parts?.[0]?.text ||
//         "";

//     if (!text) throw new AIGenerationError("No text response from Gemini", "AI_EMPTY", 502);

//     const parsed = extractJson(text);
  
    
//     if (!parsed || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
//       throw new AIGenerationError("AI returned non-JSON", "AI_INVALID_JSON", 502, {
//         rawPreview: String(text).slice(0, 500)
//       });
//     }
//     return parsed;
//   } catch (err) {
//     // Retry once: JSON mode without schema, shorter prompt (models sometimes balk at schema)
//     console.warn("[AI] First attempt failed, retrying without schema…");
//     const result2 = await genAI.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: [{ role: "user", parts: [{ text: `
// Return ONLY JSON (no markdown, no prose).
// {"skill":"${skillName}","topics":[{"title":"","difficulty":"","objectives":[],"estimated_hours":0}]}
// Fill the JSON fully and validly.
// ` }] }],
//       generationConfig: {
//         responseMimeType: "application/json",
//         maxOutputTokens: 2048,
//         temperature: 0.3
//       }
//     });


//     const text2 = typeof result2?.response?.text === "function"
//       ? result2.response.text()
//       : result2?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

//     const parsed2 = extractJson(text2);
    
    
//     if (!parsed2 || !Array.isArray(parsed2.topics) || parsed2.topics.length === 0) {
//       throw new AIGenerationError("AI returned non-JSON", "AI_INVALID_JSON", 502, {
//         rawPreview: String(text2).slice(0, 500)
//       });
//     }
//     return parsed2;
//   }
// }

// module.exports = { generateTopicsForSkill, AIGenerationError };

// learning/services/aiService.js
const { GoogleGenAI } = require("@google/genai");

class AIGenerationError extends Error {
  constructor(message, code = "AI_ERROR", status = 502, meta = {}) {
    super(message);
    this.name = "AIGenerationError";
    this.code = code;
    this.status = status;
    this.meta = meta;
  }
}

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY not set. AI generation will fail with AI_KEY_MISSING.");
}
const genAI = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

/* ---------------------------- JSON helper utils ---------------------------- */

const stripFences = (s = "") =>
  s.replace(/^[\s\n]*```(?:json)?\s*/i, "").replace(/\s*```[\s\n]*$/i, "").trim();

const normalizeQuotes = (s = "") =>
  s.replace(/\u201c|\u201d/g, '"').replace(/\u2018|\u2019/g, "'");

const removeTrailingCommas = (s = "") =>
  s.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

const safeParseJSON = (text) => {
  try { return JSON.parse(text); } catch { return null; }
};

/** Try hard to extract a valid JSON object from mixed text */
const extractJson = (raw = "") => {
  if (!raw || typeof raw !== "string") return null;

  // 1) direct
  const direct = safeParseJSON(raw);
  if (direct) return direct;

  // 2) strip code fences
  const unfenced = stripFences(raw);
  const p2 = safeParseJSON(unfenced);
  if (p2) return p2;

  // 3) outermost {...}
  const first = unfenced.indexOf("{");
  const last = unfenced.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const core = unfenced.slice(first, last + 1);
    const p3 = safeParseJSON(core);
    if (p3) return p3;
    const fixed = removeTrailingCommas(normalizeQuotes(core));
    const p4 = safeParseJSON(fixed);
    if (p4) return p4;
  }

  // 4) normalize all
  const fixedAll = removeTrailingCommas(normalizeQuotes(unfenced));
  const p5 = safeParseJSON(fixedAll);
  if (p5) return p5;

  return null;
};

const textFrom = (result) => {
  if (!result) return "";
  if (typeof result?.response?.text === "function") return result.response.text();
  return (
    result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
    result?.candidates?.[0]?.content?.parts?.[0]?.text ||
    ""
  );
};

/* ---------------------------- Topics generation ---------------------------- */

async function generateTopicsForSkill(skillName, difficulty = "intermediate") {
  if (!genAI) {
    throw new AIGenerationError("Missing GEMINI_API_KEY env", "AI_KEY_MISSING", 502);
  }

  const prompt = `
You are an expert curriculum designer.
Return ONLY JSON. Do not include any prose or code fences.
Start with "{" and end with "}". No comments.

Skill: "${skillName}"
Difficulty: "${difficulty}"

Required shape:
{
  "skill": "string",
  "topics": [
    {
      "title": "string",
      "difficulty": "beginner|intermediate|advanced",
      "objectives": ["string"],
      "estimated_hours": number
    }
  ]
}
`.trim();

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: { skill: { type: "string" }, topics: { type: "array" } },
          required: ["skill", "topics"],
        },
        maxOutputTokens: 2048,
        temperature: 0.4,
      },
    });

    const text = textFrom(result);
    if (!text) throw new AIGenerationError("No text response from Gemini", "AI_EMPTY", 502);

    const parsed = extractJson(text);
    if (!parsed || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
      throw new AIGenerationError("AI returned non-JSON", "AI_INVALID_JSON", 502, {
        rawPreview: String(text).slice(0, 500),
      });
    }
    console.log(parsed);
    
    return parsed;
  } catch (err) {
    console.warn("[AI] First attempt failed, retrying without schema…");
    const result2 = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: `
Return ONLY JSON (no markdown, no prose).
{"skill":"${skillName}","topics":[{"title":"","difficulty":"","objectives":[],"estimated_hours":0}]}
Fill the JSON fully and validly.
`.trim() }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
        temperature: 0.3,
      },
    });

    const text2 = textFrom(result2);
    const parsed2 = extractJson(text2);

    if (!parsed2 || !Array.isArray(parsed2.topics) || parsed2.topics.length === 0) {
      throw new AIGenerationError("AI returned non-JSON", "AI_INVALID_JSON", 502, {
        rawPreview: String(text2).slice(0, 500),
      });
    }
    console.log(parsed2);
    
    return parsed2;
  }
}

/* ------------------------ Skill study material (AI) ------------------------ */

async function generateSkillMaterial(skillName, difficulty = "intermediate") {
  if (!genAI) {
    throw new AIGenerationError("Missing GEMINI_API_KEY env", "AI_KEY_MISSING", 502);
  }

  const prompt = `
You are a senior instructor. Write concise study material for the skill:

Skill: "${skillName}"
Difficulty: "${difficulty}"

Include:
- What/why (short)
- Key concepts (bulleted)
- Step-by-step learning path (numbered, 5–8 steps)
- Small practice tasks (3–5 items)
- Common pitfalls

Keep it clear and scannable. Use markdown headings and lists. No code fences unless showing code.
`.trim();

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "text/markdown",
        maxOutputTokens: 2048,
        temperature: 0.5,
      },
    });

    const text = textFrom(result);
    if (!text) throw new AIGenerationError("No text response from Gemini", "AI_EMPTY", 502);
    return text;
  } catch (err) {
    // simple fallback attempt
    const result2 = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
    });
    const text2 = textFrom(result2);
    if (!text2) throw new AIGenerationError("No text response from Gemini", "AI_EMPTY", 502);
    return text2;
  }
}

module.exports = {
  generateTopicsForSkill,
  generateSkillMaterial,
  AIGenerationError,
};
