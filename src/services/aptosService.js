import { 
    Aptos,
    Network,
    AptosConfig,
    Ed25519PrivateKey,
    Account,
    Ed25519PublicKey,
    Ed25519Signature,
    PrivateKey
} from '@aptos-labs/ts-sdk';
import { AgentRuntime, LocalSigner } from 'move-agent-kit';
import dotenv from 'dotenv';

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