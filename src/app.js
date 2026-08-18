import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import { connectDB } from './config/db.js';
import authRoutes from './routes/v1/auth.routes.js';
import transactionRoutes from './routes/v1/transaction.routes.js';
import summaryRoutes from './routes/v1/summary.routes.js';
import adminRoutes from './routes/v1/admin.routes.js';
import { notFound, generalError } from './middleware/error.middleware.js';

const app = express();
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  connectDB(process.env.MONGODB_URI);
}

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/summary', summaryRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFound);
app.use(generalError);

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
