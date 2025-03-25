/**
 * Example usage of the Multi-Agent API
 * 
 * This file demonstrates how to use the secured API endpoints for:
 * 1. Creating agents for users
 * 2. Sending messages to specific agents
 * 3. Retrieving agent conversations
 * 4. Managing multiple agents per user
 */

import axios from 'axios';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Base URL for API 
const API_BASE_URL = 'http://localhost:3001/api';
const TIMEOUT_MS = 30000; // 30 second timeout

// Create an axios instance with defaults
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'YOUR_API_KEY' // Replace with actual API key in production
  }
});

// Helper to generate a user ID for testing
// In a real application, this would be your authentication system's user ID
const generateTestUserId = () => {
  return `test-user-${crypto.randomBytes(4).toString('hex')}`;
};

/**
 * Initialize a new agent for a user
 * @param {string} userId - User ID
 * @param {string} name - Name for the agent
 * @returns {Promise<Object>} - Response with agent details
 */
const createAgent = async (userId, name) => {
  try {
    const response = await api.post('/agent/initialize', {
      userId,
      name
    });
    
    console.log(`✅ Agent created: ${response.data.agent.agentId} (${response.data.agent.name})`);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating agent:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Send a message to a specific agent
 * @param {string} userId - User ID
 * @param {string} agentId - Agent ID 
 * @param {string} message - Message content
 * @returns {Promise<Object>} - Response with agent's reply
 */
const sendMessage = async (userId, agentId, message) => {
  try {
    const response = await api.post('/agent/message', {
      userId,
      agentId,
      message
    });
    
    console.log(`📩 User: ${message}`);
    console.log(`📨 Agent: ${response.data.response}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get all agents for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of agents
 */
const getUserAgents = async (userId) => {
  try {
    const response = await api.get(`/agent/user/${userId}`);
    
    console.log(`👥 Found ${response.data.agents.length} agents for user ${userId}`);
    response.data.agents.forEach(agent => {
      console.log(`  - ${agent.name} (${agent.agentId})`);
    });
    
    return response.data.agents;
  } catch (error) {
    console.error('❌ Error getting user agents:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get conversation history for a specific agent
 * @param {string} userId - User ID
 * @param {string} agentId - Agent ID
 * @returns {Promise<Array>} - Conversation messages
 */
const getAgentConversation = async (userId, agentId) => {
  try {
    const response = await api.get(`/agent/conversation/${userId}/${agentId}`);
    
    console.log(`💬 Conversation history for agent ${agentId}:`);
    if (response.data.conversation && response.data.conversation.messages) {
      response.data.conversation.messages.forEach(msg => {
        console.log(`  [${msg.role}]: ${msg.content}`);
      });
    } else {
      console.log('  No messages found');
    }
    
    return response.data.conversation;
  } catch (error) {
    console.error('❌ Error getting conversation:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Clear conversation history for a specific agent
 * @param {string} userId - User ID
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} - Response
 */
const clearAgentConversation = async (userId, agentId) => {
  try {
    const response = await api.delete(`/agent/conversation/${userId}/${agentId}`);
    
    console.log(`🧹 Cleared conversation for agent ${agentId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error clearing conversation:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Remove an agent
 * @param {string} userId - User ID
 * @param {string} agentId - Agent ID
 * @returns {Promise<Object>} - Response
 */
const removeAgent = async (userId, agentId) => {
  try {
    const response = await api.delete(`/agent/${userId}/${agentId}`);
    
    console.log(`🗑️ Removed agent ${agentId}`);
    return response.data;
  } catch (error) {
    console.error('❌ Error removing agent:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Run a complete demonstration of the Multi-Agent API
 */
const runDemonstration = async () => {
  try {
    console.log('🚀 Starting Multi-Agent API demonstration');
    
    // Generate a test user ID
    const userId = generateTestUserId();
    console.log(`👤 Test user ID: ${userId}`);
    
    // Create multiple agents for the user
    console.log('\n--- Creating multiple agents ---');
    const generalAgent = await createAgent(userId, 'General Assistant');
    const techAgent = await createAgent(userId, 'Tech Expert');
    const creativeAgent = await createAgent(userId, 'Creative Writer');
    
    // List all agents for the user
    console.log('\n--- Listing user\'s agents ---');
    await getUserAgents(userId);
    
    // Send messages to different agents
    console.log('\n--- Sending messages to different agents ---');
    await sendMessage(userId, generalAgent.agent.agentId, 'What can you help me with?');
    await sendMessage(userId, techAgent.agent.agentId, 'Explain blockchain in simple terms');
    await sendMessage(userId, creativeAgent.agent.agentId, 'Write a short poem about technology');
    
    // Get conversation history for one agent
    console.log('\n--- Getting conversation history ---');
    await getAgentConversation(userId, techAgent.agent.agentId);
    
    // Clear conversation for one agent
    console.log('\n--- Clearing conversation history ---');
    await clearAgentConversation(userId, techAgent.agent.agentId);
    
    // Verify conversation was cleared
    await getAgentConversation(userId, techAgent.agent.agentId);
    
    // Send another message after clearing
    console.log('\n--- Starting new conversation ---');
    await sendMessage(userId, techAgent.agent.agentId, 'Let\'s talk about cybersecurity now');
    
    // Remove one agent
    console.log('\n--- Removing an agent ---');
    await removeAgent(userId, creativeAgent.agent.agentId);
    
    // Verify agent was removed
    console.log('\n--- Verifying agent removal ---');
    await getUserAgents(userId);
    
    console.log('\n✅ Demonstration completed successfully');
  } catch (error) {
    console.error('\n❌ Demonstration failed:', error);
  }
};

// Run the demonstration if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDemonstration();
}

export {
  createAgent,
  sendMessage,
  getUserAgents,
  getAgentConversation,
  clearAgentConversation,
  removeAgent,
  runDemonstration
}; 