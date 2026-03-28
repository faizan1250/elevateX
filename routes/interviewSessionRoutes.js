import express from "express";
import {
  startSession,
  sendMessage,
  evaluateAnswer,
  completeSession,
  getSession,
} from "../controllers/interviewSessionController.js";

import auth from "../middleware/auth.js";
const router = express.Router();

// Replace with your auth middleware

router.post("/start", auth, startSession);
router.post("/:id/message", auth, sendMessage);
router.post("/:id/evaluate", auth, evaluateAnswer);
router.post("/:id/complete", auth, completeSession);
router.get("/:id", auth, getSession);

export default router;
