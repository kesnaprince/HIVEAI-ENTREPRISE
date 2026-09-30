import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAuth, requireRole, orgFilter } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';

const router = Router();
router.use(requireAuth);

const DEPTS = ['Engineering', 'Sales', 'HR', 'Finance', 'Legal', 'IT', 'Marketing', 'Operations'];

router.get('/', async (req, res) => {
  const where = { ...orgFilter(req) };
  if (req.query.department) where.department = String(req.query.department);
  if (req.query.status) where.status = String(req.query.status);
  // Managers only see their department unless CEO
  if (req.role === 'MANAGER' && req.department) {
    where.department = req.department;
  }
  const rows = await prisma.issue.findMany({
    where,
    include: {
      raisedBy: { select: { fullName: true } },
      resolvedBy: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows);
});

router.get('/summary', async (req, res) => {
  const where = { ...orgFilter(req) };
  if (req.role === 'MANAGER' && req.department) where.department = req.department;
  const rows = await prisma.issue.findMany({ where });
  const byDept = {};
  for (const r of rows) {
    const d = r.department || 'Other';
    if (!byDept[d]) byDept[d] = { department: d, open: 0, inProgress: 0, resolved: 0, critical: 0, total: 0 };
    byDept[d].total += 1;
    if (r.status === 'OPEN') byDept[d].open += 1;
    if (r.status === 'IN_PROGRESS') byDept[d].inProgress += 1;
    if (r.status === 'RESOLVED' || r.status === 'CLOSED') byDept[d].resolved += 1;
    if (r.severity === 'CRITICAL' || r.severity === 'HIGH') byDept[d].critical += 1;
  }
  res.json({ departments: Object.values(byDept), total: rows.length });
});

router.post('/', async (req, res) => {
  const body = z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(5000).optional(),
    department: z.string().min(1),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  }).parse(req.body);

  const row = await prisma.issue.create({
    data: {
      organizationId: req.organizationId,
      title: body.title,
      description: body.description,
      department: body.department,
      severity: body.severity || 'MEDIUM',
      raisedById: req.userId,
      status: 'OPEN',
    },
  });
  await logActivity(req, 'CREATE', 'Issue', row.id, { department: body.department });
  res.status(201).json(row);
});

router.patch('/:id', requireRole('CEO', 'MANAGER'), async (req, res) => {
  const existing = await prisma.issue.findFirst({
    where: { id: req.params.id, ...orgFilter(req) },
  });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  if (req.role === 'MANAGER' && req.department && existing.department !== req.department) {
    return res.status(403).json({ error: 'Outside your department' });
  }

  const data = {};
  if (req.body.status) data.status = req.body.status;
  if (req.body.severity) data.severity = req.body.severity;
  if (req.body.resolution) data.resolution = req.body.resolution;
  if (req.body.status === 'RESOLVED' || req.body.status === 'CLOSED') {
    data.resolvedById = req.userId;
  }

  const row = await prisma.issue.update({ where: { id: existing.id }, data });
  await logActivity(req, 'UPDATE', 'Issue', row.id, { status: row.status });
  res.json(row);
});

export default router;
export { DEPTS };
