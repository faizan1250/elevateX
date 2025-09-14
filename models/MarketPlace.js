import mongoose from "mongoose";

const marketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productImgs: { type: [String], default: [] },  
    productName: { type: String, required: true },
    productPrice: { type: Number, required: true },
    productDesc: { type: String, required: true },
    category: {
      type: String,
      enum: ["Notes", "Equipment", "Books", "Other"],
      required: true,
    },
    condition: {
      type: String,
      enum: ["New", "Like New", "Used"],
      default: "Used",
    },
    location: { type: String, required: true },
    quantity: { type: Number, default: 1 },
    selled: { type: Boolean, default: false },
    buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);


export default mongoose.model("Marketplace", marketSchema);