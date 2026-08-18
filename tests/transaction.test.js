import request from 'supertest';
import app from '../src/app.js';
import { connectInMemoryDB, disconnectInMemoryDB, clearDatabase } from './setup.js';
import dotenv from 'dotenv';
dotenv.config();

let token;
let userId;

beforeAll(async () => {
  await connectInMemoryDB();
  // create user and login
  const signupRes = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Tracy',
    last_name: 'Jones',
    email: 'tracy@example.com',
    password: 'Password123',
    phone_number: '111222333'
  });
  token = signupRes.body.data.token;
  userId = signupRes.body.data.id;
});

afterEach(async () => {
  await clearDatabase();
  // recreate user/login for isolation
  const signupRes = await request(app).post('/api/v1/auth/signup').send({
    first_name: 'Tracy',
    last_name: 'Jones',
    email: 'tracy@example.com',
    password: 'Password123',
    phone_number: '111222333'
  });
  token = signupRes.body.data.token;
  userId = signupRes.body.data.id;
});

afterAll(async () => {
  await disconnectInMemoryDB();
});

describe('Transaction Controller', () => {
  const authHeader = () => `Bearer ${token}`;

  it('should add income transaction', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        type: 'income',
        category: 'Salary',
        amount: 500,
        date: '2025-01-01',
        description: 'Monthly pay'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.type).toBe('income');
    expect(res.body.data.amount).toBe(500);
  });

  it('should add expense transaction', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        type: 'expense',
        category: 'Food',
        amount: 50,
        date: '2025-02-01',
        description: 'Lunch'
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.type).toBe('expense');
    expect(res.body.data.amount).toBe(50);
  });

  it('should fetch all transactions with filters', async () => {
    // create two
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        type: 'income',
        category: 'Salary',
        amount: 400,
        date: '2025-03-01'
      });
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        type: 'expense',
        category: 'Transport',
        amount: 30,
        date: '2025-03-05'
      });

    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', authHeader())
      .query({ category: 'Transport' });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].category).toBe('Transport');
  });

  it('should get one transaction by id', async () => {
    const create = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        type: 'income',
        category: 'Freelance',
        amount: 150,
        date: '2025-04-01'
      });
    const txId = create.body.data.id;
    const res = await request(app)
      .get(`/api/v1/transactions/${txId}`)
      .set('Authorization', authHeader());
    expect(res.statusCode).toBe(200);
    expect(res.body.data.id).toBe(txId);
  });

  it('should update a transaction', async () => {
    const create = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        type: 'expense',
        category: 'Entertainment',
        amount: 80,
        date: '2025-05-01'
      });
    const txId = create.body.data.id;

    const updated = await request(app)
      .patch(`/api/v1/transactions/${txId}`)
      .set('Authorization', authHeader())
      .send({ amount: 100, category: 'Leisure' });

    expect(updated.statusCode).toBe(200);
    expect(updated.body.data.amount).toBe(100);
    expect(updated.body.data.category).toBe('Leisure');
  });

  it('should delete a transaction', async () => {
    const create = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({
        type: 'expense',
        category: 'Bills',
        amount: 60,
        date: '2025-06-01'
      });
    const txId = create.body.data.id;

    const del = await request(app)
      .delete(`/api/v1/transactions/${txId}`)
      .set('Authorization', authHeader());

    expect(del.statusCode).toBe(200);
    expect(del.body.data.message).toMatch(/deleted/i);

    // ensure gone
    const get = await request(app)
      .get(`/api/v1/transactions/${txId}`)
      .set('Authorization', authHeader());
    expect(get.statusCode).toBe(404);
  });

  it('should reject requests with missing token', async () => {
    const res = await request(app).get('/api/v1/transactions');
    expect(res.statusCode).toBe(401);
  });

  it('should reject creating transaction with missing fields', async () => {
    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', authHeader())
      .send({ type: 'income' }); // missing others
    expect(res.statusCode).toBe(400);
  });
});
