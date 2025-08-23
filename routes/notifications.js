import express from "express";
const router = express.Router();
import * as notificationsController from "../controllers/notificationsController.js";
import auth from "../middleware/auth.js";

router.get('/', auth, notificationsController.getNotifications);
router.post('/read/:id', auth, notificationsController.markAsRead);
router.post('/archive/:id', auth, notificationsController.archiveNotification);
router.delete('/:id', auth, notificationsController.deleteNotification);

export default router;;
