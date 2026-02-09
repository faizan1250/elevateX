// import mongoose from "mongoose";
//
// const userSchema = new mongoose.Schema({
//   username: { type: String, required: true },
//   email: {
//     type: String,
//     required: true,
//     unique: true,
//     lowercase: true,
//   },
//   password: {
//     type: String,
//     required: function () {
//       return !this.googleId && !this.githubId;
//     },
//   },
//   googleId: { type: String },
//   githubId: { type: String },
//   verified: { type: Boolean, default: false },
//
//   // 🆕 Profile features
//   profilePicture: { type: String, default: '' }, // URL to Cloudinary/S3
//   links: [
//     {
//       platform: { type: String }, // e.g. "GitHub", "LeetCode"
//       url: { type: String }
//     }
//   ],
//
//   // 🆕 Friends list
//   friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // accepted friends only
// }, { timestamps: true });
//
// export default mongoose.model('User', userSchema);;
//
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.githubId;
      },
    },
    googleId: String,
    githubId: String,
    verified: { type: Boolean, default: false },

    profilePicture: { type: String, default: "" },
    links: [
      {
        platform: String,
        url: String,
      },
    ],
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

/* 🔐 GUARANTEE username */
userSchema.pre("validate", function (next) {
  if (!this.username && this.email) {
    this.username = this.email.split("@")[0];
  }
  next();
});

export default mongoose.model("User", userSchema);
