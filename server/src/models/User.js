import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['client', 'professional', 'admin'], required: true },
  name: { type: String, default: '' },
  phone: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('User', UserSchema);
