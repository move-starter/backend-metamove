import { aptosService } from './aptosService.js';

/**
 * Service for managing user-specific agents
 * Stores and retrieves agent instances for each user
 */
class AgentService {
    constructor() {
        // Map to store user-specific agents
        // Key: userId, Value: { agent, llmAgent, privateKey }
        this.userAgents = new Map();
    }

    /**
     * Initialize an agent for a specific user
     * @param {string} userId - The user's unique identifier
     * @param {string} privateKey - The user's private key
     * @returns {Promise<object>} The initialized agent info
     */
    async initializeUserAgent(userId, privateKey) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!privateKey) {
                throw new Error('Private key is required');
            }

            // Initialize agent using aptosService
            const agent = await aptosService.initializeAgent(privateKey);
            
            // Store the agent reference with user ID
            this.userAgents.set(userId, {
                agent,
                privateKey,
                llmAgent: null,
                initialized: true,
                createdAt: new Date()
            });

            return {
                userId,
                initialized: true,
                timestamp: new Date()
            };
        } catch (error) {
            console.error(`Error initializing agent for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Process a message with a user's agent
     * @param {string} userId - The user's unique identifier
     * @param {Array} messages - Array of message objects with role and content
     * @param {boolean} showIntermediateSteps - Whether to show intermediate steps
     * @returns {Promise<object>} Agent response
     */
    async processUserMessage(userId, messages, showIntermediateSteps = false) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            // Check if user has an initialized agent
            if (!this.userAgents.has(userId)) {
                throw new Error('User agent not initialized');
            }

            const userAgentInfo = this.userAgents.get(userId);
            
            // Ensure LLM agent is initialized for this user
            if (!userAgentInfo.llmAgent) {
                // First make sure agent is initialized
                if (!userAgentInfo.agent) {
                    await aptosService.initializeAgent(userAgentInfo.privateKey);
                    userAgentInfo.agent = aptosService.agent;
                }
                
                // Now initialize LLM agent
                await aptosService.initializeLLMAgent();
                userAgentInfo.llmAgent = aptosService.llmAgent;
                
                // Update the user agent info
                this.userAgents.set(userId, userAgentInfo);
            }
            
            // Process the message with aptosService
            return await aptosService.processAgentMessage(messages, showIntermediateSteps);
        } catch (error) {
            console.error(`Error processing message for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get the status of a user's agent
     * @param {string} userId - The user's unique identifier
     * @returns {object} Agent status
     */
    getUserAgentStatus(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!this.userAgents.has(userId)) {
                return {
                    initialized: false,
                    message: 'Agent not initialized for this user'
                };
            }

            const userAgentInfo = this.userAgents.get(userId);
            
            return {
                initialized: true,
                llmInitialized: !!userAgentInfo.llmAgent,
                createdAt: userAgentInfo.createdAt
            };
        } catch (error) {
            console.error(`Error getting agent status for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get all user agents (for admin purposes)
     * @returns {Array} List of user IDs with agent status
     */
    getAllUserAgents() {
        try {
            const users = [];
            
            for (const [userId, agentInfo] of this.userAgents.entries()) {
                users.push({
                    userId,
                    initialized: !!agentInfo.agent,
                    llmInitialized: !!agentInfo.llmAgent,
                    createdAt: agentInfo.createdAt
                });
            }
            
            return users;
        } catch (error) {
            console.error('Error getting all user agents:', error);
            throw error;
        }
    }

    /**
     * Remove an agent for a specific user
     * @param {string} userId - The user's unique identifier
     * @returns {boolean} Success status
     */
    removeUserAgent(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!this.userAgents.has(userId)) {
                return false;
            }

            // Delete the user's agent
            return this.userAgents.delete(userId);
        } catch (error) {
            console.error(`Error removing agent for user ${userId}:`, error);
            throw error;
        }
    }
}

// Export a singleton instance
export const agentService = new AgentService(); 