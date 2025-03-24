import express from 'express';
import { userController } from '../controllers/userController';

const router = express.Router();

// Register new user
router.post('/register', (req, res) => userController.register(req, res));

// Login user
router.post('/login', (req, res) => userController.login(req, res));

// Get user profile
router.get('/profile/:userId', (req, res) => userController.getProfile(req, res));

export default router; 