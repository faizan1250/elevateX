
const express = require("express");
const router = express.Router();
const careerController = require("../controllers/careerController");
const auth = require("../middleware/auth");


router.post("/chooseCareer", auth, careerController.chooseCareer);


router.get("/status", auth, careerController.getCareerStatus);


router.post("/plan", auth, careerController.generatePlan);

router.get("/plan", auth, careerController.getPlan);

router.patch("/skill/update", auth, careerController.updateSkill);

router.post("/project/submit", auth, careerController.submitProject);

router.delete("/plan/delete", auth, careerController.deleteCareerPlan);


router.delete("/project/delete", auth, careerController.deleteSubmission);


router.get("/progress", auth, careerController.getProgress);
router.delete("/choice", auth, careerController.deleteCareerChoice);  // 🆕 Reset
router.delete("/reset", auth, careerController.resetUserCareer);
router.put("/choice", auth, careerController.updateCareerChoice);  
router.post('/roadmap/update', auth, careerController.updateRoadmapStep);

// GET: get user's roadmap progress
router.get('/roadmap', auth, careerController.getRoadmapProgress); 
// routes/careerRoutes.js
router.post("/journey/start", auth, careerController.startJourney);
router.get('/journey/status', auth,careerController.getJourneyStatus);
router.get('/journey/dashboard', auth, careerController.getJourneyDashboard);

module.exports = router;
