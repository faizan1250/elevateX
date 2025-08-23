import express from "express";
const router = express.Router();
import * as  certController from "../controllers/certificatesController.js";
import auth from "../middleware/auth.js";
router.get('/my', auth, certController.getUserCertificates);
router.get('/test', auth, certController.generateCertificateTest); // generates questions
router.post("/submit", auth, certController.submitCertificateTest); // submits and evaluates

export default router;;
