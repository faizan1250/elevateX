const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ message: 'Unauthorized' });

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔐 Decoded token:', decoded); // <-- Add this

    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ Token verification failed:', err);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

module.exports = auth;
