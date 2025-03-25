import express from 'express';
import { initializeAgent, processMessage, getAgentStatus } from '../controllers/agentController.js';

const router = express.Router();

/**
 * Agent routes for interacting with the Aptos blockchain via move-agent-kit
 */

// Initialize agent with private key
router.post('/initialize', initializeAgent);

// Process a message with the AI agent
router.post('/message', processMessage);

// Get agent status
router.get('/status', getAgentStatus);

export default router; 