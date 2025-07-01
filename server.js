// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const authRoutes = require('./routes/authRoutes');
// const connectDB = require('./config/db');
// dotenv.config();

// const app = express();

// // CORS configuration
// app.use(cors({
//   origin: process.env.CLIENT_URL || 'http://localhost:5173', // Adjust to your frontend's URL
//   credentials: true
// }));

// // Body parsers
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Your routes here
//  app.use('/api/auth', authRoutes);

// const PORT = process.env.PORT || 5000;
// const startServer = async () => {
//   try {
//     await connectDB(); // Wait for DB connection before starting server
//     app.listen(PORT, () => {
//       console.log(`✅ Server running on port ${PORT}`);
//     });
//   } catch (err) {
//     console.error('❌ Failed to start server:', err.message);
//     process.exit(1); // Exit process if DB fails
//   }
// };

// startServer();
require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(console.error);
