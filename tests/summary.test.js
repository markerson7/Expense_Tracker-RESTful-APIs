import request from 'supertest';
import app from '../src/app.js';
import { connectInMemoryDB, disconnectInMemoryDB, clearDatabase } from './setup.js';
import dotenv from 'dotenv';
dotenv.config();

let token;

beforeAll(async () => {
  await connectInMemoryDB();
  const signup = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Mia',
    last_name: 'Brown',
    email: 'mia@example.com',
    password: 'Secret123',
    phone_number: '555444333'
  });
  token = signup.body.data.token;
});

afterEach(async () => {
  await clearDatabase();
  // re-create user and token
  const signup = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Mia',
    last_name: 'Brown',
    email: 'mia@example.com',
    password: 'Secret123',
    phone_number: '555444333'
  });
  token = signup.body.data.token;
});

afterAll(async () => {
  await disconnectInMemoryDB();
});

describe('Summary Controller', () => {
  const authHeader = () => `Bearer ${token}`;

  it('should return zeros if no transactions', async () => {
    const res = await request(app)
      .get('/api/v1/summary')
      .set('Authorization', authHeader());
    expect(res.statusCode).toBe(200);
    expect(res.body.data.total_income).toBe(0);
    expect(res.body.data.total_expenses).toBe(0);
    expect(res.body.data.balance).toBe(0);
  });

  it('should compute correct summary with mixed transactions', async () => {
    // income 1000
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        type: 'income',
        category: 'Salary',
        amount: 1000,
        date: '2025-07-01'
      });
    // expense 300
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        type: 'expense',
        category: 'Shopping',
        amount: 300,
        date: '2025-07-02'
      });

    const res = await request(app)
      .get('/api/v1/summary')
      .set('Authorization', authHeader());

    expect(res.statusCode).toBe(200);
    expect(res.body.data.total_income).toBe(1000);
    expect(res.body.data.total_expenses).toBe(300);
    expect(res.body.data.balance).toBe(700);
  });

  it('should require authentication', async () => {
    const res = await request(app).get('/api/v1/summary');
    expect(res.statusCode).toBe(401);
  });
});
