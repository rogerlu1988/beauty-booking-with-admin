import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import servicesRouter from './routes/services.js';
import bookingsRouter from './routes/bookings.js';
import availabilityRouter from './routes/availability.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import { authOptional } from './middleware/auth.js';
import User from './models/User.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(authOptional);

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

    // Seed admin if not exists (controlled by env)
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const existing = await User.findOne({ email: process.env.ADMIN_EMAIL });
      if (!existing) {
        // defer hash to router util to avoid importing bcrypt here; implement simple hash below
        const { default: bcrypt } = await import('bcryptjs');
        const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        await User.create({
          email: process.env.ADMIN_EMAIL,
          passwordHash,
          role: 'admin',
          name: 'Admin',
        });
        console.log('✓ Seeded admin user:', process.env.ADMIN_EMAIL);
      }
    }

    app.use('/api/auth', authRouter);
    app.use('/api/users', usersRouter);
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
