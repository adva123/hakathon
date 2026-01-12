import express from 'express';
import gameController from '../controllers/gameController.js';

const router = express.Router();

router.post('/add-score', gameController.updateScore);
router.get('/stats/:userId', gameController.getStats);

export default router;
