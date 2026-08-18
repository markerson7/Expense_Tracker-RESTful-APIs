import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import * as setupModule from './tests/setup.js';
let setup = { ...setupModule }; // Create a shallow copy to allow property assignment
import { MongoMemoryServer } from 'mongodb-memory-server';
// import { mongoServer, disconnectInMemoryDB } from './tests/setup.js'; 
import { setMongoServer, disconnectInMemoryDB } from './tests/setup.js';
import * as db from './src/config/db.js';

MongoMemoryServer.create = jest.fn();

// Mock response.util.js before importing the controller
const mockSuccess = jest.fn((res, data, code) =>
  res.status(code || 200).json({ status: 'success', data })
);
const mockError = jest.fn((res, msg, code) =>
  res.status(code || 500).json({ status: 'error', error: msg })
);

jest.unstable_mockModule('./src/utils/response.util.js', () => ({
  success: mockSuccess,
  error: mockError,
}));

let controller;
let Transaction;

beforeAll(async () => {
  controller = await import('./src/controllers/transaction.controller.js');
  Transaction = (await import('./src/models/Transaction.model.js')).default;
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnThis();
  res.json = jest.fn().mockReturnThis();
  return res;
};

describe('transaction.controller', () => {
  afterEach(() => jest.clearAllMocks());

  describe('addTransaction', () => {
    it('should error if required fields missing', async () => {
      const req = { body: { type: 'income' }, user: { _id: 'u1' } };
      const res = mockRes();
      await controller.addTransaction(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/missing/i), 400);
    });

    it('should save and return transaction', async () => {
      const req = {
        body: { type: 'income', category: 'cat', amount: 1, date: '2024-01-01', description: 'desc' },
        user: { _id: 'u1' }
      };
      const res = mockRes();
      jest.spyOn(Transaction.prototype, 'save').mockResolvedValueOnce();
      Transaction.prototype.toResponse = () => ({ id: 'tx1' });
      await controller.addTransaction(req, res);
      expect(mockSuccess).toHaveBeenCalledWith(res, { id: 'tx1' }, 201);
    });

    it('should catch save error', async () => {
      const req = { body: { type: 'income', category: 'cat', amount: 1, date: '2024-01-01' }, user: { _id: 'u1' } };
      const res = mockRes();
      jest.spyOn(Transaction.prototype, 'save').mockRejectedValueOnce(new Error('fail'));
      await controller.addTransaction(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/fail/), 500);
    });
  });

  describe('getAll', () => {
    it('should return filtered transactions', async () => {
      const req = { query: { category: 'cat' }, user: { _id: 'u1' } };
      const res = mockRes();
      const txs = [{ toResponse: () => ({ id: 'tx1' }) }];
      jest.spyOn(Transaction, 'find').mockReturnValueOnce({ sort: () => Promise.resolve(txs) });
      await controller.getAll(req, res);
      expect(mockSuccess).toHaveBeenCalledWith(res, [{ id: 'tx1' }]);
    });

    it('should handle date filters', async () => {
      const req = { query: { start_date: '2024-01-01', end_date: '2024-01-31' }, user: { _id: 'u1' } };
      const res = mockRes();
      jest.spyOn(Transaction, 'find').mockReturnValueOnce({ sort: () => Promise.resolve([]) });
      await controller.getAll(req, res);
      expect(mockSuccess).toHaveBeenCalledWith(res, []);
    });

    it('should catch find error', async () => {
      const req = { query: {}, user: { _id: 'u1' } };
      const res = mockRes();
      jest.spyOn(Transaction, 'find').mockImplementationOnce(() => { throw new Error('fail'); });
      await controller.getAll(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/fail/), 500);
    });
  });

  describe('getOne', () => {
    it('should return transaction', async () => {
      const req = { params: { transactionId: 'tx1' }, user: { _id: 'u1' } };
      const res = mockRes();
      const tx = { toResponse: () => ({ id: 'tx1' }) };
      jest.spyOn(Transaction, 'findOne').mockResolvedValueOnce(tx);
      await controller.getOne(req, res);
      expect(mockSuccess).toHaveBeenCalledWith(res, { id: 'tx1' });
    });

    it('should 404 if not found', async () => {
      const req = { params: { transactionId: 'tx1' }, user: { _id: 'u1' } };
      const res = mockRes();
      jest.spyOn(Transaction, 'findOne').mockResolvedValueOnce(null);
      await controller.getOne(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/not found/i), 404);
    });

    it('should catch findOne error', async () => {
      const req = { params: { transactionId: 'tx1' }, user: { _id: 'u1' } };
      const res = mockRes();
      jest.spyOn(Transaction, 'findOne').mockRejectedValueOnce(new Error('fail'));
      await controller.getOne(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/fail/), 500);
    });
  });

  describe('updateOne', () => {
    it('should update and return transaction', async () => {
      const req = { params: { transactionId: 'tx1' }, body: { amount: 2 }, user: { _id: 'u1' } };
      const res = mockRes();
      const tx = { toResponse: () => ({ id: 'tx1', amount: 2 }) };
      jest.spyOn(Transaction, 'findOneAndUpdate').mockResolvedValueOnce(tx);
      await controller.updateOne(req, res);
      expect(mockSuccess).toHaveBeenCalledWith(res, { id: 'tx1', amount: 2 });
    });

    it('should 404 if not found', async () => {
      const req = { params: { transactionId: 'tx1' }, body: {}, user: { _id: 'u1' } };
      const res = mockRes();
      jest.spyOn(Transaction, 'findOneAndUpdate').mockResolvedValueOnce(null);
      await controller.updateOne(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/not found/i), 404);
    });

    it('should catch update error', async () => {
      const req = { params: { transactionId: 'tx1' }, body: {}, user: { _id: 'u1' } };
      const res = mockRes();
      jest.spyOn(Transaction, 'findOneAndUpdate').mockRejectedValueOnce(new Error('fail'));
      await controller.updateOne(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/fail/), 500);
    });
  });

  describe('deleteOne', () => {
    it('should delete and return success', async () => {
      const req = { params: { transactionId: 'tx1' }, user: { _id: 'u1' } };
      const res = mockRes();
      jest.spyOn(Transaction, 'findOneAndDelete').mockResolvedValueOnce({});
      await controller.deleteOne(req, res);
      expect(mockSuccess).toHaveBeenCalledWith(res, { message: expect.any(String) });
    });

    it('should 404 if not found', async () => {
      const req = { params: { transactionId: 'tx1' }, user: { _id: 'u1' } };
      const res = mockRes();
      jest.spyOn(Transaction, 'findOneAndDelete').mockResolvedValueOnce(null);
      await controller.deleteOne(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/not found/i), 404);
    });

    it('should catch delete error', async () => {
      const req = { params: { transactionId: 'tx1' }, user: { _id: 'u1' } };
      const res = mockRes();
      jest.spyOn(Transaction, 'findOneAndDelete').mockRejectedValueOnce(new Error('fail'));
      await controller.deleteOne(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/fail/), 500);
    });
  });
});

