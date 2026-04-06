import mongoose from "mongoose";
import Module from "../models/Module.js";
import Skill from "../models/Skill.js";
import Topic from "../models/Topic.js";
import TopicProgress from "../models/TopicProgress.js";
import TopicMasteryAttempt from "../models/TopicMasteryAttempt.js";
import Test from "../models/Test.js";
import CareerChoice from "../../models/CareerChoice.js";
import CareerPlan from "../../models/CareerPlan.js";
import SkillProgress from "../../models/SkillProgress.js";
import ProjectSubmission from "../../models/ProjectSubmission.js";
import * as aiService from "../services/aiService.js";
import { generateSkillMaterial, generateTopicMasteryCheck } from "../services/aiService.js";

const startOfDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const diffInDays = (a, b) => Math.max(0, Math.ceil((startOfDay(a) - startOfDay(b)) / (1000 * 60 * 60 * 24)));

const average = (values = []) =>
  values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;

const safeJson = (value, fallback = {}) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const buildLearningNudgesForUser = async (userId) => {
  const [careerChoice, careerPlan, modules, skills, skillProgressDocs, topicProgressDocs, attempts] =
    await Promise.all([
      CareerChoice.findOne({ userId }).lean(),
      CareerPlan.findOne({ userId }).lean(),
      Module.find({ userId }).lean(),
      Skill.find({ userId }).lean(),
      SkillProgress.find({ userId }).lean(),
      TopicProgress.find({ userId }).lean(),
      TopicMasteryAttempt.find({ userId }).sort({ createdAt: -1 }).lean(),
    ]);

  const topics = await Topic.find({ moduleId: { $in: modules.map((module) => module._id) } }).lean();
  const skillProgressMap = new Map(skillProgressDocs.map((doc) => [String(doc.skillId), doc]));

  const mergedSkills = skills.map((skill) => {
    const progressDoc = skillProgressMap.get(String(skill._id));
    return {
      ...skill,
      progress: typeof progressDoc?.progress === "number" ? progressDoc.progress : 0,
      status: progressDoc?.status || "not_started",
    };
  });

  const overallSkillProgress = mergedSkills.length
    ? Math.round(mergedSkills.reduce((sum, skill) => sum + (skill.progress || 0), 0) / mergedSkills.length)
    : 0;
  const estimatedWeeks = Number(careerChoice?.careerJourney?.estimatedTimeline) || 0;
  const planStartDate = careerPlan?.createdAt || careerChoice?.createdAt || new Date();
  const elapsedDays = diffInDays(new Date(), new Date(planStartDate));
  const elapsedWeeks = Math.max(1, Math.ceil(elapsedDays / 7));
  const expectedProgress = estimatedWeeks > 0 ? Math.min(100, Math.round((elapsedWeeks / estimatedWeeks) * 100)) : 0;
  const pacingDelta = overallSkillProgress - expectedProgress;
  const pacingStatus = estimatedWeeks === 0
    ? "unbounded"
    : pacingDelta >= 10
      ? "ahead"
      : pacingDelta >= -10
        ? "on_track"
        : "behind";

  const staleInProgressSkills = mergedSkills.filter((skill) => {
    const progressDoc = skillProgressMap.get(String(skill._id));
    const lastTouched = progressDoc?.updatedAt || progressDoc?.lastAccessed || skill.updatedAt || new Date();
    return skill.status === "in_progress" && diffInDays(new Date(), new Date(lastTouched)) >= 4;
  });

  const retryQueue = attempts
    .filter((attempt) => !attempt.passed)
    .map((attempt) => {
      const topic = topics.find((item) => String(item._id) === String(attempt.topicId));
      return {
        topicId: attempt.topicId,
        topicTitle: topic?.title || "Topic",
        weakAreas: attempt.weakAreas || [],
      };
    });

  const upcomingAssessments = topics
    .map((topic) => {
      const progress = topicProgressDocs.find((doc) => String(doc.topicId) === String(topic._id));
      const payload = safeJson(topic.content);
      return {
        topicId: topic._id,
        title: topic.title,
        estimatedHours: Number(payload.estimated_hours) || 1,
        status: progress?.status || "not_started",
      };
    })
    .filter((topic) => topic.status !== "completed")
    .sort((left, right) => {
      const leftPriority = left.status === "in_progress" ? 0 : 1;
      const rightPriority = right.status === "in_progress" ? 0 : 1;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return left.estimatedHours - right.estimatedHours;
    });

  const nudges = [];
  if (staleInProgressSkills[0]) {
    nudges.push({
      key: `stale-skill:${staleInProgressSkills[0]._id}`,
      title: `${staleInProgressSkills[0].name} has gone cold`,
      message: `You started it, but there has been no new signal for at least 4 days.`,
      tone: "warning",
      link: `/career/plan/skills/${staleInProgressSkills[0]._id}`,
    });
  }
  if (retryQueue[0]) {
    nudges.push({
      key: `retry-topic:${retryQueue[0].topicId}`,
      title: `${retryQueue[0].topicTitle} needs a retry`,
      message: `This topic is blocking readiness. Focus on ${retryQueue[0].weakAreas?.[0] || "its weakest concept"} next.`,
      tone: "critical",
      link: `/career/plan/topics/${retryQueue[0].topicId}`,
    });
  }
  if (upcomingAssessments[0]) {
    nudges.push({
      key: `quick-win:${upcomingAssessments[0].topicId}`,
      title: "You have a 30-minute move available",
      message: `Open ${upcomingAssessments[0].title} and convert it into a proof attempt today.`,
      tone: "info",
      link: `/career/plan/topics/${upcomingAssessments[0].topicId}`,
    });
  }
  if (pacingStatus === "behind") {
    nudges.push({
      key: "timeline-risk",
      title: "Your timeline is under pressure",
      message: "You are behind the expected pace. This week needs completed proof, not passive review.",
      tone: "critical",
      link: "/career/plan/outlook",
    });
  }

  if (!nudges.length) {
    nudges.push({
      key: "steady-state",
      title: "No blockers detected",
      message: "Your learning system is stable right now. Use the outlook planner to keep momentum.",
      tone: "info",
      link: "/career/plan/outlook",
    });
  }

  return nudges;
};

