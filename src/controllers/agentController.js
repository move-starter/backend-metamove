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
        const { privateKey, userId, name } = req.body;

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
        const result = await agentService.initializeUserAgent(userId, privateKey, name);
        
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
        const { messages, agentId, userId, privateKey, showIntermediateSteps = false } = req.body;

        if (!messages || !Array.isArray(messages) || !messages.length) {
            return res.status(400).json({
                success: false,
                message: 'Messages array is required'
            });
        }

        // Check if we have an agentId
        if (!agentId) {
            return res.status(400).json({
                success: false,
                message: 'Agent ID is required'
            });
        }

        // If privateKey is provided and agent not found, initialize it
        if (privateKey && !agentService.getAgent(agentId) && userId) {
            // This would create a new agent with the specified agentId
            await agentService.initializeUserAgent(userId, privateKey);
        }

        try {
            // Process the message with the specified agent
            const result = await agentService.processAgentMessage(agentId, messages, showIntermediateSteps);

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
            // If agent not found, return specific error
            if (error.message.includes('Agent not found')) {
                return res.status(404).json({
                    success: false,
                    message: 'Agent not found. Please initialize first.'
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
 * Get all agents for a specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with user's agents
 */
export const getUserAgents = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        const agents = agentService.getUserAgents(userId);
        
        return res.status(200).json({
            success: true,
            count: agents.length,
            agents
        });
    } catch (error) {
        console.error('Error getting user agents:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get user agents'
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
    try {
        const { agentId } = req.params;
        
        if (!agentId) {
            return res.status(400).json({
                success: false,
                message: 'Agent ID is required'
            });
        }
        
        const status = agentService.getAgentStatus(agentId);
        
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
 * Update an agent's name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with updated agent
 */
export const updateAgentName = async (req, res) => {
    try {
        const { agentId } = req.params;
        const { name } = req.body;
        
        if (!agentId) {
            return res.status(400).json({
                success: false,
                message: 'Agent ID is required'
            });
        }
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }
        
        const updatedAgent = agentService.updateAgentName(agentId, name);
        
        return res.status(200).json({
            success: true,
            message: 'Agent name updated successfully',
            agent: updatedAgent
        });
    } catch (error) {
        console.error('Error updating agent name:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update agent name'
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
    try {
        // TODO: Add admin authentication check here
        
        const agents = agentService.getAllAgents();
        
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
 * Remove a specific agent
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with removal status
 */
export const removeAgent = async (req, res) => {
    try {
        const { agentId } = req.params;
        
        if (!agentId) {
            return res.status(400).json({
                success: false,
                message: 'Agent ID is required'
            });
        }
        
        const removed = agentService.removeAgent(agentId);
        
        if (removed) {
            return res.status(200).json({
                success: true,
                message: `Agent ${agentId} removed successfully`
            });
        } else {
            return res.status(404).json({
                success: false,
                message: `No agent found with ID ${agentId}`
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

/**
 * Remove all agents for a specific user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with removal status
 */
export const removeUserAgents = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }
        
        const removedCount = agentService.removeUserAgents(userId);
        
        return res.status(200).json({
            success: true,
            message: `Removed ${removedCount} agents for user ${userId}`
        });
    } catch (error) {
        console.error('Error removing user agents:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to remove user agents'
        });
    }
}; 