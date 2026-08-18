import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.model.js';
import Transaction from '../src/models/Transaction.model.js';
import jwt from 'jsonwebtoken';
import { connectInMemoryDB, disconnectInMemoryDB, clearDatabase } from './setup.js';
import dotenv from 'dotenv';
dotenv.config();

let adminToken;
let normalToken;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectInMemoryDB();

  // seed admin user
  const adminRes = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Admin',
    last_name: 'Test',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    phone_number: '0780000000'
  });
  adminToken = adminRes.body.data.token;

  const userRes = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Normal',
    last_name: 'User',
    email: 'normal@example.com',
    password: 'Password123',
     phone_number: '0780000000'
  });
  normalToken = userRes.body.data.token;
});

afterEach(async () => {
  jest.restoreAllMocks();
  await clearDatabase();
  // reseed admin + normal to keep consistent
  const adminRes = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Admin',
    last_name: 'Test',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    phone_number: '0780000001'
  });
  adminToken = adminRes.body.data.token;
  const userRes = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Normal',
    last_name: 'User',
    email: 'normal@example.com',
    password: 'Password123',
    phone_number: '0780000001'
  });
  normalToken = userRes.body.data.token;
});

afterAll(async () => {
  await disconnectInMemoryDB();
});

describe('Admin Controller extra branch coverage', () => {
  const adminAuth = () => `Bearer ${adminToken}`;
  const userAuth = () => `Bearer ${normalToken}`;

  // it('should handle listUsers internal error', async () => {
  //   jest.spyOn(User, 'find').mockRejectedValueOnce(new Error('list failure'));
  //   const res = await request(app)
  //     .get('/api/v1/admin/users')
  //     .set('Authorization', adminAuth());
  //   expect(res.statusCode).toBe(500);
  //   expect(res.body.error).toMatch(/list failure/i);
  // });

  // it('should return 404 when updating status of non-existent user', async () => {
  //   const fakeId = '64ffffffffffffffffffffffff'; // valid-ish but unlikely
  //   const res = await request(app)
  //     .patch(`/api/v1/admin/users/${fakeId}/status`)
  //     .set('Authorization', adminAuth())
  //     .send({ status: 'active' });
  //   expect(res.statusCode).toBe(404);
  // });

  it('should handle analytics internal error', async () => {
    jest.spyOn(Transaction, 'aggregate').mockRejectedValueOnce(new Error('agg failure'));
    const res = await request(app)
      .get('/api/v1/admin/analytics/transactions')
      .set('Authorization', adminAuth());
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/failed to get analytics/i);
  });

  it('should reject updating status with invalid status value', async () => {
    // get a user to update
    const list = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', adminAuth());
    const someUser = list.body.data.find(u => u.email === 'normal@example.com');
    const res = await request(app)
      .patch(`/api/v1/admin/users/${someUser.id}/status`)
      .set('Authorization', adminAuth())
      .send({ status: 'not-valid' });
    expect(res.statusCode).toBe(400);
  });
});