const flattenPlanSkills = (skills) => {
  if (!skills) return [];
  if (Array.isArray(skills)) return skills.flatMap(flattenPlanSkills);
  if (typeof skills === "string") return [skills];
  if (typeof skills === "object") return Object.values(skills).flatMap(flattenPlanSkills);
  return [];
};

export const getLearningDashboard = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const [careerChoice, careerPlan, modules, skills, skillProgressDocs, topicProgressDocs, submissions, attempts] =
      await Promise.all([
        CareerChoice.findOne({ userId }).lean(),
        CareerPlan.findOne({ userId }).lean(),
        Module.find({ userId }).sort({ updatedAt: -1 }).lean(),
        Skill.find({ userId }).sort({ updatedAt: -1 }).lean(),
        SkillProgress.find({ userId }).lean(),
        TopicProgress.find({ userId }).lean(),
        ProjectSubmission.find({ userId }).lean(),
        TopicMasteryAttempt.find({ userId }).sort({ createdAt: -1 }).lean(),
      ]);

    const moduleObjectIds = modules.map((module) => module._id);
    const [topics, tests] = await Promise.all([
      Topic.find({ moduleId: { $in: moduleObjectIds } }).lean(),
      Test.find({ moduleId: { $in: moduleObjectIds } }).lean(),
    ]);

    const moduleMap = new Map(modules.map((module) => [String(module._id), module]));
    const skillProgressMap = new Map(skillProgressDocs.map((doc) => [String(doc.skillId), doc]));
    const topicProgressMap = new Map(topicProgressDocs.map((doc) => [String(doc.topicId), doc]));

    const mergedSkills = skills.map((skill) => {
      const progressDoc = skillProgressMap.get(String(skill._id));
      return {
        ...skill,
        progress: typeof progressDoc?.progress === "number" ? progressDoc.progress : 0,
        status: progressDoc?.status || "not_started",
      };
    });

    const topicsBySkill = topics.reduce((acc, topic) => {
      const key = String(topic.skillId || "");
      if (!acc[key]) acc[key] = [];
      acc[key].push(topic);
      return acc;
    }, {});
    const topicsById = new Map(topics.map((topic) => [String(topic._id), topic]));
    const attemptsByTopicId = attempts.reduce((acc, attempt) => {
      const key = String(attempt.topicId || "");
      if (!acc[key]) acc[key] = [];
      acc[key].push(attempt);
      return acc;
    }, {});
    const attemptsBySkillId = attempts.reduce((acc, attempt) => {
      const key = String(attempt.skillId || "");
      if (!acc[key]) acc[key] = [];
      acc[key].push(attempt);
      return acc;
    }, {});

    const overallSkillProgress = mergedSkills.length
      ? Math.round(mergedSkills.reduce((sum, skill) => sum + (skill.progress || 0), 0) / mergedSkills.length)
      : 0;

    const completedSkills = mergedSkills.filter((skill) => skill.status === "completed").length;
    const inProgressSkills = mergedSkills.filter((skill) => skill.status === "in_progress").length;
    const notStartedSkills = mergedSkills.filter((skill) => skill.status === "not_started").length;
    const completedTopics = topicProgressDocs.filter((topic) => topic.status === "completed").length;
    const inProgressTopics = topicProgressDocs.filter((topic) => topic.status === "in_progress").length;

    const estimatedWeeks = Number(careerChoice?.careerJourney?.estimatedTimeline) || 0;
    const planStartDate = careerPlan?.createdAt || careerChoice?.createdAt || new Date();
    const elapsedDays = diffInDays(new Date(), new Date(planStartDate));
    const elapsedWeeks = Math.max(1, Math.ceil(elapsedDays / 7));
    const expectedProgress = estimatedWeeks > 0 ? Math.min(100, Math.round((elapsedWeeks / estimatedWeeks) * 100)) : 0;
    const pacingDelta = overallSkillProgress - expectedProgress;
    const pacingStatus = estimatedWeeks === 0
      ? "unbounded"
      : pacingDelta >= 10
        ? "ahead"
        : pacingDelta >= -10
          ? "on_track"
          : "behind";

    const moduleProgress = modules.map((module) => {
      const moduleSkills = mergedSkills.filter((skill) => String(skill.moduleId) === String(module._id));
      const avgProgress = moduleSkills.length
        ? Math.round(moduleSkills.reduce((sum, skill) => sum + (skill.progress || 0), 0) / moduleSkills.length)
        : 0;

      return {
        moduleId: module._id,
        title: module.title,
        skillsCount: moduleSkills.length,
        completedSkills: moduleSkills.filter((skill) => skill.status === "completed").length,
        inProgressSkills: moduleSkills.filter((skill) => skill.status === "in_progress").length,
        averageProgress: avgProgress,
      };
    });

    const difficultyBreakdown = ["beginner", "intermediate", "advanced", "soft_skills"].map((difficulty) => {
      const bucket = mergedSkills.filter((skill) => skill.difficulty === difficulty);
      return {
        difficulty,
        total: bucket.length,
        completed: bucket.filter((skill) => skill.status === "completed").length,
        averageProgress: bucket.length
          ? Math.round(bucket.reduce((sum, skill) => sum + (skill.progress || 0), 0) / bucket.length)
          : 0,
      };
    });

    const activityMap = new Map();
    [...skillProgressDocs, ...topicProgressDocs].forEach((doc) => {
      const date = startOfDay(new Date(doc.updatedAt || doc.lastAccessed || new Date())).toISOString().slice(0, 10);
      activityMap.set(date, (activityMap.get(date) || 0) + 1);
    });

    const activity = Array.from({ length: 14 }).map((_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (13 - index));
      const key = startOfDay(date).toISOString().slice(0, 10);
      return { date: key, count: activityMap.get(key) || 0 };
    });

    const focusSkills = mergedSkills
      .map((skill) => {
        const topicList = topicsBySkill[String(skill._id)] || [];
        const topicCompletionCount = topicList.filter((topic) => {
          const progress = topicProgressMap.get(String(topic._id));
          return progress?.status === "completed";
        }).length;

        return {
          id: skill._id,
          name: skill.name,
          moduleTitle: moduleMap.get(String(skill.moduleId))?.title || "Module",
          difficulty: skill.difficulty,
          progress: skill.progress || 0,
          status: skill.status,
          topicCount: topicList.length,
          topicCompletionRate: topicList.length ? Math.round((topicCompletionCount / topicList.length) * 100) : 0,
          updatedAt: skill.updatedAt,
        };
      })
      .sort((a, b) => (b.progress === a.progress ? new Date(b.updatedAt) - new Date(a.updatedAt) : a.progress - b.progress))
      .slice(0, 6);

    const skillActionRows = mergedSkills
      .map((skill) => {
        const topicList = topicsBySkill[String(skill._id)] || [];
        const attemptList = attemptsBySkillId[String(skill._id)] || [];
        const latestAttempt = attemptList[0] || null;
        const avgEstimatedHours = average(
          topicList.map((topic) => Number(safeJson(topic.content).estimated_hours) || 0).filter(Boolean),
        );
        const weakAreas = latestAttempt?.weakAreas || [];
        return {
          id: skill._id,
          name: skill.name,
          moduleTitle: moduleMap.get(String(skill.moduleId))?.title || "Module",
          difficulty: skill.difficulty,
          progress: skill.progress || 0,
          status: skill.status,
          attemptCount: attemptList.length,
          latestScore: latestAttempt?.score ?? null,
          weakAreas,
          estimatedHours: avgEstimatedHours || 2,
          topicCount: topicList.length,
          incompleteTopics: topicList.filter((topic) => topicProgressMap.get(String(topic._id))?.status !== "completed").length,
          updatedAt: skill.updatedAt,
        };
      })
      .sort((left, right) => {
        const leftRank = left.status === "in_progress" ? 0 : left.status === "not_started" ? 1 : 2;
        const rightRank = right.status === "in_progress" ? 0 : right.status === "not_started" ? 1 : 2;
        if (leftRank !== rightRank) return leftRank - rightRank;
        return (left.progress || 0) - (right.progress || 0);
      });

    const retryQueue = attempts
      .filter((attempt) => !attempt.passed)
      .map((attempt) => {
        const topic = topicsById.get(String(attempt.topicId));
        const skill = mergedSkills.find((item) => String(item._id) === String(attempt.skillId));
        return {
          id: attempt._id,
          topicId: attempt.topicId,
          topicTitle: topic?.title || "Topic",
          skillId: attempt.skillId,
          skillName: skill?.name || "Skill",
          score: attempt.score,
          weakAreas: attempt.weakAreas || [],
          createdAt: attempt.createdAt,
        };
      })
      .slice(0, 8);

    const weakTopics = topics
      .map((topic) => {
        const progress = topicProgressMap.get(String(topic._id));
        const topicAttempts = attemptsByTopicId[String(topic._id)] || [];
        const latestAttempt = topicAttempts[0] || null;
        return {
          topicId: topic._id,
          title: topic.title,
          skillId: topic.skillId,
          skillName: mergedSkills.find((skill) => String(skill._id) === String(topic.skillId))?.name || "Skill",
          status: progress?.status || "not_started",
          progress: progress?.progress || 0,
          latestScore: latestAttempt?.score ?? null,
          attempts: topicAttempts.length,
          weakAreas: latestAttempt?.weakAreas || [],
          lastAttemptedAt: latestAttempt?.createdAt || progress?.updatedAt || null,
        };
      })
      .filter((topic) => topic.status !== "completed")
      .sort((left, right) => {
        const leftScore = left.latestScore ?? -1;
        const rightScore = right.latestScore ?? -1;
        if (leftScore !== rightScore) return leftScore - rightScore;
        return (left.progress || 0) - (right.progress || 0);
      })
      .slice(0, 8);

    const upcomingAssessments = topics
      .map((topic) => {
        const progress = topicProgressMap.get(String(topic._id));
        const topicAttempts = attemptsByTopicId[String(topic._id)] || [];
        const payload = safeJson(topic.content);
        return {
          topicId: topic._id,
          title: topic.title,
          skillId: topic.skillId,
          skillName: mergedSkills.find((skill) => String(skill._id) === String(topic.skillId))?.name || "Skill",
          estimatedHours: Number(payload.estimated_hours) || 1,
          status: progress?.status || "not_started",
          attempts: topicAttempts.length,
          objective: Array.isArray(payload.objectives) ? payload.objectives[0] || "" : "",
        };
      })
      .filter((topic) => topic.status !== "completed")
      .sort((left, right) => {
        const leftPriority = left.status === "in_progress" ? 0 : 1;
        const rightPriority = right.status === "in_progress" ? 0 : 1;
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        return left.attempts - right.attempts;
      })
      .slice(0, 6);

    const decayRiskTopics = topics
      .map((topic) => {
        const progress = topicProgressMap.get(String(topic._id));
        const topicAttempts = attemptsByTopicId[String(topic._id)] || [];
        const latestAttempt = topicAttempts[0] || null;
        const lastSeen = latestAttempt?.createdAt || progress?.updatedAt || progress?.lastAccessed || null;
        return {
          topicId: topic._id,
          title: topic.title,
          skillName: mergedSkills.find((skill) => String(skill._id) === String(topic.skillId))?.name || "Skill",
          latestScore: latestAttempt?.score ?? null,
          daysSinceReview: lastSeen ? diffInDays(new Date(), new Date(lastSeen)) : null,
        };
      })
      .filter((topic) => topic.daysSinceReview != null && topic.daysSinceReview >= 7)
      .sort((left, right) => (right.daysSinceReview || 0) - (left.daysSinceReview || 0))
      .slice(0, 6);

    const submittedProjectTitles = new Set(submissions.map((submission) => submission.projectTitle));
    const projectQueue = (careerPlan?.plan?.projects || []).map((project, index) => ({
      id: `${project.name || project.title || "project"}-${index}`,
      name: project.name || project.title || `Project ${index + 1}`,
      difficulty: project.difficulty || project.level || "Intermediate",
      description: project.description || "",
      expectedOutcome: project.expected_outcome || "",
      focusSkills: project.focus_skills || [],
      submitted: submittedProjectTitles.has(project.name || project.title || ""),
    }));

    const recommendedResources = Object.entries(careerPlan?.plan?.resources || {}).map(([category, items]) => ({
      category,
      items: Array.isArray(items) ? items : [],
    }));

    const allPlanSkills = flattenPlanSkills(careerPlan?.plan?.skills);
    const readinessScore = careerPlan?.plan?.analytics?.readinessScore || overallSkillProgress;
    const currentWeekSkills = skillProgressDocs.filter((doc) => diffInDays(new Date(), new Date(doc.updatedAt || doc.createdAt || new Date())) <= 7);
    const streakDays = activity.reduceRight((streak, day) => {
      if (streak !== activity.length && day.count === 0) return streak;
      if (day.count === 0) return streak;
      return streak + 1;
    }, 0);
    const weeklySkillScore = Math.min(
      100,
      Math.round(
        Math.min(60, currentWeekSkills.length * 12) +
          Math.min(40, average(attempts.filter((attempt) => diffInDays(new Date(), new Date(attempt.createdAt)) <= 7).map((attempt) => attempt.score || 0)) / 2.5),
      ),
    );
    const masteryMilestones = {
      completedSkills,
      proofUnlocked: attempts.filter((attempt) => attempt.passed).length,
      modulesClosed: moduleProgress.filter((module) => module.skillsCount > 0 && module.completedSkills === module.skillsCount).length,
    };

    const priorities = skillActionRows.slice(0, 3).map((skill, index) => ({
      rank: index + 1,
      skillId: skill.id,
      skillName: skill.name,
      moduleTitle: skill.moduleTitle,
      hoursNeeded: Math.max(1, Math.min(6, skill.estimatedHours * Math.max(1, skill.incompleteTopics || 1))),
      reason:
        skill.status === "in_progress"
          ? `Already in motion. Finish the incomplete topics before context decays.`
          : skill.latestScore != null && skill.latestScore < 70
            ? `Recent assessment signal is weak. Close ${skill.weakAreas[0] || "the weakest concept"} first.`
            : `This is one of the highest leverage unopened skills for the current roadmap.`,
    }));

    const quickWinTopic = upcomingAssessments[0] || weakTopics[0] || null;
    const weeklyPlan = {
      priorities,
      expectedHoursNeeded: priorities.reduce((sum, item) => sum + item.hoursNeeded, 0),
      riskLevel: pacingStatus === "behind" ? "high" : pacingStatus === "on_track" ? "moderate" : "low",
      riskWarning:
        pacingStatus === "behind"
          ? "You are behind the timeline. This week has to convert directly into completed proof, not passive reading."
          : pacingStatus === "on_track"
            ? "You are on pace, but one skipped week will push the forecast off target."
            : "You have buffer. Use it to turn weak topics into durable proof.",
      quickWin:
        quickWinTopic
          ? {
              topicId: quickWinTopic.topicId,
              title: quickWinTopic.title,
              skillName: quickWinTopic.skillName,
              prompt: `If you only have 30 minutes today, open ${quickWinTopic.title} and complete one study block plus the mastery check.`,
            }
          : null,
    };

    const nudges = [];
    const staleInProgressSkills = skillActionRows.filter(
      (skill) => skill.status === "in_progress" && diffInDays(new Date(), new Date(skill.updatedAt || new Date())) >= 4,
    );
    if (staleInProgressSkills[0]) {
      nudges.push({
        id: "stale-skill",
        tone: "warning",
        title: `${staleInProgressSkills[0].name} has gone cold`,
        message: `You started it, but there has been no new signal for ${diffInDays(new Date(), new Date(staleInProgressSkills[0].updatedAt || new Date()))} days.`,
      });
    }
    if (retryQueue[0]) {
      nudges.push({
        id: "retry-queue",
        tone: "critical",
        title: `${retryQueue.length} retry topic${retryQueue.length > 1 ? "s are" : " is"} blocking readiness`,
        message: `Start with ${retryQueue[0].topicTitle} and focus on ${retryQueue[0].weakAreas?.[0] || "the weakest concept"}.`,
      });
    }
    if (quickWinTopic) {
      nudges.push({
        id: "quick-win",
        tone: "info",
        title: "You have a 30-minute move available",
        message: weeklyPlan.quickWin?.prompt || "",
      });
    }
    if (!nudges.length) {
      nudges.push({
        id: "steady-state",
        tone: "info",
        title: "No blockers detected",
        message: "Keep compounding on the current roadmap. Your next best move is already visible in the planner.",
      });
    }

    return res.json({
      summary: {
        readinessScore,
        currentProgress: overallSkillProgress,
        expectedProgress,
        pacingStatus,
        estimatedWeeks: estimatedWeeks || null,
        elapsedWeeks,
        daysToGoal: estimatedWeeks ? Math.max(0, estimatedWeeks * 7 - elapsedDays) : null,
      },
      goal: {
        targetRole: careerChoice?.careerJourney?.targetRole || careerChoice?.careergoal || careerPlan?.plan?.targetRole || null,
        availability: careerChoice?.availabilty || null,
        timeline: careerChoice?.timeconstraint || null,
      },
      counts: {
        modules: modules.length,
        skills: mergedSkills.length || allPlanSkills.length,
        topics: topics.length,
        tests: tests.length,
        completedSkills,
        inProgressSkills,
        notStartedSkills,
        completedTopics,
        inProgressTopics,
        projectsSubmitted: submissions.length,
      },
      moduleProgress,
      difficultyBreakdown,
      activity,
      focusSkills,
      projectQueue,
      recommendedResources,
      weeklyPlan,
      reviewCenter: {
        weakTopics,
        retryQueue,
        upcomingAssessments,
        decayRiskTopics,
      },
      completionSignals: {
        streakDays,
        weeklySkillScore,
        masteryMilestones,
        moduleRewards: moduleProgress
          .filter((module) => module.skillsCount > 0 && module.completedSkills === module.skillsCount)
          .map((module) => ({
            moduleId: module.moduleId,
            title: module.title,
            reward: `${module.title} is fully closed. Use it as a confidence checkpoint and portfolio proof bank.`,
          })),
      },
      nudges,
      needModes: [
        {
          id: "default",
          label: "Roadmap mode",
          description: "Follow the normal roadmap order with the current recommendation bias.",
        },
        {
          id: "interview_7d",
          label: "Interview in 7 days",
          description: "Prioritize evidence, weak-topic repair, and fast revision.",
        },
        {
          id: "portfolio_project",
          label: "Build portfolio project",
          description: "Push implementation-heavy skills and project-linked proof first.",
        },
        {
          id: "internship",
          label: "Learn for internship",
          description: "Favor fundamentals, execution velocity, and common task readiness.",
        },
        {
          id: "revision_only",
          label: "Revision only",
          description: "Focus on decay-risk topics and retry queues instead of new material.",
        },
      ],
    });
  } catch (err) {
    console.error("getLearningDashboard error", err);
    return res.status(500).json({ message: err.message || "Failed to fetch learning dashboard" });
  }
};

