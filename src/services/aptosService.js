import { 
    Aptos,
    Network,
    AptosConfig,
    Ed25519PrivateKey,
    Account,
    Ed25519PublicKey,
    Ed25519Signature,
    PrivateKey,
    PrivateKeyVariants
} from '@aptos-labs/ts-sdk';
import { AgentRuntime, LocalSigner, createAptosTools } from 'move-agent-kit';
import dotenv from 'dotenv';
// Add imports for LangChain
import { ChatAnthropic } from '@langchain/anthropic';
import { MemorySaver } from '@langchain/langgraph';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { AIMessage, HumanMessage, ChatMessage } from '@langchain/core/messages';

dotenv.config();

/**
 * Service for interacting with the Aptos blockchain
 * Handles wallet creation, transaction management, and signature verification
 */
class AptosService {
    /**
     * Initialize the Aptos service with default configuration
     */
    constructor() {
        // Initialize with Aptos mainnet
        this.config = new AptosConfig({ network: Network.MAINNET });
        this.aptos = new Aptos(this.config);
        this.agent = null;
        this.llmAgent = null;
    }

    /**
     * Initialize the Agent Runtime with a user's private key
     * @param {string} privateKeyStr - The private key as a string
     * @returns {Promise<AgentRuntime>} The initialized agent runtime
     */
    async initializeAgent(privateKeyStr) {
        try {
            // Create an account from the private key
            const privateKey = new Ed25519PrivateKey(privateKeyStr);
            const account = Account.fromPrivateKey({ privateKey });
            
            // Create a signer from the account
            const signer = new LocalSigner(account);
            
            // Initialize the agent runtime
            this.agent = new AgentRuntime(signer, this.aptos);
            
            return this.agent;
        } catch (error) {
            console.error('Error initializing agent:', error);
            throw new Error(`Failed to initialize agent: ${error.message}`);
        }
    }

    /**
     * Initialize the LLM Agent with move-agent-kit
     * @returns {Promise<Object>} The initialized LLM agent
     */
    async initializeLLMAgent() {
        try {
            // Check if we have API key
            if (!process.env.ANTHROPIC_API_KEY) {
                throw new Error('Missing ANTHROPIC_API_KEY environment variable');
            }

            // Check if agent is initialized
            if (!this.agent) {
                throw new Error('Agent not initialized. Call initializeAgent first.');
            }

            // Initialize LLM
            const llm = new ChatAnthropic({
                temperature: 0.7,
                model: "claude-3-5-sonnet-latest",
                apiKey: process.env.ANTHROPIC_API_KEY,
            });

            // Create tools from agent
            const tools = createAptosTools(this.agent);
            const memory = new MemorySaver();

            // Create React agent
            this.llmAgent = createReactAgent({
                llm,
                tools,
                checkpointSaver: memory,
                messageModifier: `
                    You are a helpful agent that can interact onchain using the Aptos Agent Kit. You are
                    empowered to interact onchain using your tools. If you ever need funds, you can request them from the
                    faucet. If not, you can provide your wallet details and request funds from the user. If there is a 5XX
                    (internal) HTTP error code, ask the user to try again later. If someone asks you to do something you
                    can't do with your currently available tools, you must say so, and encourage them to implement it
                    themselves using the Aptos Agent Kit, recommend they go to https://www.aptosagentkit.xyz for more information. Be
                    concise and helpful with your responses. Refrain from restating your tools' descriptions unless it is explicitly requested.

                    The response also contains token/token[] which contains the name and address of the token and the decimals.
                    WHEN YOU RETURN ANY TOKEN AMOUNTS, RETURN THEM ACCORDING TO THE DECIMALS OF THE TOKEN.
                `,
            });

            return this.llmAgent;
        } catch (error) {
            console.error('Error initializing LLM agent:', error);
            throw new Error(`Failed to initialize LLM agent: ${error.message}`);
        }
    }

