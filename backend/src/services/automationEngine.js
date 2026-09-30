import prisma from '../lib/prisma.js';

/**
 * Deterministic automation evaluation.
 * Ambiguous conditions (prefix "kess:") create a pending approval instead of executing.
 */
export async function evaluateAutomations(organizationId, trigger, context = {}) {
  const rules = await prisma.automation.findMany({
    where: { organizationId, status: 'ACTIVE', trigger },
  });

  for (const rule of rules) {
    try {
      if (rule.condition.startsWith('kess:')) {
        await prisma.approval.create({
          data: {
            organizationId,
            type: 'automation_decision',
            title: `Review automation: ${rule.name}`,
            details: `Condition requires human judgment: ${rule.condition}. Context: ${JSON.stringify(context).slice(0, 500)}`,
            status: 'PENDING',
            requesterId: (await prisma.membership.findFirst({
              where: { organizationId, role: 'CEO' },
            }))?.userId || (await prisma.user.findFirst())?.id,
          },
        });
        await prisma.automationRun.create({
          data: {
            organizationId,
            automationId: rule.id,
            status: 'needs_approval',
            message: 'Routed to human approval (ambiguous condition)',
          },
        });
        continue;
      }

      let matched = false;
      if (rule.condition === 'always') matched = true;
      if (rule.condition.startsWith('amount_lte:') && context.amount != null) {
        matched = context.amount <= Number(rule.condition.split(':')[1]);
      }
      if (rule.condition.startsWith('risk_eq:') && context.attritionRisk) {
        matched = context.attritionRisk === rule.condition.split(':')[1];
      }

      if (!matched) {
        await prisma.automationRun.create({
          data: {
            organizationId,
            automationId: rule.id,
            status: 'skipped',
            message: 'Condition not met',
          },
        });
        continue;
      }

      // Record execution (side-effects handled at call sites for auto_approve)
      await prisma.automationRun.create({
        data: {
          organizationId,
          automationId: rule.id,
          status: 'executed',
          message: `Action: ${rule.action}`,
        },
      });
    } catch (e) {
      await prisma.automationRun.create({
        data: {
          organizationId,
          automationId: rule.id,
          status: 'error',
          message: e.message,
        },
      });
    }
  }
}

export async function listAutomations(organizationId) {
  return prisma.automation.findMany({
    where: { organizationId },
    include: { runs: { orderBy: { createdAt: 'desc' }, take: 5 } },
    orderBy: { createdAt: 'desc' },
  });
}
