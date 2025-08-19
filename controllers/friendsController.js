const Friendship = require('../models/Friendship');
const User = require('../models/User');
const Notification = require('../models/Notification');

// 📌 Send friend request
exports.sendRequest = async (req, res) => {
  try {
    console.log(`📩 Friend request attempt from ${req.user.id} to ${req.params.id}`);

    if (req.user.id === req.params.id) {
      console.warn("❌ Cannot send friend request to self");
      return res.status(400).json({ message: 'You cannot friend yourself' });
    }

    const existing = await Friendship.findOne({
      $or: [
        { requester: req.user.id, recipient: req.params.id },
        { requester: req.params.id, recipient: req.user.id }
      ],
      status: { $in: ['pending', 'accepted'] }
    });

    if (existing) {
      console.warn("⚠️ Friend request already exists");
      return res.status(400).json({ message: 'Friend request already exists' });
    }

    const friendship = await Friendship.create({
      requester: req.user.id,
      recipient: req.params.id
    });

    console.log("✅ Friendship created:", friendship);

    await Notification.create({
      user: req.params.id,
      fromUser: req.user.id,
      type: 'friend_request',
      data: { requesterId: req.user.id }
    });

    console.log(`🔔 Notification created for user ${req.params.id}`);

    const io = req.app.get('io');
    io.to(req.params.id).emit('notification', {
      type: 'friend_request',
      fromUser: req.user.id,
      requesterId: req.user.id
    });

    console.log(`📤 Real-time notification emitted to user ${req.params.id}`);

    res.json({ message: 'Friend request sent', friendship });
  } catch (err) {
    console.error("❌ Error sending request:", err);
    res.status(500).json({ message: 'Error sending request' });
  }
};

// 📌 Accept friend request
exports.acceptRequest = async (req, res) => {
  try {
    console.log(`✅ Accept friend request ID: ${req.params.id} by user: ${req.user.id}`);

    const request = await Friendship.findById(req.params.id);
    if (!request || request.recipient.toString() !== req.user.id) {
      console.warn("❌ Friend request not found or unauthorized");
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = 'accepted';
    await request.save();
    console.log("📝 Friend request accepted and updated in DB");

    await User.findByIdAndUpdate(request.requester, { $addToSet: { friends: request.recipient } });
    await User.findByIdAndUpdate(request.recipient, { $addToSet: { friends: request.requester } });
    console.log("👥 Users updated with each other as friends");

    await Notification.create({
      user: request.requester,
      fromUser: req.user.id,
      type: 'friend_accept',
      data: { recipientId: req.user.id }
    });
    console.log(`🔔 Acceptance notification created for user ${request.requester}`);

    const io = req.app.get('io');
    io.to(request.requester.toString()).emit('notification', {
      type: 'friend_accept',
      fromUser: req.user.id,
      recipientId: req.user.id
    });

    io.to(request.requester.toString()).emit('friendsListUpdated');
    io.to(request.recipient.toString()).emit('friendsListUpdated');
    console.log(`📤 Real-time updates sent to both users`);

    res.json({ message: 'Friend request accepted' });
  } catch (err) {
    console.error("❌ Error accepting request:", err);
    res.status(500).json({ message: 'Error accepting request' });
  }
};

// 📌 Decline friend request
exports.declineRequest = async (req, res) => {
  try {
    console.log(`⚠️ Declining friend request ID: ${req.params.id} by user: ${req.user.id}`);

    const request = await Friendship.findById(req.params.id);
    if (!request || request.recipient.toString() !== req.user.id) {
      console.warn("❌ Request not found or unauthorized");
      return res.status(404).json({ message: 'Request not found' });
    }

    request.status = 'declined';
    await request.save();

    const io = req.app.get('io');
    io.to(request.requester.toString()).emit('friendRequestDeclined', {
      recipientId: req.user.id
    });

    console.log(`📤 Real-time decline event sent to ${request.requester}`);

    res.json({ message: 'Friend request declined' });
  } catch (err) {
    console.error("❌ Error declining request:", err);
    res.status(500).json({ message: 'Error declining request' });
  }
};

// 📌 Remove / unfriend
exports.removeFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const friendId = req.params.id;

    console.log(`🗑️ Unfriending: ${userId} removing ${friendId}`);

    if (userId === friendId) {
      return res.status(400).json({ message: "You cannot unfriend yourself" });
    }

    await User.findByIdAndUpdate(userId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: userId } });

    await Friendship.deleteMany({
      $or: [
        { requester: userId, recipient: friendId },
        { requester: friendId, recipient: userId },
      ],
    });

    console.log(`✅ Users unfriended and friendship records removed`);

    const io = req.app.get('io');
    io.to(friendId).emit('friendRemoved', { userId });
    io.to(userId).emit('friendsListUpdated');

    res.json({ message: "Friend removed successfully" });
  } catch (err) {
    console.error("❌ Error removing friend:", err);
    res.status(500).json({ message: "Error removing friend" });
  }
};

// 📌 Get all friends
exports.getFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📥 Fetching friends for user: ${userId}`);

    const friendships = await Friendship.find({
      status: 'accepted',
      $or: [{ requester: userId }, { recipient: userId }],
    });

    const friendIds = friendships.map(f =>
      f.requester.toString() === userId ? f.recipient : f.requester
    );

    const friends = await User.find({ _id: { $in: friendIds } })
      .select('username profilePicture links')
      .lean();

    console.log(`✅ Found ${friends.length} friends`);

    res.json(friends);
  } catch (err) {
    console.error('❌ Error fetching friends:', err);
    res.status(500).json({ message: 'Error fetching friends' });
  }
};

// 📌 Get pending requests
exports.getPendingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`📥 Fetching pending requests for user: ${userId}`);

    const requests = await Friendship.find({
      recipient: userId,
      status: 'pending'
    }).populate('requester', 'username profilePicture');

    const formatted = requests.map(r => ({
      _id: r._id,
      requesterId: r.requester._id,
      username: r.requester.username,
      profilePicture: r.requester.profilePicture,
      createdAt: r.createdAt
    }));

    console.log(`✅ Found ${formatted.length} pending requests`);

    res.json(formatted);
  } catch (err) {
    console.error('❌ Error fetching pending requests:', err);
    res.status(500).json({ message: 'Error fetching pending requests' });
  }
};
