// tests/setup.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// let mongoServer;
export let mongoServer;


export const setMongoServer = (server) => {
  mongoServer = server;
};

export const connectInMemoryDB = async () => {
  if (mongoose.connection.readyState === 1) return; // already connected
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

export const disconnectInMemoryDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
};
