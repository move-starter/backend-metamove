import { 
    Aptos,
    Network,
    AptosConfig,
    Ed25519PrivateKey,
    Account,
    Ed25519PublicKey,
    Ed25519Signature
} from '@aptos-labs/ts-sdk';

/**
 * Service for interacting with the Aptos blockchain
 * Handles wallet creation, transaction management, and signature verification
 */
class AptosService {
    /**
     * Initialize the Aptos service with default configuration
     */
    constructor() {
        // Initialize with Aptos devnet
        this.config = new AptosConfig({ network: Network.DEVNET });
        this.client = new Aptos(this.config);
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
            const accountInfo = await this.client.getAccountInfo({ accountAddress: address });
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
     * Gets a user account from storage
     * @param {string} userId - User ID to retrieve account for
     * @returns {Promise<Account>} Aptos account
     */
    async getUserAccount(userId) {
        try {
            const privateKey = await this.getPrivateKeyFromStorage(userId);
            return Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(privateKey) });
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
            const accountResource = await this.client.getAccountResource({
                accountAddress: address,
                resourceType: "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
            });
            return accountResource.data.coin.value;
        } catch (error) {
            console.error('Error getting account balance:', error);
            if (error.message.includes('Resource not found')) {
                return '0'; // Return zero balance if resource not found
            }
            throw new Error('Failed to get account balance');
        }
    }

    /**
     * Sends a transaction on the Aptos blockchain
     * @param {string} fromAddress - Sender address
     * @param {string} toAddress - Recipient address
     * @param {string} amount - Amount to send
     * @returns {Promise<string>} Transaction hash
     */
    async sendTransaction(fromAddress, toAddress, amount) {
        // Validate parameters
        if (!fromAddress || !toAddress || !amount) {
            throw new Error('Missing required parameters for transaction');
        }
        
        // Validate amount format
        if (isNaN(parseInt(amount))) {
            throw new Error('Amount must be a valid number');
        }
        
        // Check if amount is positive
        if (parseInt(amount) <= 0) {
            throw new Error('Amount must be greater than zero');
        }

        try {
            const account = await this.getUserAccount(fromAddress);
            
            // 1. Build the transaction
            const transaction = await this.client.transaction.build.simple({
                sender: account.accountAddress,
                data: {
                    function: "0x1::coin::transfer",
                    typeArguments: ["0x1::aptos_coin::AptosCoin"],
                    functionArguments: [toAddress, amount]
                }
            });

            // 2. Sign the transaction
            const senderAuthenticator = await this.client.transaction.sign({
                signer: account,
                transaction
            });

            // 3. Submit the transaction
            const submittedTx = await this.client.transaction.submit.simple({
                transaction,
                senderAuthenticator
            });

            // 4. Wait for transaction to be confirmed with timeout
            const confirmedTx = await this.waitForTransactionWithRetry(submittedTx.hash);
            return confirmedTx.hash;
        } catch (error) {
            console.error('Error sending transaction:', error);
            throw new Error(`Transaction failed: ${error.message}`);
        }
    }

    /**
     * Waits for a transaction with retry logic
     * @param {string} hash - Transaction hash
     * @param {number} maxRetries - Maximum number of retries
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<object>} Transaction result
     */
    async waitForTransactionWithRetry(hash, maxRetries = 5, timeout = 10000) {
        if (!hash) {
            throw new Error('Transaction hash is required');
        }
        
        let retries = 0;
        while (retries < maxRetries) {
            try {
                const result = await Promise.race([
                    this.client.waitForTransaction({ transactionHash: hash }),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Transaction timeout')), timeout)
                    )
                ]);
                return result;
            } catch (error) {
                retries++;
                console.warn(`Transaction wait retry ${retries}/${maxRetries}`);
                if (retries >= maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s between retries
            }
        }
        throw new Error('Transaction confirmation failed after maximum retries');
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