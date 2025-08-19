const express = require("express");
const router = express.Router();
//const requireAuth = require('../../middleware/auth');

router.use("/skills",  require("./skillRoutes"));
router.use("/modules", require("./moduleRoutes"));
router.use("/topics", require("./topicRoutes"));
router.use("/tests", require("./testRoutes"));

// NEW bootstrap routes
router.use("/bootstrap", require("./bootstrapRoutes"));

module.exports = router;
