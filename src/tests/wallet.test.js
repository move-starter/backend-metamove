import request from 'supertest';
import app from '../index.js';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';

describe('Wallet API', () => {
  let testUser;
  let testUserToken;

  // Before all tests, set up test environment
  beforeAll(async () => {
    // Use in-memory MongoDB for testing
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/metamove-test');
    
    // Clear users collection
    await User.deleteMany({});
    
    // Create a test user
    const userData = {
      email: 'wallet-test@example.com',
      password: '$2b$10$abcdefghijklmnopqrstuvwxyz', // Hashed password
      name: 'Wallet Test User',
      privateKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      role: 'user'
    };
    
    testUser = await User.create(userData);
    
    // Create a JWT token for the test user
    testUserToken = jwt.sign(
      { 
        userId: testUser._id.toString(),
        email: testUser.email,
        role: testUser.role
      },
      process.env.JWT_SECRET || 'test-jwt-secret',
      { expiresIn: '1h' }
    );
  });

  // After all tests, clean up
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Test wallet retrieval
  describe('GET /api/wallet', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/wallet')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should get wallet details for authenticated user', async () => {
      const response = await request(app)
        .get('/api/wallet')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Wallet retrieved successfully');
      expect(response.body.wallet).toBeDefined();
      expect(response.body.wallet.address).toBeDefined();
      expect(response.body.wallet.publicKey).toBeDefined();
    });
  });

  // Test wallet balance
  describe('GET /api/wallet/balance', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/wallet/balance')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should get wallet balance for authenticated user', async () => {
      const response = await request(app)
        .get('/api/wallet/balance')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Balance retrieved successfully');
      expect(response.body.wallet).toBeDefined();
      expect(response.body.wallet.address).toBeDefined();
      expect(typeof response.body.wallet.balance).toBe('number');
    });
  });

  // Test deposit funds
  describe('POST /api/wallet/deposit', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/wallet/deposit')
        .send({ amount: 10 })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should deposit funds for authenticated user', async () => {
      const depositData = { amount: 10 };
      
      const response = await request(app)
        .post('/api/wallet/deposit')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(depositData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Funds deposited successfully');
      expect(response.body.wallet).toBeDefined();
      expect(response.body.wallet.balance).toBeGreaterThanOrEqual(depositData.amount);
    });

    it('should validate deposit amount', async () => {
      const depositData = { amount: -5 };
      
      const response = await request(app)
        .post('/api/wallet/deposit')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(depositData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });

  // Test withdraw funds
  describe('POST /api/wallet/withdraw', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .send({ amount: 5 })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should withdraw funds for authenticated user', async () => {
      // Ensure user has enough balance first by depositing
      await request(app)
        .post('/api/wallet/deposit')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ amount: 20 });
      
      const withdrawData = { amount: 5 };
      
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(withdrawData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Funds withdrawn successfully');
      expect(response.body.wallet).toBeDefined();
    });

    it('should validate withdrawal amount', async () => {
      const withdrawData = { amount: -5 };
      
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(withdrawData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });

    it('should prevent withdrawing more than balance', async () => {
      // Get current balance
      const balanceResponse = await request(app)
        .get('/api/wallet/balance')
        .set('Authorization', `Bearer ${testUserToken}`);
      
      const currentBalance = balanceResponse.body.wallet.balance;
      const withdrawData = { amount: currentBalance + 100 };
      
      const response = await request(app)
        .post('/api/wallet/withdraw')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(withdrawData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Insufficient balance for withdrawal');
    });
  });
}); 