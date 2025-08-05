
const express = require("express");
const router = express.Router();
const careerController = require("../controllers/careerController");
const auth = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Career
 *   description: Career OS API Endpoints
 */

/**
 * @swagger
 * /api/career/choose:
 *   post:
 *     summary: Choose a career path
 *     tags: [Career]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               careerPath:
 *                 type: string
 *                 example: ML Engineer
 *     responses:
 *       200:
 *         description: Career choice saved
 */
router.post("/chooseCareer", auth, careerController.chooseCareer);

/**
 * @swagger
 * /api/career/status:
 *   get:
 *     summary: Get the chosen career path
 *     tags: [Career]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Career status retrieved
 */
router.get("/status", auth, careerController.getCareerStatus);

/**
 * @swagger
 * /api/career/generate-plan:
 *   post:
 *     summary: Generate a roadmap based on the chosen career
 *     tags: [Career]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roadmap generated
 */
router.post("/plan", auth, careerController.generatePlan);

/**
 * @swagger
 * /api/career/roadmap:
 *   get:
 *     summary: Get the current roadmap
 *     tags: [Career]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Career roadmap retrieved
 */
router.get("/plan", auth, careerController.getPlan);

/**
 * @swagger
 * /api/career/skill/update:
 *   patch:
 *     summary: Update a skill's status
 *     tags: [Career]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               skill:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [complete, in-progress, not-started]
 *     responses:
 *       200:
 *         description: Skill status updated
 */
router.patch("/skill/update", auth, careerController.updateSkill);

/**
 * @swagger
 * /api/career/project/submit:
 *   post:
 *     summary: Submit a project
 *     tags: [Career]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectName:
 *                 type: string
 *               link:
 *                 type: string
 *     responses:
 *       200:
 *         description: Project submitted
 */
router.post("/project/submit", auth, careerController.submitProject);

/**
 * @swagger
 * /api/career/plan/delete:
 *   delete:
 *     summary: Delete the current career plan
 *     tags: [Career]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Plan deleted
 */
router.delete("/plan/delete", auth, careerController.deleteCareerPlan);

/**
 * @swagger
 * /api/career/project/delete:
 *   delete:
 *     summary: Delete a submitted project
 *     tags: [Career]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Project deleted
 */
router.delete("/project/delete", auth, careerController.deleteSubmission);

/**
 * @swagger
 * /api/career/progress:
 *   get:
 *     summary: Get overall career progress
 *     tags: [Career]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Career progress retrieved
 */
router.get("/progress", auth, careerController.getProgress);
router.delete("/choice", auth, careerController.deleteCareerChoice);  // 🆕 Reset
router.put("/choice", auth, careerController.updateCareerChoice);   

module.exports = router;
