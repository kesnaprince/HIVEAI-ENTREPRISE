import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAuth, requireRole, orgFilter } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';

const router = Router();
router.use(requireAuth);

const schema = z.object({
  name: z.string().min(1),
  title: z.string().optional(),
  department: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'OFFBOARDED']).optional(),
  engagement: z.number().int().min(0).max(100).optional(),
  attritionRisk: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

router.get('/', async (req, res) => {
  const where = { ...orgFilter(req) };
  if (req.role === 'MANAGER' && req.department) where.department = req.department;
  const rows = await prisma.employee.findMany({ where, orderBy: { name: 'asc' } });
  res.json(rows);
});

router.post('/', requireRole('CEO', 'MANAGER'), async (req, res) => {
  try {
    const body = schema.parse(req.body);
    if (req.role === 'MANAGER') body.department = req.department || body.department;
    const row = await prisma.employee.create({
      data: {
        organizationId: req.organizationId,
        name: body.name,
        title: body.title,
        department: body.department,
        email: body.email || null,
        status: body.status || 'ACTIVE',
        engagement: body.engagement ?? 70,
        attritionRisk: body.attritionRisk || 'LOW',
      },
    });
    await logActivity(req, 'CREATE', 'Employee', row.id);
    res.status(201).json(row);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors[0].message });
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

router.patch('/:id', requireRole('CEO', 'MANAGER'), async (req, res) => {
  try {
    const body = schema.partial().parse(req.body);
    const existing = await prisma.employee.findFirst({ where: { id: req.params.id, ...orgFilter(req) } });
    if (!existing) return res.status(404).json({ error: 'Not found' });
    if (req.role === 'MANAGER' && existing.department !== req.department) {
      return res.status(403).json({ error: 'Outside your department' });
    }
    const row = await prisma.employee.update({ where: { id: existing.id }, data: body });
    await logActivity(req, 'UPDATE', 'Employee', row.id);
    res.json(row);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors[0].message });
    res.status(500).json({ error: 'Failed to update' });
  }
});

router.delete('/:id', requireRole('CEO'), async (req, res) => {
  const existing = await prisma.employee.findFirst({ where: { id: req.params.id, ...orgFilter(req) } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.employee.delete({ where: { id: existing.id } });
  await logActivity(req, 'DELETE', 'Employee', existing.id);
  res.json({ ok: true });
});

export default router;
