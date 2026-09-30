import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAuth, requireRole, orgFilter } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';
import { listAutomations } from '../services/automationEngine.js';

const router = Router();
router.use(requireAuth);

router.get('/', requireRole('CEO', 'MANAGER'), async (req, res) => {
  const rows = await listAutomations(req.organizationId);
  res.json(rows);
});

router.post('/', requireRole('CEO'), async (req, res) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      trigger: z.string().min(1),
      condition: z.string().min(1),
      action: z.string().min(1),
      status: z.enum(['ACTIVE', 'PAUSED']).optional(),
    }).parse(req.body);

    const row = await prisma.automation.create({
      data: {
        organizationId: req.organizationId,
        name: body.name,
        trigger: body.trigger,
        condition: body.condition,
        action: body.action,
        status: body.status || 'ACTIVE',
      },
    });
    await logActivity(req, 'CREATE', 'Automation', row.id);
    res.status(201).json(row);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors[0].message });
    res.status(500).json({ error: 'Failed to create automation' });
  }
});

router.patch('/:id', requireRole('CEO'), async (req, res) => {
  const existing = await prisma.automation.findFirst({ where: { id: req.params.id, ...orgFilter(req) } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const row = await prisma.automation.update({
    where: { id: existing.id },
    data: {
      status: req.body.status,
      name: req.body.name,
      condition: req.body.condition,
      action: req.body.action,
    },
  });
  await logActivity(req, 'UPDATE', 'Automation', row.id);
  res.json(row);
});

export default router;
