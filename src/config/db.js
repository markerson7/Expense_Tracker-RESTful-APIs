import mongoose from 'mongoose';

let _isConnected = false;
export const getIsConnected = () => _isConnected;
export const setIsConnected = (val) => { _isConnected = val; };

export const connectDB = async (uri) => {
  try {
    if (_isConnected && mongoose.connection.readyState === 1) {
      return; // already connected
    }
    await mongoose.connect(uri);
    _isConnected = true;
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    _isConnected = false;
  }
};

export {connectDB as default} from './db.js';