import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.model.js';
import Transaction from '../src/models/Transaction.model.js';
import { connectInMemoryDB, disconnectInMemoryDB, clearDatabase } from './setup.js';
import dotenv from 'dotenv';
dotenv.config();

let adminToken;
let normalToken;
let normalUserId;

beforeAll(async () => {
  await connectInMemoryDB();
  // seed admin user manually (matching env ADMIN_EMAIL)
  const adminSignup = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Admin',
    last_name: 'User',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    phone_number: '000999888'
  });
  adminToken = adminSignup.body.data.token;

  // create normal user
  const userSignup = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Regular',
    last_name: 'User',
    email: 'regular@example.com',
    password: 'RegPass123',
    phone_number: '123123123'
  });
  normalToken = userSignup.body.data.token;
  normalUserId = userSignup.body.data.id;
});

afterEach(async () => {
  await clearDatabase();
  // reseed admin and normal for isolation
  const adminRes = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Admin',
    last_name: 'User',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    phone_number: '000999888'
  });
  adminToken = adminRes.body.data.token;

  const userRes = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Regular',
    last_name: 'User',
    email: 'regular@example.com',
    password: 'RegPass123',
    phone_number: '123123123'
  });
  normalToken = userRes.body.data.token;
  normalUserId = userRes.body.data.id;
});

afterAll(async () => {
  await disconnectInMemoryDB();
});

describe('Admin Controller', () => {
  const adminAuth = () => `Bearer ${adminToken}`;
  const userAuth = () => `Bearer ${normalToken}`;

  it('should list all users (admin)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', adminAuth());
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // at least admin + regular
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('should forbid non-admin from accessing admin endpoints', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', userAuth());
    expect(res.statusCode).toBe(403);
    expect(res.body.status).toBe('error');
  });

  it('should update user status to banned and back', async () => {
    // ban regular user
    const list = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', adminAuth());
    const regular = list.body.data.find(u => u.email === 'regular@example.com');
    expect(regular).toBeDefined();

    const banRes = await request(app)
      .patch(`/api/v1/admin/users/${regular.id}/status`)
      .set('Authorization', adminAuth())
      .send({ status: 'banned' });
    expect(banRes.statusCode).toBe(200);
    expect(banRes.body.data.status).toBe('banned');

    const unbanRes = await request(app)
      .patch(`/api/v1/admin/users/${regular.id}/status`)
      .set('Authorization', adminAuth())
      .send({ status: 'active' });
    expect(unbanRes.statusCode).toBe(200);
    expect(unbanRes.body.data.status).toBe('active');
  });

  it('should reject invalid status update', async () => {
    const list = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', adminAuth());
    const regular = list.body.data.find(u => u.email === 'regular@example.com');
    const res = await request(app)
      .patch(`/api/v1/admin/users/${regular.id}/status`)
      .set('Authorization', adminAuth())
      .send({ status: 'unknown' });
    expect(res.statusCode).toBe(400);
  });

  it('should return analytics with transactions grouped by category', async () => {
    // create some transactions under regular user
    // login as regular to create
    const addIncome = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', userAuth())
      .send({
        type: 'income',
        category: 'Consulting',
        amount: 800,
        date: '2025-08-01'
      });
    const addExpense = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', userAuth())
      .send({
        type: 'expense',
        category: 'Consulting',
        amount: 200,
        date: '2025-08-02'
      });

    const analytics = await request(app)
      .get('/api/v1/admin/analytics/transactions')
      .set('Authorization', adminAuth());

    expect(analytics.statusCode).toBe(200);
    expect(Array.isArray(analytics.body.data)).toBe(true);
    const consulting = analytics.body.data.find(item => item.category === 'Consulting');
    expect(consulting).toBeDefined();
    expect(consulting.total_income).toBe(800);
    expect(consulting.total_expense).toBe(200);
  });

  it('should require admin for analytics', async () => {
    const res = await request(app)
      .get('/api/v1/admin/analytics/transactions')
      .set('Authorization', userAuth());
    expect(res.statusCode).toBe(403);
  });
});
