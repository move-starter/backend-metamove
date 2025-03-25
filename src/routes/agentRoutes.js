import express from 'express';
import { 
    initializeAgent, 
    processMessage, 
    getAgentStatus, 
    getAllAgents, 
    removeAgent,
    getUserAgents,
    removeUserAgents,
    updateAgentName,
    cleanupInactiveAgents
} from '../controllers/agentController.js';
import { rateLimiter, validateRequest } from '../middleware/securityMiddleware.js';

const router = express.Router();

/**
 * Agent routes for interacting with the Aptos blockchain via move-agent-kit
 * Supports multiple agents per user with enhanced security
 */

// Security middleware for all routes
router.use(rateLimiter);

// Agent creation and message processing
router.post('/initialize', validateRequest('body', ['privateKey', 'userId']), initializeAgent);
router.post('/message', validateRequest('body', ['agentId', 'messages']), processMessage);

// User agent management
router.get('/user/:userId', validateRequest('params', ['userId']), getUserAgents);
router.delete('/user/:userId', validateRequest('params', ['userId']), removeUserAgents);

// Agent-specific operations
router.get('/:agentId', validateRequest('params', ['agentId']), getAgentStatus);
router.put('/:agentId/name', validateRequest('params, body', ['agentId', 'name']), updateAgentName);
router.delete('/:agentId', validateRequest('params', ['agentId']), removeAgent);

// Admin endpoints (should have authentication middleware in production)
router.get('/admin/all', getAllAgents);
router.post('/admin/cleanup', cleanupInactiveAgents);

export default router; 