import express from 'express';
import User from '../models/User.js';
import { z } from 'zod';

const router = express.Router();

// GET /api/users - currently supports listing professionals
// Query: role=professional, q (partial on name/email)
router.get('/', async (req, res) => {
  try {
    const role = (req.query.role || '').toString();
    const q = (req.query.q || '').toString();

    const filter = {};
    if (role) filter.role = role;
    if (q) {
      const rx = new RegExp(q, 'i');
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const users = await User.find(filter).select('name email phone role').limit(500).lean();
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
