const CareerChoice = require("../models/CareerChoice");
const CareerPlan = require("../models/CareerPlan");
const SkillProgress = require("../models/SkillProgress");
const ProjectSubmission = require("../models/ProjectSubmission");
const RoadmapProgress = require("../models/RoadmapProgress");
const Certificate = require("../models/Certificate");
const { bootstrapFromPlanForUser } = require("../learning/services/bootstrapService");

const { generateCareerPlan } = require("../utils/gemini"); // renamed for clarity

// ✅ 1. Save career choice
exports.chooseCareer = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      interest,
      skills,
      education,
      experience,
      careergoal,
      timeconstraint,
      availabilty,
    } = req.body;

    // Validation (optional)
    if (!interest || !skills || !education || !experience || !careergoal || !timeconstraint || !availabilty) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const choice = await CareerChoice.findOneAndUpdate(
      { userId },
      {
        interest,
        skills,
        education,
        experience,
        careergoal,
        timeconstraint,
        availabilty,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ message: "Career choice saved", choice });
  } catch (err) {
    console.error("❌ Error saving career choice:", err);
    res.status(500).json({ message: "Error saving career choice" });
  }
};


// ✅ 2. Get status
exports.getCareerStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const choice = await CareerChoice.findOne({ userId }).populate({
      path: 'userId',
      select: 'username' // Only bring the name
    });

    if (!choice) return res.status(200).json({ status: 'not_chosen' });

    res.status(200).json({
      status: 'chosen',
      choice,
      user: choice.userId?.username || 'User'
    });
  } catch (err) {
    console.error('❌ Error fetching career status:', err);
    res.status(500).json({ message: 'Error fetching career status' });
  }
};


// ✅ 3. Generate career plan

exports.generatePlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const userChoice = await CareerChoice.findOne({ userId });
    if (!userChoice)
      return res.status(404).json({ message: "Career choice not found" });

    const planObject = await generateCareerPlan(userChoice); // Already parsed JSON

    // Log or debug structure
    console.log("✅ Parsed Gemini Plan:", JSON.stringify(planObject, null, 2));

    // Optional: validate structure here (e.g., skills, roadmap exist)
    if (!planObject.skills || !planObject.roadmap || !planObject.projects) {
      return res.status(400).json({ message: "Invalid plan structure" });
    }

    const saved = await CareerPlan.findOneAndUpdate(
  { userId },
  { plan: planObject },
  { upsert: true, new: true } // 🔥 upsert = create if not exists, new = return updated doc
);

    res.status(201).json({ message: "Career plan generated", plan: saved.plan });
  } catch (err) {
    console.error("❌ AI Gen Error:", err);
    res.status(500).json({ message: "Error generating career plan" });
  }
};



// ✅ 4. Get plan
exports.getPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const plan = await CareerPlan.findOne({ userId });
    console.log("the one i am returning in get method", plan.plan);
    
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.status(200).json(plan.plan);
  } catch (err) {
    console.error("❌ Error fetching plan:", err);
    res.status(500).json({ message: "Error fetching plan" });
  }
};

// ✅ 5. Update skill progress
exports.updateSkill = async (req, res) => {
  try {
    const userId = req.user.id;
    const { skillName, status } = req.body;

    if (!["not_started", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid skill status" });
    }

    const updated = await SkillProgress.findOneAndUpdate(
      { userId, skillName },
      { status, updatedAt: Date.now() },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Skill status updated", skill: updated });
  } catch (err) {
    console.error("❌ Error updating skill:", err);
    res.status(500).json({ message: "Error updating skill status" });
  }
};
// PUT /api/career/choice
exports.updateCareerChoice = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    // Update career choice & reset journeyStarted
    const updated = await CareerChoice.findOneAndUpdate(
      { userId },
      { ...updateData, journeyStarted: false },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Career choice not found" });
    }

    // Delete all certificates for the user to reset certificate list
    await Certificate.deleteMany({ userId });

    res.status(200).json({ 
      message: "Career choice updated and certificates reset", 
      choice: updated 
    });
  } catch (err) {
    console.error("❌ Error updating career choice:", err);
    res.status(500).json({ message: "Error updating career choice" });
  }
};



// ✅ 6. Submit a project
exports.submitProject = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectTitle, githubLink } = req.body;

    if (!projectTitle || !githubLink) {
      return res.status(400).json({ message: "Title and GitHub link required" });
    }

    const submission = new ProjectSubmission({ userId, projectTitle, githubLink });
    await submission.save();
    res.status(201).json({ message: "Project submitted", submission });
  } catch (err) {
    console.error("❌ Error submitting project:", err);
    res.status(500).json({ message: "Error submitting project" });
  }
};

// ✅ 7. Delete career plan
exports.deleteCareerPlan = async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await CareerPlan.findOneAndDelete({ userId });
    if (!deleted) return res.status(404).json({ message: "Plan not found" });
    res.status(200).json({ message: "Career plan deleted" });
  } catch (err) {
    console.error("❌ Error deleting plan:", err);
    res.status(500).json({ message: "Error deleting career plan" });
  }
};





