const mongoose = require("mongoose");
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // receiver
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // sende
  type: { type: String, enum: ['friend_request', 'friend_accept'], required: true },
  data: { type: Object }, // e.g. { requesterId, requesterName, requesterAvatar }
  status: { type: String, enum: ['unread', 'read', 'archived'], default: 'unread' }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
