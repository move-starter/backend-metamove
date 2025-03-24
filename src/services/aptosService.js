import { 
    Aptos,
    Network,
    AptosConfig,
    Ed25519PrivateKey,
    Account,
    Ed25519PublicKey,
    Ed25519Signature
} from '@aptos-labs/ts-sdk';

export class AptosService {
    constructor() {
        this.config = new AptosConfig({ network: Network.DEVNET });
        this.client = new Aptos(this.config);
    }

    async verifySignature(address, message, signature) {
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

    async createUserWallet() {
        const account = Account.generate();
        return {
            address: account.accountAddress.toString(),
            privateKey: account.privateKey.toString()
        };
    }

    async getUserAccount(userId) {
        const privateKey = await this.getPrivateKeyFromStorage(userId);
        return Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(privateKey) });
    }

    async getAccountBalance(address) {
        try {
            const accountResource = await this.client.getAccountResource({
                accountAddress: address,
                resourceType: "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
            });
            return accountResource.data.coin.value;
        } catch (error) {
            console.error('Error getting account balance:', error);
            throw error;
        }
    }

    async sendTransaction(fromAddress, toAddress, amount) {
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

            // 4. Wait for transaction to be confirmed
            const confirmedTx = await this.client.waitForTransaction({
                transactionHash: submittedTx.hash
            });

            return confirmedTx.hash;
        } catch (error) {
            console.error('Error sending transaction:', error);
            throw error;
        }
    }

    async getPrivateKeyFromStorage(userId) {
        // Implementation to retrieve private key from secure storage
        // This is a placeholder - implement your secure storage solution
        throw new Error('Not implemented');
    }
}

// Export a singleton instance
export const aptosService = new AptosService(); 