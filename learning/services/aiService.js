
// import { GoogleGenAI } from "@google/genai";

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
//   console.warn("⚠️ GEMINI_API_KEY not set. AI generation will fail with AI_KEY_MISSING.");
// }
// const genAI = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

// /* ---------------------------- JSON helper utils ---------------------------- */

// const stripFences = (s = "") =>
//   s.replace(/^[\s\n]*```(?:json)?\s*/i, "").replace(/\s*```[\s\n]*$/i, "").trim();

// const normalizeQuotes = (s = "") =>
//   s.replace(/\u201c|\u201d/g, '"').replace(/\u2018|\u2019/g, "'");

// const removeTrailingCommas = (s = "") =>
//   s.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

// const safeParseJSON = (text) => {
//   try { return JSON.parse(text); } catch { return null; }
// };

// /** Try hard to extract a valid JSON object from mixed text */
// const extractJson = (raw = "") => {
//   if (!raw || typeof raw !== "string") return null;

//   // 1) direct
//   const direct = safeParseJSON(raw);
//   if (direct) return direct;

//   // 2) strip code fences
//   const unfenced = stripFences(raw);
//   const p2 = safeParseJSON(unfenced);
//   if (p2) return p2;

//   // 3) outermost {...}
//   const first = unfenced.indexOf("{");
//   const last = unfenced.lastIndexOf("}");
//   if (first !== -1 && last !== -1 && last > first) {
//     const core = unfenced.slice(first, last + 1);
//     const p3 = safeParseJSON(core);
//     if (p3) return p3;
//     const fixed = removeTrailingCommas(normalizeQuotes(core));
//     const p4 = safeParseJSON(fixed);
//     if (p4) return p4;
//   }

//   // 4) normalize all
//   const fixedAll = removeTrailingCommas(normalizeQuotes(unfenced));
//   const p5 = safeParseJSON(fixedAll);
//   if (p5) return p5;

//   return null;
// };

// const textFrom = (result) => {
//   if (!result) return "";
//   if (typeof result?.response?.text === "function") return result.response.text();
//   return (
//     result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
//     result?.candidates?.[0]?.content?.parts?.[0]?.text ||
//     ""
//   );
// };

// /* ---------------------------- Topics generation ---------------------------- */

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

//   try {
//     const result = await genAI.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: [{ role: "user", parts: [{ text: prompt }] }],
//       generationConfig: {
//         responseMimeType: "application/json",
//         responseSchema: {
//           type: "object",
//           properties: { skill: { type: "string" }, topics: { type: "array" } },
//           required: ["skill", "topics"],
//         },
//         maxOutputTokens: 2048,
//         temperature: 0.4,
//       },
//     });

//     const text = textFrom(result);
//     if (!text) throw new AIGenerationError("No text response from Gemini", "AI_EMPTY", 502);

//     const parsed = extractJson(text);
//     if (!parsed || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
//       throw new AIGenerationError("AI returned non-JSON", "AI_INVALID_JSON", 502, {
//         rawPreview: String(text).slice(0, 500),
//       });
//     }
//     console.log(parsed);
    
//     return parsed;
//   } catch (err) {
//     console.warn("[AI] First attempt failed, retrying without schema…");
//     const result2 = await genAI.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: [{
//         role: "user",
//         parts: [{ text: `
// Return ONLY JSON (no markdown, no prose).
// {"skill":"${skillName}","topics":[{"title":"","difficulty":"","objectives":[],"estimated_hours":0}]}
// Fill the JSON fully and validly.
// `.trim() }]
//       }],
//       generationConfig: {
//         responseMimeType: "application/json",
//         maxOutputTokens: 2048,
//         temperature: 0.3,
//       },
//     });

//     const text2 = textFrom(result2);
//     const parsed2 = extractJson(text2);

//     if (!parsed2 || !Array.isArray(parsed2.topics) || parsed2.topics.length === 0) {
//       throw new AIGenerationError("AI returned non-JSON", "AI_INVALID_JSON", 502, {
//         rawPreview: String(text2).slice(0, 500),
//       });
//     }
//     console.log(parsed2);
    
//     return parsed2;
//   }
// }

// /* ------------------------ Skill study material (AI) ------------------------ */



// function coerceArray(x) {
//   if (!x) return [];
//   if (Array.isArray(x)) return x.map(String).filter(Boolean);
//   return String(x).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
// }

