import { OpenAI } from 'openai';
import { ConversationService } from '../services/conversationService.js';
import { AgentService } from '../services/agentService.js';
import crypto from 'crypto';
import { sanitizeInput } from '../middleware/securityMiddleware.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize conversation service
const conversationService = new ConversationService();
// Initialize agent service
const agentService = new AgentService();

/**
 * Agent Controller - Handles AI agent and blockchain agent interactions
 * Enhanced with security features and input validation
 */

/**
 * Sanitize and validate user input
 * @param {string} input - Input to validate
 * @returns {string} - Sanitized input or throws error
 */
function validateInput(input) {
    if (typeof input !== 'string') {
        throw new Error('Input must be a string');
    }
    
    // Basic sanitization - remove potentially dangerous characters
    return input.replace(/[<>]/g, '');
}

/**
 * Calculate hash for logging (don't log sensitive data)
 * @param {string} text - Text to hash
 * @returns {string} - Hashed text
 */
function hashForLogging(text) {
    return crypto.createHash('sha256')
        .update(text)
        .digest('hex')
        .substring(0, 8); // Just use first 8 chars for logging
}

/**
 * Initialize agent for a user with security enhancements
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with agent status
 */
export const initializeAgent = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || 'unknown';
    
    try {
        const { userId, agentId, name } = req.body;

        // Validate required fields
        if (!userId || !name) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userId and name are required'
            });
        }

        // Sanitize inputs
        const sanitizedUserId = sanitizeInput(userId);
        const sanitizedName = sanitizeInput(name);
        const sanitizedAgentId = agentId ? sanitizeInput(agentId) : crypto.randomUUID();

        // Create or update agent with the specified ID
        const agent = await agentService.createOrUpdateAgent(
            sanitizedUserId,
            sanitizedAgentId,
            sanitizedName
        );

        // Log success without sensitive data
        const timeMs = Date.now() - startTime;
        console.log(`Agent initialized for user ${sanitizedUserId} in ${timeMs}ms, agent: ${sanitizedAgentId}`);
        
        return res.status(200).json({
            success: true,
            message: 'Agent initialized successfully',
            agent: {
                userId: agent.userId,
                agentId: agent.agentId,
                name: agent.name,
                createdAt: agent.createdAt
            }
        });
    } catch (error) {
        // Log error without revealing sensitive information
        const timeMs = Date.now() - startTime;
        console.error(`Error initializing agent [${timeMs}ms, IP: ${clientIP}]:`, error.message);
        
        // Determine appropriate error response
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Failed to initialize agent',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * Process a message with the LLM agent with security enhancements
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with agent reply
 */
export const processMessage = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || 'unknown';
    
    try {
        const { userId, agentId, message } = req.body;

        // Validate required fields
        if (!userId || !agentId || !message) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: userId, agentId, and message are required'
            });
        }

        // Sanitize inputs
        const sanitizedUserId = sanitizeInput(userId);
        const sanitizedAgentId = sanitizeInput(agentId);
        const sanitizedMessage = sanitizeInput(message);

        // Check if agent exists
        const agent = await agentService.getAgent(sanitizedUserId, sanitizedAgentId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found. Please initialize an agent first.'
            });
        }

        // Update last active timestamp
        await agentService.updateAgentActivity(sanitizedUserId, sanitizedAgentId);

        // Get conversation history or create new one
        const conversation = await conversationService.getOrCreateConversation(
            sanitizedUserId,
            sanitizedAgentId
        );

        // Add user message to history
        await conversationService.addMessageToConversation(
            conversation._id,
            'user',
            sanitizedMessage
        );

        // Get the conversation history limited to last 10 messages for context
        const messageHistory = await conversationService.getConversationMessages(
            conversation._id,
            10
        );

        // Format messages for OpenAI
        const formattedMessages = messageHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));

        // Call OpenAI API with rate limiting and timeout protection
        const startTime = Date.now();
        const openaiResponse = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
            messages: formattedMessages,
            max_tokens: 500,
            temperature: 0.7,
            timeout: 30000 // 30 second timeout
        });
        const responseTime = Date.now() - startTime;

        // Log response time for monitoring
        console.log(`OpenAI API response time: ${responseTime}ms`);

        if (!openaiResponse || !openaiResponse.choices || openaiResponse.choices.length === 0) {
            throw new Error('Invalid response from OpenAI API');
        }

        const aiMessage = openaiResponse.choices[0].message.content;

        // Add AI response to conversation
        await conversationService.addMessageToConversation(
            conversation._id,
            'assistant',
            aiMessage
        );

        // Log success without sensitive data
        const timeMs = Date.now() - startTime;
        console.log(`Processed message for agent ${sanitizedAgentId} in ${timeMs}ms`);
        
        return res.status(200).json({
            success: true,
            message: 'Message processed successfully',
            response: aiMessage,
            agentId: sanitizedAgentId
        });
    } catch (error) {
        // Log error without revealing sensitive information
        const timeMs = Date.now() - startTime;
        console.error(`Error processing message [${timeMs}ms, IP: ${clientIP}]:`, error.message);
        
        // Handle different types of errors
        if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
            return res.status(504).json({
                success: false,
                message: 'Request to AI service timed out. Please try again later.'
            });
        }
        
        if (error.response && error.response.status === 429) {
            return res.status(429).json({
                success: false,
                message: 'Rate limit exceeded. Please try again later.'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Failed to process message',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * Get all agents for a specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with user's agents
 */
export const getUserAgents = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || 'unknown';
    
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameter: userId'
            });
        }
        
        const sanitizedUserId = sanitizeInput(userId);
        
        // Log request
        console.log(`Getting agents for user ${sanitizedUserId}`);
        
        const agents = await agentService.getAllAgentsForUser(sanitizedUserId);
        
        // Format response to exclude sensitive information
        const formattedAgents = agents.map(agent => ({
            userId: agent.userId,
            agentId: agent.agentId,
            name: agent.name,
            createdAt: agent.createdAt,
            lastActive: agent.lastActive
        }));
        
        // Log success
        const timeMs = Date.now() - startTime;
        console.log(`Retrieved ${agents.length} agents for user ${sanitizedUserId} in ${timeMs}ms`);
        
        return res.status(200).json({
            success: true,
            message: 'Agents retrieved successfully',
            agents: formattedAgents
        });
    } catch (error) {
        // Log error
        const timeMs = Date.now() - startTime;
        console.error(`Error getting user agents [${timeMs}ms, IP: ${clientIP}]:`, error.message);
        
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve agents',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * Get agent status by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with agent status
 */
export const getAgentStatus = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || 'unknown';
    
    try {
        const { agentId } = req.params;
        
        if (!agentId || typeof agentId !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Valid agent ID is required'
            });
        }
        
        const sanitizedAgentId = sanitizeInput(agentId);
        
        // Log request
        console.log(`Getting status for agent ${sanitizedAgentId}`);
        
        const status = agentService.getAgentStatus(sanitizedAgentId);
        
        // Log success
        const timeMs = Date.now() - startTime;
        console.log(`Retrieved status for agent ${sanitizedAgentId} in ${timeMs}ms`);
        
        return res.status(200).json({
            success: true,
            status
        });
    } catch (error) {
        // Log error
        const timeMs = Date.now() - startTime;
        console.error(`Error getting agent status [${timeMs}ms, IP: ${clientIP}]:`, error.message);
        
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Failed to get agent status'
        });
    }
};

