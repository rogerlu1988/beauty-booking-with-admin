import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  clientPhone: { type: String, default: '' },
  notes: { type: String, default: '' },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  status: { type: String, enum: ['booked', 'cancelled'], default: 'booked' }
}, { timestamps: true });

// Simple index to speed up date range queries
BookingSchema.index({ start: 1, end: 1 });

export default mongoose.model('Booking', BookingSchema);
