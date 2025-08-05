const CareerChoice = require("../models/CareerChoice");
const CareerPlan = require("../models/CareerPlan");
const SkillProgress = require("../models/SkillProgress");
const ProjectSubmission = require("../models/ProjectSubmission");

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
// exports.generatePlan = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const userChoice = await CareerChoice.findOne({ userId });
//     if (!userChoice) return res.status(404).json({ message: "Career choice not found" });

//     const aiResponse = await generateCareerPlan(userChoice); // now powered by OpenAI

//     let plan;
//     try {
//       plan = JSON.parse(aiResponse);
//     } catch {
//       plan = {
//         skills: ["HTML", "CSS", "JavaScript"],
//         roadmap: [],
//         projects: [],
//         resources: [],
//         note: "⚠️ Raw AI response was not JSON",
//         raw: aiResponse,
//       };
//     }

//     const saved = await CareerPlan.create({ userId, plan });
//     res.status(201).json({ message: "Career plan generated", plan: saved.plan });
//   } catch (err) {
//     console.error("❌ AI Gen Error:", err);
//     res.status(500).json({ message: "Error generating career plan" });
//   }
// };
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

    const updated = await CareerChoice.findOneAndUpdate(
      { userId },
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Career choice not found" });
    }

    res.status(200).json({ message: "Career choice updated", choice: updated });
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
// DELETE /api/career/choice
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
