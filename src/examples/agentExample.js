import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

/**
 * Example script demonstrating the usage of the Multi-Agent API
 * Shows how a single user can have multiple agents
 */
async function runAgentExample() {
    try {
        console.log('=== MetaMove Multi-Agent API Example ===');
        const API_URL = 'http://localhost:3001/api/agent';
        
        // Generate a unique user ID for this example
        const userId = uuidv4();
        console.log(`Generated test user ID: ${userId}`);
        
        // Example 1: Create first agent for the user with a specific name
        console.log('\n=== Creating First Agent for User ===');
        // Replace with your private key for testing
        const privateKey = process.env.MOCK_PRIVATE_KEY;
        
        if (!privateKey) {
            console.error('No MOCK_PRIVATE_KEY found in environment variables');
            return;
        }
        
        const firstAgentResponse = await fetch(`${API_URL}/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                privateKey,
                userId,
                name: "Primary Agent"
            })
        });
        
        const firstAgentResult = await firstAgentResponse.json();
        console.log('First agent creation result:', firstAgentResult);
        const firstAgentId = firstAgentResult.data.agentId;
        
        // Example 2: Create a second agent for the same user
        console.log('\n=== Creating Second Agent for Same User ===');
        const secondAgentResponse = await fetch(`${API_URL}/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                privateKey,
                userId,
                name: "Secondary Agent"
            })
        });
        
        const secondAgentResult = await secondAgentResponse.json();
        console.log('Second agent creation result:', secondAgentResult);
        const secondAgentId = secondAgentResult.data.agentId;
        
        // Example 3: List all agents for the user
        console.log('\n=== Listing All Agents for User ===');
        const userAgentsResponse = await fetch(`${API_URL}/user/${userId}`, {
            method: 'GET'
        });
        
        const userAgentsResult = await userAgentsResponse.json();
        console.log('User agents:', userAgentsResult);
        
        // Example 4: Get status of specific agent
        console.log('\n=== Getting Status of First Agent ===');
        const agentStatusResponse = await fetch(`${API_URL}/${firstAgentId}`, {
            method: 'GET'
        });
        
        const agentStatusResult = await agentStatusResponse.json();
        console.log('First agent status:', agentStatusResult);
        
        // Example 5: Send a message to the first agent
        console.log('\n=== Sending Message to First Agent ===');
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
                agentId: firstAgentId
            })
        });
        
        const messageResult = await messageResponse.json();
        console.log('First agent response:', messageResult);
        
        // Example 6: Send a different message to the second agent
        console.log('\n=== Sending Message to Second Agent ===');
        const secondMessages = [
            {
                role: 'user',
                content: 'How much APT do I have?'
            }
        ];
        
        const secondMessageResponse = await fetch(`${API_URL}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                messages: secondMessages,
                agentId: secondAgentId
            })
        });
        
        const secondMessageResult = await secondMessageResponse.json();
        console.log('Second agent response:', secondMessageResult);
        
        // Example 7: Rename the first agent
        console.log('\n=== Renaming First Agent ===');
        const renameResponse = await fetch(`${API_URL}/${firstAgentId}/name`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                name: "Wallet Explorer Agent"
            })
        });
        
        const renameResult = await renameResponse.json();
        console.log('Rename result:', renameResult);
        
        // Example 8: Create a second user with their own agent
        console.log('\n=== Creating Agent for Another User ===');
        const secondUserId = uuidv4();
        console.log(`Generated second user ID: ${secondUserId}`);
        
        const otherUserAgentResponse = await fetch(`${API_URL}/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                privateKey,
                userId: secondUserId,
                name: "Other User's Agent"
            })
        });
        
        const otherUserAgentResult = await otherUserAgentResponse.json();
        console.log('Other user agent creation result:', otherUserAgentResult);
        const otherUserAgentId = otherUserAgentResult.data.agentId;
        
        // Example 9: Get all agents (admin function)
        console.log('\n=== Getting All Agents (Admin) ===');
        const allAgentsResponse = await fetch(`${API_URL}/admin/all`, {
            method: 'GET'
        });
        
        const allAgentsResult = await allAgentsResponse.json();
        console.log('All agents:', allAgentsResult);
        
        // Example 10: Remove the second agent for the first user
        console.log('\n=== Removing Second Agent ===');
        const removeAgentResponse = await fetch(`${API_URL}/${secondAgentId}`, {
            method: 'DELETE'
        });
        
        const removeAgentResult = await removeAgentResponse.json();
        console.log('Remove agent result:', removeAgentResult);
        
        // Example 11: Check user agents after removal
        console.log('\n=== Checking User Agents After Removal ===');
        const checkAgentsResponse = await fetch(`${API_URL}/user/${userId}`, {
            method: 'GET'
        });
        
        const checkAgentsResult = await checkAgentsResponse.json();
        console.log('User agents after removal:', checkAgentsResult);
        
        // Example 12: Remove all agents for second user
        console.log('\n=== Removing All Agents for Second User ===');
        const removeUserAgentsResponse = await fetch(`${API_URL}/user/${secondUserId}`, {
            method: 'DELETE'
        });
        
        const removeUserAgentsResult = await removeUserAgentsResponse.json();
        console.log('Remove user agents result:', removeUserAgentsResult);
        
        // Example 13: Final check of all agents
        console.log('\n=== Final Check of All Agents ===');
        const finalCheckResponse = await fetch(`${API_URL}/admin/all`, {
            method: 'GET'
        });
        
        const finalCheckResult = await finalCheckResponse.json();
        console.log('Final agents list:', finalCheckResult);
        
        console.log('\n=== Example Complete ===');
    } catch (error) {
        console.error('Error running agent example:', error);
    }
}

// Run the example
runAgentExample(); 