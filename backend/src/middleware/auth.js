import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const membership = await prisma.membership.findFirst({
      where: { userId: decoded.userId, organizationId: decoded.organizationId },
      include: { user: true, organization: true },
    });
    if (!membership) return res.status(401).json({ error: 'Invalid session' });

    req.user = membership.user;
    req.membership = membership;
    req.organizationId = membership.organizationId;
    req.role = membership.role;
    req.department = membership.department;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function orgFilter(req) {
  return { organizationId: req.organizationId };
}