/**
 * Update an agent's name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with updated agent
 */
export const updateAgentName = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || 'unknown';
    
    try {
        const { agentId } = req.params;
        const { name } = req.body;
        
        if (!agentId || typeof agentId !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Valid agent ID is required'
            });
        }
        
        if (!name || typeof name !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Valid name is required'
            });
        }
        
        const sanitizedAgentId = sanitizeInput(agentId);
        const sanitizedName = sanitizeInput(name);
        
        // Log request
        console.log(`Updating name for agent ${sanitizedAgentId} to "${sanitizedName}"`);
        
        const updatedAgent = agentService.updateAgentName(sanitizedAgentId, sanitizedName);
        
        // Log success
        const timeMs = Date.now() - startTime;
        console.log(`Updated name for agent ${sanitizedAgentId} in ${timeMs}ms`);
        
        return res.status(200).json({
            success: true,
            message: 'Agent name updated successfully',
            agent: updatedAgent
        });
    } catch (error) {
        // Log error
        const timeMs = Date.now() - startTime;
        console.error(`Error updating agent name [${timeMs}ms, IP: ${clientIP}]:`, error.message);
        
        if (error.message.includes('Agent not found')) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }
        
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Failed to update agent name'
        });
    }
};

/**
 * Get all agents (admin endpoint)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with all agents
 */
