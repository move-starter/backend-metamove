import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Example script demonstrating the usage of the Agent API
 */
async function runAgentExample() {
    try {
        console.log('=== MetaMove Agent API Example ===');
        const API_URL = 'http://localhost:3001/api/agent';
        
        // Example 1: Initialize Agent with Private Key
        console.log('\n=== Initializing Agent ===');
        // Replace with your private key for testing
        const privateKey = process.env.MOCK_PRIVATE_KEY;
        
        if (!privateKey) {
            console.error('No MOCK_PRIVATE_KEY found in environment variables');
            return;
        }
        
        const initResponse = await fetch(`${API_URL}/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ privateKey })
        });
        
        const initResult = await initResponse.json();
        console.log('Agent initialization result:', initResult);
        
        // Example 2: Check Agent Status
        console.log('\n=== Checking Agent Status ===');
        const statusResponse = await fetch(`${API_URL}/status`, {
            method: 'GET'
        });
        
        const statusResult = await statusResponse.json();
        console.log('Agent status:', statusResult);
        
        // Example 3: Process a message with the Agent
        console.log('\n=== Processing Message with Agent ===');
        const messages = [
            {
                role: 'user',
                content: 'What is my wallet address?'
            }
        ];
        
        const messageResponse = await fetch(`${API_URL}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages })
        });
        
        const messageResult = await messageResponse.json();
        console.log('Agent response:', messageResult);
        
        // Example 4: Process another message (continuing the conversation)
        console.log('\n=== Continuing Conversation ===');
        const followupMessages = [
            ...messages,
            {
                role: 'assistant',
                content: messageResult.result.messages[0].content
            },
            {
                role: 'user',
                content: 'What is my APT balance?'
            }
        ];
        
        const followupResponse = await fetch(`${API_URL}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ messages: followupMessages })
        });
        
        const followupResult = await followupResponse.json();
        console.log('Agent follow-up response:', followupResult);
        
        console.log('\n=== Example Complete ===');
    } catch (error) {
        console.error('Error running agent example:', error);
    }
}

// Run the example
runAgentExample(); 