# MetaMove - Aptos Blockchain Integration

MetaMove is a blockchain integration service that provides seamless interaction with the Aptos blockchain network. This service handles wallet creation, transaction management, and signature verification.

## Features

- Wallet Creation and Management
- Transaction Building and Submission
- Signature Verification
- Balance Checking
- Secure Private Key Storage

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Aptos Devnet Account (for testing)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/sagar/backend-metamove.git
cd metamove
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Usage

### Initialize the Service

```javascript
import { aptosService } from './services/aptosService';

// Create a new wallet
const { address, privateKey } = await aptosService.createUserWallet();

// Get account balance
const balance = await aptosService.getAccountBalance(address);

// Send a transaction
const txHash = await aptosService.sendTransaction(
    fromAddress,
    toAddress,
    amount
);

// Verify a signature
const isValid = await aptosService.verifySignature(
    address,
    message,
    signature
);
```

### Example Implementation

```javascript
// Example of creating a wallet and sending a transaction
async function example() {
    try {
        // Create a new wallet
        const { address, privateKey } = await aptosService.createUserWallet();
        console.log('New wallet created:', address);

        // Get initial balance
        const balance = await aptosService.getAccountBalance(address);
        console.log('Initial balance:', balance);

        // Send a transaction
        const txHash = await aptosService.sendTransaction(
            address,
            '0x123...', // recipient address
            '100000000' // amount in octas
        );
        console.log('Transaction sent:', txHash);

    } catch (error) {
        console.error('Error:', error);
    }
}
```

## Security Considerations

1. Private Key Storage:
   - Implement secure storage for private keys
   - Never store private keys in plain text
   - Use encryption for private key storage
   - Consider using hardware security modules (HSM) for production

2. Transaction Security:
   - Always verify transaction details before signing
   - Implement proper error handling
   - Use appropriate gas limits
   - Monitor transaction status

## Development

### Running Tests

```bash
npm test
# or
yarn test
```

### Building the Project

```bash
npm run build
# or
yarn build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Aptos Blockchain](https://aptos.dev/)
- [Aptos TypeScript SDK](https://github.com/aptos-labs/aptos-ts-sdk)
- [MetaMove Team](https://github.com/yourusername/metamove) 