export const getAllAgents = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || 'unknown';
    
    try {
        // TODO: Add admin authentication check here
        // Example:
        // if (!req.user || req.user.role !== 'admin') {
        //     return res.status(403).json({
        //         success: false,
        //         message: 'Admin access required'
        //     });
        // }
        
        // Log request
        console.log(`Admin request to get all agents from IP: ${clientIP}`);
        
        const agents = agentService.getAllAgents();
        
        // Log success
        const timeMs = Date.now() - startTime;
        console.log(`Retrieved ${agents.length} agents in ${timeMs}ms`);
        
        return res.status(200).json({
            success: true,
            count: agents.length,
            agents
        });
    } catch (error) {
        // Log error
        const timeMs = Date.now() - startTime;
        console.error(`Error getting all agents [${timeMs}ms, IP: ${clientIP}]:`, error.message);
        
        return res.status(500).json({
            success: false,
            message: 'Failed to get all agents'
        });
    }
};

/**
 * Clean up inactive agents (maintenance endpoint)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with cleanup results
 */
export const cleanupInactiveAgents = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || 'unknown';
    
    try {
        // TODO: Add admin authentication check here
        
        const { hours } = req.query;
        const maxAgeHours = hours ? parseInt(hours, 10) : 24;
        
        // Log request
        console.log(`Admin request to clean up inactive agents (${maxAgeHours}h) from IP: ${clientIP}`);
        
        const cleanedCount = agentService.cleanupInactiveAgents(maxAgeHours);
        
        // Log success
        const timeMs = Date.now() - startTime;
        console.log(`Cleaned up ${cleanedCount} inactive agents in ${timeMs}ms`);
        
        return res.status(200).json({
            success: true,
            message: `Cleaned up ${cleanedCount} inactive agents`,
            count: cleanedCount
        });
    } catch (error) {
        // Log error
        const timeMs = Date.now() - startTime;
        console.error(`Error cleaning up agents [${timeMs}ms, IP: ${clientIP}]:`, error.message);
        
        return res.status(500).json({
            success: false,
            message: 'Failed to clean up inactive agents'
        });
    }
};

/**
 * Remove a specific agent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with removal status
 */
export const removeAgent = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || 'unknown';
    
    try {
        const { userId, agentId } = req.params;
        
        if (!userId || !agentId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: userId and agentId'
            });
        }
        
        const sanitizedUserId = sanitizeInput(userId);
        const sanitizedAgentId = sanitizeInput(agentId);
        
        // Log request
        console.log(`Removing agent ${sanitizedAgentId}`);
        
        const removed = await agentService.removeAgent(sanitizedUserId, sanitizedAgentId);
        
        // Also remove associated conversations
        await conversationService.deleteConversationsByAgentId(sanitizedUserId, sanitizedAgentId);
        
        // Log result
        const timeMs = Date.now() - startTime;
        console.log(`Agent removal result for ${sanitizedAgentId}: ${removed ? 'success' : 'not found'} in ${timeMs}ms`);
        
        if (removed) {
            return res.status(200).json({
                success: true,
                message: `Agent removed successfully`
            });
        } else {
            return res.status(404).json({
                success: false,
                message: `Agent not found`
            });
        }
    } catch (error) {
        // Log error
        const timeMs = Date.now() - startTime;
        console.error(`Error removing agent [${timeMs}ms, IP: ${clientIP}]:`, error.message);
        
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Failed to remove agent'
        });
    }
};

