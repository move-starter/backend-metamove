import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    aptosAddress: {
        type: String,
        required: true,
        unique: true
    },
    aptosPrivateKey: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export const User = mongoose.model('User', userSchema); 