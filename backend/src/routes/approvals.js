import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAuth, requireRole, orgFilter } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';
import { evaluateAutomations } from '../services/automationEngine.js';

const router = Router();
router.use(requireAuth);

const schema = z.object({
  type: z.string().min(1),
  department: z.string().optional(),
  title: z.string().min(1),
  details: z.string().optional(),
  amount: z.number().optional(),
});

router.get('/', async (req, res) => {
  const where = { ...orgFilter(req) };
  if (req.role === 'EMPLOYEE') where.requesterId = req.user.id;
  const rows = await prisma.approval.findMany({
    where,
    include: { requester: { select: { fullName: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows);
});

router.post('/', async (req, res) => {
  try {
    const body = schema.parse(req.body);
    let status = 'PENDING';
    const autos = await prisma.automation.findMany({
      where: { organizationId: req.organizationId, status: 'ACTIVE', trigger: 'approval_created' },
    });
    for (const a of autos) {
      if (a.condition.startsWith('amount_lte:') && body.amount != null) {
        const thr = Number(a.condition.split(':')[1]);
        if (!Number.isNaN(thr) && body.amount <= thr && a.action === 'auto_approve') {
          status = 'APPROVED';
        }
      }
    }
    const row = await prisma.approval.create({
      data: {
        organizationId: req.organizationId,
        type: body.type,
        department: body.department,
        title: body.title,
        details: body.details,
        amount: body.amount,
        status,
        requesterId: req.user.id,
        actorId: status === 'APPROVED' ? req.user.id : null,
      },
      include: { requester: { select: { fullName: true, email: true } } },
    });
    await logActivity(req, status === 'APPROVED' ? 'AUTO_APPROVE' : 'CREATE', 'Approval', row.id);
    await evaluateAutomations(req.organizationId, 'approval_created', row);
    res.status(201).json(row);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors[0].message });
    console.error(e);
    res.status(500).json({ error: 'Failed to create approval' });
  }
});

router.patch('/:id', requireRole('CEO'), async (req, res) => {
  const status = req.body.status;
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'status must be APPROVED or REJECTED' });
  }
  const existing = await prisma.approval.findFirst({ where: { id: req.params.id, ...orgFilter(req) } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const row = await prisma.approval.update({
    where: { id: existing.id },
    data: { status, actorId: req.user.id },
    include: { requester: { select: { fullName: true, email: true } } },
  });
  await logActivity(req, status, 'Approval', row.id);
  res.json(row);
});

export default router;
