import express from 'express';
import { getSummary } from '../../controllers/summary.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticate, getSummary);

export default router;
