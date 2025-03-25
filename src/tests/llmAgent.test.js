import request from 'supertest';
import app from '../index.js';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import jwt from 'jsonwebtoken';

describe('LLM Agent API', () => {
  let testUser;
  let testUserToken;
  let testAgentId;

  // Before all tests, set up test environment
  beforeAll(async () => {
    // Use in-memory MongoDB for testing
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/metamove-test');
    
    // Clear users collection
    await User.deleteMany({});
    
    // Create a test user
    const userData = {
      email: 'agent-test@example.com',
      password: '$2b$10$abcdefghijklmnopqrstuvwxyz', // Hashed password
      name: 'Agent Test User',
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

  // Test agent creation
  describe('POST /api/llm-agent', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/llm-agent')
        .send({ name: 'Test Agent' })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should create a new agent for authenticated user', async () => {
      const agentData = {
        name: 'Test Agent'
      };
      
      const response = await request(app)
        .post('/api/llm-agent')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(agentData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Agent created successfully');
      expect(response.body.agent).toBeDefined();
      expect(response.body.agent.id).toBeDefined();
      expect(response.body.agent.name).toBe(agentData.name);
      
      // Save agent ID for future tests
      testAgentId = response.body.agent.id;
    });

    it('should validate agent name', async () => {
      const agentData = { name: '' };
      
      const response = await request(app)
        .post('/api/llm-agent')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(agentData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });

  // Test getting all agents
  describe('GET /api/llm-agent', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/llm-agent')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should get all agents for authenticated user', async () => {
      const response = await request(app)
        .get('/api/llm-agent')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Agents retrieved successfully');
      expect(Array.isArray(response.body.agents)).toBe(true);
      expect(response.body.agents.length).toBeGreaterThanOrEqual(1);
    });
  });

  // Test sending a message to an agent
  describe('POST /api/llm-agent/:agentId/message', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/llm-agent/${testAgentId}/message`)
        .send({ message: 'Hello Agent' })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should send a message to an agent', async () => {
      const messageData = {
        message: 'Hello Agent'
      };
      
      const response = await request(app)
        .post(`/api/llm-agent/${testAgentId}/message`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(messageData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Message processed successfully');
      expect(response.body.response).toBeDefined();
    });

    it('should validate message content', async () => {
      const messageData = { message: '' };
      
      const response = await request(app)
        .post(`/api/llm-agent/${testAgentId}/message`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(messageData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });

    it('should handle non-existent agent', async () => {
      const nonExistentAgentId = '60b6e95c0d59f32e94f55555';
      const messageData = { message: 'Hello Agent' };
      
      const response = await request(app)
        .post(`/api/llm-agent/${nonExistentAgentId}/message`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(messageData)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Agent not found');
    });
  });

  // Test getting conversation history
  describe('GET /api/llm-agent/:agentId/history', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/llm-agent/${testAgentId}/history`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should get conversation history for an agent', async () => {
      const response = await request(app)
        .get(`/api/llm-agent/${testAgentId}/history`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Conversation history retrieved successfully');
      expect(Array.isArray(response.body.history)).toBe(true);
      expect(response.body.history.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle non-existent agent', async () => {
      const nonExistentAgentId = '60b6e95c0d59f32e94f55555';
      
      const response = await request(app)
        .get(`/api/llm-agent/${nonExistentAgentId}/history`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Agent not found');
    });
  });

  // Test clearing conversation history
  describe('DELETE /api/llm-agent/:agentId/history', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/llm-agent/${testAgentId}/history`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should clear conversation history for an agent', async () => {
      const response = await request(app)
        .delete(`/api/llm-agent/${testAgentId}/history`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Conversation history cleared successfully');
      
      // Verify history is cleared
      const historyResponse = await request(app)
        .get(`/api/llm-agent/${testAgentId}/history`)
        .set('Authorization', `Bearer ${testUserToken}`);
      
      expect(historyResponse.body.history.length).toBe(0);
    });

    it('should handle non-existent agent', async () => {
      const nonExistentAgentId = '60b6e95c0d59f32e94f55555';
      
      const response = await request(app)
        .delete(`/api/llm-agent/${nonExistentAgentId}/history`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Agent not found');
    });
  });

  // Test deleting an agent
  describe('DELETE /api/llm-agent/:agentId', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .delete(`/api/llm-agent/${testAgentId}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should delete an agent', async () => {
      const response = await request(app)
        .delete(`/api/llm-agent/${testAgentId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Agent deleted successfully');
      
      // Verify agent is deleted
      const getResponse = await request(app)
        .get(`/api/llm-agent/${testAgentId}/history`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);
      
      expect(getResponse.body.success).toBe(false);
    });

    it('should handle non-existent agent', async () => {
      const nonExistentAgentId = '60b6e95c0d59f32e94f55555';
      
      const response = await request(app)
        .delete(`/api/llm-agent/${nonExistentAgentId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Agent not found');
    });
  });
}); 