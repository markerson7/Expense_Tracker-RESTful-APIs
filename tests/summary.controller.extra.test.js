import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import Transaction from '../src/models/Transaction.model.js';
import { connectInMemoryDB, disconnectInMemoryDB, clearDatabase } from './setup.js';
import dotenv from 'dotenv';
dotenv.config();

let token;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectInMemoryDB();
});

beforeEach(async () => {
  await clearDatabase();

  const signup = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Sum',
    last_name: 'User',
    email: 'sumuser@example.com',
    password: 'Password123',
    phone_number: '0781234567' // ✅ Required field
  });

  if (signup.statusCode !== 201) {
    console.error('Signup failed:', signup.body);
    throw new Error('Signup failed in setup');
  }

  token = signup.body.data.token;
});

afterAll(async () => {
  await disconnectInMemoryDB();
});

describe('Summary Controller extra branch coverage', () => {
  const authHeader = () => `Bearer ${token}`;

  it('should handle aggregate error for income', async () => {
    jest.spyOn(Transaction, 'aggregate').mockRejectedValueOnce(new Error('agg income failure'));
    const res = await request(app).get('/api/v1/summary').set('Authorization', authHeader());
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/agg income failure/i);
  });

  it('should handle when only income exists', async () => {
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        type: 'income',
        category: 'Solo',
        amount: 500,
        date: '2025-09-01'
      });

    const res = await request(app).get('/api/v1/summary').set('Authorization', authHeader());
    expect(res.statusCode).toBe(200);
    expect(res.body.data.total_income).toBe(500);
    expect(res.body.data.total_expenses).toBe(0);
    expect(res.body.data.balance).toBe(500);
  });

  it('should handle when only expenses exist', async () => {
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        type: 'expense',
        category: 'OnlyExpense',
        amount: 200,
        date: '2025-09-02'
      });

    const res = await request(app).get('/api/v1/summary').set('Authorization', authHeader());
    expect(res.statusCode).toBe(200);
    expect(res.body.data.total_income).toBe(0);
    expect(res.body.data.total_expenses).toBe(200);
    expect(res.body.data.balance).toBe(-200);
  });
});
