import express from 'express';
import { z } from 'zod';
import { authRequired, requireRole } from '../middleware/auth.js';
import ProfessionalProfile from '../models/ProfessionalProfile.js';

const router = express.Router();

// All routes here require professional auth
router.use(authRequired, requireRole('professional'));

async function ensureProfile(userId) {
  let doc = await ProfessionalProfile.findOne({ userId });
  if (!doc) {
    doc = await ProfessionalProfile.create({ userId, services: [], businessHours: { open: '09:00', close: '18:00' } });
  }
  return doc;
}

router.get('/profile', async (req, res) => {
  try {
    const prof = await ensureProfile(req.user.id);
    res.json(prof);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const UpdateSchema = z.object({
  services: z.array(z.string()).optional(),
  businessHours: z.object({
    open: z.string().regex(/^\d{2}:\d{2}$/),
    close: z.string().regex(/^\d{2}:\d{2}$/),
  }).optional(),
});

router.patch('/profile', async (req, res) => {
  try {
    const payload = UpdateSchema.parse(req.body || {});
    const update = {};
    if (payload.services) update.services = payload.services;
    if (payload.businessHours) update.businessHours = payload.businessHours;
    const doc = await ensureProfile(req.user.id);
    Object.assign(doc, update);
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
