import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Define schema for an agent
const agentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  agentId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index for userId and agentId
agentSchema.index({ userId: 1, agentId: 1 }, { unique: true });

// Create the model
const Agent = mongoose.model('Agent', agentSchema);

/**
 * Service for managing agents
 */
export class AgentService {
  /**
   * Create or update an agent for a user
   * @param {string} userId - The user ID
   * @param {string} agentId - The agent ID (creates new one if not provided)
   * @param {string} name - The agent name
   * @returns {Promise<Object>} The agent object
   */
  async createOrUpdateAgent(userId, agentId, name) {
    try {
      // Generate a new agentId if not provided
      const finalAgentId = agentId || crypto.randomUUID();
      
      // Try to find existing agent
      let agent = await Agent.findOne({ userId, agentId: finalAgentId });
      
      // If agent exists, update name and lastActive
      if (agent) {
        agent.name = name || agent.name;
        agent.lastActive = new Date();
        await agent.save();
        return agent;
      }
      
      // Create new agent
      agent = new Agent({
        userId,
        agentId: finalAgentId,
        name: name || 'My Agent',
        lastActive: new Date()
      });
      
      await agent.save();
      return agent;
    } catch (error) {
      console.error('Error in createOrUpdateAgent:', error);
      throw error;
    }
  }
  
  /**
   * Get an agent by user ID and agent ID
   * @param {string} userId - The user ID
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object|null>} The agent object or null if not found
   */
  async getAgent(userId, agentId) {
    try {
      return await Agent.findOne({ userId, agentId });
    } catch (error) {
      console.error('Error in getAgent:', error);
      throw error;
    }
  }
  
  /**
   * Get all agents for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} Array of agent objects
   */
  async getAllAgentsForUser(userId) {
    try {
      return await Agent.find({ userId }).sort({ lastActive: -1 });
    } catch (error) {
      console.error('Error in getAllAgentsForUser:', error);
      throw error;
    }
  }
  
  /**
   * Remove an agent
   * @param {string} userId - The user ID
   * @param {string} agentId - The agent ID
   * @returns {Promise<boolean>} True if successful, false if not found
   */
  async removeAgent(userId, agentId) {
    try {
      const result = await Agent.findOneAndDelete({ userId, agentId });
      return !!result;
    } catch (error) {
      console.error('Error in removeAgent:', error);
      throw error;
    }
  }
  
  /**
   * Update agent activity timestamp
   * @param {string} userId - The user ID
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object|null>} The updated agent or null if not found
   */
  async updateAgentActivity(userId, agentId) {
    try {
      return await Agent.findOneAndUpdate(
        { userId, agentId },
        { lastActive: new Date() },
        { new: true }
      );
    } catch (error) {
      console.error('Error in updateAgentActivity:', error);
      throw error;
    }
  }
  
  /**
   * Remove inactive agents (not used for longer than the specified time)
   * @param {Date} cutoffDate - Remove agents not active since this date
   * @returns {Promise<Object>} The result of the delete operation with count and removed agents
   */
  async removeInactiveAgents(cutoffDate) {
    try {
      // First get the list of inactive agents for reporting
      const inactiveAgents = await Agent.find({ lastActive: { $lt: cutoffDate } });
      
      // Then delete them
      const result = await Agent.deleteMany({ lastActive: { $lt: cutoffDate } });
      
      return {
        count: result.deletedCount,
        inactiveAgents
      };
    } catch (error) {
      console.error('Error in removeInactiveAgents:', error);
      throw error;
    }
  }
  
  /**
   * Count total agents in the system
   * @returns {Promise<number>} The total count of agents
   */
  async countAllAgents() {
    try {
      return await Agent.countDocuments();
    } catch (error) {
      console.error('Error in countAllAgents:', error);
      throw error;
    }
  }
  
  /**
   * Get system stats about agents
   * @returns {Promise<Object>} Statistics about agents
   */
  async getAgentStats() {
    try {
      const totalCount = await Agent.countDocuments();
      const activeInLast24Hours = await Agent.countDocuments({
        lastActive: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      const createdInLast7Days = await Agent.countDocuments({
        createdAt: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });
      
      return {
        totalAgents: totalCount,
        activeInLast24Hours,
        createdInLast7Days
      };
    } catch (error) {
      console.error('Error in getAgentStats:', error);
      throw error;
    }
  }
} 