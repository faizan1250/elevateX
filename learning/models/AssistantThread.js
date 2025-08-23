import mongoose from "mongoose";

const { Schema, model } = mongoose;

const AssistantThreadSchema = new Schema({
  skillId: { type: Schema.Types.ObjectId, ref: "Skill", index: true },
  title: String,                    // first user msg or heuristic
  lastMessageAt: Date,
  messages: [{
    role: { type: String, enum: ["system","user","assistant"], required: true },
    content: { type: String, required: true },
    tokens: Number,
    createdAt: { type: Date, default: Date.now }
  }],
}, { timestamps: true });

AssistantThreadSchema.index({ skillId: 1, updatedAt: -1 });

export default model("AssistantThread", AssistantThreadSchema);;
