import express from "express";
import auth from "../middleware/auth.js";
import {
  completeSession,
  getInterviewAnalytics,
  getInterviewHistory,
  getSession,
  startSession,
  sendMessage,
} from "../controllers/interviewSessionController.js";

const router = express.Router();

router.post("/start", auth, startSession);
router.get("/history/list", auth, getInterviewHistory);
router.get("/analytics/overview", auth, getInterviewAnalytics);
router.post("/:id/message", auth, sendMessage);
router.post("/:id/evaluate", auth, sendMessage);
router.post("/:id/complete", auth, completeSession);
router.get("/:id", auth, getSession);

export default router;
