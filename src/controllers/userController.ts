import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { aptosService } from '../services/aptosService';
import jwt from 'jsonwebtoken';

export class UserController {
    async register(req: Request, res: Response) {
        try {
            const { username, email, password } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({ 
                $or: [{ email }, { username }] 
            });
            if (existingUser) {
                return res.status(400).json({ 
                    message: 'User already exists' 
                });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create user
            const user = new User({
                username,
                email,
                password: hashedPassword
            });

            await user.save();

            // Create Aptos wallet for user
            const wallet = await aptosService.createUserWallet(user._id.toString());
            if (!wallet) {
                return res.status(500).json({ 
                    message: 'Failed to create Aptos wallet' 
                });
            }

            res.status(201).json({
                message: 'User registered successfully',
                userId: user._id,
                aptosAddress: wallet.address
            });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ 
                message: 'Error registering user' 
            });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            // Find user
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(400).json({ 
                    message: 'Invalid credentials' 
                });
            }

            // Verify password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ 
                    message: 'Invalid credentials' 
                });
            }

            // Get user's Aptos account
            const account = await aptosService.getUserAccount(user._id.toString());
            if (!account) {
                return res.status(500).json({ 
                    message: 'Failed to get Aptos account' 
                });
            }

            // Get account balance
            const balance = await aptosService.getAccountBalance(user._id.toString());

            res.json({
                message: 'Login successful',
                userId: user._id,
                username: user.username,
                aptosAddress: account.accountAddress.toString(),
                balance
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                message: 'Error logging in' 
            });
        }
    }

    async loginWithAptos(req: Request, res: Response) {
        try {
            const { aptosAddress, signature, message } = req.body;

            if (!aptosAddress || !signature || !message) {
                return res.status(400).json({ 
                    message: 'Missing required fields' 
                });
            }

            // Verify the signature
            const isValid = await aptosService.verifySignature(aptosAddress, message, signature);
            if (!isValid) {
                return res.status(401).json({ 
                    message: 'Invalid signature' 
                });
            }

            // Find or create user
            let user = await User.findOne({ aptosAddress });
            
            if (!user) {
                // Create new user with Aptos wallet
                const wallet = await aptosService.createUserWallet(aptosAddress);
                if (!wallet) {
                    return res.status(500).json({ 
                        message: 'Failed to create Aptos wallet' 
                    });
                }

                user = new User({
                    aptosAddress: wallet.address,
                    aptosPrivateKey: wallet.privateKey
                });
                await user.save();
            }

            // Generate JWT token
            const token = jwt.sign(
                { userId: user._id, aptosAddress: user.aptosAddress },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            // Get account balance
            const balance = await aptosService.getAccountBalance(user._id.toString());

            res.json({
                message: 'Login successful',
                token,
                user: {
                    aptosAddress: user.aptosAddress,
                    balance
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ 
                message: 'Error logging in' 
            });
        }
    }

    async getProfile(req: Request, res: Response) {
        try {
            const userId = req.params.userId;
            
            // Validate userId format
            if (!Types.ObjectId.isValid(userId)) {
                return res.status(400).json({ 
                    message: 'Invalid user ID format' 
                });
            }

            const user = await User.findById(userId);
            
            if (!user) {
                return res.status(404).json({ 
                    message: 'User not found' 
                });
            }

            // Get Aptos account info
            const account = await aptosService.getUserAccount(userId);
            const balance = await aptosService.getAccountBalance(userId);

            res.json({
                user: {
                    aptosAddress: user.aptosAddress,
                    balance
                }
            });
        } catch (error) {
            console.error('Profile error:', error);
            res.status(500).json({ 
                message: 'Error fetching profile' 
            });
        }
    }
}

export const userController = new UserController(); 