export const getLearningOpsDashboard = async (_req, res) => {
  try {
    const [skills, skillProgressDocs, topics, attempts] = await Promise.all([
      Skill.find({}).lean(),
      SkillProgress.find({}).lean(),
      Topic.find({}).lean(),
      TopicMasteryAttempt.find({}).sort({ createdAt: -1 }).lean(),
    ]);

    const topicsBySkill = topics.reduce((acc, topic) => {
      const key = String(topic.skillId || "");
      if (!acc[key]) acc[key] = [];
      acc[key].push(topic);
      return acc;
    }, {});

    const attemptsBySkillId = attempts.reduce((acc, attempt) => {
      const key = String(attempt.skillId || "");
      if (!acc[key]) acc[key] = [];
      acc[key].push(attempt);
      return acc;
    }, {});

    const startedButAbandoned = skillProgressDocs.filter(
      (doc) => doc.status === "in_progress" && diffInDays(new Date(), new Date(doc.updatedAt || doc.lastAccessed || new Date())) >= 7,
    );
    const skillsMissingTopics = skills.filter((skill) => (topicsBySkill[String(skill._id)] || []).length === 0);
    const topicsMissingAssessments = topics.filter((topic) => !topic.generatedContent?.masteryCheck?.questions?.length);
    const startedTopics = skillProgressDocs.filter((doc) => doc.status !== "not_started").length;
    const assessedTopics = new Set(attempts.map((attempt) => String(attempt.topicId))).size;
    const passRateBySkill = skills
      .map((skill) => {
        const skillAttempts = attemptsBySkillId[String(skill._id)] || [];
        return {
          skillId: skill._id,
          skillName: skill.name,
          attempts: skillAttempts.length,
          passRate: skillAttempts.length
            ? Math.round((skillAttempts.filter((attempt) => attempt.passed).length / skillAttempts.length) * 100)
            : 0,
        };
      })
      .filter((row) => row.attempts > 0)
      .sort((left, right) => left.passRate - right.passRate)
      .slice(0, 10);

    const weakConceptMap = new Map();
    attempts.forEach((attempt) => {
      (attempt.weakAreas || []).forEach((area) => {
        weakConceptMap.set(area, (weakConceptMap.get(area) || 0) + 1);
      });
    });

    return res.json({
      summary: {
        startedButAbandonedSkills: startedButAbandoned.length,
        topicGenerationBacklog: skillsMissingTopics.length,
        assessmentCoverageGap: topicsMissingAssessments.length,
        assessmentCompletionRate: startedTopics ? Math.round((assessedTopics / startedTopics) * 100) : 0,
      },
      backlog: {
        skillsMissingTopics: skillsMissingTopics.slice(0, 10).map((skill) => ({
          skillId: skill._id,
          skillName: skill.name,
        })),
        topicsMissingAssessments: topicsMissingAssessments.slice(0, 10).map((topic) => ({
          topicId: topic._id,
          topicTitle: topic.title,
        })),
      },
      passRateBySkill,
      weakConcepts: Array.from(weakConceptMap.entries())
        .map(([concept, count]) => ({ concept, count }))
        .sort((left, right) => right.count - left.count)
        .slice(0, 12),
    });
  } catch (err) {
    console.error("getLearningOpsDashboard error", err);
    return res.status(500).json({ message: err.message || "Failed to fetch ops dashboard" });
  }
};

