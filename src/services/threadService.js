import { openai } from '../config/openai.js';
import { Thread } from '../models/Thread.js';
import { Assistant } from '../models/Assistant.js';
import { FunctionExecutor } from './functionExecutor.js';
import { ERROR_MESSAGES } from '../utils/constants.js';
import mongoose from 'mongoose';
import { Chat } from '../models/chatModel.js';
import User from '../models/userModel.js';
import { Conversation } from '../models/conversationModel.js';

export const threadService = {
  async createThread(assistantId) {
    if (!mongoose.Types.ObjectId.isValid(assistantId)) {
      throw new Error('Invalid assistant ID');
    }

    const assistant = await Assistant.findById(assistantId);
    if (!assistant) {
      throw new Error(ERROR_MESSAGES.ASSISTANT_NOT_FOUND);
    }

    const openaiThread = await openai.beta.threads.create();
    return await Thread.create({
      assistantId,
      openaiThreadId: openaiThread.id
    });
  },

  async sendMessage(threadId, userMessage) {
    const thread = await Thread.findById(threadId).populate('assistantId');
    if (!thread) {
      throw new Error(ERROR_MESSAGES.THREAD_NOT_FOUND);
    }

    try {
      console.log('Adding user message to thread:', userMessage);
      await openai.beta.threads.messages.create(thread.openaiThreadId, {
        role: "user",
        content: userMessage
      });

      const dynamicInstructions = thread.assistantId.instructions;

      console.log('Creating run with assistant:', thread.assistantId.openaiAssistantId);
      const run = await openai.beta.threads.runs.create(thread.openaiThreadId, {
        assistant_id: thread.assistantId.openaiAssistantId,
        instructions: dynamicInstructions
      });

      let runStatus = await this.waitForRunCompletion(thread.openaiThreadId, run.id);
      console.log('Initial run status:', runStatus);
      
      while (runStatus.status === 'requires_action' && runStatus.required_action?.type === 'submit_tool_outputs') {
        console.log('Function call required:', runStatus.required_action.submit_tool_outputs);
        const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
        const toolOutputs = await FunctionExecutor.execute(toolCalls);
        
        console.log('Submitting tool outputs:', toolOutputs);
        runStatus = await openai.beta.threads.runs.submitToolOutputs(
          thread.openaiThreadId,
          run.id,
          { tool_outputs: toolOutputs }
        );
        
        runStatus = await this.waitForRunCompletion(thread.openaiThreadId, run.id);
        console.log('Updated run status after tool outputs:', runStatus);
      }

      // Get the latest message that includes function results
      const messages = await openai.beta.threads.messages.list(thread.openaiThreadId);
      const latestMessage = messages.data[0];
      
      // If the message has no content (empty response), create a formatted response
      if (latestMessage.content.length === 0 && latestMessage.role === 'assistant') {
        // Get the previous assistant message that might have the function call results
        const previousMessages = messages.data.slice(1);
        const functionResults = previousMessages.find(msg => 
          msg.role === 'assistant' && msg.content.some(c => c.type === 'function')
        );
        
        if (functionResults) {
          const balance = JSON.parse(functionResults.content[0].text.value);
          return {
            ...latestMessage,
            content: [{
              type: 'text',
              text: {
                value: `The balance for address ${balance.address} on ${balance.chain} is:\n${balance.balance} Wei`,
                annotations: []
              }
            }]
          };
        }
      }

      // Check if the database connection is established
      if (!mongoose.connection.readyState) {
        console.error('Database connection is not established');
        throw new Error('Database connection error');
      }

      // Append user message to the conversation
      let conversation = await Conversation.findOne({ threadId });
      if (!conversation) {
        conversation = new Conversation({ threadId, messages: [] });
      }
      conversation.messages.push({ role: 'user', content: userMessage });

      // Extract text from the latest message content
      const assistantMessageContent = latestMessage.content.map(c => c.text.value).join(' ');

      // Append assistant message to the conversation
      conversation.messages.push({ role: 'assistant', content: assistantMessageContent });

      // Save the conversation and log the result
      try {
        await conversation.save();
        console.log('Conversation saved successfully');
      } catch (saveError) {
        console.error('Error saving conversation:', saveError);
        throw new Error('Failed to save conversation');
      }

      return latestMessage;
    } catch (error) {
      console.error('Send Message Error:', error);
      throw new Error(`${ERROR_MESSAGES.OPENAI_ERROR}: ${error.message}`);
    }
  },

  async waitForRunCompletion(threadId, runId) {
    let runStatus;
    do {
      runStatus = await openai.beta.threads.runs.retrieve(threadId, runId);
      
      if (runStatus.status === 'failed') {
        console.error('Run failed:', runStatus.last_error);
        throw new Error('Run failed: ' + runStatus.last_error?.message || 'Unknown error');
      }
      
      if (!['completed', 'requires_action'].includes(runStatus.status)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } while (!['completed', 'requires_action'].includes(runStatus.status));
    
    return runStatus;
  },

  async getMessages(threadId) {
    const thread = await Thread.findById(threadId);
    if (!thread) {
      throw new Error(ERROR_MESSAGES.THREAD_NOT_FOUND);
    }

    const messages = await openai.beta.threads.messages.list(thread.openaiThreadId);
    return messages.data;
  },

  async getConversation(threadId) {
    const conversation = await Conversation.findOne({ threadId });
    if (!conversation) {
      throw new Error('Conversation not found');
    }
    return conversation.messages;
  }
};