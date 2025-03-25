import { Assistant } from '../models/Assistant.js';
import { openai } from '../config/openai.js';
import { functionDefinitions } from './functions/index.js';
import { ERROR_MESSAGES } from '../utils/constants.js';
import { Thread } from '../models/Thread.js';
import { createConversation, addMessageToConversation, getConversationHistory } from './conversation.js';
import { mongoose } from 'mongoose';
import { openaiClient } from '../clients/openaiClient.js';

export const assistantService = {
  async create(data) {
    try {
      // Create assistant in OpenAI
      const openaiResponse = await openaiClient.createAssistant({
        name: data.name,
        model: data.llmModel,
        // Add other necessary fields
      });

      const openaiAssistantId = openaiResponse.id; // Extract the actual OpenAI assistant ID

      // Create assistant in your database
      const assistant = await Assistant.create({
        ...data,
        imageUrl: data.imageUrl,
        availableFunctions: data.availableFunctions,
        codeName: data.codeName,
        createdBy: data.createdBy,
        userAddress: data.userAddress,
        llmModel: data.llmModel,
        llmProvider: data.llmProvider,
        openaiAssistantId // Store the actual OpenAI assistant ID
      });

      // Create a thread for the new assistant
      const thread = await Thread.create({
        assistantId: assistant._id,
        openaiThreadId: openaiAssistantId // Use the OpenAI assistant ID for the thread
      });

      await createConversation(thread._id);

      console.log('Created thread ID:', thread._id);

      return { assistant, thread };
    } catch (error) {
      console.error('Create Assistant Error:', error.message, error.stack);
      throw new Error('Error creating assistant in database');
    }
  },

  async list(page, limit, categories) {
    const query = categories.length ? { categories: { $in: categories } } : {};
    const assistants = await Assistant.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    const total = await Assistant.countDocuments(query);
    return { assistants, total };
  },

  async getById(id) {
    const assistant = await Assistant.findById(id);
    if (!assistant) {
      throw new Error(ERROR_MESSAGES.ASSISTANT_NOT_FOUND);
    }
    return assistant;
  },

  async update(id, data) {
    const assistant = await Assistant.findById(id);
    if (!assistant) {
      throw new Error(ERROR_MESSAGES.ASSISTANT_NOT_FOUND);
    }

    // Update OpenAI assistant
    await openai.beta.assistants.update(assistant.openaiAssistantId, {
      name: data.name,
      instructions: data.instructions,
      tools: [
        {
          "type": "function",
          "function": {
            "name": "get_balance",
            "description": "Get native token balance of a wallet address on Sepolia network",
            "parameters": {
              "type": "object",
              "properties": {
                "address": {
                  "type": "string",
                  "description": "The wallet address to check"
                }
              },
              "required": ["address"]
            }
          }
        }
      ]
    });

    // Update assistant in database
    return await Assistant.findByIdAndUpdate(id, {
      ...data,
      llmModel: data.llmModel,
      llmProvider: data.llmProvider
    }, { new: true });
  },

  async delete(id) {
    const assistant = await Assistant.findById(id);
    if (!assistant) {
      throw new Error(ERROR_MESSAGES.ASSISTANT_NOT_FOUND);
    }

    // Delete from OpenAI
    await openai.beta.assistants.del(assistant.openaiAssistantId);

    // Delete from database
    await Assistant.findByIdAndDelete(id);
  },

  async getThreadIdByAssistantId(assistantId) {
    const thread = await Thread.findOne({ assistantId });
    if (!thread) {
      throw new Error('Thread not found for the given assistant ID');
    }
    return thread._id;
  },

  async getByUserAddress(userAddress, page, limit) {
    try {
      const skip = (page - 1) * limit;
      const assistants = await Assistant.find({ userAddress }).skip(skip).limit(limit);
      const total = await Assistant.countDocuments({ userAddress });
      return { assistants, total };
    } catch (error) {
      console.error('Error fetching assistants by userAddress:', error);
      throw new Error('Could not fetch assistants');
    }
  },

  /**
   * Verifies a signature using the Aptos blockchain
   * @param {string} address - The account address
   * @param {string} message - The message that was signed
   * @param {string} signature - The signature to verify
   * @returns {Promise<boolean>} - True if signature is valid
   */
  async verifySignature(address, message, signature) {
    // Input validation
    if (!address || !message || !signature) {
      throw new Error('Missing required parameters');
    }
    
    try {
      // Implementation to verify signature
      const { aptosService } = await import('./aptosService.js');
      const isValid = await aptosService.verifySignature(address, message, signature);
      return isValid;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }
};

// async function saveDataToDatabase(data) {
//   try {
//     const newData = new Assistant(data);
//     await newData.save();
//     console.log('Data saved to MongoDB');
//   } catch (error) {
//     console.error('Error saving data to MongoDB:', error);
//   }
// }

// // Example usage
// const data = {
//   name: 'example',
//   instructions: 'example instructions',
//   // ... other fields
// };

// saveDataToDatabase(data);