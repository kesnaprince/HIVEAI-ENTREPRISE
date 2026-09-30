import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAuth, requireRole, orgFilter } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';

const router = Router();
router.use(requireAuth);

const schema = z.object({
  name: z.string().min(1),
  stage: z.enum(['PROSPECTING', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).optional(),
  value: z.number().optional(),
  owner: z.string().optional(),
  winProbability: z.number().int().min(0).max(100).optional(),
  closeDate: z.string().optional().nullable(),
});

router.get('/', async (req, res) => {
  if (req.role === 'EMPLOYEE') return res.status(403).json({ error: 'Sales data restricted' });
  const rows = await prisma.deal.findMany({ where: orgFilter(req), orderBy: { createdAt: 'desc' } });
  res.json(rows);
});

router.post('/', requireRole('CEO', 'MANAGER'), async (req, res) => {
  try {
    const body = schema.parse(req.body);
    const row = await prisma.deal.create({
      data: {
        organizationId: req.organizationId,
        name: body.name,
        stage: body.stage || 'PROSPECTING',
        value: body.value ?? 0,
        owner: body.owner,
        winProbability: body.winProbability ?? 20,
        closeDate: body.closeDate ? new Date(body.closeDate) : null,
      },
    });
    await logActivity(req, 'CREATE', 'Deal', row.id);
    res.status(201).json(row);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors[0].message });
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

router.patch('/:id', requireRole('CEO', 'MANAGER'), async (req, res) => {
  try {
    const body = schema.partial().parse(req.body);
    const existing = await prisma.deal.findFirst({ where: { id: req.params.id, ...orgFilter(req) } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    const data = { ...body };
    if (body.closeDate !== undefined) data.closeDate = body.closeDate ? new Date(body.closeDate) : null;
    const row = await prisma.deal.update({ where: { id: existing.id }, data });
    await logActivity(req, 'UPDATE', 'Deal', row.id);
    res.json(row);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors[0].message });
    res.status(500).json({ error: 'Failed to update' });
  }
});

router.delete('/:id', requireRole('CEO'), async (req, res) => {
  const existing = await prisma.deal.findFirst({ where: { id: req.params.id, ...orgFilter(req) } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.deal.delete({ where: { id: existing.id } });
  await logActivity(req, 'DELETE', 'Deal', existing.id);
  res.json({ ok: true });
});

export default router;
