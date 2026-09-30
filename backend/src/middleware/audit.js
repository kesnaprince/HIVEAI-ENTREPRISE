import prisma from '../lib/prisma.js';

export async function logActivity(req, action, entity, entityId, meta) {
  try {
    await prisma.activityLog.create({
      data: {
        organizationId: req.organizationId,
        userId: req.user?.id,
        action,
        entity,
        entityId: entityId || null,
        meta: meta ? JSON.stringify(meta) : null,
      },
    });
  } catch (e) {
    console.warn('audit log failed', e.message);
  }
}
