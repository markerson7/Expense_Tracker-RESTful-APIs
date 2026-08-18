import { jest } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/User.model.js';
import jwt from 'jsonwebtoken';
import { connectInMemoryDB, disconnectInMemoryDB, clearDatabase } from './setup.js';
import dotenv from 'dotenv';
dotenv.config();

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

describe('Auth Controller extra branch coverage', () => {
  it('should fail signup when User.save throws', async () => {
    jest.setTimeout(15000); // Increase timeout for this test
    const spy = jest.spyOn(User.prototype, 'save').mockRejectedValueOnce(new Error('save error'));
    const res = await request(app).post('/api/v1/auth/signup').send({
      first_name: 'Err',
      last_name: 'User',
      email: `err${Date.now()}@example.com`,
      password: 'Password123',
      phone_number: '0799999999'
    });
    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toMatch(/save error/i);
    spy.mockRestore();
  });

  it('should fail signup when required fields are missing', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      first_name: 'OnlyName'
      // missing last_name, email, password, phone_number
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toMatch(/missing/i);
  });

  it('should fail login when jwt.sign throws (simulate during token creation)', async () => {
    const email = `testlogin${Date.now()}@example.com`;

    await request(app).post('/api/v1/auth/signup').send({
      first_name: 'Test',
      last_name: 'User',
      email,
      password: 'Password123',
      phone_number: '0781234567'
    });

    const signSpy = jest.spyOn(jwt, 'sign').mockImplementation(() => {
      throw new Error('jwt failure');
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email,
      password: 'Password123'
    });

    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toMatch(/jwt failure/i);

    signSpy.mockRestore();
  });

  it('should fail login when email or password missing', async () => {
    const res1 = await request(app).post('/api/v1/auth/login').send({ email: 'a@b.com' });
    expect(res1.statusCode).toBe(400);
    const res2 = await request(app).post('/api/v1/auth/login').send({ password: 'pw' });
    expect(res2.statusCode).toBe(400);
  });

  it('should return error when login internal error happens (mock User.findOne)', async () => {
    jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('lookup failure'));
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'nonexistent@example.com',
      password: 'whatever'
    });
    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toMatch(/lookup failure/i);
  });
});