// function normalizeConcepts(concepts) {
//   if (!concepts) return [];
//   if (Array.isArray(concepts)) {
//     return concepts
//       .map(c => {
//         if (!c) return null;
//         if (typeof c === "string") {
//           // accept "Term: definition" strings
//           const m = c.match(/^\s*\**\s*([^:]+)\s*:\s*(.+)$/);
//           return m ? { term: m[1].trim(), definition: m[2].trim() } : null;
//         }
//         if (typeof c === "object") {
//           const term = (c.term || c.name || "").toString().trim();
//           const definition = (c.definition || c.desc || "").toString().trim();
//           if (!term || !definition) return null;
//           return { term, definition };
//         }
//         return null;
//       })
//       .filter(Boolean);
//   }
//   // string list
//   return normalizeConcepts(coerceArray(concepts));
// }

// function normalizeMaterial(obj, fallbackTitle, fallbackDifficulty) {
//   const safe = {
//     title: (obj.title || fallbackTitle || "").toString().trim(),
//     difficulty: (obj.difficulty || fallbackDifficulty || "").toString().trim(),
//     whatWhy: (obj.whatWhy || obj.what || "").toString().trim(),
//     concepts: normalizeConcepts(obj.concepts),
//     steps: coerceArray(obj.steps),
//     tasks: coerceArray(obj.tasks),
//     pitfalls: coerceArray(obj.pitfalls),
//   };
//   // minimal sanity checks
//   if (!safe.title) throw new AIGenerationError("AI returned empty title", "AI_EMPTY_TITLE", 502);
//   if (!safe.whatWhy) throw new AIGenerationError("AI returned empty What/Why", "AI_EMPTY_WHY", 502);
//   return safe;
// }

// async function generateSkillMaterial( skillName, difficulty = "intermediate") {
//   if (!genAI) {
//     throw new AIGenerationError("Missing GEMINI_API_KEY env", "AI_KEY_MISSING", 502);
//   }

// const prompt = `
// You are a senior instructor creating structured learning content. Return ONLY a valid JSON object that matches this exact schema:

// {
//   "title": string,               // concise skill title (based on input skill)
//   "difficulty": string,          // must match input: "beginner" | "intermediate" | "advanced" | "expert"
//   "whatWhy": string,             // 2-4 clear sentences explaining what it is and why it matters
//   "concepts": [                  // 5-10 key concepts with clear definitions
//     { 
//       "term": string,            // concise concept name
//       "definition": string       // 1-2 sentence explanation
//     }
//   ],
//   "steps": [string],             // 5-8 actionable learning steps in imperative voice
//   "tasks": [string],             // 3-5 practical, small practice tasks
//   "pitfalls": [string]           // 4-8 common mistakes with brief explanations
// }

// CRITICAL CONSTRAINTS:
// 1. Output MUST be valid JSON only - no markdown, no backticks, no additional text
// 2. All fields must be present, even if empty arrays for optional sections
// 3. Content should be concise but comprehensive for learning
// 4. Difficulty must exactly match the input difficulty level
// 5. Use clear, instructional language suitable for learners

// Input Parameters:
// - Skill: "${skillName}"
// - Difficulty: "${difficulty}"
// `.trim();

//   const call = async (temp) => {
//     const result = await genAI.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: [{ role: "user", parts: [{ text: prompt }] }],
//       generationConfig: {
//         responseMimeType: "application/json",
//         maxOutputTokens: 2048,
//         temperature: temp,
//       },
//     });
//     return result;
//   };

//   const textFrom = (r) => {
//     try {
//       // Gemini SDKs differ; be defensive
//       const cand = r?.response?.candidates?.[0];
//       const part = cand?.content?.parts?.[0]?.text ?? r?.text ?? r?.response?.text;
//       return typeof part === "string" ? part : "";
//     } catch { return ""; }
//   };

//   try {
//     const r1 = await call(0.4);
//     const t1 = textFrom(r1);
//     let parsed;
//     try { parsed = JSON.parse(t1); } catch { /* fall through */ }
//     if (!parsed) throw new AIGenerationError("AI returned non-JSON", "AI_NOT_JSON", 502);
//     const normalized = normalizeMaterial(parsed, skillName, difficulty);
//     return { normalized, rawJson: parsed, rawText: t1 };
//   } catch (err) {
//     // fallback attempt with slightly different settings
//     const r2 = await call(0.3);
//     const t2 = textFrom(r2);
//     let parsed2;
//     try { parsed2 = JSON.parse(t2); } catch { /* nope */ }
//     if (!parsed2) throw err;
//     const normalized2 = normalizeMaterial(parsed2, skillName, difficulty);
//     return { normalized: normalized2, rawJson: parsed2, rawText: t2 };
//   }
// }

