import mongoose from 'mongoose';
import express from 'express';
import { z } from 'zod';
import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import { authOptional, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

const BookingSchema = z.object({
  serviceId: z.string(),
  clientName: z.string().min(2),
  clientEmail: z.string().email(),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
  start: z.string().datetime(), // ISO string
  // Optional professional assignment at creation time
  professionalUserId: z.string().optional(),
});

// --- Assign booking to a professional (admin only) ---
router.patch('/:id/assign', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    const { professionalUserId, professionalEmail } = req.body || {};

    let proId = professionalUserId;
    if (!proId && professionalEmail) {
      const u = await User.findOne({ email: professionalEmail });
      if (!u) return res.status(404).json({ error: 'Professional user not found by email' });
      proId = u._id;
    }
    if (!proId) return res.status(400).json({ error: 'Provide professionalUserId or professionalEmail' });
    if (!mongoose.isValidObjectId(proId)) return res.status(400).json({ error: 'Invalid professionalUserId' });

    const updated = await Booking.findByIdAndUpdate(
      id,
      { professionalUserId: proId },
      { new: true }
    ).populate('serviceId', 'name');
    if (!updated) return res.status(404).json({ error: 'Booking not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Ensure req.user may be present if provided
router.use(authOptional);

router.get('/', async (req, res) => {
  const { date, mine, client } = req.query;

  // Auth-scoped views
  if (mine === '1') {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const items = await Booking.find({ professionalUserId: req.user.id }).sort({ start: -1 }).limit(200);
    return res.json({ bookings: items });
  }
  if (client === '1') {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const items = await Booking.find({ clientUserId: req.user.id }).sort({ start: -1 }).limit(200);
    return res.json({ bookings: items });
  }

  // Public views
  const { } = req.query;
  const qDate = date;
  if (qDate) {
    const dayStart = new Date(qDate + 'T00:00:00');
    const dayEnd = new Date(qDate + 'T23:59:59');
    const items = await Booking.find({ start: { $gte: dayStart, $lte: dayEnd } }).sort({ start: 1 });
    return res.json(items);
  }
  const items = await Booking.find().sort({ start: 1 }).limit(200);
  res.json(items);
});

router.post('/', async (req, res) => {
  try {
    const payload = BookingSchema.parse(req.body);
    const service = await Service.findById(payload.serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const start = new Date(payload.start);
    const end = new Date(start.getTime() + service.durationMinutes * 60000);

    // Check conflicts (per professional if provided)
    const conflictFilter = {
      status: 'booked',
      start: { $lt: end },
      end: { $gt: start }
    };
    if (payload.professionalUserId) {
      conflictFilter.professionalUserId = payload.professionalUserId;
    }
    const conflict = await Booking.findOne(conflictFilter);

    if (conflict) {
      return res.status(409).json({ error: 'Selected time overlaps an existing booking' });
    }

    const booking = await Booking.create({
      serviceId: service._id,
      clientUserId: req.user?.id || undefined,
      professionalUserId: payload.professionalUserId || undefined,
      clientName: payload.clientName,
      clientEmail: payload.clientEmail,
      clientPhone: payload.clientPhone || '',
      notes: payload.notes || '',
      start,
      end,
      status: 'booked'
    });
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;


// --- Admin list bookings ---
router.get('/admin', async (req, res) => {
  try {
    const { q = '', status, dateFrom, dateTo, page = '1', limit = '50' } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (dateFrom || dateTo) {
      filter.start = {};
      if (dateFrom) filter.start.$gte = new Date(dateFrom + 'T00:00:00');
      if (dateTo)   filter.start.$lte = new Date(dateTo   + 'T23:59:59');
    }
    if (q) {
      const rx = new RegExp(q, 'i');
      filter.$or = [{ clientName: rx }, { clientEmail: rx }, { clientPhone: rx }, { notes: rx }];
    }
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const [items, total] = await Promise.all([
      Booking.find(filter).populate('serviceId', 'name').sort({ start: -1 }).skip((pageNum - 1) * lim).limit(lim).lean(),
      Booking.countDocuments(filter),
    ]);
    res.json({ items, total, page: pageNum, limit: lim });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Cancel booking ---
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    const updated = await Booking.findByIdAndUpdate(id, { status: 'cancelled' }, { new: true }).populate('serviceId', 'name');
    if (!updated) return res.status(404).json({ error: 'Booking not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