export const createModule = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const module = await Module.create({ ...req.body, userId });
    res.status(201).json(module);
  } catch (err) {
    console.log(err);
    
    res.status(400).json({ message: err.message });
  }
};;

export const getModules = async (req, res) => {
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
};;

export const getModule = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const module = await Module.findOne({ _id: req.params.id, userId }).lean();
    if (!module) return res.status(404).json({ message: 'Module not found' });
    res.json(module);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};;

export const updateModule = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const module = await Module.findOneAndUpdate({ _id: req.params.id, userId }, req.body, { new: true });
    if (!module) return res.status(404).json({ message: 'Module not found' });
    res.json(module);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};;

export const deleteModule = async (req, res) => {
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
};;

// AI generated learning path for module
export const generateModulePath = async (req, res) => {
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
};;

export const precomputeModuleContent = async (req, res) => {
  try {
    const userId = req.user?.id || req.query.userId;
    const { moduleId } = req.params;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      return res.status(400).json({ message: "Invalid moduleId" });
    }

    const skills = await Skill.find({ moduleId, userId });
    const topics = await Topic.find({ moduleId });

    let generatedSkills = 0;
    let generatedChecks = 0;

    for (const skill of skills) {
      if (!skill.generatedContent?.studyMaterialJson) {
        const { normalized, rawText } = await generateSkillMaterial(skill.name, skill.difficulty);
        skill.generatedContent = {
          ...(skill.generatedContent || {}),
          studyMaterialJson: normalized,
          studyMaterialText: rawText,
        };
        await skill.save();
        generatedSkills += 1;
      }
    }

    for (const topic of topics) {
      if (!topic.generatedContent?.masteryCheck?.questions?.length) {
        const parentSkill = skills.find((skill) => String(skill._id) === String(topic.skillId));
        const masteryCheck = await generateTopicMasteryCheck({
          topicTitle: topic.title,
          topicContent:
            typeof topic.content === "string" ? topic.content : JSON.stringify(topic.content || {}),
          skillName: parentSkill?.name || "",
          difficulty: parentSkill?.difficulty || "intermediate",
        });

        topic.generatedContent = {
          ...(topic.generatedContent || {}),
          masteryCheck,
        };
        await topic.save();
        generatedChecks += 1;
      }
    }

    return res.json({
      message: "Module AI content precomputed",
      generatedSkills,
      generatedChecks,
    });
  } catch (err) {
    console.error("precomputeModuleContent error", err);
    return res.status(500).json({ message: err.message || "Failed to precompute module content" });
  }
};
