import { aptosService } from '../services/aptosService.js';
import { agentService } from '../services/agentService.js';

/**
 * Agent Controller - Handles AI agent and blockchain agent interactions
 */

/**
 * Initialize agent for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with agent status
 */
export const initializeAgent = async (req, res) => {
    try {
        const { privateKey, userId } = req.body;

        if (!privateKey) {
            return res.status(400).json({ 
                success: false, 
                message: 'Private key is required' 
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Initialize user-specific agent
        const result = await agentService.initializeUserAgent(userId, privateKey);
        
        return res.status(200).json({
            success: true,
            message: 'Agent initialized successfully for user',
            data: result
        });
    } catch (error) {
        console.error('Error initializing agent:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to initialize agent'
        });
    }
};

/**
 * Process a message with the LLM agent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with agent reply
 */
export const processMessage = async (req, res) => {
    try {
        const { messages, userId, privateKey, showIntermediateSteps = false } = req.body;

        if (!messages || !Array.isArray(messages) || !messages.length) {
            return res.status(400).json({
                success: false,
                message: 'Messages array is required'
            });
        }

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // If privateKey is provided and agent not initialized, initialize it first
        if (privateKey && !agentService.getUserAgentStatus(userId).initialized) {
            await agentService.initializeUserAgent(userId, privateKey);
        }

        try {
            // Process the message with the user's agent
            const result = await agentService.processUserMessage(userId, messages, showIntermediateSteps);

            // For streaming response
            if (showIntermediateSteps && result.eventStream) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                // Handling the event stream
                for await (const { event, data } of result.eventStream) {
                    if (event === 'on_chat_model_stream') {
                        if (data.chunk.content) {
                            if (typeof data.chunk.content === 'string') {
                                res.write(`data: ${data.chunk.content}\n\n`);
                            } else {
                                for (const content of data.chunk.content) {
                                    if (content.text) {
                                        res.write(`data: ${content.text}\n\n`);
                                    }
                                }
                            }
                        }
                    }
                }
                
                res.end();
                return;
            }

            // For non-streaming response
            return res.status(200).json({
                success: true,
                result
            });
        } catch (error) {
            // If agent not initialized, return specific error
            if (error.message.includes('User agent not initialized')) {
                return res.status(400).json({
                    success: false,
                    message: 'Agent not initialized for this user. Please initialize with privateKey first.'
                });
            }
            throw error;
        }
    } catch (error) {
        console.error('Error processing message:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to process message'
        });
    }
};

/**
 * Get agent status for a specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with agent status
 */
export const getAgentStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        const status = agentService.getUserAgentStatus(userId);
        
        return res.status(200).json({
            success: true,
            status
        });
    } catch (error) {
        console.error('Error getting agent status:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get agent status'
        });
    }
};

/**
 * Get all user agents (admin endpoint)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with all user agents
 */
export const getAllAgents = async (req, res) => {
    try {
        // TODO: Add admin authentication check here
        
        const agents = agentService.getAllUserAgents();
        
        return res.status(200).json({
            success: true,
            count: agents.length,
            agents
        });
    } catch (error) {
        console.error('Error getting all agents:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get all agents'
        });
    }
};

/**
 * Remove an agent for a specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with removal status
 */
export const removeAgent = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        const removed = agentService.removeUserAgent(userId);
        
        if (removed) {
            return res.status(200).json({
                success: true,
                message: `Agent for user ${userId} removed successfully`
            });
        } else {
            return res.status(404).json({
                success: false,
                message: `No agent found for user ${userId}`
            });
        }
    } catch (error) {
        console.error('Error removing agent:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to remove agent'
        });
    }
}; 