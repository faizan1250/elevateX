import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import sendEmail from "../utils/sendEmail.js";
import { getVerificationEmailTemplate, getResetPasswordEmailTemplate } from "../utils/emailTemplate.js";

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }


const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = createToken(user);
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

await sendEmail({
  to: user.email,
  subject: 'Verify your ElevateX Email',
  html: getVerificationEmailTemplate(user.username, verifyUrl),
});
  
    res.status(201).json({ message: 'User registered. Please verify your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};;

export const verifyEmail = async (req, res) => {
  const { token } = req.query;
  try {
    if (!token) return res.status(400).json({ message: 'Missing token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(400).json({ message: 'Invalid token' });
    if (user.verified) return res.json({ message: 'Email already verified' });

    user.verified = true;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};;

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid Email' });

    // ❌ Prevent login if user was created via Google or GitHub
    if (user.provider === 'google') {
      return res.status(400).json({ message: 'Please log in using Google' });
    }

    if (user.provider === 'github') {
      return res.status(400).json({ message: 'Please log in using GitHub' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Match result:", isMatch);
    if (!isMatch) return res.status(400).json({ message: 'Invalid Password' });

    if (!user.verified) return res.status(403).json({ message: 'Please verify your email' });

    const token = createToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};;


export const logout = (req, res) => {
  res.clearCookie('token').json({ message: 'Logged out' });
};;

export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const token = createToken(user);
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    await sendEmail({
  to: user.email,
  subject: 'Reset Your ElevateX Password',
  html: getResetPasswordEmailTemplate(user.username, resetUrl),
});
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};;

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
 
  try {
    if (!token) return res.status(400).json({ message: 'Missing token' });

    const decoded = jwt.verify(String(token), process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(400).json({ message: 'Invalid token' });

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error("Reset password error:", err.name, err.message);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
};;
