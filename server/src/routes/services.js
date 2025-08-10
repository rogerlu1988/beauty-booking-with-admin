import express from 'express';
import { z } from 'zod';
import Service from '../models/Service.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const services = await Service.find({ active: true }).sort({ price: 1 });
  res.json(services);
});

const ServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  durationMinutes: z.number().int().min(15).max(480),
  price: z.number().min(0),
  active: z.boolean().optional()
});

router.post('/', async (req, res) => {
  try {
    const payload = ServiceSchema.parse(req.body);
    const service = await Service.create(payload);
    res.status(201).json(service);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
