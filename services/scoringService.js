import { generateJson, isAiAvailable } from "./aiService.js";

const buildFallbackPlan = ({ careerSnapshot, questionLimit, interviewType }) => {
  const primarySkills = careerSnapshot.skills.slice(0, 4);
  const focusAreas = primarySkills.length ? primarySkills : [careerSnapshot.careerGoal];

  return {
    title: `${careerSnapshot.careerGoal} interview`,
    targetRole: careerSnapshot.careerGoal,
    interviewType,
    interviewerStyle: "direct, technical, evidence-driven",
    questionLimit,
    primarySkills,
    focusAreas,
    rubric: [
      "Technical correctness",
      "Problem solving",
      "Communication clarity",
      "Real-world tradeoffs",
    ],
    questions: Array.from({ length: questionLimit }, (_, index) => {
      const topic = focusAreas[index % focusAreas.length] || "core fundamentals";
      return {
        questionId: `q-${index + 1}`,
        prompt: `Explain how you would handle ${topic} in a production ${careerSnapshot.careerGoal} environment. Include tradeoffs, failure modes, and how you would validate your approach.`,
        topic,
        competency: index === 0 ? "fundamentals" : "applied reasoning",
        difficulty: index < 2 ? "easy" : index < 4 ? "medium" : "hard",
        expectedSignals: [
          "Uses concrete examples",
          "Mentions tradeoffs",
          "Connects answer to real systems",
        ],
      };
    }),
  };
};

