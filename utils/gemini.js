
// const { GoogleGenAI } = require("@google/genai");
// const { mockAIResponse } = require("./aiWrapper");

// const genAI = new GoogleGenAI({
//   apiKey: process.env.GEMINI_API_KEY,
// });

// async function generateCareerPlan(userChoice) {
//   try {
// //  const prompt = `
// // You're an AI career planner. Based on the user's input below, return a clean **JSON object** with the following structure, ensuring each field is non-empty and consistently formatted:

// // {
// //   "skills": {
// //     "technical": [string],
// //     "soft_skills": [string]
// //   },
// //   "roadmap": [
// //     {
// //       "phase": "string", // e.g., "Phase 1: Foundation"
// //       "description": "string",
// //       "tasks": [string]
// //     }
// //   ],
// //   "projects": [
// //     {
// //       "name": "string",
// //       "description": "string",
// //       "focus_skills": [string]
// //     }
// //   ],
// //   "resources": {
// //     "online_courses": [string],
// //     "books": [string],
// //     "tools": [string],
// //     "communities": [string]
// //   }
// // }

// // 🧠 Return only a properly structured JSON object. Avoid nesting arrays unnecessarily (e.g., do not use roadmap: { phases: [...] } – use roadmap: [...] directly).

// // 📌 Ensure:
// // - All arrays are filled with at least 2-3 relevant entries.
// // - Use fallback suggestions if user input is vague or minimal.
// // - Avoid null/undefined/empty values – always return meaningful defaults.

// // Tailor the response to help the user become: **${userChoice.careergoal || 'a successful professional'}**

// // Input:
// // ${JSON.stringify(userChoice, null, 2)}
// // `.trim();
// const prompt = `
// You are an **AI Career Mentor, Industry Expert, and Project Manager**.  
// Your job is to generate a **step-by-step, JSON-structured career plan** that is **personalized, actionable, and realistic**.

// 📌 OUTPUT FORMAT:
// Return **only valid JSON** with the following schema (no extra text, no markdown fences):

// {
//   "skills": {
//     "foundation": [string],        // essential beginner skills
//     "intermediate": [string],      // mid-level skills
//     "advanced": [string],          // expert-level skills
//     "soft_skills": [string]        // communication, teamwork, problem solving, etc.
//   },
//   "roadmap": [
//     {
//       "phase": "string",           // e.g., "Phase 1: Foundations"
//       "duration_weeks": number,    // realistic time (2–12 weeks)
//       "description": "string",     // what to achieve in this phase
//       "milestones": [string],      // 3–5 measurable outcomes
//       "tools_to_focus": [string]   // specific tools/libraries/platforms
//     }
//   ],
//   "projects": [
//     {
//       "name": "string",            // project title
//       "difficulty": "Beginner | Intermediate | Advanced",
//       "description": "string",     // what the project involves
//       "focus_skills": [string],    // skills practiced
//       "expected_outcome": "string" // what user will gain (portfolio, proof of skill, etc.)
//     }
//   ],
//   "resources": {
//     "online_courses": [string],    // at least 3
//     "books": [string],             // at least 2
//     "tools": [string],             // software/tools to master
//     "communities": [string]        // forums, Discords, subreddits, meetups
//   },
//   "career_outlook": {
//     "roles": [string],             // e.g., "Data Scientist", "ML Engineer"
//     "salary_range": "string",      // general global salary range
//     "industry_trends": [string]    // 2–3 trends shaping the field
//   },
//   "note": "string"                 // fallback/explanation if input is vague
// }

// ---

// 🎯 RULES:
// 1. **Always fill every field** with at least 2–3 meaningful items (never empty, null, or placeholder).
// 2. Ensure **projects escalate** from beginner → intermediate → advanced.
// 3. Roadmap must have **minimum 3 phases**, each with realistic duration.
// 4. Tailor **skills, roadmap, and projects** to align with the user’s input (career goal, background, interests).
// 5. If input is vague, generate a **general but still practical plan**.
// 6. Write all text in **clear, concise, professional English**.
// 7. Do not wrap output in markdown or explanation. Return JSON only.

// ---

// 👤 USER INPUT:
// ${JSON.stringify(userChoice, null, 2)}

// ⚡ Your goal: Help this user become a **${userChoice.careergoal || 'successful professional'}**. 
// `.trim();


//     const result = await genAI.models.generateContent({
//       model: "gemini-2.5-flash",
//       contents: [{ role: "user", parts: [{ text: prompt }] }],
//     });

//     const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

//     if (!text) {
//       throw new Error("No text response from Gemini");
//     }

//     console.log("🔍 Gemini raw response:", text);

