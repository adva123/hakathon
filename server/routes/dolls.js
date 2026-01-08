import express from 'express';
import dollsController from '../controllers/dollsController.js';

const router = express.Router();

// POST /api/dolls/generate
router.post('/generate', dollsController.generateDoll);

// GET /api/dolls
router.get('/', dollsController.getAllDolls);

// DELETE /api/dolls/:id
router.delete('/:id', dollsController.deleteDoll);

export default router;
