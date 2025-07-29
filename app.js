const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/authRoutes');
const careerRoutes = require('./routes/careerRoutes');
const session = require('express-session');
const passport = require('passport');
require('./config/passport');
const setupSwagger = require("./swagger"); // adjust path
const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use("/api/career", careerRoutes);

app.use(session({
  secret: 'your-secret',
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

setupSwagger(app); 


module.exports = app;
