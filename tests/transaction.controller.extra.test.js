import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import Transaction from '../src/models/Transaction.model.js';
import User from '../src/models/User.model.js';
import { connectInMemoryDB, disconnectInMemoryDB, clearDatabase } from './setup.js';
import dotenv from 'dotenv';
dotenv.config();

// jest.setTimeout(20000);

let userToken;
let userId;

const createUserAndGetToken = async (overrides = {}) => {
  const payload = {
    first_name: 'Branch',
    last_name: 'Tester',
    email: `branch${Math.random().toString(36).substring(2, 8)}@example.com`,
    password: 'Password123',
    phone_number: '000111222',
    ...overrides
  };
  const signup = await request(app).post('/api/v1/auth/signup').send(payload);
  return { token: signup.body.data.token, id: signup.body.data.id };
};

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectInMemoryDB();
});

afterEach(async () => {
  jest.restoreAllMocks();
  await clearDatabase();
});

afterAll(async () => {
  await disconnectInMemoryDB();
});

describe('Transaction Controller extended branch coverage', () => {
  beforeEach(async () => {
    const { token, id } = await createUserAndGetToken();
    userToken = token;
    userId = id;
  });

  const authHeader = (token) => `Bearer ${token}`;

  it('should reject addTransaction when required fields missing', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader(userToken))
      .send({ type: 'income' }); // missing category, amount, date

    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toMatch(/missing required transaction fields/i);
  });

  it('should apply category filter in getAll and return only matching', async () => {
    // Add two transactions with different categories
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader(userToken))
      .send({
        type: 'expense',
        category: 'Food',
        amount: 10,
        date: '2025-01-01'
      });

    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader(userToken))
      .send({
        type: 'expense',
        category: 'Transport',
        amount: 20,
        date: '2025-01-02'
      });

    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', authHeader(userToken))
      .query({ category: 'Transport' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].category).toBe('Transport');
  });

  it('should apply date range filter in getAll', async () => {
    // Transactions on different dates
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader(userToken))
      .send({ type: 'income', category: 'A', amount: 100, date: '2025-03-01' });

    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader(userToken))
      .send({ type: 'income', category: 'B', amount: 200, date: '2025-04-01' });

    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', authHeader(userToken))
      .query({ start_date: '2025-03-15', end_date: '2025-04-15' });

    expect(res.statusCode).toBe(200);
    // only the 'B' transaction (2025-04-01) should fall in range
    expect(res.body.data.every(tx => new Date(tx.date) >= new Date('2025-03-15'))).toBe(true);
    expect(res.body.data.some(tx => tx.category === 'B')).toBe(true);
  });

  it('should return empty array when no transactions match filters', async () => {
    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', authHeader(userToken))
      .query({ category: 'Nonexistent' });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(0);
  });

  it('should return 404 for getOne when transaction does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .get(`/api/v1/transactions/${fakeId}`)
      .set('Authorization', authHeader(userToken));
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('should return 404 for updateOne when transaction does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .patch(`/api/v1/transactions/${fakeId}`)
      .set('Authorization', authHeader(userToken))
      .send({ amount: 999 });
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('should return 404 for deleteOne when transaction does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .delete(`/api/v1/transactions/${fakeId}`)
      .set('Authorization', authHeader(userToken));
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('should prevent one user from accessing another user’s transaction', async () => {
    // create another user and their transaction
    const { token: otherToken } = await createUserAndGetToken({
      email: `other${Math.random().toString(36).substring(2, 6)}@example.com`
    });
    const createRes = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader(otherToken))
      .send({
        type: 'expense',
        category: 'Shared',
        amount: 55,
        date: '2025-05-01'
      });
    const txId = createRes.body.data.id;

    const res = await request(app)
      .get(`/api/v1/transactions/${txId}`)
      .set('Authorization', authHeader(userToken));
    expect(res.statusCode).toBe(404);
  });

  // simulate internal errors to hit catch blocks
  it('should return 500 when Transaction.save throws', async () => {
    const spy = jest.spyOn(Transaction.prototype, 'save').mockRejectedValueOnce(new Error('save failure'));

    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader(userToken))
      .send({
        type: 'income',
        category: 'Test',
        amount: 10,
        date: '2025-06-01'
      });

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toMatch(/save failure/i);
    spy.mockRestore();
  });

  it('should return 500 when Transaction.find throws in getAll', async () => {
  // make find throw immediately so .sort is never reached and error is caught
  const spy = jest.spyOn(Transaction, 'find').mockImplementationOnce(() => {
    throw new Error('find failure');
  });

  const res = await request(app)
    .get('/api/v1/transactions')
    .set('Authorization', authHeader(userToken));

  expect(res.statusCode).toBe(500);
  expect(res.body.error).toMatch(/find failure/i);
  spy.mockRestore();
});


  it('should return 500 when findOne throws in getOne', async () => {
    const spy = jest.spyOn(Transaction, 'findOne').mockRejectedValueOnce(new Error('findOne failure'));

    const res = await request(app)
      .get(`/api/v1/transactions/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', authHeader(userToken));
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/findOne failure/i);
    spy.mockRestore();
  });

  it('should return 500 when findOneAndUpdate throws in updateOne', async () => {
    const spy = jest
      .spyOn(Transaction, 'findOneAndUpdate')
      .mockRejectedValueOnce(new Error('update failure'));

    const res = await request(app)
      .patch(`/api/v1/transactions/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', authHeader(userToken))
      .send({ amount: 500 });
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/update failure/i);
    spy.mockRestore();
  });

  it('should return 500 when findOneAndDelete throws in deleteOne', async () => {
    const spy = jest
      .spyOn(Transaction, 'findOneAndDelete')
      .mockRejectedValueOnce(new Error('delete failure'));

    const res = await request(app)
      .delete(`/api/v1/transactions/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', authHeader(userToken));
    expect(res.statusCode).toBe(500);
    expect(res.body.error).toMatch(/delete failure/i);
    spy.mockRestore();
  });
});
