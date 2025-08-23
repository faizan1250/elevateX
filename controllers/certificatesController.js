import Certificate from "../models/Certificate.js";
import CareerPlan from "../models/CareerPlan.js";
import { generateQuestionsFromSkills, evaluateAnswers } from "../utils/certHelper.js";
import { generateCertificatePDF } from "../utils/pdfGenerator.js";
// controllers/certificatesController.js
export const getUserCertificates = async (req, res) => {
  try {
    const userId = req.user.id;
    const certificates = await Certificate.find({ userId });
    res.status(200).json(certificates);
  } catch (err) {
    console.error("❌ Error fetching certificates:", err);
    res.status(500).json({ message: "Failed to fetch certificates" });
  }
};;
export const generateCertificateTest = async (req, res) => {
  try {
    console.log("route hit");

    const userId = req.user.id;
    const plan = await CareerPlan.findOne({ userId });

    const skills = [
      ...(plan?.plan?.skills?.technical || []),
      ...(plan?.plan?.skills?.soft_skills || [])
    ];

    if (!skills.length) {
      return res.status(404).json({ message: "No skills found in career plan" });
    }

    const questions = await generateQuestionsFromSkills(skills);
    return res.status(200).json({ questions });
  } catch (err) {
    console.error("❌ Error generating test:", err);
    res.status(500).json({ message: "Failed to generate test" });
  }
};;

export const submitCertificateTest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { answers, questions } = req.body;

    const { score, passed } = await evaluateAnswers(questions, answers);

    if (passed) {
      const userName = req.user.name || "Learner";

      const certificateUrl = await generateCertificatePDF({
        userId,
        userName,
        score,
      });

      const certificate = await Certificate.create({
        userId,
        score,
        certificateUrl,
      });

      return res.status(200).json({ message: "Certificate issued", certificate });
    }

    return res.status(200).json({ message: "Test submitted", passed, score });
  } catch (err) {
    console.error("❌ Error submitting test:", err);
    res.status(500).json({ message: "Error submitting certificate test" });
  }
};;
