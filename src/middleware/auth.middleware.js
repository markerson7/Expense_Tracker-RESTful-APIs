import jwt from 'jsonwebtoken';
import User from '../models/User.model.js';
import dotenv from 'dotenv';
dotenv.config();

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', error: 'Unauthorized' });
    }
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ status: 'error', error: 'User not found' });
    if (user.status === 'banned') return res.status(403).json({ status: 'error', error: 'User is banned' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  // Simplest: define admin by email from env or add role in schema
  if (req.user.email !== process.env.ADMIN_EMAIL) {
    return res.status(403).json({ status: 'error', error: 'Admin access required' });
  }
  next();
};

export { authenticate, requireAdmin };
