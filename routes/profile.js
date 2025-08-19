const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const auth = require('../middleware/auth');
const User = require('../models/User');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
router.get('/me', auth, async (req, res) => {
  try {


    console.log("req.user:", req.user); // Check what's coming from auth middleware
    const user = await User.findById(req.user.id)
      .select('username email profilePicture links friends')
      .populate('friends', 'username profilePicture');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error("Error in /me route:", err);
    res.status(500).json({ message: 'Error fetching profile', error: err.message });
  }
});

router.get('/:userId', auth, profileController.getProfile);
router.put('/', auth, profileController.updateProfile);
router.post('/upload-picture', auth, upload.single('profilePicture'), profileController.uploadProfilePicture);
router.delete('/picture', auth, profileController.deleteProfilePicture);

module.exports = router;
