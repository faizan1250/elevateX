import express from "express";
import auth from "../middleware/auth.js";
import {
  completeSession,
  getInterviewAnalytics,
  getInterviewHistory,
  getProfile,
  getSession,
  startInterviewSession,
  submitInterviewAnswer,
} from "../controllers/interviewController.js";

const router = express.Router();

router.get("/profile", auth, getProfile);
router.get("/sessions/history", auth, getInterviewHistory);
router.get("/analytics", auth, getInterviewAnalytics);
router.post("/sessions/start", auth, startInterviewSession);
router.get("/sessions/:id", auth, getSession);
router.post("/sessions/:id/answer", auth, submitInterviewAnswer);
router.post("/sessions/:id/complete", auth, completeSession);

export default router;
