import Notification from "../models/Notification.js";
import { buildLearningNudgesForUser } from "../learning/controllers/moduleController.js";

// 📌 Get notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .populate('fromUser', 'username profilePicture') // ✅
      .sort({ createdAt: -1 });
      
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};;


// 📌 Mark as read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification || notification.user.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    notification.status = 'read';
    await notification.save();
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating notification' });
  }
};;

export const markManyAsRead = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter(Boolean) : [];

    if (!ids.length) {
      return res.status(400).json({ message: "No notification ids provided" });
    }

    const result = await Notification.updateMany(
      {
        _id: { $in: ids },
        user: req.user.id,
        status: { $ne: "archived" },
      },
      {
        $set: { status: "read" },
      },
    );

    res.json({
      message: "Notifications marked as read",
      updatedCount: result.modifiedCount || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating notifications" });
  }
};;

// 📌 Archive
export const archiveNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification || notification.user.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    notification.status = 'archived';
    await notification.save();
    res.json({ message: 'Notification archived' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error archiving notification' });
  }
};;

// 📌 Create notification + emit in real-time
export const createNotification = async (req, res) => {
  try {
    const { userId, type, data } = req.body;

    const notification = await Notification.create({
      user: userId,
      type,
      data
    });

    // 🔹 Emit via Socket.IO in real-time
    const sendNotification = req.app.get('sendNotification');
    if (sendNotification) {
      sendNotification(userId, {
        _id: notification._id,
        type: notification.type,
        data: notification.data,
        createdAt: notification.createdAt
      });
    }

    res.status(201).json(notification);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating notification' });
  }
};;

export const syncLearningNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const nudges = await buildLearningNudgesForUser(userId);
    const created = [];

    for (const nudge of nudges) {
      const existing = await Notification.findOne({
        user: userId,
        type: "learning_nudge",
        "data.key": nudge.key,
      }).lean();

      if (existing) continue;

      const notification = await Notification.create({
        user: userId,
        type: "learning_nudge",
        data: {
          key: nudge.key,
          title: nudge.title,
          message: nudge.message,
          tone: nudge.tone,
          link: nudge.link,
        },
      });

      created.push(notification);

      const sendNotification = req.app.get("sendNotification");
      if (sendNotification) {
        sendNotification(userId, {
          _id: notification._id,
          type: notification.type,
          data: notification.data,
          createdAt: notification.createdAt,
        });
      }
    }

    res.json({ created: created.length, notifications: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error syncing learning notifications" });
  }
};;
// 📌 Delete Notification
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification || notification.user.toString() !== req.user.id) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.deleteOne();
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting notification' });
  }
};;
