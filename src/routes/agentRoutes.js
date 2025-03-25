import express from 'express';
import { 
    initializeAgent, 
    processMessage, 
    getAgentStatus, 
    getAllAgents, 
    removeAgent 
} from '../controllers/agentController.js';

const router = express.Router();

/**
 * Agent routes for interacting with the Aptos blockchain via move-agent-kit
 * User-specific routes require a userId parameter
 */

// Initialize agent with private key for a specific user
router.post('/initialize', initializeAgent);

// Process a message with the AI agent for a specific user
router.post('/message', processMessage);

// Get agent status for a specific user
router.get('/status/:userId', getAgentStatus);

// Get all user agents (admin endpoint)
router.get('/admin/all', getAllAgents);

// Remove an agent for a specific user
router.delete('/:userId', removeAgent);

export default router; 