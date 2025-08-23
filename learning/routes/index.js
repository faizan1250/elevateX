import express from "express";
import skillRoutes from "./skillRoutes.js";
import moduleRoutes from "./moduleRoutes.js";
import topicRoutes from "./topicRoutes.js";
import testRoutes from "./testRoutes.js";
import assistantRoutes from "./assistant.js";
import bootstrapRoutes from "./bootstrapRoutes.js";

const router = express.Router();

router.use("/skills", skillRoutes);
router.use("/modules", moduleRoutes);
router.use("/topics", topicRoutes);
router.use("/tests", testRoutes);
router.use("/assistant", assistantRoutes);
router.use("/bootstrap", bootstrapRoutes);

export default router;