    /**
     * Process a user message with the LLM agent
     * @param {Array} messages - Array of message objects with role and content
     * @param {boolean} showIntermediateSteps - Whether to show intermediate steps
     * @returns {Promise<Object>} Agent response
     */
    async processAgentMessage(messages, showIntermediateSteps = false) {
        try {
            // Check if LLM agent is initialized
            if (!this.llmAgent) {
                await this.initializeLLMAgent();
            }

            // Format messages for LangChain if needed
            const formattedMessages = messages.map(msg => {
                if (msg.role === 'user') {
                    return new HumanMessage(msg.content);
                } else if (msg.role === 'assistant') {
                    return new AIMessage(msg.content);
                } else {
                    return new ChatMessage(msg.content, msg.role);
                }
            });

            if (!showIntermediateSteps) {
                // Invoke the agent with messages
                const result = await this.llmAgent.invoke({ messages: formattedMessages });
                
                // Format the response
                return {
                    messages: result.messages.map(msg => {
                        if (msg._getType() === 'human') {
                            return { content: msg.content, role: 'user' };
                        } else if (msg._getType() === 'ai') {
                            return {
                                content: msg.content,
                                role: 'assistant',
                                tool_calls: msg.tool_calls,
                            };
                        } else {
                            return { content: msg.content, role: msg._getType() };
                        }
                    }),
                };
            } else {
                // Get event stream with intermediate steps
                const eventStream = await this.llmAgent.streamEvents(
                    { messages: formattedMessages },
                    {
                        version: "v2",
                        configurable: {
                            thread_id: "Aptos Agent Kit!",
                        },
                    }
                );

                // Process and return stream
                return { eventStream };
            }
        } catch (error) {
            console.error('Error processing agent message:', error);
            throw new Error(`Failed to process agent message: ${error.message}`);
        }
    }

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
            throw new Error('Missing required parameters for signature verification');
        }
        
        try {
            const accountInfo = await this.aptos.getAccountInfo({ accountAddress: address });
            const publicKey = new Ed25519PublicKey(accountInfo.authentication_key);
            return publicKey.verifySignature({
                message,
                signature: new Ed25519Signature(signature)
            });
        } catch (error) {
            console.error('Error verifying signature:', error);
            return false;
        }
    }

    /**
     * Creates a new user wallet
     * @returns {Promise<{address: string, privateKey: string}>} Wallet credentials
     */
    async createUserWallet() {
        try {
            const account = Account.generate();
            
            // Initialize agent for the new account
            await this.initializeAgent(account.privateKey.toString());
            
            return {
                address: account.accountAddress.toString(),
                privateKey: account.privateKey.toString()
            };
        } catch (error) {
            console.error('Error creating user wallet:', error);
            throw new Error('Failed to create user wallet');
        }
    }

    /**
     * Gets a user account from the provided private key
     * @param {string} privateKeyStr - The private key as a string
     * @returns {Promise<Account>} Aptos account
     */
    async getUserAccount(privateKeyStr) {
        try {
            const privateKey = new Ed25519PrivateKey(privateKeyStr);
            const account = Account.fromPrivateKey({ privateKey });
            
            // Initialize agent for this account
            await this.initializeAgent(privateKeyStr);
            
            return account;
        } catch (error) {
            console.error('Error getting user account:', error);
            throw new Error('Failed to retrieve user account');
        }
    }

    /**
     * Gets the balance of an account
     * @param {string} address - Address to check balance
     * @returns {Promise<string>} Account balance
     */
    async getAccountBalance(address) {
        // Input validation
        if (!address) {
            throw new Error('Address is required to check balance');
        }

        try {
            // Ensure agent is initialized
            if (!this.agent) {
                throw new Error('Agent not initialized. Call initializeAgent first.');
            }
            
            // Get balance using agent
            const balance = await this.agent.aptos.getAccountAPTAmount({
                accountAddress: address
            });
            
            return balance.toString();
        } catch (error) {
            console.error('Error getting account balance:', error);
            if (error.message.includes('Resource not found')) {
                return '0'; // Return zero balance if resource not found
            }
            throw new Error('Failed to get account balance');
        }
    }

    /**
     * Gets token balance for a specific token
     * @param {string} address - Address to check balance
     * @param {string} tokenType - Token type/mint (optional)
     * @returns {Promise<string>} Token balance
     */
    async getTokenBalance(address, tokenType = null) {
        if (!address) {
            throw new Error('Address is required to check token balance');
        }

        try {
            // Ensure agent is initialized
            if (!this.agent) {
                throw new Error('Agent not initialized. Call initializeAgent first.');
            }
            
            let balance;
            
            if (tokenType) {
                if (tokenType.split('::').length === 3) {
                    // This is a coin type
                    balance = await this.agent.aptos.getAccountCoinAmount({
                        accountAddress: address,
                        coinType: tokenType
                    });
                } else {
                    // This is a fungible asset
                    const balances = await this.agent.aptos.getCurrentFungibleAssetBalances({
                        options: {
                            where: {
                                owner_address: { _eq: address },
                                asset_type: { _eq: tokenType }
                            }
                        }
                    });
                    
                    balance = balances.length > 0 ? balances[0].amount : 0;
                }
            } else {
                // Default to APT
                balance = await this.agent.aptos.getAccountAPTAmount({
                    accountAddress: address
                });
            }
            
            return balance.toString();
        } catch (error) {
            console.error('Error getting token balance:', error);
            return '0'; // Return zero balance on error
        }
    }

    /**
     * Transfers tokens to a recipient address
     * @param {string} toAddress - Recipient address
     * @param {number|string} amount - Amount to transfer
     * @param {string} tokenType - Token type (optional, defaults to APT)
     * @returns {Promise<string>} Transaction hash
     */
    async transferTokens(toAddress, amount, tokenType = null) {
        // Input validation
        if (!toAddress || !amount) {
            throw new Error('Recipient address and amount are required');
        }
        
        if (parseFloat(amount) <= 0) {
            throw new Error('Amount must be greater than zero');
        }
        
        try {
            // Ensure agent is initialized
            if (!this.agent) {
                throw new Error('Agent not initialized. Call initializeAgent first.');
            }
            
            let txResult;
            
            if (tokenType) {
                // Transfer specific token
                txResult = await this.agent.transferToken(toAddress, parseFloat(amount), tokenType);
            } else {
                // Transfer APT
                txResult = await this.agent.transferTokens(toAddress, parseFloat(amount));
            }
            
            return txResult.hash;
        } catch (error) {
            console.error('Error transferring tokens:', error);
            throw new Error(`Token transfer failed: ${error.message}`);
        }
    }
    
    /**
     * Gets transaction details
     * @param {string} txHash - Transaction hash
     * @returns {Promise<object>} Transaction details
     */
    async getTransactionDetails(txHash) {
        if (!txHash) {
            throw new Error('Transaction hash is required');
        }
        
        try {
            // Ensure agent is initialized
            if (!this.agent) {
                // We can use the Aptos client directly if agent is not initialized
                return await this.aptos.getTransactionByHash({
                    transactionHash: txHash
                });
            }
            
            return await this.agent.aptos.getTransactionByHash({
                transactionHash: txHash
            });
        } catch (error) {
            console.error('Error getting transaction details:', error);
            throw new Error(`Failed to retrieve transaction details: ${error.message}`);
        }
    }

    /**
     * Legacy method for sending transactions for backward compatibility
     * @param {string} fromPrivateKey - Sender's private key
     * @param {string} toAddress - Recipient address
     * @param {string} amount - Amount to send
     * @returns {Promise<string>} Transaction hash
     */
    async sendTransaction(fromPrivateKey, toAddress, amount) {
        try {
            // Initialize agent with sender's private key
            await this.initializeAgent(fromPrivateKey);
            
            // Use the new transferTokens method
            return await this.transferTokens(toAddress, amount);
        } catch (error) {
            console.error('Error sending transaction:', error);
            throw new Error(`Transaction failed: ${error.message}`);
        }
    }

    /**
     * Initializes an agent with the user's private key
     * @param {string} userId - User ID
     * @returns {Promise<AgentRuntime>} Initialized agent
     */
    async initializeAgentForUser(userId) {
        try {
            const privateKey = await this.getPrivateKeyFromStorage(userId);
            return await this.initializeAgent(privateKey);
        } catch (error) {
            console.error('Error initializing agent for user:', error);
            throw new Error(`Failed to initialize agent for user: ${error.message}`);
        }
    }

    /**
     * Retrieves a private key from secure storage
     * @param {string} userId - User ID to retrieve key for
     * @returns {Promise<string>} Private key
     */
    async getPrivateKeyFromStorage(userId) {
        // Implement secure storage retrieval
        // This is a placeholder - in production, use a secure storage solution
        
        try {
            // In a real implementation, you would:
            // 1. Retrieve the encrypted key from a database or secure storage
            // 2. Decrypt the key using an encryption key stored securely
            // 3. Return the decrypted private key
            
            // Mock implementation for development
            if (process.env.NODE_ENV === 'development' && process.env.MOCK_PRIVATE_KEY) {
                console.warn('Using mock private key. DO NOT USE IN PRODUCTION!');
                return process.env.MOCK_PRIVATE_KEY;
            }
            
            throw new Error('Secure storage not implemented');
        } catch (error) {
            console.error('Error retrieving private key:', error);
            throw new Error('Failed to retrieve private key from secure storage');
        }
    }
}

// Export a singleton instance
export const aptosService = new AptosService(); 