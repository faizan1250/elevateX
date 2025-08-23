import Notification from "../models/Notification.js";

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
        id: notification._id,
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