//     // 🧼 Clean Gemini markdown code block output
//     const cleaned = text
//       .replace(/^```(?:json)?\s*/i, '')  // Remove opening ```
//       .replace(/\s*```$/, '')           // Remove closing ```
//       .trim();

//     try {
//       return typeof cleaned === "string" ? JSON.parse(cleaned) : cleaned;

//     } catch {
//       console.warn("⚠️ Gemini returned non-JSON. Falling back to mock.");
//       return mockAIResponse(userChoice);
//     }
//   } catch (err) {
//     console.error("❌ Gemini API failed. Falling back to mock.", err.message);
//     return mockAIResponse(userChoice);
//   }
// }

// module.exports = { generateCareerPlan };



const { GoogleGenAI } = require("@google/genai");
const { mockAIResponse } = require("./aiWrapper");

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ✅ Strict default structure for fallback safety
function defaultPlan(userChoice) {
  return {
    skills: {
      foundation: ["Python Basics", "SQL Basics"],
      intermediate: ["Data Analysis with Pandas", "Machine Learning Basics"],
      advanced: ["Deep Learning", "Model Deployment"],
      soft_skills: ["Problem Solving", "Communication", "Teamwork"]
    },
    roadmap: [
      {
        phase: "Phase 1: Foundations",
        duration_weeks: 6,
        description: "Learn core programming and data skills.",
        milestones: ["Complete Python crash course", "Practice SQL queries"],
        tools_to_focus: ["Python", "PostgreSQL"]
      }
    ],
    projects: [
      {
        name: "Simple Data Analysis",
        difficulty: "Beginner",
        description: "Analyze a dataset and present insights.",
        focus_skills: ["EDA", "Visualization"],
        expected_outcome: "Portfolio-ready Jupyter notebook"
      }
    ],
    resources: {
      online_courses: ["Google Data Analytics (Coursera)"],
      books: ["Hands-On Machine Learning by Aurélien Géron"],
      tools: ["Python", "Jupyter Notebook", "GitHub"],
      communities: ["Kaggle", "Stack Overflow"]
    },
    career_outlook: {
      roles: ["Data Analyst", "Junior Data Scientist"],
      salary_range: "$50k–$80k (entry-level, varies by region)",
      industry_trends: ["AI adoption", "Cloud-first workflows"]
    },
    note: "This is a fallback plan since AI output was invalid or incomplete."
  };
}

async function generateCareerPlan(userChoice) {
  try {
    const prompt = `
You are an **AI Career Mentor, Industry Expert, and Project Manager**.  
Your job is to generate a **step-by-step, JSON-structured career plan** that is **personalized, actionable, and realistic**.

📌 OUTPUT FORMAT:
Return **only valid JSON** with the following schema (no extra text, no markdown fences):

{
  "skills": {
    "foundation": [string],
    "intermediate": [string],
    "advanced": [string],
    "soft_skills": [string]
  },
  "roadmap": [
    {
      "phase": "string",
      "duration_weeks": number,
      "description": "string",
      "milestones": [string],
      "tools_to_focus": [string]
    }
  ],
  "projects": [
    {
      "name": "string",
      "difficulty": "Beginner | Intermediate | Advanced",
      "description": "string",
      "focus_skills": [string],
      "expected_outcome": "string"
    }
  ],
  "resources": {
    "online_courses": [string],
    "books": [string],
    "tools": [string],
    "communities": [string]
  },
  "career_outlook": {
    "roles": [string],
    "salary_range": "string",
    "industry_trends": [string]
  },
  "note": "string"
}

---

🎯 RULES:
1. Always fill every field with at least 2–3 meaningful items (never empty, null, or placeholder).
2. Ensure projects escalate from Beginner → Intermediate → Advanced.
3. Roadmap must have at least 3 phases with realistic durations.
4. Tailor skills, roadmap, and projects to align with the user’s input.
5. If input is vague, generate a general but still practical plan.
6. Return JSON only, no markdown fences or extra text.

👤 USER INPUT:
${JSON.stringify(userChoice, null, 2)}

⚡ Your goal: Help this user become a **${userChoice.careergoal || 'successful professional'}**. 
    `.trim();

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No text response from Gemini");
    }

    console.log("🔍 Gemini raw response:", text);

    // 🧼 Clean potential markdown wrapping
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.warn("⚠️ Gemini returned non-JSON, using mock.");
      return mockAIResponse(userChoice);
    }

    // ✅ Validate structure (basic checks)
    if (!parsed.skills || !parsed.roadmap || !parsed.projects || !parsed.resources) {
      console.warn("⚠️ Incomplete plan detected, falling back to default.");
      return defaultPlan(userChoice);
    }

    return parsed;
  } catch (err) {
    console.error("❌ Gemini API failed, using fallback:", err.message);
    return defaultPlan(userChoice);
  }
}

module.exports = { generateCareerPlan };
