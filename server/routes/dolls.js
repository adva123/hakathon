import express from 'express';
import { generateDoll, getUserDolls } from '../controllers/dollsController.js';

const router = express.Router();


// POST /api/dolls/generate
router.post('/generate', generateDoll);

// GET /api/dolls
router.get('/', getUserDolls);

export default router;
