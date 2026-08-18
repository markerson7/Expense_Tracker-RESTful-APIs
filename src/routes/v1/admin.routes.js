import express from 'express';
import { listUsers, updateStatus, transactionsAnalytics } from '../../controllers/admin.controller.js';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate, requireAdmin);

router.get('/users', listUsers);
router.patch('/users/:id/status', updateStatus);
router.get('/analytics/transactions', transactionsAnalytics);

export default router;
