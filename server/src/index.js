import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import servicesRouter from './routes/services.js';
import bookingsRouter from './routes/bookings.js';
import availabilityRouter from './routes/availability.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || 'beauty_booking';

if (!uri) {
  console.error('Missing MONGODB_URI. Please set it in .env');
  process.exit(1);
}

async function start() {
  try {
    await mongoose.connect(uri, { dbName });
    console.log('✓ Connected to MongoDB');

    app.use('/api/services', servicesRouter);
    app.use('/api/bookings', bookingsRouter);
    app.use('/api/availability', availabilityRouter);

    app.get('/api/health', (_req, res) => {
      res.json({ ok: true, now: new Date().toISOString() });
    });

    app.listen(PORT, () => {
      console.log(`✓ API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
}

start();