///////////////////////////////////

// Mock success/error before importing

jest.unstable_mockModule('./src/utils/response.util.js', () => ({
  success: mockSuccess,
  error: mockError,
}));

let summaryController;

beforeAll(async () => {
  summaryController = await import('./src/controllers/summary.controller.js');
  Transaction = (await import('./src/models/Transaction.model.js')).default;
});


describe('summary.controller', () => {
  afterEach(() => jest.clearAllMocks());

  it('should return summary with totals', async () => {
    const req = { user: { _id: 'u1' } };
    const res = mockRes();
    jest.spyOn(Transaction, 'aggregate')
      .mockResolvedValueOnce([{ total: 100 }])
      .mockResolvedValueOnce([{ total: 50 }]);
    await summaryController.getSummary(req, res);
    expect(mockSuccess).toHaveBeenCalledWith(res, {
      total_income: 100,
      total_expenses: 50,
      balance: 50
    });
  });

  it('should handle zero transactions', async () => {
    const req = { user: { _id: 'u1' } };
    const res = mockRes();
    jest.spyOn(Transaction, 'aggregate')
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await summaryController.getSummary(req, res);
    expect(mockSuccess).toHaveBeenCalledWith(res, {
      total_income: 0,
      total_expenses: 0,
      balance: 0
    });
  });

  it('should catch error', async () => {
    const req = { user: { _id: 'u1' } };
    const res = mockRes();
    jest.spyOn(Transaction, 'aggregate').mockRejectedValueOnce(new Error('fail'));
    await summaryController.getSummary(req, res);
    expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/fail/), 500);
  });
});


