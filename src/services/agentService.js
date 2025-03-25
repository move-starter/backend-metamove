import { aptosService } from './aptosService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing user-specific agents
 * Stores and retrieves agent instances for each user
 */
class AgentService {
    constructor() {
        // Map to store all agents
        // Key: agentId, Value: { agent, llmAgent, privateKey, userId, name }
        this.agents = new Map();
        
        // Map to store user to agents mapping
        // Key: userId, Value: Array of agentIds
        this.userAgents = new Map();
    }

    /**
     * Initialize a new agent for a user
     * @param {string} userId - The user's unique identifier
     * @param {string} privateKey - The user's private key
     * @param {string} name - Optional name for the agent
     * @returns {Promise<object>} The initialized agent info
     */
    async initializeUserAgent(userId, privateKey, name = '') {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!privateKey) {
                throw new Error('Private key is required');
            }

            // Generate a unique ID for this agent
            const agentId = uuidv4();
            
            // Initialize agent using aptosService
            const agent = await aptosService.initializeAgent(privateKey);
            
            // Create agent data object
            const agentData = {
                agent,
                privateKey,
                llmAgent: null,
                userId,
                name: name || `Agent-${agentId.slice(0, 8)}`,
                initialized: true,
                createdAt: new Date()
            };
            
            // Store the agent
            this.agents.set(agentId, agentData);
            
            // Add agent to user's agents list
            if (!this.userAgents.has(userId)) {
                this.userAgents.set(userId, []);
            }
            this.userAgents.get(userId).push(agentId);

