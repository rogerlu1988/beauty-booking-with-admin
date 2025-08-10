import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  durationMinutes: { type: Number, required: true, min: 15, max: 480 },
  price: { type: Number, required: true, min: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Service', ServiceSchema);
