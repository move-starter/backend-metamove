import express from 'express';
import { 
    initializeAgent, 
    processMessage, 
    getAgentStatus, 
    getAllAgents, 
    removeAgent,
    getUserAgents,
    removeUserAgents,
    updateAgentName
} from '../controllers/agentController.js';

const router = express.Router();

/**
 * Agent routes for interacting with the Aptos blockchain via move-agent-kit
 * Supports multiple agents per user
 */

// Create a new agent for a user
router.post('/initialize', initializeAgent);

// Process a message with a specific agent
router.post('/message', processMessage);

// Get all agents for a specific user
router.get('/user/:userId', getUserAgents);

// Get status of a specific agent
router.get('/:agentId', getAgentStatus);

// Update an agent's name
router.put('/:agentId/name', updateAgentName);

// Remove a specific agent
router.delete('/:agentId', removeAgent);

// Remove all agents for a specific user
router.delete('/user/:userId', removeUserAgents);

// Get all agents (admin endpoint)
router.get('/admin/all', getAllAgents);

export default router; 