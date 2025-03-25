import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import morgan from 'morgan';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/database.js';
import assistantRoutes from './routes/assistantRoutes.js';
import threadRoutes from './routes/threadRoutes.js';
import { errorHandler, securityHeaders, requestLogger } from './middleware/securityMiddleware.js';
import { setupSwagger } from './config/swagger.js';
import userRoutes from './routes/userRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import Web3 from 'web3';
import { Assistant } from './models/Assistant.js';
import factoryABI from '../abi_Fectory_Bonding_Curve.json' assert { type: 'json' };
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Security middleware
app.use(helmet());
app.use(securityHeaders);
app.use(requestLogger);

// Logging
app.use(morgan('dev'));

// Dynamic CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://ai-agent-frontend-nine.vercel.app',
  'https://main.d2fr6vimkj4d1z.amplifyapp.com',
  'https://movestarter.fun',
  'https://main.d21c1uuxm7cd7x.amplifyapp.com'
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400  // 24 hours
};

app.use(cors(corsOptions));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define routes
app.use('/api/assistants', assistantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/agent', agentRoutes);

// Security endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

// Test route to verify server is working
app.get('/test', (req, res) => {
  res.send('Server is running');
});

// Function to set up event listener
async function setupEventListener() {
  try {
    // Blockchain event listener setup
    const web3 = new Web3(process.env.ETHEREUM_RPC_URL);
    const contract = new web3.eth.Contract(factoryABI, process.env.FACTORY_CONTRACT_ADDRESS);

    contract.events.AssistantCreated()
      .on('data', async (event) => {
        try {
          console.log('AssistantCreated event detected:', event.returnValues);
          // Process the event data
          const { assistantId, creator, tokenAddress } = event.returnValues;
          
          // Example: Save to database
          await Assistant.create({
            blockchainId: assistantId,
            creator,
            tokenAddress
          });
          
          console.log('New assistant saved to database');
        } catch (error) {
          console.error('Error processing event:', error);
        }
      })
      .on('error', (error) => {
        console.error('Event listener error:', error);
      });

    console.log('Event listener set up successfully');
  } catch (error) {
    console.error('Error setting up event listener:', error);
  }
}

// Set up the event listener
setupEventListener(); 

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to MetaMove API' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Graceful shutdown
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit, but log it
});

export default app;