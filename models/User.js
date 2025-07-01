const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId && !this.githubId;
    },
  },
  googleId: { type: String },
  githubId: { type: String },
  verified: { type: Boolean, default: false },

});


module.exports = mongoose.model('User', userSchema);
