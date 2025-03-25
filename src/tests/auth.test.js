import request from 'supertest';
import app from '../index.js';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import bcrypt from 'bcrypt';

describe('Auth API', () => {
  // Before all tests, set up test environment
  beforeAll(async () => {
    // Use in-memory MongoDB for testing
    await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/metamove-test');
    
    // Clear users collection
    await User.deleteMany({});
  });

  // After all tests, clean up
  afterAll(async () => {
    await mongoose.connection.close();
  });

  // Test user registration
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.name).toBe(userData.name);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
      expect(response.body.token).toBeDefined();
    });

    it('should not register user with existing email', async () => {
      const userData = {
        name: 'Another User',
        email: 'test@example.com', // Using the same email
        password: 'password456'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already in use');
    });

    it('should validate user data', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'pwd' // Too short
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });

  // Test user login
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const hashedPassword = await bcrypt.hash('password123', 10);
      await User.create({
        name: 'Login Test User',
        email: 'login@example.com',
        password: hashedPassword
      });
    });

    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.token).toBeDefined();
    });

    it('should not login with invalid password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'wrongpassword'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should not login non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  // Test get current user
  describe('GET /api/auth/me', () => {
    let testUser;
    let testUserToken;

    beforeEach(async () => {
      // Create a test user and generate token
      const hashedPassword = await bcrypt.hash('password123', 10);
      testUser = await User.create({
        name: 'Profile Test User',
        email: 'profile@example.com',
        password: hashedPassword
      });
      
      // Make a login request to get a token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'profile@example.com',
          password: 'password123'
        });
      
      testUserToken = loginResponse.body.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('profile@example.com');
      expect(response.body.user.name).toBe('Profile Test User');
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
    });

    it('should not get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No token provided');
    });

    it('should not get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid token');
    });
  });
}); 