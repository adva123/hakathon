import express from 'express';
import userController from '../controllers/userController.js';

const router = express.Router();


router.post('/login', userController.login);
router.get('/profile/:userId', userController.getProfile);
router.get('/:userId/robots', userController.getOwnedRobots);
router.post('/:userId/robots', userController.addOwnedRobot);

export default router;