/**
 * Remove all agents for a specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with removal status
 */
export const removeUserAgents = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || 'unknown';
    
    try {
        const { userId } = req.params;
        
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Valid user ID is required'
            });
        }
        
        const sanitizedUserId = sanitizeInput(userId);
        
        // Log request
        console.log(`Removing all agents for user ${sanitizedUserId}`);
        
        const removedCount = agentService.removeUserAgents(sanitizedUserId);
        
        // Log result
        const timeMs = Date.now() - startTime;
        console.log(`Removed ${removedCount} agents for user ${sanitizedUserId} in ${timeMs}ms`);
        
        return res.status(200).json({
            success: true,
            message: `Removed ${removedCount} agents`,
            count: removedCount
        });
    } catch (error) {
        // Log error
        const timeMs = Date.now() - startTime;
        console.error(`Error removing user agents [${timeMs}ms, IP: ${clientIP}]:`, error.message);
        
        if (error.message.includes('Rate limit')) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please try again later.'
            });
        }
        
        return res.status(500).json({
            success: false,
            message: 'Failed to remove user agents'
        });
    }
};

/**
 * Get conversation history for a specific agent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with conversation history
 */
export const getAgentConversation = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || 'unknown';
    
    try {
        const { userId, agentId } = req.params;
        const { limit = 50 } = req.query;

        // Validate required fields
        if (!userId || !agentId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: userId and agentId'
            });
        }

        // Sanitize inputs
        const sanitizedUserId = sanitizeInput(userId);
        const sanitizedAgentId = sanitizeInput(agentId);
        const sanitizedLimit = Math.min(parseInt(limit), 100); // Cap at 100 messages

        // Check if agent exists
        const agent = await agentService.getAgent(sanitizedUserId, sanitizedAgentId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        // Get conversation for the agent
        const conversation = await conversationService.getConversationByUserAndAgentId(
            sanitizedUserId,
            sanitizedAgentId
        );

        if (!conversation) {
            return res.status(200).json({
                success: true,
                message: 'No conversation found for this agent',
                messages: []
            });
        }

        // Get messages for the conversation
        const messages = await conversationService.getConversationMessages(
            conversation._id,
            sanitizedLimit
        );

        // Log success
        const timeMs = Date.now() - startTime;
        console.log(`Retrieved ${messages.length} messages for agent ${sanitizedAgentId} in ${timeMs}ms`);
        
        return res.status(200).json({
            success: true,
            message: 'Conversation retrieved successfully',
            conversation: {
                conversationId: conversation._id,
                messages
            }
        });
    } catch (error) {
        // Log error
        const timeMs = Date.now() - startTime;
        console.error(`Error getting agent conversation [${timeMs}ms, IP: ${clientIP}]:`, error.message);
        
        return res.status(500).json({
            success: false,
            message: 'Failed to retrieve conversation',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

/**
 * Clear conversation history for a specific agent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with clear status
 */
export const clearAgentConversation = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || 'unknown';
    
    try {
        const { userId, agentId } = req.params;

        // Validate required fields
        if (!userId || !agentId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: userId and agentId'
            });
        }

        // Sanitize inputs
        const sanitizedUserId = sanitizeInput(userId);
        const sanitizedAgentId = sanitizeInput(agentId);

        // Check if agent exists
        const agent = await agentService.getAgent(sanitizedUserId, sanitizedAgentId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agent not found'
            });
        }

        // Delete the conversation
        await conversationService.deleteConversationsByAgentId(sanitizedUserId, sanitizedAgentId);

        // Log success
        const timeMs = Date.now() - startTime;
        console.log(`Conversation cleared for agent ${sanitizedAgentId} in ${timeMs}ms`);
        
        return res.status(200).json({
            success: true,
            message: 'Conversation cleared successfully'
        });
    } catch (error) {
        // Log error
        const timeMs = Date.now() - startTime;
        console.error(`Error clearing agent conversation [${timeMs}ms, IP: ${clientIP}]:`, error.message);
        
        return res.status(500).json({
            success: false,
            message: 'Failed to clear conversation',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
}; 