const normalizeScore = (value, fallback) => {
  const numeric = Number(value);

  if (Number.isNaN(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const sanitizePlan = (plan, fallback) => {
  const questions = Array.isArray(plan?.questions) ? plan.questions : fallback.questions;
  const normalizedQuestions = questions
    .slice(0, fallback.questionLimit)
    .map((question, index) => ({
      questionId: question?.questionId || `q-${index + 1}`,
      prompt: question?.prompt || fallback.questions[index]?.prompt || `Question ${index + 1}`,
      topic:
        question?.topic || fallback.questions[index]?.topic || fallback.focusAreas[0] || "general",
      competency:
        question?.competency ||
        fallback.questions[index]?.competency ||
        "applied reasoning",
      difficulty:
        question?.difficulty === "easy" ||
        question?.difficulty === "medium" ||
        question?.difficulty === "hard"
          ? question.difficulty
          : fallback.questions[index]?.difficulty || "medium",
      expectedSignals: Array.isArray(question?.expectedSignals)
        ? question.expectedSignals.slice(0, 5)
        : fallback.questions[index]?.expectedSignals || [],
    }));

  while (normalizedQuestions.length < fallback.questionLimit) {
    normalizedQuestions.push(fallback.questions[normalizedQuestions.length]);
  }

  return {
    title: plan?.title || fallback.title,
    targetRole: plan?.targetRole || fallback.targetRole,
    interviewType:
      plan?.interviewType === "technical_screen" ||
      plan?.interviewType === "problem_solving" ||
      plan?.interviewType === "mixed"
        ? plan.interviewType
        : fallback.interviewType,
    interviewerStyle: plan?.interviewerStyle || fallback.interviewerStyle,
    questionLimit: fallback.questionLimit,
    primarySkills: Array.isArray(plan?.primarySkills) && plan.primarySkills.length
      ? plan.primarySkills.slice(0, 6)
      : fallback.primarySkills,
    focusAreas: Array.isArray(plan?.focusAreas) && plan.focusAreas.length
      ? plan.focusAreas.slice(0, 6)
      : fallback.focusAreas,
    rubric: Array.isArray(plan?.rubric) && plan.rubric.length
      ? plan.rubric.slice(0, 6)
      : fallback.rubric,
    questions: normalizedQuestions,
  };
};

export const generateInterviewPlan = async ({
  careerSnapshot,
  questionLimit,
  interviewType,
}) => {
  const fallback = buildFallbackPlan({
    careerSnapshot,
    questionLimit,
    interviewType,
  });

  if (!isAiAvailable()) {
    return fallback;
  }

  const result = await generateJson(
    `
You are designing a premium technical interview for a hiring-grade interview simulator.
The candidate's saved career choice must be the basis for the interview.

Return STRICT JSON:
{
  "title": "...",
  "targetRole": "...",
  "interviewType": "technical_screen|problem_solving|mixed",
  "interviewerStyle": "...",
  "questionLimit": ${questionLimit},
  "primarySkills": ["..."],
  "focusAreas": ["..."],
  "rubric": ["..."],
  "questions": [
    {
      "questionId": "q-1",
      "prompt": "...",
      "topic": "...",
      "competency": "...",
      "difficulty": "easy|medium|hard",
      "expectedSignals": ["..."]
    }
  ]
}

Rules:
- Generate exactly ${questionLimit} questions.
- Keep it realistic for a live technical screening.
- Ask one question at a time later, so every prompt must stand alone.
- Prioritize the candidate's target role and the skills already saved.
- Questions must become gradually harder.
- Avoid trivia. Prefer practical engineering judgment and applied fundamentals.

Candidate profile:
Career Goal: ${careerSnapshot.careerGoal}
Skills: ${(careerSnapshot.skills || []).join(", ")}
Interest: ${careerSnapshot.interest}
Experience: ${careerSnapshot.experience}
Education: ${careerSnapshot.education}
Availability: ${careerSnapshot.availability}
Time Constraint: ${careerSnapshot.timeConstraint}
Interview Type: ${interviewType}
`,
    (rawText) => {
      const plan = fallback;
      plan.planGenerationFallback = rawText;
      return plan;
    },
  );

  return sanitizePlan(result, fallback);
};

export const evaluateQuestionAnswer = async ({
  careerSnapshot,
  targetRole,
  question,
  answer,
}) => {
  const fallback = {
    overallScore: answer.length > 120 ? 70 : 55,
    technicalAccuracy: answer.length > 120 ? 72 : 50,
    problemSolving: answer.length > 120 ? 68 : 54,
    communication: answer.length > 80 ? 75 : 58,
    strengths: ["Provided a direct answer"],
    improvementAreas: [
      "Add deeper technical detail",
      "Use a more structured explanation",
    ],
    feedback:
      "The answer addresses the question, but it needs more precision, stronger tradeoff analysis, and clearer technical depth.",
    idealAnswer:
      "A stronger answer would explain the design, justify tradeoffs, and mention validation, monitoring, and failure handling.",
    nextStepAdvice:
      "Practice answering with a simple structure: approach, tradeoffs, implementation details, and validation.",
  };

  if (!isAiAvailable()) {
    return fallback;
  }

  const result = await generateJson(
    `
You are an exacting senior interviewer scoring one answer from a premium mock interview.

Return STRICT JSON:
{
  "overallScore": number,
  "technicalAccuracy": number,
  "problemSolving": number,
  "communication": number,
  "strengths": ["..."],
  "improvementAreas": ["..."],
  "feedback": "...",
  "idealAnswer": "...",
  "nextStepAdvice": "..."
}

Scoring rules:
- Scores are 0 to 100.
- Reward correctness, concrete reasoning, tradeoffs, and production awareness.
- Penalize vague answers, incorrect claims, and lack of structure.
- Feedback must be specific to the question and answer.

Candidate target role: ${targetRole}
Candidate background:
- Career Goal: ${careerSnapshot.careerGoal}
- Skills: ${(careerSnapshot.skills || []).join(", ")}
- Experience: ${careerSnapshot.experience}

Question:
${question.prompt}

Question topic: ${question.topic}
Expected signals: ${(question.expectedSignals || []).join(", ")}

Candidate answer:
${answer}
`,
    () => fallback,
  );

  return {
    overallScore: normalizeScore(result.overallScore, fallback.overallScore),
    technicalAccuracy: normalizeScore(
      result.technicalAccuracy,
      fallback.technicalAccuracy,
    ),
    problemSolving: normalizeScore(result.problemSolving, fallback.problemSolving),
    communication: normalizeScore(result.communication, fallback.communication),
    strengths: Array.isArray(result.strengths) ? result.strengths.slice(0, 4) : fallback.strengths,
    improvementAreas: Array.isArray(result.improvementAreas)
      ? result.improvementAreas.slice(0, 4)
      : fallback.improvementAreas,
    feedback: result.feedback || fallback.feedback,
    idealAnswer: result.idealAnswer || fallback.idealAnswer,
    nextStepAdvice: result.nextStepAdvice || fallback.nextStepAdvice,
  };
};
