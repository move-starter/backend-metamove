import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

/**
 * Example script demonstrating the usage of the User-Specific Agent API
 */
async function runAgentExample() {
    try {
        console.log('=== MetaMove User-Specific Agent API Example ===');
        const API_URL = 'http://localhost:3001/api/agent';
        
        // Generate a unique user ID for this example
        const userId = uuidv4();
        console.log(`Generated test user ID: ${userId}`);
        
        // Example 1: Initialize Agent with Private Key for a specific user
        console.log('\n=== Initializing Agent for User ===');
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
            body: JSON.stringify({ 
                privateKey,
                userId 
            })
        });
        
        const initResult = await initResponse.json();
        console.log('Agent initialization result:', initResult);
        
        // Example 2: Check Agent Status for the user
        console.log('\n=== Checking Agent Status for User ===');
        const statusResponse = await fetch(`${API_URL}/status/${userId}`, {
            method: 'GET'
        });
        
        const statusResult = await statusResponse.json();
        console.log('Agent status for user:', statusResult);
        
        // Example 3: Process a message with the Agent for the user
        console.log('\n=== Processing Message with User Agent ===');
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
            body: JSON.stringify({ 
                messages,
                userId 
            })
        });
        
        const messageResult = await messageResponse.json();
        console.log('Agent response for user:', messageResult);
        
        // Example 4: Process another message (continuing the conversation)
        console.log('\n=== Continuing Conversation for User ===');
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
            body: JSON.stringify({ 
                messages: followupMessages,
                userId 
            })
        });
        
        const followupResult = await followupResponse.json();
        console.log('Agent follow-up response for user:', followupResult);
        
        // Example 5: Create a second user agent to demonstrate multi-user support
        console.log('\n=== Initializing Agent for Second User ===');
        const secondUserId = uuidv4();
        console.log(`Generated second test user ID: ${secondUserId}`);
        
        const secondInitResponse = await fetch(`${API_URL}/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                privateKey,
                userId: secondUserId 
            })
        });
        
        const secondInitResult = await secondInitResponse.json();
        console.log('Second agent initialization result:', secondInitResult);
        
        // Example 6: Get all agents (admin function)
        console.log('\n=== Getting All User Agents ===');
        const allAgentsResponse = await fetch(`${API_URL}/admin/all`, {
            method: 'GET'
        });
        
        const allAgentsResult = await allAgentsResponse.json();
        console.log('All user agents:', allAgentsResult);
        
        // Example 7: Remove an agent for a user
        console.log('\n=== Removing Agent for Second User ===');
        const removeResponse = await fetch(`${API_URL}/${secondUserId}`, {
            method: 'DELETE'
        });
        
        const removeResult = await removeResponse.json();
        console.log('Agent removal result:', removeResult);
        
        // Example 8: Verify the agent was removed
        console.log('\n=== Verifying Agent Removal ===');
        const verifyResponse = await fetch(`${API_URL}/admin/all`, {
            method: 'GET'
        });
        
        const verifyResult = await verifyResponse.json();
        console.log('Updated user agents list:', verifyResult);
        
        console.log('\n=== Example Complete ===');
    } catch (error) {
        console.error('Error running agent example:', error);
    }
}

// Run the example
runAgentExample(); 