import { Router } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { requireAuth, requireRole, orgFilter } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';

const router = Router();
router.use(requireAuth);

// ——— Tickets ———
router.get('/tickets', async (req, res) => {
  const rows = await prisma.ticket.findMany({
    where: orgFilter(req),
    include: { assignee: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(rows);
});

router.post('/tickets', async (req, res) => {
  const body = z.object({
    subject: z.string().min(1),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  }).parse(req.body);
  const row = await prisma.ticket.create({
    data: {
      organizationId: req.organizationId,
      subject: body.subject,
      description: body.description,
      priority: body.priority || 'MEDIUM',
    },
  });
  await logActivity(req, 'CREATE', 'Ticket', row.id);
  res.status(201).json(row);
});

router.patch('/tickets/:id', requireRole('CEO', 'MANAGER'), async (req, res) => {
  const existing = await prisma.ticket.findFirst({ where: { id: req.params.id, ...orgFilter(req) } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const row = await prisma.ticket.update({
    where: { id: existing.id },
    data: {
      status: req.body.status,
      priority: req.body.priority,
      assigneeId: req.body.assigneeId,
    },
  });
  await logActivity(req, 'UPDATE', 'Ticket', row.id);
  res.json(row);
});

// ——— Contracts ———
router.get('/contracts', async (req, res) => {
  if (req.role === 'EMPLOYEE') return res.status(403).json({ error: 'Restricted' });
  const rows = await prisma.contract.findMany({ where: orgFilter(req), orderBy: { createdAt: 'desc' } });
  res.json(rows);
});

router.post('/contracts', requireRole('CEO', 'MANAGER'), async (req, res) => {
  const body = z.object({
    name: z.string().min(1),
    counterparty: z.string().min(1),
    status: z.enum(['DRAFT', 'ACTIVE', 'EXPIRED', 'RENEWED']).optional(),
    value: z.number().optional(),
    expiryDate: z.string().optional().nullable(),
  }).parse(req.body);
  const row = await prisma.contract.create({
    data: {
      organizationId: req.organizationId,
      name: body.name,
      counterparty: body.counterparty,
      status: body.status || 'DRAFT',
      value: body.value,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
    },
  });
  await logActivity(req, 'CREATE', 'Contract', row.id);
  res.status(201).json(row);
});

// ——— Vendors ———
router.get('/vendors', async (req, res) => {
  const rows = await prisma.vendor.findMany({ where: orgFilter(req), orderBy: { name: 'asc' } });
  res.json(rows);
});

router.post('/vendors', requireRole('CEO', 'MANAGER'), async (req, res) => {
  const body = z.object({
    name: z.string().min(1),
    category: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
    contractValue: z.number().optional(),
    renewalDate: z.string().optional().nullable(),
  }).parse(req.body);
  const row = await prisma.vendor.create({
    data: {
      organizationId: req.organizationId,
      name: body.name,
      category: body.category,
      status: body.status || 'PENDING',
      contractValue: body.contractValue,
      renewalDate: body.renewalDate ? new Date(body.renewalDate) : null,
    },
  });
  await logActivity(req, 'CREATE', 'Vendor', row.id);
  res.status(201).json(row);
});

// ——— Notifications ———
router.get('/notifications', async (req, res) => {
  const rows = await prisma.notification.findMany({
    where: { organizationId: req.organizationId, userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(rows);
});

router.patch('/notifications/:id/read', async (req, res) => {
  const row = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { isRead: true },
  });
  res.json({ ok: true, count: row.count });
});

router.post('/notifications/read-all', async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, organizationId: req.organizationId, isRead: false },
    data: { isRead: true },
  });
  res.json({ ok: true });
});

// ——— Activity ———
router.get('/activity', requireRole('CEO', 'MANAGER'), async (req, res) => {
  const rows = await prisma.activityLog.findMany({
    where: orgFilter(req),
    include: { user: { select: { fullName: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(rows);
});

// ——— Dashboard summary ———
router.get('/dashboard', async (req, res) => {
  const oid = req.organizationId;
  const [employees, deals, pendingApprovals, openTickets, unread] = await Promise.all([
    prisma.employee.count({ where: { organizationId: oid } }),
    req.role === 'EMPLOYEE' ? [] : prisma.deal.findMany({ where: { organizationId: oid } }),
    prisma.approval.count({
      where: {
        organizationId: oid,
        status: 'PENDING',
        ...(req.role === 'EMPLOYEE' ? { requesterId: req.user.id } : {}),
      },
    }),
    prisma.ticket.count({ where: { organizationId: oid, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);

  const pipeline = Array.isArray(deals)
    ? deals.filter((d) => d.stage !== 'CLOSED_LOST').reduce((s, d) => s + d.value, 0)
    : 0;

  res.json({
    employees,
    pipeline,
    pendingApprovals,
    openTickets,
    unreadNotifications: unread,
    founderScore: req.membership.organization.founderScore,
    role: req.role,
  });
});

export default router;
