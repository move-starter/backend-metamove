# MetaMove Backend

A robust backend service for blockchain integration with the Aptos network, providing wallet management, transaction handling, and signature verification.

## Features

- **Blockchain Integration**: Seamless interaction with Aptos blockchain using move-agent-kit
- **Wallet Management**: Create and manage blockchain wallets
- **Transaction Processing**: Build, sign, and submit transactions
- **Signature Verification**: Verify signatures using cryptographic methods
- **Account Management**: Check balances and manage user accounts
- **Secure Key Storage**: Secure handling of private keys
- **Token Transfers**: Transfer tokens to other addresses
- **Transaction History**: Retrieve transaction details

## Prerequisites

- Node.js (v16 or higher)
- MongoDB
- Aptos Mainnet Account (for interacting with the blockchain)
- OpenAI API Key (for AI assistant features)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/metamove.git
cd metamove/backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Required environment variables:
```
PORT=3001
MONGODB_URI=mongodb://localhost:27017/metamove
JWT_SECRET=your_jwt_secret
APTOS_NODE_URL=https://fullnode.mainnet.aptoslabs.com/v1
OPENAI_API_KEY=your_openai_api_key
# For development only
NODE_ENV=development
MOCK_PRIVATE_KEY=your_dev_private_key_here
```

## Project Structure

```
backend/
│
├── src/                  # Source files
│   ├── config/           # Configuration files
│   ├── controllers/      # Request controllers
│   ├── middleware/       # Express middleware
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   │   ├── aptosService.js  # Aptos blockchain service with move-agent-kit
│   │   └── assistantService.js  # AI assistant service
│   ├── examples/         # Example usage
│   └── utils/            # Utility functions
│
├── .babelrc              # Babel configuration
├── .env.example          # Example environment variables
├── .eslintrc.js          # ESLint configuration
├── .gitignore            # Git ignore file
├── jest.config.cjs       # Jest configuration
├── package.json          # Package information
└── README.md             # This file
```

## Usage

### Starting the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### Using the AptosService with move-agent-kit

The `aptosService` provides enhanced blockchain functionality using the move-agent-kit library.

```javascript
import { aptosService } from './services/aptosService.js';

// Initialize agent with private key
await aptosService.initializeAgent(privateKey);

// Create a new wallet
const wallet = await aptosService.createUserWallet();
console.log('New wallet address:', wallet.address);

// Check APT balance
const balance = await aptosService.getAccountBalance(wallet.address);
console.log('Balance:', balance);

// Check specific token balance
const tokenBalance = await aptosService.getTokenBalance(
  wallet.address,
  '0x1::aptos_coin::AptosCoin'
);
console.log('Token Balance:', tokenBalance);

// Transfer tokens
const txHash = await aptosService.transferTokens(
  recipientAddress,
  0.1 // amount in APT
);
console.log('Transaction submitted:', txHash);

// Get transaction details
const txDetails = await aptosService.getTransactionDetails(txHash);
console.log('Transaction details:', txDetails);

// Verify a signature
const isValid = await aptosService.verifySignature(
  address,
  message,
  signature
);
console.log('Signature valid:', isValid);
```

### Running the Example

To run the example script demonstrating AptosService functionality:

```bash
node src/examples/aptosExample.js
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user

### Wallet Management
- `POST /api/wallet/create` - Create a new wallet
- `GET /api/wallet/balance/:address` - Get wallet balance
- `POST /api/wallet/transfer` - Send a transaction

### Assistant
- `POST /api/assistant/create` - Create a new AI assistant
- `GET /api/assistant/list` - List available assistants
- `GET /api/assistant/:id` - Get assistant details

## Security Considerations

### Private Key Management
- Private keys are never stored in plain text
- Development mode uses environment variables (not for production)
- Production should use a secure key management system

### API Security
- Rate limiting for all API endpoints
- JWT authentication for protected routes
- Input validation for all requests
- HTTPS enforcement in production

## Development

### Testing
```bash
# Run all tests
npm test

# Run specific tests
npm test -- --testPathPattern=aptosService
```

### Linting
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Formatting
```bash
# Format code
npm run format
```

## Deployment

For production deployment:

1. Set NODE_ENV to production in .env
2. Ensure all secrets are properly configured
3. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details. 