// Mock before importing
jest.unstable_mockModule('./src/utils/response.util.js', () => ({
  success: mockSuccess,
  error: mockError,
}));

let adminController;
let User;

beforeAll(async () => {
  adminController = await import('./src/controllers/admin.controller.js');
  User = (await import('./src/models/User.model.js')).default;
  Transaction = (await import('./src/models/Transaction.model.js')).default;
});


describe('admin.controller', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listUsers', () => {
    it('should return users', async () => {
      const res = mockRes();
      const users = [{
        _id: 'u1', first_name: 'A', last_name: 'B', email: 'a@b.com', phone_number: '123', created_on: 'd', status: 'active'
      }];
      jest.spyOn(User, 'find').mockReturnValueOnce({ sort: () => Promise.resolve(users) });
      await adminController.listUsers({}, res);
      expect(mockSuccess).toHaveBeenCalledWith(res, [{
        id: 'u1', first_name: 'A', last_name: 'B', email: 'a@b.com', phone_number: '123', created_on: 'd', status: 'active'
      }]);
    });

    it('should catch error', async () => {
      const res = mockRes();
      jest.spyOn(User, 'find').mockImplementationOnce(() => { throw new Error('fail'); });
      await adminController.listUsers({}, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/failed/i), 500);
    });
  });

  describe('updateStatus', () => {
    it('should error for invalid status', async () => {
      const req = { params: { id: 'u1' }, body: { status: 'bad' } };
      const res = mockRes();
      await adminController.updateStatus(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/invalid/i), 400);
    });

    it('should error if user not found', async () => {
      const req = { params: { id: 'u1' }, body: { status: 'active' } };
      const res = mockRes();
      jest.spyOn(User, 'findById').mockResolvedValueOnce(null);
      await adminController.updateStatus(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/not found/i), 404);
    });

    it('should update and return user', async () => {
      const req = { params: { id: 'u1' }, body: { status: 'active' } };
      const res = mockRes();
      const user = {
        _id: 'u1', first_name: 'A', last_name: 'B', email: 'a@b.com', status: 'active',
        save: jest.fn().mockResolvedValueOnce()
      };
      jest.spyOn(User, 'findById').mockResolvedValueOnce(user);
      await adminController.updateStatus(req, res);
      expect(mockSuccess).toHaveBeenCalledWith(res, {
        id: 'u1', first_name: 'A', last_name: 'B', email: 'a@b.com', status: 'active'
      });
    });

    it('should catch error', async () => {
      const req = { params: { id: 'u1' }, body: { status: 'active' } };
      const res = mockRes();
      jest.spyOn(User, 'findById').mockRejectedValueOnce(new Error('fail'));
      await adminController.updateStatus(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/fail/), 500);
    });
  });

  describe('transactionsAnalytics', () => {
    it('should return analytics grouped by category/type', async () => {
      const req = { user: { _id: 'u1' } };
      const res = mockRes();
      const grouped = [
        { category: 'Food', type: 'income', total: 10 },
        { category: 'Food', type: 'expense', total: 5 },
        { category: 'Travel', type: 'income', total: 20 }
      ];
      jest.spyOn(Transaction, 'aggregate').mockResolvedValueOnce(grouped);
      await adminController.transactionsAnalytics(req, res);
      expect(mockSuccess).toHaveBeenCalledWith(res, [
        { category: 'Food', total_income: 10, total_expense: 5 },
        { category: 'Travel', total_income: 20, total_expense: 0 }
      ]);
    });

    it('should catch error', async () => {
      const req = { user: { _id: 'u1' } };
      const res = mockRes();
      jest.spyOn(Transaction, 'aggregate').mockRejectedValueOnce(new Error('fail'));
      await adminController.transactionsAnalytics(req, res);
      expect(mockError).toHaveBeenCalledWith(res, expect.stringMatching(/failed/i), 500);
    });
  });
});


/////////////////////////////////

import { success, error } from './src/utils/response.util.js';

describe('response.util', () => {
  let res;
  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('success', () => {
    it('should use default statusCode and data', () => {
      success(res);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: {} });
    });

    it('should use custom statusCode and data', () => {
      success(res, { foo: 'bar' }, 201);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ status: 'success', data: { foo: 'bar' } });
    });
  });

  describe('error', () => {
    it('should use default message and statusCode', () => {
      error(res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', error: 'An error occurred' });
    });

    it('should use custom message and statusCode', () => {
      error(res, 'fail', 500);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ status: 'error', error: 'fail' });
    });
  });
});

