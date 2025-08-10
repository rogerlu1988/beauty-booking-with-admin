import mongoose from 'mongoose';

const ProfessionalProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  businessHours: {
    open: { type: String, default: '09:00' }, // HH:mm
    close: { type: String, default: '18:00' },
  },
}, { timestamps: true });

ProfessionalProfileSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model('ProfessionalProfile', ProfessionalProfileSchema);
