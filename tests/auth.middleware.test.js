import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

import User from '../src/models/User.model.js';
import { connectInMemoryDB, disconnectInMemoryDB, clearDatabase } from './setup.js';
import { authenticate, requireAdmin } from '../src/middleware/auth.middleware.js';

const app = express();
app.use(express.json());
app.get('/protected', authenticate, (req, res) => res.json({ ok: true }));
app.get('/admin-only', authenticate, requireAdmin, (req, res) => res.json({ admin: true }));

describe('Auth middleware edge cases', () => {
  let normalUser;
  let normalToken;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectInMemoryDB();
  });

  beforeEach(async () => {
    // create normal user fresh for each test
    await clearDatabase();
    normalUser = new User({
      first_name: 'Test',
      last_name: 'User',
      email: 'testuser@example.com',
      password: 'Password123'
    });
    await normalUser.save();
    normalToken = jwt.sign({ id: normalUser._id }, process.env.JWT_SECRET);
  });

  afterAll(async () => {
    await disconnectInMemoryDB();
  });

  it('rejects missing authorization header', async () => {
    const res = await request(app).get('/protected');
    expect(res.statusCode).toBe(401);
  });

  it('rejects malformed bearer token', async () => {
    const res = await request(app).get('/protected').set('Authorization', 'BearerBadToken');
    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.statusCode).toBe(401);
  });

  it('allows valid token', async () => {
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${normalToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects non-admin on admin route', async () => {
    const res = await request(app).get('/admin-only').set('Authorization', `Bearer ${normalToken}`);
    expect(res.statusCode).toBe(403);
  });

  it('allows admin on admin route', async () => {
    // create admin user matching env
    const adminUser = new User({
      first_name: 'Admin',
      last_name: 'User',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD
    });
    await adminUser.save();
    const adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET);
    const res = await request(app).get('/admin-only').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.admin).toBe(true);
  });
});
