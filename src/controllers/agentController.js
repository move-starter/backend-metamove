import { aptosService } from '../services/aptosService.js';

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
        const { privateKey } = req.body;

        if (!privateKey) {
            return res.status(400).json({ 
                success: false, 
                message: 'Private key is required' 
            });
        }

        await aptosService.initializeAgent(privateKey);
        
        return res.status(200).json({
            success: true,
            message: 'Agent initialized successfully'
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
        const { messages, privateKey, showIntermediateSteps = false } = req.body;

        if (!messages || !Array.isArray(messages) || !messages.length) {
            return res.status(400).json({
                success: false,
                message: 'Messages array is required'
            });
        }

        // If privateKey is provided, initialize agent first
        if (privateKey) {
            await aptosService.initializeAgent(privateKey);
        }

        // Check if agent is initialized
        if (!aptosService.agent) {
            return res.status(400).json({
                success: false,
                message: 'Agent not initialized. Please provide private key.'
            });
        }

        // Process the message with the agent
        const result = await aptosService.processAgentMessage(messages, showIntermediateSteps);

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
        console.error('Error processing message:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to process message'
        });
    }
};

/**
 * Get agent status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with agent status
 */
export const getAgentStatus = async (req, res) => {
    try {
        const isAgentInitialized = !!aptosService.agent;
        const isLLMAgentInitialized = !!aptosService.llmAgent;
        
        return res.status(200).json({
            success: true,
            status: {
                agentInitialized: isAgentInitialized,
                llmAgentInitialized: isLLMAgentInitialized
            }
        });
    } catch (error) {
        console.error('Error getting agent status:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to get agent status'
        });
    }
}; 