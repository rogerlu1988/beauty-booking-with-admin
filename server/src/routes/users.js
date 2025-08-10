import express from 'express';
import User from '../models/User.js';
import ProfessionalProfile from '../models/ProfessionalProfile.js';
import { z } from 'zod';

const router = express.Router();

// GET /api/users - currently supports listing professionals
// Query: role=professional, q (partial on name/email), serviceId (filter pros who offer service)
router.get('/', async (req, res) => {
  try {
    const role = (req.query.role || '').toString();
    const q = (req.query.q || '').toString();
    const serviceId = (req.query.serviceId || '').toString();

    const filter = {};
    if (role) filter.role = role;
    if (q) {
      const rx = new RegExp(q, 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }
    if (role === 'professional' && serviceId) {
      // Find professional userIds whose profile includes the service
      const profs = await ProfessionalProfile.find({ services: serviceId }).select('userId -_id').lean();
      const ids = profs.map(p => p.userId);
      filter._id = { $in: ids };
    }

    const users = await User.find(filter).select('name email phone role').limit(500).lean();
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
