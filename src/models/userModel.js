import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    unique: true,
  },
});

const User = mongoose.model('User', userSchema);

export default User; 