// controllers/career.js
const mongoose = require("mongoose");

// Add the extras you actually have:
//const LearningJourney = require("../models/LearningJourney");
//const JourneyStatus = require("../models/JourneyStatus");
//const ProjectProgress = require("../models/ProjectProgress");
const TopicProgress = require("../learning/models/TopicProgress");

// const cache = require("../lib/cache"); // e.g., Redis, if you’re caching
const Skill = require("../learning/models/Skill");
// exports.resetUserCareer = async (req, res) => {
//   //i also want thus controller to reset ../learning/models/Skill contents. i have imported that model you just do that too 
//   //if there isnt any Skill object present then just do the current functionalities but if there are then reset that too
//   const userId = req.user?.id;
//   if (!userId) return res.status(401).json({ message: "Unauthorized" });

//   const session = await mongoose.startSession();

//   try {
//     let deleted = { careerPlan: 0, careerChoice: 0, topicProgress: 0 };

//     await session.withTransaction(async () => {
//       const [plan, choice, tp] = await Promise.all([
//         CareerPlan.deleteOne({ userId }).session(session),
//         CareerChoice.deleteOne({ userId }).session(session),
//         TopicProgress.deleteMany({ userId }).session(session),
//       ]);

//       deleted.careerPlan = plan.deletedCount || 0;
//       deleted.careerChoice = choice.deletedCount || 0;
//       deleted.topicProgress = tp.deletedCount || 0;
//     });

//     session.endSession();

//     return res.status(200).json({
//       message: "User reset to brand-new state",
//       deleted,
//     });
//   } catch (err) {
//     session.endSession();
//     console.error("❌ Reset error:", err);
//     return res.status(500).json({ message: "Error resetting user state" });
//   }
// };




// DELETE /api/career/choice


exports.resetUserCareer = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  // optional preview: /api/career/choice?dryRun=true
  if (req.query.dryRun === "true") {
    const [cp, cc, tp, sp, sk] = await Promise.all([
      CareerPlan.countDocuments({ userId }),
      CareerChoice.countDocuments({ userId }),
      TopicProgress.countDocuments({ userId }),
      SkillProgress.countDocuments({ userId }),
      Skill.countDocuments({ userId }),
    ]);
    return res.json({
      dryRun: true,
      wouldDelete: {
        careerPlan: cp,
        careerChoice: cc,
        topicProgress: tp,
        skillProgress: sp,
        skills: sk,
      },
    });
  }

  const session = await mongoose.startSession();

  // helper so we can reuse for txn + fallback
  const runDeletes = async (sess) => {
    const opt = sess ? { session: sess } : undefined;

    const [plan, choice, tp, sp, sk] = await Promise.all([
      CareerPlan.deleteOne({ userId }, opt),      // remove generated plan
      CareerChoice.deleteOne({ userId }, opt),    // remove chosen path
      TopicProgress.deleteMany({ userId }, opt),  // clear topic progress
      SkillProgress.deleteMany({ userId }, opt),  // clear per-skill status/progress
      Skill.deleteMany({ userId }, opt),          // delete only THIS user's skills
    ]);

    return {
      careerPlan: plan.deletedCount || 0,
      careerChoice: choice.deletedCount || 0,
      topicProgress: tp.deletedCount || 0,
      skillProgress: sp.deletedCount || 0,
      skills: sk.deletedCount || 0,
    };
  };

  try {
    let deleted;
    await session.withTransaction(async () => {
      deleted = await runDeletes(session);
    });
    session.endSession();

    // keep response shape friendly; nothing else in your app should choke on this
    return res.status(200).json({
      message: "Career choice and related data deleted",
      deleted,
    });
  } catch (err) {
    // fallback if not running a replica set
    const noTxn =
      /Transaction numbers are only allowed|ReplicaSetMonitor|not supported/i.test(
        String(err && (err.message || err))
      );

    if (noTxn) {
      try {
        const deleted = await runDeletes(null);
        session.endSession();
        return res.status(200).json({
          message:
            "Career choice and related data deleted (no transaction available)",
          deleted,
        });
      } catch (fallbackErr) {
        session.endSession();
        console.error("❌ Choice delete fallback error:", fallbackErr);
        return res
          .status(500)
          .json({ message: "Failed to delete career choice (fallback)" });
      }
    }

    session.endSession();
    console.error("❌ Choice delete error:", err);
    return res.status(500).json({ message: "Failed to delete career choice" });
  }
};

exports.deleteCareerChoice = async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await CareerChoice.findOneAndDelete({ userId });

    if (!deleted) {
      return res.status(404).json({ message: "Career choice not found" });
    }

    res.status(200).json({ message: "Career choice reset successfully" });
  } catch (err) {
    console.error("❌ Error resetting career choice:", err);
    res.status(500).json({ message: "Error resetting career choice" });
  }
};


