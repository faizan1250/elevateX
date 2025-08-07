// routes/certificates.js
const express = require("express");
const router = express.Router();
const certController = require("../controllers/certificatesController");
const  auth  = require("../middleware/auth");
router.get('/my', auth, certController.getUserCertificates);
router.get('/test', auth, certController.generateCertificateTest); // generates questions
router.post("/submit", auth, certController.submitCertificateTest); // submits and evaluates

module.exports = router;
