const jwt = require('jsonwebtoken');

// middlewares/authMiddleware.js
const authMiddleware = (req, res, next) => {
  // Skip middleware for these paths
  if (req.path === '/api/auth/register' || req.path === '/api/auth/login') {
    return next();
  }

  // Rest of your authentication logic
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;