// /* ------------------------- Topic summary generation ------------------------- */

// async function generateTopicSummary(topicName, difficulty = "intermediate") {
//   if (!genAI) {
//     throw new AIGenerationError("Missing GEMINI_API_KEY env", "AI_KEY_MISSING", 502);
//   }

//   const prompt = `
// You are a subject-matter expert. Write a **concise, learner-friendly summary** of the following topic:

// Topic: "${topicName}"
// Difficulty: "${difficulty}"

// Include:
// - A short explanation (what/why)
// - 3–5 key concepts
// - 2–3 real-world applications/examples
// - 2–3 small practice questions/tasks

// Keep the response clear, scannable, and suitable for beginners. Return text in markdown format (no code fences).
// `.trim();

//   try {
//     const result = await genAI.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: [{ role: "user", parts: [{ text: prompt }] }],
//       generationConfig: {
//         responseMimeType: "text/markdown",
//         maxOutputTokens: 1024,
//         temperature: 0.5,
//       },
//     });

//     const text = textFrom(result);
//     if (!text) throw new AIGenerationError("No text response from Gemini", "AI_EMPTY", 502);
//     return text;
//   } catch (err) {
//     console.error("[AI] Topic summary generation failed:", err);
//     throw new AIGenerationError("Failed to generate topic summary", "AI_ERROR", 502, { cause: err.message });
//   }
// }


// export {
//   generateTopicsForSkill,
//   generateSkillMaterial,
//   AIGenerationError,
//   generateTopicSummary
// };;


// learning/services/aiService.js (ESM, tidy, consistent)
import { GoogleGenAI } from "@google/genai";

/* --------------------------- Error type for AI ops -------------------------- */
export class AIGenerationError extends Error {
  constructor(message, code = "AI_ERROR", status = 502, meta = {}) {
    super(message);
    this.name = "AIGenerationError";
    this.code = code;
    this.status = status;
    this.meta = meta;
  }
}

/* ----------------------------- Client bootstrapping ----------------------------- */
/**
 * @google/genai has seen multiple constructor shapes in the wild.
 * This adapter tries both: new GoogleGenAI(key) and new GoogleGenAI({ apiKey: key }).
 */
function makeGenAI(apiKey) {
  if (!apiKey) return null;
  try {
    // most common
    return new GoogleGenAI(apiKey);
  } catch {
    // some builds expect an object
    return new GoogleGenAI({ apiKey });
  }
}

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY not set. AI generation will fail with AI_KEY_MISSING.");
}
const genAI = makeGenAI(API_KEY);

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

/** Normalize SDK response to plain text */
const textFrom = (result) => {
  if (!result) return "";
  try {
    if (typeof result?.response?.text === "function") return result.response.text();
    return (
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      result?.text ||
      ""
    );
  } catch {
    return "";
  }
};

/* ---------------------------- Topics generation ---------------------------- */

export async function generateTopicsForSkill(skillName, difficulty = "intermediate") {
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
          required: ["skill", "topics"]
        },
        maxOutputTokens: 2048,
        temperature: 0.4
      }
    });

    const text = textFrom(result);
    if (!text) throw new AIGenerationError("No text response from Gemini", "AI_EMPTY", 502);

    const parsed = extractJson(text);
    if (!parsed || !Array.isArray(parsed.topics) || parsed.topics.length === 0) {
      throw new AIGenerationError("AI returned non-JSON", "AI_INVALID_JSON", 502, {
        rawPreview: String(text).slice(0, 500)
      });
    }

    return parsed;
  } catch (err) {
    // fallback without schema
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
        temperature: 0.3
      }
    });

    const text2 = textFrom(result2);
    const parsed2 = extractJson(text2);

    if (!parsed2 || !Array.isArray(parsed2.topics) || parsed2.topics.length === 0) {
      throw new AIGenerationError("AI returned non-JSON", "AI_INVALID_JSON", 502, {
        rawPreview: String(text2).slice(0, 500)
      });
    }

    return parsed2;
  }
}

/* ------------------------ Skill study material (AI) ------------------------ */