//////////////////////////////////////////



jest.mock('mongodb-memory-server', () => ({
  MongoMemoryServer: {
    create: jest.fn(),
  },
}));

describe('setup.js', () => {
  let mongoServerMock;

  beforeEach(() => {
    mongoServerMock = {
      getUri: jest.fn().mockReturnValue('mongodb://localhost:27017/test'),
      stop: jest.fn(),
    };
    MongoMemoryServer.create.mockResolvedValue(mongoServerMock);
    jest.spyOn(mongoose, 'connect').mockResolvedValue();
    jest.spyOn(mongoose.connection, 'dropDatabase').mockResolvedValue();
    jest.spyOn(mongoose, 'disconnect').mockResolvedValue();
    mongoose.connection.readyState = 0;
    setup.mongoServer = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
    mongoose.connection.readyState = 0;
    setup.mongoServer = null;
  });

  it('should connect if not already connected', async () => {
    mongoose.connection.readyState = 0;
    await setup.connectInMemoryDB();
    expect(MongoMemoryServer.create).toHaveBeenCalled();
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test');
  });

  it('should not connect if already connected', async () => {
    mongoose.connection.readyState = 1;
    await setup.connectInMemoryDB();
    expect(MongoMemoryServer.create).not.toHaveBeenCalled();
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  describe('disconnectInMemoryDB', () => {
   it('should disconnect and stop server if connected', async () => {
  mongoose.connection.readyState = 1;
  setMongoServer(mongoServerMock);
  await disconnectInMemoryDB();
  expect(mongoose.connection.dropDatabase).toHaveBeenCalled();
  expect(mongoose.disconnect).toHaveBeenCalled();
  expect(mongoServerMock.stop).toHaveBeenCalled();
});

    it('should not disconnect if not connected', async () => {
      mongoose.connection.readyState = 0;
      setMongoServer(mongoServerMock);
      await disconnectInMemoryDB();
      expect(mongoose.connection.dropDatabase).not.toHaveBeenCalled();
      expect(mongoose.disconnect).not.toHaveBeenCalled();
      expect(mongoServerMock.stop).toHaveBeenCalled();
      expect(setup.mongoServer).toBeNull();
    });

    it('should not stop server if mongoServer is null', async () => {
      mongoose.connection.readyState = 0;
      setup.mongoServer = null;
      await disconnectInMemoryDB();
      expect(setup.mongoServer).toBeNull();
    });
  });

  describe('clearDatabase', () => {
    it('should clear all collections', async () => {
      const mockCollection = { deleteMany: jest.fn().mockResolvedValue() };
      mongoose.connection.collections = { a: mockCollection, b: mockCollection };
      await setup.clearDatabase();
      expect(mockCollection.deleteMany).toHaveBeenCalledTimes(2);
    });

    it('should handle empty collections', async () => {
      mongoose.connection.collections = {};
      await expect(setup.clearDatabase()).resolves.toBeUndefined();
    });
  });
});

//////////////////////////////////////////////////



jest.spyOn(mongoose, 'connect').mockResolvedValue();
jest.spyOn(mongoose, 'disconnect').mockResolvedValue();

describe('db.js', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset isConnected for each test
    db.setIsConnected(false);
  });

  it('should connect if not already connected', async () => {
    mongoose.connection.readyState = 0;
    await db.connectDB('mongodb://localhost:27017/test');
    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test');
  });

  it('should not connect if already connected', async () => {
    db.setIsConnected (true);
    mongoose.connection.readyState = 1;
    await db.connectDB('mongodb://localhost:27017/test');
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  it('should handle connection error', async () => {
    mongoose.connection.readyState = 0;
    mongoose.connect.mockRejectedValueOnce(new Error('fail'));
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await db.connectDB('mongodb://localhost:27017/test');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/MongoDB connection error/), expect.any(Error));
    expect(exitSpy).toHaveBeenCalledWith(1);
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should disconnect if connected', async () => {
    mongoose.connection.readyState = 1;
    await db.disconnectDB();
    expect(mongoose.disconnect).toHaveBeenCalled();
  });

  it('should not disconnect if not connected', async () => {
    mongoose.connection.readyState = 0;
    await db.disconnectDB();
    expect(mongoose.disconnect).not.toHaveBeenCalled();
  });
});

////////////////////////////////////////////////
