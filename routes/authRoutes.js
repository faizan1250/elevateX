const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
router.post('/register', authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json({ user });
});
module.exports = router;
