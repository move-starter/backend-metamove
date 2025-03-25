import mongoose from 'mongoose';

// Define schema for a single message
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Define schema for a conversation
const conversationSchema = new mongoose.Schema({
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
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index for userId and agentId
conversationSchema.index({ userId: 1, agentId: 1 }, { unique: true });

// Create the model
const Conversation = mongoose.model('Conversation', conversationSchema);

/**
 * Service for managing conversations
 */
export class ConversationService {
  /**
   * Get an existing conversation or create a new one if it doesn't exist
   * @param {string} userId - The user ID
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object>} The conversation object
   */
  async getOrCreateConversation(userId, agentId) {
    try {
      // Try to find an existing conversation
      let conversation = await Conversation.findOne({ userId, agentId });
      
      // If no conversation exists, create one
      if (!conversation) {
        conversation = new Conversation({
          userId,
          agentId,
          messages: []
        });
        await conversation.save();
      }
      
      return conversation;
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      throw error;
    }
  }
  
  /**
   * Get a conversation by user ID and agent ID
   * @param {string} userId - The user ID
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object|null>} The conversation object or null if not found
   */
  async getConversationByUserAndAgentId(userId, agentId) {
    try {
      return await Conversation.findOne({ userId, agentId });
    } catch (error) {
      console.error('Error in getConversationByUserAndAgentId:', error);
      throw error;
    }
  }
  
  /**
   * Get all conversations for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Array>} Array of conversation objects
   */
  async getUserConversations(userId) {
    try {
      return await Conversation.find({ userId }).sort({ updatedAt: -1 });
    } catch (error) {
      console.error('Error in getUserConversations:', error);
      throw error;
    }
  }
  
  /**
   * Add a message to a conversation
   * @param {string} conversationId - The conversation ID
   * @param {string} role - The message role (user, assistant, or system)
   * @param {string} content - The message content
   * @returns {Promise<Object>} The updated conversation
   */
  async addMessageToConversation(conversationId, role, content) {
    try {
      // Validate role
      if (!['user', 'assistant', 'system'].includes(role)) {
        throw new Error('Invalid message role');
      }
      
      // Add the message and update the updatedAt timestamp
      const updatedConversation = await Conversation.findByIdAndUpdate(
        conversationId,
        {
          $push: { messages: { role, content, timestamp: new Date() } },
          $set: { updatedAt: new Date() }
        },
        { new: true }
      );
      
      if (!updatedConversation) {
        throw new Error('Conversation not found');
      }
      
      return updatedConversation;
    } catch (error) {
      console.error('Error in addMessageToConversation:', error);
      throw error;
    }
  }
  
  /**
   * Get messages from a conversation, optionally limited to a certain count
   * @param {string} conversationId - The conversation ID
   * @param {number} limit - Maximum number of messages to return (most recent first)
   * @returns {Promise<Array>} Array of message objects
   */
  async getConversationMessages(conversationId, limit = 100) {
    try {
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      // Return the most recent messages if limit is specified
      const messages = conversation.messages || [];
      if (limit && messages.length > limit) {
        return messages.slice(-limit);
      }
      
      return messages;
    } catch (error) {
      console.error('Error in getConversationMessages:', error);
      throw error;
    }
  }
  
  /**
   * Delete a conversation
   * @param {string} conversationId - The conversation ID
   * @returns {Promise<boolean>} True if successful, false if not found
   */
  async deleteConversation(conversationId) {
    try {
      const result = await Conversation.findByIdAndDelete(conversationId);
      return !!result;
    } catch (error) {
      console.error('Error in deleteConversation:', error);
      throw error;
    }
  }
  
  /**
   * Delete all conversations for a user
   * @param {string} userId - The user ID
   * @returns {Promise<Object>} The result of the delete operation
   */
  async deleteUserConversations(userId) {
    try {
      return await Conversation.deleteMany({ userId });
    } catch (error) {
      console.error('Error in deleteUserConversations:', error);
      throw error;
    }
  }
  
  /**
   * Delete all conversations for a specific agent of a user
   * @param {string} userId - The user ID
   * @param {string} agentId - The agent ID
   * @returns {Promise<Object>} The result of the delete operation
   */
  async deleteConversationsByAgentId(userId, agentId) {
    try {
      return await Conversation.deleteMany({ userId, agentId });
    } catch (error) {
      console.error('Error in deleteConversationsByAgentId:', error);
      throw error;
    }
  }
  
  /**
   * Delete all conversations older than a specified date
   * @param {Date} date - Delete conversations older than this date
   * @returns {Promise<Object>} The result of the delete operation
   */
  async deleteOldConversations(date) {
    try {
      return await Conversation.deleteMany({ updatedAt: { $lt: date } });
    } catch (error) {
      console.error('Error in deleteOldConversations:', error);
      throw error;
    }
  }
} 