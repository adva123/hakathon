import express from 'express';
import shopController from '../controllers/shopController.js';

const router = express.Router();

router.post('/buy', shopController.buyItem);
router.get('/catalog', shopController.getCatalog);

export default router;
