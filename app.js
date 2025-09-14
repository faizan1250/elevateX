// app.js (ESM clean)
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import passport from "passport";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Side-effect import to register passport strategies
import "./config/passport.js";

// Routes (make sure each of these files exports a router default)
import authRoutes from "./routes/authRoutes.js";
import careerRoutes from "./routes/careerRoutes.js";
import certificateRoutes from "./routes/certificates.js";
import profileRoutes from "./routes/profile.js";
import friendsRoutes from "./routes/friends.js";
import notificationsRoutes from "./routes/notifications.js";
import learningRoutes from "./learning/routes/index.js";

// Swagger
import setupSwagger from "./swagger.js";

// Optional: Google GenAI wiring
import { GoogleGenAI } from "@google/genai";
import marketRouter from "./routes/marketRoute.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);


// ✅ Serve the uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// AI wiring
if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY missing. SSE will throw 'AI not initialized'.");
}
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI(process.env.GEMINI_API_KEY) : null;
app.set("genAI", genAI);

// ============================
// MIDDLEWARE
// ============================
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/certificates", express.static(path.join(__dirname, "certificates")));
app.use(passport.initialize());

// ============================
// SOCKET.IO + JWT AUTHENTICATION
// ============================
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", credentials: true },
});

// Optional map; you aren’t using it to store sockets anymore, so either delete or actually set it.
const onlineUsers = new Map();

io.use((socket, next) => {
  try {
    const token = socket.handshake?.auth?.token;
    if (!token) {
      const err = new Error("No token provided");
      // socket.io inspects err.data
      err.data = { code: "NO_TOKEN" };
      return next(err);
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    return next();
  } catch (err) {
    const error = new Error("Authentication error");
    error.data = { code: "AUTH_ERROR", message: err.message };
    return next(error);
  }
});

io.on("connection", socket => {
  const userId = socket.userId;
  socket.join(userId);

  socket.on("ping", () => socket.emit("pong"));

  socket.on("sendFriendRequest", ({ senderId, receiverId }) => {
    io.to(receiverId).emit("receiveFriendRequest", { senderId });
  });

  socket.on("acceptFriendRequest", ({ senderId, receiverId }) => {
    io.to(senderId).emit("friendRequestAccepted", { receiverId });
  });
});

// Notification helper used by controllers
app.set("sendNotification", (userId, payload) => {
  try {
    io.to(String(userId)).emit("notification", payload);
  } catch (err) {
    console.error("sendNotification error:", err);
  }
});

// Expose io if someone insists
app.set("io", io);

// ============================
// ROUTES
// ============================
app.use("/api/auth", authRoutes);
app.use("/api/career", careerRoutes);
app.use("/api/certificate", certificateRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/marketplace",marketRouter)

// SWAGGER
setupSwagger(app);


export { app, server };
