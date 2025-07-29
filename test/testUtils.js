const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(__dirname, "../env.test") });

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

// Dummy user (not saved in DB, just used for token and _id)
const mockUser = {
  _id: new mongoose.Types.ObjectId(),
  email: "testuser@example.com",
  name: "Test User",
};

function generateTestToken() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET in test environment");
  }

  const token = jwt.sign(
    {
      id: mockUser._id,
      email: mockUser.email,
      name: mockUser.name,
    },
    secret,
    { expiresIn: "1d" }
  );

  return {
    token: `Bearer ${token}`,
    user: mockUser,
  };
}

module.exports = {
  generateTestToken,
  mockUser,
};
