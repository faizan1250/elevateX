import User from "../models/User.js";
import cloudinar from 'cloudinary';
const cloudinary = cloudinar.v2;
// 🖼 Configure Cloudinary (optional, or use S3)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 📌 Get a user's profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('username email profilePicture links friends')
      .populate('friends', 'username profilePicture');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
};;


// 📌 Update profile details
export const updateProfile = async (req, res) => {
  try {
    const { username, links } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // ✅ Check and update username only if it's different
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
      user.username = username;
    }

    // ✅ Update links if provided
    if (links) {
      user.links = links; // [{ platform, url }]
    }

    await user.save();
    res.json({ message: 'Profile updated', user });

  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Error updating profile' });
  }
};;

// 📌 Upload profile picture
export const uploadProfilePicture = async (req, res) => {
  try {
    console.log("REQ FILE:", req.file);
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'No file uploaded' });

    const result = await cloudinary.uploader.upload(file.path, {
      folder: 'profile_pics'
    });

    const user = await User.findById(req.user.id);
    user.profilePicture = result.secure_url;
    await user.save();

    res.json({ message: 'Profile picture updated', url: result.secure_url });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: err.message || 'Error uploading picture' });
  }
};;

// 📌 Delete profile picture
export const deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Optional: If you store the public_id for Cloudinary deletion, you can do it here
    // Example: 
    // if (user.profilePicturePublicId) {
    //   await cloudinary.uploader.destroy(user.profilePicturePublicId);
    // }

    // Remove profile picture URL from user document
    user.profilePicture = null;
    // Optionally remove public_id too if stored:
    // user.profilePicturePublicId = null;

    await user.save();

    res.json({ message: 'Profile picture deleted' });
  } catch (err) {
    console.error('Error deleting profile picture:', err);
    res.status(500).json({ message: 'Error deleting profile picture' });
  }
};;
