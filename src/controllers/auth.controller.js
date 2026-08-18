import User from '../models/User.model.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
import { success, error } from '../utils/response.util.js';

const signToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '1d'
  });
};


const signup = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone_number } = req.body;
    if (!first_name || !last_name || !email || !password || !phone_number) {
      return error(res, 'Missing required fields', 400);
    }
    const existing = await User.findOne({ email });
    if (existing) return error(res, 'Email already in use', 409);

    const user = new User({ first_name, last_name, email, password, phone_number });
    await user.save();
    const token = signToken(user);
    return success(res, {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      token
    }, 201);
  } catch (err) {
    return error(res, err.message || 'Signup failed', 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'Email and password required', 400);
    const user = await User.findOne({ email });
    if (!user) return error(res, 'Invalid credentials', 401);
    const valid = await user.comparePassword(password);
    if (!valid) return error(res, 'Invalid credentials', 401);
    if (user.status === 'banned') return error(res, 'User is banned', 403);
    const token = signToken(user);
    return success(res, {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      token
    });
  } catch (err) {
    return error(res, err.message || 'Login failed', 500);
  }
};

export { signup, login };
