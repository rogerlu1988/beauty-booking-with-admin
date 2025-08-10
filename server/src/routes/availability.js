import express from 'express';
import { z } from 'zod';
import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import { computeSlots } from '../utils/slots.js';
import ProfessionalProfile from '../models/ProfessionalProfile.js';

const router = express.Router();

const QuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  serviceId: z.string(),
  professionalUserId: z.string().optional(),
});

router.get('/', async (req, res) => {
  try {
    const { date, serviceId, professionalUserId } = QuerySchema.parse(req.query);
    const service = await Service.findById(serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });

    const dayStart = new Date(date + 'T00:00:00');
    const dayEnd = new Date(date + 'T23:59:59');

    const conflictFilter = {
      status: 'booked',
      start: { $lt: dayEnd },
      end: { $gt: dayStart }
    };
    if (professionalUserId) conflictFilter.professionalUserId = professionalUserId;
    const existing = await Booking.find(conflictFilter).select('start end -_id');

    // Use professional's business hours if provided and found; fallback to default
    let businessHours = { open: '09:00', close: '18:00' };
    if (professionalUserId) {
      const profile = await ProfessionalProfile.findOne({ userId: professionalUserId }).lean();
      if (profile?.businessHours?.open && profile?.businessHours?.close) {
        businessHours = {
          open: profile.businessHours.open,
          close: profile.businessHours.close,
        };
      }
    }

    const slots = computeSlots({
      businessHours,
      stepMinutes: 30,
      durationMinutes: service.durationMinutes,
      date,
      existing
    });

    res.json({ slots });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
