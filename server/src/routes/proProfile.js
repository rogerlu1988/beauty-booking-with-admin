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

function validHHMM(str) {
  if (!/^\d{2}:\d{2}$/.test(str)) return false;
  const [hh, mm] = str.split(':').map(n => parseInt(n, 10));
  return hh >= 0 && hh < 24 && mm >= 0 && mm < 60;
}

const UpdateSchema = z.object({
  services: z.array(z.string()).optional(),
  businessHours: z.object({
    open: z.string(),
    close: z.string(),
  }).optional(),
});

router.patch('/profile', async (req, res) => {
  try {
    const payload = UpdateSchema.parse(req.body || {});
    const update = {};
    if (payload.services) update.services = payload.services;
    if (payload.businessHours) {
      const { open, close } = payload.businessHours;
      if (!validHHMM(open) || !validHHMM(close)) {
        return res.status(400).json({ error: 'businessHours must be HH:mm and valid times' });
      }
      // ensure open < close
      const [oH, oM] = open.split(':').map(n => parseInt(n, 10));
      const [cH, cM] = close.split(':').map(n => parseInt(n, 10));
      const oMin = oH * 60 + oM;
      const cMin = cH * 60 + cM;
      if (!(oMin < cMin)) {
        return res.status(400).json({ error: 'Open time must be earlier than close time' });
      }
      update.businessHours = { open, close };
    }
    const doc = await ensureProfile(req.user.id);
    Object.assign(doc, update);
    await doc.save();
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
