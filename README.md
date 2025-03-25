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
- **AI Agent Integration**: Interact with the blockchain through an AI-powered agent using LangChain
- **User-Specific Agents**: Each user has their own dedicated blockchain agent

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

### Using the AI Agent API

The agent API allows for interacting with the blockchain through natural language, with each user having their own dedicated agent:

```javascript
// Initialize the agent with a private key for a specific user
const response = await fetch('http://localhost:3001/api/agent/initialize', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ 
    privateKey: 'your-private-key',
    userId: 'unique-user-id'
  })
});

// Send a message to the user's agent
const messageResponse = await fetch('http://localhost:3001/api/agent/message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'unique-user-id',
    messages: [
      {
        role: 'user',
        content: 'What is my wallet balance?'
      }
    ]
  })
});

// Check agent status for a specific user
const statusResponse = await fetch('http://localhost:3001/api/agent/status/unique-user-id', {
  method: 'GET'
});

// List all user agents (admin function)
const allAgentsResponse = await fetch('http://localhost:3001/api/agent/admin/all', {
  method: 'GET'
});

// Remove a user's agent
const removeResponse = await fetch('http://localhost:3001/api/agent/unique-user-id', {
  method: 'DELETE'
});
```

### Running the Examples

To run the example scripts demonstrating AptosService functionality:

```bash
# Run the basic Aptos example
node src/examples/aptosExample.js

# Run the Agent API example
node src/examples/agentExample.js
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user

### Wallet Management
- `POST /api/wallet/create` - Create a new wallet
- `GET /api/wallet/balance/:address` - Get wallet balance
- `POST /api/wallet/transfer` - Send a transaction

### Agent API
- `POST /api/agent/initialize` - Initialize the blockchain agent with a private key for a specific user
- `POST /api/agent/message` - Send a message to the user's AI agent and get a response
- `GET /api/agent/status/:userId` - Check the status of a user's agent
- `GET /api/agent/admin/all` - List all user agents (admin function)
- `DELETE /api/agent/:userId` - Remove an agent for a specific user

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