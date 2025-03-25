import { aptosService } from '../services/aptosService.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Example script demonstrating the usage of AptosService with move-agent-kit
 */
async function runExample() {
  try {
    console.log('=== MetaMove Aptos Service Example ===');
    
    // Example 1: Create a new wallet
    console.log('\n=== Creating New Wallet ===');
    const wallet = await aptosService.createUserWallet();
    console.log('New wallet created:');
    console.log('Address:', wallet.address);
    console.log('Private Key:', wallet.privateKey.substring(0, 10) + '...');
    
    // Example 2: Initialize agent with a private key
    console.log('\n=== Initializing Agent with Private Key ===');
    // Use the mock private key from environment for development
    const privateKey = process.env.MOCK_PRIVATE_KEY || wallet.privateKey;
    const agent = await aptosService.initializeAgent(privateKey);
    console.log('Agent initialized successfully!');
    
    // Example 3: Get account balance
    console.log('\n=== Checking Account Balance ===');
    const address = privateKey === wallet.privateKey ? wallet.address : 'Use your address here';
    const balance = await aptosService.getAccountBalance(address);
    console.log(`Account balance for ${address}: ${balance} APT`);
    
    // Example 4: Get token balance for a specific token (if available)
    console.log('\n=== Checking Token Balance ===');
    // Replace with an actual token type if you want to test
    const tokenType = '0x1::aptos_coin::AptosCoin'; // Example token type
    const tokenBalance = await aptosService.getTokenBalance(address, tokenType);
    console.log(`Token balance for ${tokenType}: ${tokenBalance}`);
    
    // Example 5: Get transaction details (requires a valid transaction hash)
    console.log('\n=== Getting Transaction Details ===');
    const exampleTxHash = '0x123...'; // Replace with a real transaction hash
    console.log('Example tx hash:', exampleTxHash);
    console.log('(Skipping actual call to prevent errors. In real usage, call:)');
    console.log('await aptosService.getTransactionDetails(exampleTxHash)');
    
    // Example 6: Transfer tokens (commented out to prevent actual transfers)
    console.log('\n=== Transfer Tokens Example (commented out) ===');
    console.log('Example code for transferring tokens:');
    console.log('await aptosService.transferTokens("recipient_address", 0.1);');
    
    console.log('\n=== Example Complete ===');
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Run the example
runExample(); 