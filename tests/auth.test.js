import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.model.js';
import { connectInMemoryDB, disconnectInMemoryDB, clearDatabase } from './setup.js';
import dotenv from 'dotenv';
dotenv.config();

beforeAll(async () => {
  await connectInMemoryDB();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectInMemoryDB();
});

describe('Auth Controller', () => {
  const userPayload = {
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'alice@example.com',
    password: 'StrongPass123',
    phone_number: '0987654321'
  };

  it('should sign up a new user successfully', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send(userPayload);
    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.email).toBe(userPayload.email);
    expect(res.body.data.token).toBeDefined();
  });

  it('should not allow duplicate email signup', async () => {
    await request(app).post('/api/v1/auth/signup').send(userPayload);
    const res2 = await request(app).post('/api/v1/auth/signup').send(userPayload);
    expect(res2.statusCode).toBe(409);
    expect(res2.body.status).toBe('error');
    expect(res2.body.error || res2.body).toBeDefined();
  });

  it('should login with correct credentials', async () => {
    await request(app).post('/api/v1/auth/signup').send(userPayload);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userPayload.email, password: userPayload.password });
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    await request(app).post('/api/v1/auth/signup').send(userPayload);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userPayload.email, password: 'WrongPassword' });
    expect(res.statusCode).toBe(401);
    expect(res.body.status).toBe('error');
  });

  it('should reject login for non-existing user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'noone@example.com', password: 'whatever' });
    expect(res.statusCode).toBe(401);
    expect(res.body.status).toBe('error');
  });

  it('should prevent banned user from logging in', async () => {
    // Create user and ban manually
    const signup = await request(app).post('/api/v1/auth/signup').send(userPayload);
    const user = await User.findOne({ email: userPayload.email });
    user.status = 'banned';
    await user.save();

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userPayload.email, password: userPayload.password });
    expect(res.statusCode).toBe(403);
    expect(res.body.status).toBe('error');
  });

  it('should fail signup if required fields missing', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      first_name: 'Bob'
      // missing last_name, email, password
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
  });
});
