import express from 'express';
import {
  addTransaction,
  getAll,
  getOne,
  updateOne,
  deleteOne
} from '../../controllers/transaction.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/', addTransaction);
router.get('/', getAll);
router.get('/:transactionId', getOne);
router.patch('/:transactionId', updateOne);
router.delete('/:transactionId', deleteOne);

export default router;