function coerceArray(x) {
  if (!x) return [];
  if (Array.isArray(x)) return x.map(String).filter(Boolean);
  return String(x).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function normalizeConcepts(concepts) {
  if (!concepts) return [];
  if (Array.isArray(concepts)) {
    return concepts
      .map(c => {
        if (!c) return null;
        if (typeof c === "string") {
          const m = c.match(/^\s*\**\s*([^:]+)\s*:\s*(.+)$/);
          return m ? { term: m[1].trim(), definition: m[2].trim() } : null;
        }
        if (typeof c === "object") {
          const term = (c.term || c.name || "").toString().trim();
          const definition = (c.definition || c.desc || "").toString().trim();
          if (!term || !definition) return null;
          return { term, definition };
        }
        return null;
      })
      .filter(Boolean);
  }
  return normalizeConcepts(coerceArray(concepts));
}

function normalizeMaterial(obj, fallbackTitle, fallbackDifficulty) {
  const safe = {
    title: (obj.title || fallbackTitle || "").toString().trim(),
    difficulty: (obj.difficulty || fallbackDifficulty || "").toString().trim(),
    whatWhy: (obj.whatWhy || obj.what || "").toString().trim(),
    concepts: normalizeConcepts(obj.concepts),
    steps: coerceArray(obj.steps),
    tasks: coerceArray(obj.tasks),
    pitfalls: coerceArray(obj.pitfalls)
  };
  if (!safe.title) throw new AIGenerationError("AI returned empty title", "AI_EMPTY_TITLE", 502);
  if (!safe.whatWhy) throw new AIGenerationError("AI returned empty What/Why", "AI_EMPTY_WHY", 502);
  return safe;
}

export async function generateSkillMaterial(skillName, difficulty = "intermediate") {
  if (!genAI) {
    throw new AIGenerationError("Missing GEMINI_API_KEY env", "AI_KEY_MISSING", 502);
  }

  const prompt = `
You are a senior instructor creating structured learning content. Return ONLY a valid JSON object that matches this exact schema:

{
  "title": string,
  "difficulty": string,          // "beginner" | "intermediate" | "advanced" | "expert"
  "whatWhy": string,             // 2-4 sentences explaining what/why
  "concepts": [
    { "term": string, "definition": string }
  ],
  "steps": [string],
  "tasks": [string],
  "pitfalls": [string]
}

CRITICAL CONSTRAINTS:
1. Output MUST be valid JSON only - no markdown, no backticks, no extra text
2. All fields must be present
3. Difficulty must exactly match the input difficulty

Input:
- Skill: "${skillName}"
- Difficulty: "${difficulty}"
`.trim();

  const call = async (temp) =>
    genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
        temperature: temp
      }
    });

  try {
    const r1 = await call(0.4);
    const t1 = textFrom(r1);
    const parsed = safeParseJSON(t1) ?? extractJson(t1);
    if (!parsed) throw new AIGenerationError("AI returned non-JSON", "AI_NOT_JSON", 502);
    const normalized = normalizeMaterial(parsed, skillName, difficulty);
    return { normalized, rawJson: parsed, rawText: t1 };
  } catch (err) {
    const r2 = await call(0.3);
    const t2 = textFrom(r2);
    const parsed2 = safeParseJSON(t2) ?? extractJson(t2);
    if (!parsed2) throw err;
    const normalized2 = normalizeMaterial(parsed2, skillName, difficulty);
    return { normalized: normalized2, rawJson: parsed2, rawText: t2 };
  }
}

/* ------------------------- Topic summary generation ------------------------- */

export async function generateTopicSummary(topicName, difficulty = "intermediate") {
  if (!genAI) {
    throw new AIGenerationError("Missing GEMINI_API_KEY env", "AI_KEY_MISSING", 502);
  }

  const prompt = `
You are a subject-matter expert. Write a concise, learner-friendly summary.

Topic: "${topicName}"
Difficulty: "${difficulty}"

Include:
- A short explanation (what/why)
- 3–5 key concepts
- 2–3 real-world applications/examples
- 2–3 small practice questions/tasks

Return text in markdown format (no code fences).
`.trim();

  try {
    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "text/markdown",
        maxOutputTokens: 1024,
        temperature: 0.5
      }
    });

    const text = textFrom(result);
    if (!text) throw new AIGenerationError("No text response from Gemini", "AI_EMPTY", 502);
    return text;
  } catch (err) {
    console.error("[AI] Topic summary generation failed:", err);
    throw new AIGenerationError("Failed to generate topic summary", "AI_ERROR", 502, { cause: err.message });
  }
}
