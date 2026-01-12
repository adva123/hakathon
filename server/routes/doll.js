import express from 'express';
import { generateDoll, getUserDolls } from '../controllers/dollsController.js';

const router = express.Router();

router.post('/generate', generateDoll);
router.get('/history/:userId', getUserDolls);

export default router;
