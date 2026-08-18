import mongoose from 'mongoose';
import User from '../src/models/User.model.js';
import Transaction from '../src/models/Transaction.model.js';
import { connectInMemoryDB, disconnectInMemoryDB, clearDatabase } from './setup.js';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectInMemoryDB();
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await disconnectInMemoryDB();
});

describe('Model helpers', () => {
  it('hashes password and comparePassword works', async () => {
    const user = new User({
      first_name: 'Hash',
      last_name: 'Test',
      email: 'hash@test.com',
      password: 'MySecret123'
    });
    await user.save();
    expect(user.password).not.toBe('MySecret123');
    const match = await user.comparePassword('MySecret123');
    expect(match).toBe(true);
    const wrong = await user.comparePassword('WrongPass');
    expect(wrong).toBe(false);
  });

  it('toResponse omits password and formats correctly', async () => {
    const user = new User({
      first_name: 'Resp',
      last_name: 'Test',
      email: 'resp@test.com',
      password: 'AnotherSecret'
    });
    await user.save();
    const resp = user.toResponse();
    expect(resp.email).toBe('resp@test.com');
    expect(resp).not.toHaveProperty('password');
    expect(resp).toHaveProperty('first_name');
    expect(resp).toHaveProperty('created_on');
  });

  it('transaction toResponse works', async () => {
    const fakeUserId = new mongoose.Types.ObjectId();
    const tx = new Transaction({
      user_id: fakeUserId,
      type: 'income',
      category: 'Test',
      amount: 123,
      date: new Date(),
      description: 'desc'
    });
    await tx.save();
    const resp = tx.toResponse();
    expect(resp.category).toBe('Test');
    expect(resp.amount).toBe(123);
    expect(resp).toHaveProperty('id');
  });
});
