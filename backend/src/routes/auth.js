import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../lib/prisma.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  organizationName: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(body.password, 12);
    const orgName = body.organizationName || `${body.fullName}'s Organization`;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash,
          fullName: body.fullName,
        },
      });
      const org = await tx.organization.create({
        data: { name: orgName, founderScore: 72 },
      });
      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: 'CEO',
          department: 'Executive',
        },
      });
      return { user, org, membership };
    });

    const token = signToken({
      userId: result.user.id,
      organizationId: result.org.id,
      role: result.membership.role,
    });

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.membership.role,
        department: result.membership.department,
        organizationId: result.org.id,
        organizationName: result.org.name,
      },
    });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors[0].message });
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() },
      include: { memberships: { include: { organization: true }, take: 1 } },
    });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const membership = user.memberships[0];
    if (!membership) return res.status(403).json({ error: 'No organization membership' });

    const token = signToken({
      userId: user.id,
      organizationId: membership.organizationId,
      role: membership.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: membership.role,
        department: membership.department,
        organizationId: membership.organizationId,
        organizationName: membership.organization.name,
        founderScore: membership.organization.founderScore,
      },
    });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors[0].message });
    console.error(e);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.role,
      department: req.department,
      organizationId: req.organizationId,
      organizationName: req.membership.organization.name,
      founderScore: req.membership.organization.founderScore,
    },
  });
});

router.post('/logout', requireAuth, async (req, res) => {
  await logActivity(req, 'LOGOUT', 'User', req.user.id);
  res.json({ ok: true });
});

export default router;
