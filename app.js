
// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/authRoutes');
const careerRoutes = require('./routes/careerRoutes');
const certificateRoutes = require('./routes/certificates');
const passport = require('passport');
require('./config/passport');
const setupSwagger = require('./swagger');

const app = express();
const server = http.createServer(app);

// ============================
// MIDDLEWARE
// ============================
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use('/certificates', express.static('certificates'));
app.use(passport.initialize());

// ============================
// SOCKET.IO + JWT AUTHENTICATION
// ============================
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true
  }
});

// Keep online users map: userId -> socketId
const onlineUsers = new Map();

// Authenticate socket connections using JWT passed in handshake.auth.token
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    console.log("🔐 Authenticating socket...");

    if (!token) {
      console.warn("⛔ No token provided in socket handshake");
      const err = new Error('No token provided');
      err.data = { code: 'NO_TOKEN' };
      return next(err);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    console.log(`✅ Socket authenticated as user: ${socket.userId}`);
    return next();
  } catch (err) {
    console.error('❌ Socket auth error:', err.message);
    const error = new Error('Authentication error');
    error.data = { code: 'AUTH_ERROR', message: err.message };
    return next(error);
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  console.log(`🟢 Socket connected: ${socket.id} (user: ${userId})`);

  // ✅ Join user's personal room using their userId
  socket.join(userId);
  console.log(`✅ User ${userId} joined room ${userId}`);

  socket.on('ping', () => {
    console.log(`📶 Received ping from ${socket.id}`);
    socket.emit('pong');
  });

  // ✅ Friend request event using room
  socket.on('sendFriendRequest', ({ senderId, receiverId }) => {
    console.log(`📨 sendFriendRequest from ${senderId} to ${receiverId}`);
    io.to(receiverId).emit('receiveFriendRequest', { senderId });
    console.log(`✅ Friend request sent to room: ${receiverId}`);
  });

  // ✅ Friend request accepted event using room
  socket.on('acceptFriendRequest', ({ senderId, receiverId }) => {
    console.log(`🎉 acceptFriendRequest from ${receiverId} to ${senderId}`);
    io.to(senderId).emit('friendRequestAccepted', { receiverId });
    console.log(`✅ Acceptance notification sent to room: ${senderId}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔴 Socket disconnected: ${socket.id} (user: ${userId}) Reason: ${reason}`);
    // ❌ No need to delete from onlineUsers anymore
  });
}); 

// 🔔 Notification helper used by controllers
app.set('sendNotification', (userId, payload) => {
  try {
    console.log(`📢 sendNotification to userId: ${userId}, payload:`, payload);
    const socketId = onlineUsers.get(String(userId));
    if (socketId) {
      io.to(socketId).emit('notification', payload);
      console.log(`✅ Notification emitted to socket ${socketId}`);
    } else {
      console.log(`❌ User ${userId} is not online or socket not found`);
    }
  } catch (err) {
    console.error('❌ sendNotification error:', err);
  }
});


// (Optional) expose io for advanced use in other modules
app.set('io', io);

// ============================
// ROUTES (existing)
// ============================
app.use('/api/auth', authRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/certificate', certificateRoutes);
app.use('/api/profile', require('./routes/profile'));
const learningRoutes = require("./learning/routes");
app.use("/api/learning", learningRoutes);
app.use('/api/friends', require('./routes/friends'));
app.use('/api/notifications', require('./routes/notifications'));

// SWAGGER
setupSwagger(app);

// Export both app and server (use server.listen in your entry file)
module.exports = { app, server };
