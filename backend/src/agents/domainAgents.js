import prisma from '../lib/prisma.js';

/** Domain agents return concise structured summaries — never raw dumps. */

export async function hrAgent(organizationId, role, department) {
  const where = { organizationId };
  if (role === 'MANAGER' && department) where.department = department;
  const employees = await prisma.employee.findMany({ where, take: 50 });
  const highRisk = employees.filter((e) => e.attritionRisk === 'HIGH' || e.attritionRisk === 'MEDIUM');
  const avgEngagement = employees.length
    ? Math.round(employees.reduce((s, e) => s + e.engagement, 0) / employees.length)
    : 0;
  return {
    domain: 'HR',
    headcount: employees.length,
    averageEngagement: avgEngagement,
    elevatedRiskCount: highRisk.length,
    elevatedRiskNames: highRisk.slice(0, 5).map((e) => `${e.name} (${e.attritionRisk})`),
    byDepartment: Object.entries(
      employees.reduce((acc, e) => {
        const d = e.department || 'Unassigned';
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {})
    ).map(([dept, count]) => ({ dept, count })),
  };
}

export async function salesAgent(organizationId, role) {
  if (role === 'EMPLOYEE') return { domain: 'Sales', restricted: true };
  const deals = await prisma.deal.findMany({ where: { organizationId }, take: 100 });
  const open = deals.filter((d) => d.stage === 'PROSPECTING' || d.stage === 'NEGOTIATION');
  const won = deals.filter((d) => d.stage === 'CLOSED_WON');
  const pipeline = open.reduce((s, d) => s + d.value, 0);
  const wonValue = won.reduce((s, d) => s + d.value, 0);
  return {
    domain: 'Sales',
    dealCount: deals.length,
    openDeals: open.length,
    pipelineValue: pipeline,
    closedWonValue: wonValue,
    topOpen: open
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((d) => ({ name: d.name, value: d.value, stage: d.stage, owner: d.owner })),
  };
}

export async function financeAgent(organizationId, role) {
  if (role === 'EMPLOYEE') return { domain: 'Finance', restricted: true };
  const approvals = await prisma.approval.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const pending = approvals.filter((a) => a.status === 'PENDING');
  const pendingAmount = pending.reduce((s, a) => s + (a.amount || 0), 0);
  return {
    domain: 'Finance',
    pendingApprovals: pending.length,
    pendingAmount,
    recentDecisions: approvals
      .filter((a) => a.status !== 'PENDING')
      .slice(0, 5)
      .map((a) => ({ title: a.title, status: a.status, amount: a.amount })),
  };
}

export async function securityAgent(organizationId) {
  const tickets = await prisma.ticket.findMany({
    where: { organizationId, priority: { in: ['HIGH', 'CRITICAL'] } },
    take: 20,
  });
  const open = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  return {
    domain: 'Security',
    highPriorityTickets: open.length,
    subjects: open.slice(0, 5).map((t) => ({ subject: t.subject, priority: t.priority, status: t.status })),
  };
}

export async function legalAgent(organizationId, role) {
  if (role === 'EMPLOYEE') return { domain: 'Legal', restricted: true };
  const contracts = await prisma.contract.findMany({ where: { organizationId }, take: 50 });
  const soon = contracts.filter((c) => {
    if (!c.expiryDate) return false;
    const days = (new Date(c.expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 60;
  });
  return {
    domain: 'Legal',
    contractCount: contracts.length,
    expiringSoon: soon.length,
    expiring: soon.slice(0, 5).map((c) => ({ name: c.name, counterparty: c.counterparty, expiryDate: c.expiryDate })),
  };
}

export async function automationsAgent(organizationId, role) {
  if (role === 'EMPLOYEE') return { domain: 'Automations', restricted: true };
  const rules = await prisma.automation.findMany({ where: { organizationId } });
  const runs = await prisma.automationRun.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  return {
    domain: 'Automations',
    activeRules: rules.filter((r) => r.status === 'ACTIVE').length,
    pausedRules: rules.filter((r) => r.status === 'PAUSED').length,
    recentRuns: runs.map((r) => ({ status: r.status, message: r.message, at: r.createdAt })),
  };
}


export async function issuesAgent(organizationId, role, department) {
  const where = { organizationId };
  if (role === 'MANAGER' && department) where.department = department;
  const issues = await prisma.issue.findMany({ where, take: 100, orderBy: { createdAt: 'desc' } });
  const open = issues.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS');
  const critical = open.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH');
  const byDept = {};
  for (const i of open) {
    byDept[i.department] = (byDept[i.department] || 0) + 1;
  }
  return {
    domain: 'Issues',
    openCount: open.length,
    criticalCount: critical.length,
    byDepartment: Object.entries(byDept).map(([dept, count]) => ({ dept, count })),
    topOpen: open.slice(0, 5).map((i) => ({
      title: i.title,
      department: i.department,
      severity: i.severity,
      status: i.status,
    })),
  };
}

export function selectAgents(question) {
  const q = question.toLowerCase();
  const map = [];
  if (/hr|people|employee|attrition|engagement|headcount|hiring/.test(q)) map.push('hr');
  if (/sales|deal|pipeline|revenue|quota/.test(q)) map.push('sales');
  if (/finance|approval|spend|budget|cost/.test(q)) map.push('finance');
  if (/security|ticket|incident|access|mfa/.test(q)) map.push('security');
  if (/legal|contract|vendor|compliance/.test(q)) map.push('legal');
  if (/automation|automat|rule|trigger/.test(q)) map.push('automations');
  if (/issue|blocker|bug|incident|escalat/.test(q)) map.push('issues');
  if (map.length === 0) return ['hr', 'sales', 'finance', 'issues'];
  return [...new Set(map)];
}

export async function runDomainAgents(keys, organizationId, role, department) {
  const runners = {
    hr: () => hrAgent(organizationId, role, department),
    sales: () => salesAgent(organizationId, role),
    finance: () => financeAgent(organizationId, role),
    security: () => securityAgent(organizationId),
    legal: () => legalAgent(organizationId, role),
    automations: () => automationsAgent(organizationId, role),
    issues: () => issuesAgent(organizationId, role, department),
  };
  const out = [];
  for (const k of keys) {
    if (runners[k]) out.push(await runners[k]());
  }
  return out;
}
