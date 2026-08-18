import request from 'supertest';
import express from 'express';
import { notFound, generalError } from '../src/middleware/error.middleware.js';
import dotenv from 'dotenv';
dotenv.config();

// dummy app to exercise middleware
const app = express();
app.get('/throw', (req, res) => {
  throw new Error('boom');
});
app.use(notFound);
app.use(generalError);

describe('Error middleware', () => {
  it('should return 404 for unknown route', async () => {
    const res = await request(app).get('/nonexistent');
    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toMatch(/route not found/i);
  });

  it('should catch thrown errors and respond with 500', async () => {
    const res = await request(app).get('/throw');
    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
    expect(res.body.error).toMatch(/server error/i);
  });
});
