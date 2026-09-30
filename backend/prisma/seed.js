import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  const org = await prisma.organization.upsert({
    where: { id: 'seed-org-acme' },
    update: {},
    create: {
      id: 'seed-org-acme',
      name: 'Acme Corp',
      founderScore: 74,
    },
  });

  const ceo = await prisma.user.upsert({
    where: { email: 'ceo@acme.com' },
    update: {},
    create: {
      email: 'ceo@acme.com',
      passwordHash,
      fullName: 'Alex Founder',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@acme.com' },
    update: {},
    create: {
      email: 'manager@acme.com',
      passwordHash,
      fullName: 'Jordan Lee',
    },
  });

  const employee = await prisma.user.upsert({
    where: { email: 'employee@acme.com' },
    update: {},
    create: {
      email: 'employee@acme.com',
      passwordHash,
      fullName: 'Sam Rivera',
    },
  });

  for (const [userId, role, department] of [
    [ceo.id, 'CEO', 'Executive'],
    [manager.id, 'MANAGER', 'Engineering'],
    [employee.id, 'EMPLOYEE', 'Design'],
  ]) {
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId, organizationId: org.id } },
      update: { role, department },
      create: { userId, organizationId: org.id, role, department },
    });
  }

  const empCount = await prisma.employee.count({ where: { organizationId: org.id } });
  if (empCount === 0) {
    await prisma.employee.createMany({
      data: [
        { organizationId: org.id, name: 'Alex Chen', title: 'Senior Frontend Engineer', department: 'Engineering', email: 'alex@acme.com', engagement: 82, attritionRisk: 'LOW' },
        { organizationId: org.id, name: 'Taylor Kim', title: 'QA Engineer', department: 'Engineering', email: 'taylor@acme.com', engagement: 61, attritionRisk: 'MEDIUM' },
        { organizationId: org.id, name: 'Casey Brooks', title: 'Automation QA', department: 'Engineering', email: 'casey@acme.com', engagement: 78, attritionRisk: 'LOW' },
        { organizationId: org.id, name: 'Riley Quinn', title: 'Account Executive', department: 'Sales', email: 'riley@acme.com', engagement: 88, attritionRisk: 'LOW' },
        { organizationId: org.id, name: 'Jamie Ortiz', title: 'Legal Counsel', department: 'Legal', email: 'jamie@acme.com', engagement: 75, attritionRisk: 'LOW' },
        { organizationId: org.id, name: 'Morgan Blake', title: 'Product Manager', department: 'Product', email: 'morgan@acme.com', engagement: 80, attritionRisk: 'LOW' },
      ],
    });
  }

  if ((await prisma.deal.count({ where: { organizationId: org.id } })) === 0) {
    await prisma.deal.createMany({
      data: [
        { organizationId: org.id, name: 'Northwind Enterprise', stage: 'NEGOTIATION', value: 120000, owner: 'Riley Quinn', winProbability: 55 },
        { organizationId: org.id, name: 'Contoso Expansion', stage: 'CLOSED_WON', value: 62000, owner: 'Riley Quinn', winProbability: 100 },
        { organizationId: org.id, name: 'Globex Pilot', stage: 'PROSPECTING', value: 28000, owner: 'Riley Quinn', winProbability: 25 },
        { organizationId: org.id, name: 'Initech Renewal', stage: 'NEGOTIATION', value: 45000, owner: 'Morgan Blake', winProbability: 60 },
      ],
    });
  }

  if ((await prisma.automation.count({ where: { organizationId: org.id } })) === 0) {
    await prisma.automation.createMany({
      data: [
        {
          organizationId: org.id,
          name: 'Auto-approve small expenses',
          trigger: 'approval_created',
          condition: 'amount_lte:500',
          action: 'auto_approve',
          status: 'ACTIVE',
        },
        {
          organizationId: org.id,
          name: 'Flag high-risk interpretation',
          trigger: 'employee_risk_change',
          condition: 'kess:subjective_risk_review',
          action: 'create_approval',
          status: 'ACTIVE',
        },
      ],
    });
  }

  if ((await prisma.ticket.count({ where: { organizationId: org.id } })) === 0) {
    await prisma.ticket.createMany({
      data: [
        { organizationId: org.id, subject: 'Phishing reports (3 users)', priority: 'HIGH', status: 'IN_PROGRESS', description: 'SOC investigating' },
        { organizationId: org.id, subject: 'Laptop request — new hire', priority: 'LOW', status: 'OPEN' },
      ],
    });
  }

  if ((await prisma.contract.count({ where: { organizationId: org.id } })) === 0) {
    const in45 = new Date();
    in45.setDate(in45.getDate() + 45);
    await prisma.contract.create({
      data: {
        organizationId: org.id,
        name: 'Northwind MSA',
        counterparty: 'Northwind Ltd',
        status: 'ACTIVE',
        value: 120000,
        expiryDate: in45,
      },
    });
  }

  if ((await prisma.vendor.count({ where: { organizationId: org.id } })) === 0) {
    await prisma.vendor.createMany({
      data: [
        { organizationId: org.id, name: 'AWS', category: 'Infrastructure', status: 'ACTIVE', contractValue: 48000 },
        { organizationId: org.id, name: 'Notion', category: 'Software', status: 'ACTIVE', contractValue: 9600 },
      ],
    });
  }

  if ((await prisma.issue.count({ where: { organizationId: org.id } })) === 0) {
    await prisma.issue.createMany({
      data: [
        { organizationId: org.id, title: 'Staging deploy blocked by flaky tests', description: 'CI fails intermittently on payment suite.', department: 'Engineering', severity: 'HIGH', status: 'OPEN', raisedById: employee.id },
        { organizationId: org.id, title: 'Northwind MSA language stall', description: 'Liability clause holding close.', department: 'Legal', severity: 'MEDIUM', status: 'IN_PROGRESS', raisedById: manager.id },
        { organizationId: org.id, title: 'Q3 forecast sheet missing owners', description: 'Three deals lack AE assignment.', department: 'Sales', severity: 'MEDIUM', status: 'OPEN', raisedById: ceo.id },
        { organizationId: org.id, title: 'Laptop MFA enrollment incomplete', description: '3 users still pending hardware keys.', department: 'IT', severity: 'HIGH', status: 'OPEN', raisedById: manager.id },
        { organizationId: org.id, title: 'Onboarding checklist outdated', description: 'New hire week-1 tasks still list legacy tools.', department: 'HR', severity: 'LOW', status: 'OPEN', raisedById: employee.id },
      ],
    });
  }

  for (const uid of [ceo.id, manager.id, employee.id]) {
    const n = await prisma.notification.count({ where: { userId: uid } });
    if (n === 0) {
      await prisma.notification.create({
        data: {
          organizationId: org.id,
          userId: uid,
          title: 'Welcome to WatchTower',
          body: 'Your enterprise command center is ready. Ask Kess anything about your org.',
          department: 'System',
        },
      });
    }
  }

  console.log('Seed complete.');
  console.log('Logins (password: password123):');
  console.log('  ceo@acme.com      → CEO');
  console.log('  manager@acme.com  → Manager (Engineering)');
  console.log('  employee@acme.com → Employee');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
