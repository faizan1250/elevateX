import mongoose from "mongoose";
const friendshipSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'declined', 'archived'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model('Friendship', friendshipSchema);;
