import express from "express";
import {
  getProfile,
  interviewChat,
  interviewChatStream,
  evaluateAnswer,
} from "../controllers/interviewController.js";

import auth from "../middleware/auth.js";
const router = express.Router();

// Routes
router.get("/profile", auth, getProfile);
router.post("/chat", auth, interviewChat);
router.post("/chat/stream", auth, interviewChatStream);
router.post("/evaluate", auth, evaluateAnswer);
export default router;