            return {
                agentId,
                userId,
                name: agentData.name,
                initialized: true,
                timestamp: new Date()
            };
        } catch (error) {
            console.error(`Error initializing agent for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Process a message with a specific agent
     * @param {string} agentId - The agent's unique identifier
     * @param {Array} messages - Array of message objects with role and content
     * @param {boolean} showIntermediateSteps - Whether to show intermediate steps
     * @returns {Promise<object>} Agent response
     */
    async processAgentMessage(agentId, messages, showIntermediateSteps = false) {
        try {
            if (!agentId) {
                throw new Error('Agent ID is required');
            }

            // Check if agent exists
            if (!this.agents.has(agentId)) {
                throw new Error('Agent not found');
            }

            const agentData = this.agents.get(agentId);
            
            // Ensure LLM agent is initialized for this agent
            if (!agentData.llmAgent) {
                // First make sure agent is initialized
                if (!agentData.agent) {
                    await aptosService.initializeAgent(agentData.privateKey);
                    agentData.agent = aptosService.agent;
                }
                
                // Now initialize LLM agent
                await aptosService.initializeLLMAgent();
                agentData.llmAgent = aptosService.llmAgent;
                
                // Update the agent data
                this.agents.set(agentId, agentData);
            }
            
            // Process the message with aptosService
            return await aptosService.processAgentMessage(messages, showIntermediateSteps);
        } catch (error) {
            console.error(`Error processing message for agent ${agentId}:`, error);
            throw error;
        }
    }

    /**
     * Get an agent by ID
     * @param {string} agentId - The agent's unique identifier
     * @returns {object|null} Agent data or null if not found
     */
    getAgent(agentId) {
        if (!agentId || !this.agents.has(agentId)) {
            return null;
        }
        
        const agentData = this.agents.get(agentId);
        
        return {
            agentId,
            userId: agentData.userId,
            name: agentData.name,
            initialized: !!agentData.agent,
            llmInitialized: !!agentData.llmAgent,
            createdAt: agentData.createdAt
        };
    }

    /**
     * Get the status of a specific agent
     * @param {string} agentId - The agent's unique identifier
     * @returns {object} Agent status
     */
    getAgentStatus(agentId) {
        try {
            if (!agentId) {
                throw new Error('Agent ID is required');
            }

            if (!this.agents.has(agentId)) {
                return {
                    initialized: false,
                    message: 'Agent not found'
                };
            }

            const agentData = this.agents.get(agentId);
            
            return {
                agentId,
                userId: agentData.userId,
                name: agentData.name,
                initialized: true,
                llmInitialized: !!agentData.llmAgent,
                createdAt: agentData.createdAt
            };
        } catch (error) {
            console.error(`Error getting agent status for agent ${agentId}:`, error);
            throw error;
        }
    }

    /**
     * Get all agents for a specific user
     * @param {string} userId - The user's unique identifier
     * @returns {Array} List of user's agents
     */
    getUserAgents(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!this.userAgents.has(userId)) {
                return [];
            }

            const agentIds = this.userAgents.get(userId);
            const agents = [];
            
            for (const agentId of agentIds) {
                if (this.agents.has(agentId)) {
                    const agentData = this.agents.get(agentId);
                    agents.push({
                        agentId,
                        name: agentData.name,
                        initialized: !!agentData.agent,
                        llmInitialized: !!agentData.llmAgent,
                        createdAt: agentData.createdAt
                    });
                }
            }
            
            return agents;
        } catch (error) {
            console.error(`Error getting agents for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get all agents (for admin purposes)
     * @returns {Array} List of all agents
     */
    getAllAgents() {
        try {
            const agents = [];
            
            for (const [agentId, agentData] of this.agents.entries()) {
                agents.push({
                    agentId,
                    userId: agentData.userId,
                    name: agentData.name,
                    initialized: !!agentData.agent,
                    llmInitialized: !!agentData.llmAgent,
                    createdAt: agentData.createdAt
                });
            }
            
            return agents;
        } catch (error) {
            console.error('Error getting all agents:', error);
            throw error;
        }
    }

    /**
     * Update an agent's name
     * @param {string} agentId - The agent's unique identifier
     * @param {string} name - The new name for the agent
     * @returns {object} Updated agent data
     */
    updateAgentName(agentId, name) {
        try {
            if (!agentId) {
                throw new Error('Agent ID is required');
            }

            if (!this.agents.has(agentId)) {
                throw new Error('Agent not found');
            }

            if (!name) {
                throw new Error('Name is required');
            }

            const agentData = this.agents.get(agentId);
            agentData.name = name;
            
            // Update the agent data
            this.agents.set(agentId, agentData);
            
            return this.getAgent(agentId);
        } catch (error) {
            console.error(`Error updating agent name for agent ${agentId}:`, error);
            throw error;
        }
    }

    /**
     * Remove a specific agent
     * @param {string} agentId - The agent's unique identifier
     * @returns {boolean} Success status
     */
    removeAgent(agentId) {
        try {
            if (!agentId) {
                throw new Error('Agent ID is required');
            }

            if (!this.agents.has(agentId)) {
                return false;
            }

            // Get the user ID for this agent
            const agentData = this.agents.get(agentId);
            const userId = agentData.userId;
            
            // Remove agent from the agents map
            this.agents.delete(agentId);
            
            // Remove agent from the user's agents list
            if (this.userAgents.has(userId)) {
                const userAgents = this.userAgents.get(userId);
                const updatedAgents = userAgents.filter(id => id !== agentId);
                
                if (updatedAgents.length === 0) {
                    // If user has no more agents, remove the user entry
                    this.userAgents.delete(userId);
                } else {
                    // Update the user's agents list
                    this.userAgents.set(userId, updatedAgents);
                }
            }
            
            return true;
        } catch (error) {
            console.error(`Error removing agent ${agentId}:`, error);
            throw error;
        }
    }

    /**
     * Remove all agents for a specific user
     * @param {string} userId - The user's unique identifier
     * @returns {number} Number of agents removed
     */
    removeUserAgents(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            if (!this.userAgents.has(userId)) {
                return 0;
            }

            // Get all agent IDs for this user
            const agentIds = this.userAgents.get(userId);
            let removedCount = 0;
            
            // Remove each agent
            for (const agentId of agentIds) {
                if (this.agents.has(agentId)) {
                    this.agents.delete(agentId);
                    removedCount++;
                }
            }
            
            // Remove the user entry
            this.userAgents.delete(userId);
            
            return removedCount;
        } catch (error) {
            console.error(`Error removing agents for user ${userId}:`, error);
            throw error;
        }
    }
}

// Export a singleton instance
export const agentService = new AgentService(); 