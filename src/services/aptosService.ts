import { 
    Aptos,
    Network,
    AptosConfig,
    Ed25519PrivateKey,
    Account,
    TypeTag,
    TransactionPayloadEntryFunction,
    HexString,
    Ed25519PublicKey,
    Ed25519Signature
} from '@aptos-labs/ts-sdk';
import { User } from '../models/User';

export class AptosService {
    private client: Aptos;
    private config: AptosConfig;

    constructor() {
        this.config = new AptosConfig({ network: Network.DEVNET });
        this.client = new Aptos(this.config);
    }

    async verifySignature(address: string, message: string, signature: string): Promise<boolean> {
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

    async createUserWallet(): Promise<{ address: string; privateKey: string }> {
        const account = Account.generate();
        return {
            address: account.accountAddress.toString(),
            privateKey: account.privateKey.toString()
        };
    }

    async getUserAccount(userId: string): Promise<Account> {
        const privateKey = await this.getPrivateKeyFromStorage(userId);
        return Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(privateKey) });
    }

    async getAccountBalance(address: string): Promise<string> {
        try {
            const accountResource = await this.client.getAccountResource({
                accountAddress: address,
                resourceType: "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
            });
            return (accountResource.data as any).coin.value;
        } catch (error) {
            console.error('Error getting account balance:', error);
            throw error;
        }
    }

    async sendTransaction(fromAddress: string, toAddress: string, amount: string): Promise<string> {
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

    private async getPrivateKeyFromStorage(userId: string): Promise<string> {
        // Implementation to retrieve private key from secure storage
        // This is a placeholder - implement your secure storage solution
        throw new Error('Not implemented');
    }
}

// Export a singleton instance
export const aptosService = new AptosService(); 