// ✅ 8. Delete project
exports.deleteSubmission = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectTitle } = req.body;
    const deleted = await ProjectSubmission.findOneAndDelete({ userId, projectTitle });
    if (!deleted) return res.status(404).json({ message: "Project not found" });
    res.status(200).json({ message: "Project deleted" });
  } catch (err) {
    console.error("❌ Error deleting project:", err);
    res.status(500).json({ message: "Error deleting project" });
  }
};

// ✅ 9. Progress tracker
exports.getProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const skills = await SkillProgress.find({ userId });
    const projects = await ProjectSubmission.find({ userId });
    const plan = await CareerPlan.findOne({ userId });

    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const totalSkills = plan.plan.skills.length;
    const completedSkills = skills.filter(s => s.status === "completed").length;
    const totalProjects = plan.plan.projects.length;
    const completedProjects = projects.length;

    const skillProgress = totalSkills ? (completedSkills / totalSkills) * 100 : 0;
    const projectProgress = totalProjects ? (completedProjects / totalProjects) * 100 : 0;
    const overallProgress = Math.round((skillProgress + projectProgress) / 2);

    res.status(200).json({
      skillProgress: Math.round(skillProgress),
      projectProgress: Math.round(projectProgress),
      overallProgress,
    });
  } catch (err) {
    console.error("❌ Error calculating progress:", err);
    res.status(500).json({ message: "Error calculating progress" });
  }
};
exports.updateRoadmapStep = async (req, res) => {
  try {
    const userId = req.user.id;
    const { stepTitle, status } = req.body;

    if (!stepTitle || !["not_started", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const updated = await RoadmapProgress.findOneAndUpdate(
      { userId, stepTitle },
      { status, updatedAt: Date.now() },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Roadmap step updated", step: updated });
  } catch (err) {
    console.error("❌ Error updating roadmap step:", err);
    res.status(500).json({ message: "Error updating roadmap step" });
  }
};

exports.getRoadmapProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const progress = await RoadmapProgress.find({ userId });
    res.status(200).json(progress);
  } catch (err) {
    console.error("❌ Error fetching roadmap progress:", err);
    res.status(500).json({ message: "Error fetching roadmap progress" });
  }
};

// In your career controller
exports.startJourney = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const existing = await CareerChoice.findOne({ userId });
    if (!existing) {
      return res.status(404).json({ message: "Career choice not found" });
    }

    if (existing.journeyStarted) {
      // Optionally still run a sync to keep Learning in line with the latest plan:
      // const sync = await bootstrapFromPlanForUser(userId, { mode: "sync" });
      return res.status(200).json({
        message: "Journey already started",
        journeyStarted: true,
        // sync, // include if you run it
      });
    }

    existing.journeyStarted = true;
    await existing.save();

    // 🔥 Immediately sync Learning modules/skills from the current plan
    const bootstrap = await bootstrapFromPlanForUser(userId, { mode: "sync" });

    return res.status(200).json({
      message: "Journey started successfully",
      journeyStarted: true,
      bootstrap, // useful to inspect on FE if you want
    });
  } catch (err) {
    console.error("❌ Error starting journey:", err);
    return res.status(500).json({ message: "Failed to start journey" });
  }
};
exports.getJourneyStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const choice = await CareerChoice.findOne({ userId });

    if (!choice) {
      return res.status(404).json({ message: 'Career choice not found' });
    }

    return res.status(200).json({ journeyStarted: choice.journeyStarted });
  } catch (err) {
    console.error('❌ Error fetching journey status:', err);
    return res.status(500).json({ message: 'Error fetching journey status' });
  }
};
// controllers/career.js (or wherever your controller lives)


/* ----------------- helpers ----------------- */

// Accept either an object by level or a flat array. Always return { foundation, intermediate, advanced, soft_skills }
// controllers/career.js

// import your models however you normally do:





/* ========================= helpers ========================= */
// controllers/career.js
exports.getJourneyDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const [plan, skillProgress, projects, careerChoice] = await Promise.all([
      CareerPlan.findOne({ userId }),
      SkillProgress.find({ userId }),
      ProjectSubmission.find({ userId }),
      CareerChoice.findOne({ userId }) // fetch career goal
    ]);

    // Default counts
    const completedSkills = skillProgress?.filter(s => s.status === 'completed').length || 0;
    const inProgressSkills = skillProgress?.filter(s => s.status === 'in_progress').length || 0;
    const miniProjects = plan?.plan?.projects?.length || 0;
    const resumeScore = 80;
    const skills = plan?.plan?.skills || [];
    const allProjects = projects || [];
    const certificates = [];

    const careerGoal = careerChoice?.careergoal || null;

    // Always return a valid object, even for new users
    return res.status(200).json({
      completedSkills,
      inProgressSkills,
      miniProjects,
      resumeScore,
      skills,
      projects: allProjects,
      certificates,
      goal: careerGoal
    });

  } catch (err) {
    console.error("❌ Error fetching journey dashboard:", err);
    return res.status(500).json({ message: "Error fetching journey dashboard" });
  }
};