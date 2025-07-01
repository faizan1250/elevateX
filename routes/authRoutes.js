const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');

const authController = require('../controllers/authController');
const User = require('../models/User');
const auth = require('../middleware/auth');
router.post('/register', authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', authController.login);
router.post('/logout', auth, authController.logout);
router.post('/forgot-password', authController.requestPasswordReset);
router.post('/reset-password', authController.resetPassword);
router.get('/me', auth, async (req, res) => {
  try {
    console.log('Decoded user from JWT:', req.user); // 👈 Add this

    const user = await User.findById(req.user.id).select('username email provider');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user });
  } catch (err) {
    console.error('Error in /me:', err); // 👈 Add this
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const user = req.user;
    console.log("OAuth user:", user);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // Redirect to frontend with the token
    res.redirect(`http://localhost:5173/oauth-success?token=${token}&provider=google`);
  }
);


router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', (req, res, next) => {
  passport.authenticate('github', async (err, user, info) => {
    if (err || !user) {
      console.error('OAuth Failed:', err, info);
      return res.redirect('http://localhost:5173/login?error=OAuthFailed');
    }

    console.log('GitHub User:', user);
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.redirect(`http://localhost:5173/oauth-success?token=${token}&provider=github`);
  })(req, res, next);
});




module.exports = router;
