const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const auth = require('../middleware/auth');

router.get('/', auth, notificationsController.getNotifications);
router.post('/read/:id', auth, notificationsController.markAsRead);
router.post('/archive/:id', auth, notificationsController.archiveNotification);
router.delete('/:id', auth, notificationsController.deleteNotification); 

module.exports = router;
