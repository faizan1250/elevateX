// import mongoose from "mongoose";
//
// const skillSchema = new mongoose.Schema(
//   {
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
//     name: { type: String, required: true, trim: true, index: true },
//     description: { type: String, default: "" },
//     difficulty: { type: String, enum: ["beginner", "intermediate", "advanced","soft_skills"], required: true, index: true },
//     moduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Module", required: true, index: true },
//     topics: [{ type: mongoose.Schema.Types.ObjectId, ref: "Topic" }],
//
//     // new field to cache AI content
//     generatedContent: { type: mongoose.Schema.Types.Mixed, default: null },
//   },
//   { timestamps: true }
// );
//
// // unique skill per user per module (case-insensitive)
// skillSchema.index(
//   { userId: 1, moduleId: 1, name: 1 },
//   { unique: true, collation: { locale: "en", strength: 2 } }
// );
//
// export default mongoose.model("Skill", skillSchema);;
//

import mongoose from "mongoose";

const skillSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      default: "",
    },

    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "soft_skills"],
      required: true,
      index: true,
    },

    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },

    /* ===========================
       ROADMAP GRAPH FIELDS
    ============================ */

    // Visual fallback order (used if no prerequisites)
    order: {
      type: Number,
      default: 0,
      index: true,
    },

    // True dependency graph
    prerequisites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Skill",
      },
    ],

    /* ===========================
       CONTENT
    ============================ */

    topics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Topic",
      },
    ],

    // Cached AI-generated content
    generatedContent: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true },
);

/* ===========================
   INDEXES
============================ */

// Unique skill per user per module (case-insensitive)
skillSchema.index(
  { userId: 1, moduleId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } },
);

// Order lookup inside a module
skillSchema.index({ moduleId: 1, order: 1 });

/* ===========================
   SAFETY GUARDS
============================ */

// Prevent self-dependency
skillSchema.pre("validate", function (next) {
  if (this.prerequisites?.some((id) => String(id) === String(this._id))) {
    return next(new Error("Skill cannot depend on itself"));
  }
  next();
});

export default mongoose.model("Skill", skillSchema);
