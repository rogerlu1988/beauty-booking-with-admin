function parseHHMMToDate(baseDate, hhmm) {
  // baseDate is a Date; returns a new Date on the same YYYY-MM-DD at given HH:mm
  const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
  const y = baseDate.getFullYear();
  const mon = baseDate.getMonth();
  const d = baseDate.getDate();
  return new Date(y, mon, d, h, m, 0, 0);
}

import mongoose from 'mongoose';
import express from 'express';
import { z } from 'zod';
import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import { authOptional, authRequired, requireRole } from '../middleware/auth.js';
import User from '../models/User.js';
import ProfessionalProfile from '../models/ProfessionalProfile.js';
import AuditLog from '../models/AuditLog.js';
import {
  notifyBookingAssigned,
  notifyBookingCancelled,
  notifyBookingCreated,
  notifyBookingRescheduled,
  notifyBookingRestored,
} from '../services/notifications.js';

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

// --- Restore (undo cancel) ---
router.patch('/:id/restore', requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.status !== 'cancelled') {
      return res.status(400).json({ error: 'Only cancelled bookings can be restored' });
    } else {
      // For unassigned bookings, prevent overlap with ANY booked booking
      const conflict = await Booking.findOne({
        _id: { $ne: booking._id },
        status: 'booked',
        start: { $lt: booking.end },
        end: { $gt: booking.start },
      });
      if (conflict) return res.status(409).json({ error: 'Another booking overlaps this time; cannot restore unassigned booking' });
    }

    if (booking.start.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Cannot restore a booking in the past' });
    }

    // Ensure business hours if assigned professional; otherwise enforce global no-overlap for unassigned
    if (booking.professionalUserId) {
      const prof = await ProfessionalProfile.findOne({ userId: booking.professionalUserId }).lean();
      const bh = prof?.businessHours || { open: '09:00', close: '18:00' };
      const dayOpen = parseHHMMToDate(booking.start, bh.open);
      const dayClose = parseHHMMToDate(booking.start, bh.close);
      if (!(booking.start >= dayOpen && booking.end <= dayClose)) {
        return res.status(400).json({ error: 'Booking time is outside the professional business hours' });
      }

      // Conflict check per professional
      const conflict = await Booking.findOne({
        _id: { $ne: booking._id },
        status: 'booked',
        professionalUserId: booking.professionalUserId,
        start: { $lt: booking.end },
        end: { $gt: booking.start },
      });
      if (conflict) return res.status(409).json({ error: 'Professional already has a conflicting booking at that time' });
    }

    booking.status = 'booked';
    await booking.save();
    await AuditLog.create({
      action: 'restore',
      bookingId: booking._id,
      actorUserId: req.user?.id || undefined,
      actorRole: req.user?.role || undefined,
      meta: {}
    });
    await notifyBookingRestored({ booking });
    res.json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Conflict check for the target professional
    const conflict = await Booking.findOne({
      _id: { $ne: booking._id },
      status: 'booked',
      professionalUserId: proId,
      start: { $lt: booking.end },
      end: { $gt: booking.start },
    });
    if (conflict) return res.status(409).json({ error: 'Professional already has a conflicting booking at that time' });

    // Business hours check for the target professional
    const prof = await ProfessionalProfile.findOne({ userId: proId }).lean();
    const bh = prof?.businessHours || { open: '09:00', close: '18:00' };
    const dayOpen = parseHHMMToDate(booking.start, bh.open);
    const dayClose = parseHHMMToDate(booking.start, bh.close);
    if (!(booking.start >= dayOpen && booking.end <= dayClose)) {
      return res.status(400).json({ error: 'Booking time is outside the professional business hours' });
    }

    const updated = await Booking.findByIdAndUpdate(
      id,
      { professionalUserId: proId },
      { new: true }
    ).populate('serviceId', 'name');
    await AuditLog.create({
      action: 'assign',
      bookingId: updated._id,
      actorUserId: req.user?.id || undefined,
      actorRole: req.user?.role || undefined,
      meta: { professionalUserId: proId }
    });
    await notifyBookingAssigned({ booking: updated, professionalUserId: proId });
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
    const items = await Booking.find({ professionalUserId: req.user.id })
      .populate('serviceId', 'name durationMinutes')
      .sort({ start: -1 }).limit(200).lean();
    return res.json({ bookings: items });
  }
  if (client === '1') {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const items = await Booking.find({ clientUserId: req.user.id })
      .populate('serviceId', 'name durationMinutes')
      .sort({ start: -1 }).limit(200).lean();
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

    // Validation: not in the past
    if (start.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Cannot book in the past' });
    }

    // Validation: within assigned professional business hours (if assigned)
    if (payload.professionalUserId) {
      const prof = await ProfessionalProfile.findOne({ userId: payload.professionalUserId }).lean();
      const bh = prof?.businessHours || { open: '09:00', close: '18:00' };
      const dayOpen = parseHHMMToDate(start, bh.open);
      const dayClose = parseHHMMToDate(start, bh.close);
      if (!(start >= dayOpen && end <= dayClose)) {
        return res.status(400).json({ error: 'Selected time is outside professional business hours' });
      }
    }

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
    await AuditLog.create({
      action: 'create',
      bookingId: booking._id,
      actorUserId: req.user?.id || undefined,
      actorRole: req.user?.role || undefined,
      meta: { professionalUserId: payload.professionalUserId || null }
    });
    await notifyBookingCreated({ booking });
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Reschedule booking (admin, owning client, or assigned professional) ---
router.patch('/:id/reschedule', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    const { start } = req.body || {};
    if (!start) return res.status(400).json({ error: 'Missing start' });

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // Authorization: admin OR client owner OR assigned professional
    const isAdmin = req.user?.role === 'admin';
    const isOwner = booking.clientUserId && String(booking.clientUserId) === String(req.user.id);
    const isPro = booking.professionalUserId && String(booking.professionalUserId) === String(req.user.id);
    if (!isAdmin && !isOwner && !isPro) return res.status(403).json({ error: 'Forbidden' });

    const service = await Service.findById(booking.serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const newStart = new Date(start);
    if (isNaN(newStart.getTime())) return res.status(400).json({ error: 'Invalid start' });
    const newEnd = new Date(newStart.getTime() + service.durationMinutes * 60000);

    // Validation: not in the past
    if (newStart.getTime() < Date.now()) {
      return res.status(400).json({ error: 'Cannot reschedule to a past time' });
    }

    // Validation: within assigned professional business hours (if assigned)
    if (booking.professionalUserId) {
      const prof = await ProfessionalProfile.findOne({ userId: booking.professionalUserId }).lean();
      const bh = prof?.businessHours || { open: '09:00', close: '18:00' };
      const dayOpen = parseHHMMToDate(newStart, bh.open);
      const dayClose = parseHHMMToDate(newStart, bh.close);
      if (!(newStart >= dayOpen && newEnd <= dayClose)) {
        return res.status(400).json({ error: 'Selected time is outside professional business hours' });
      }
    }

    // Conflict check: scope to assigned professional if present
    const conflictFilter = {
      _id: { $ne: booking._id },
      status: 'booked',
      start: { $lt: newEnd },
      end: { $gt: newStart },
    };
    if (booking.professionalUserId) {
      conflictFilter.professionalUserId = booking.professionalUserId;
    }
    const conflict = await Booking.findOne(conflictFilter);
    if (conflict) return res.status(409).json({ error: 'Selected time overlaps an existing booking' });

    const oldStart = booking.start;
    const oldEnd = booking.end;
    booking.start = newStart;
    booking.end = newEnd;
    await booking.save();
    await AuditLog.create({
      action: 'reschedule',
      bookingId: booking._id,
      actorUserId: req.user?.id || undefined,
      actorRole: req.user?.role || undefined,
      meta: { oldStart, oldEnd }
    });
    await notifyBookingRescheduled({ booking, oldStart, oldEnd });
    res.json(booking);
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
router.patch('/:id/cancel', authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid id' });
    const booking = await Booking.findById(id).populate('serviceId', 'name');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.status === 'cancelled') {
      return res.status(400).json({ error: 'Booking already cancelled' });
    }

    const isAdmin = req.user?.role === 'admin';
    const isOwner = booking.clientUserId && String(booking.clientUserId) === String(req.user.id);
    const isPro = booking.professionalUserId && String(booking.professionalUserId) === String(req.user.id);
    if (!isAdmin && !isOwner && !isPro) return res.status(403).json({ error: 'Forbidden' });

    booking.status = 'cancelled';
    await booking.save();
    await AuditLog.create({
      action: 'cancel',
      bookingId: booking._id,
      actorUserId: req.user?.id || undefined,
      actorRole: req.user?.role || undefined,
      meta: {}
    });
    await notifyBookingCancelled({ booking });
    res.json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
