import { Router } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth.js';
import { logActivity } from '../middleware/audit.js';
import { selectAgents, runDomainAgents } from '../agents/domainAgents.js';

const router = Router();
router.use(requireAuth);

router.post('/ask', async (req, res) => {
  try {
    const body = z.object({
      question: z.string().min(1).max(2000),
      domain: z.enum(['hr','sales','finance','security','legal','automations','issues']).optional(),
    }).parse(req.body);

    const agentKeys = body.domain ? [body.domain] : selectAgents(body.question);
    const summaries = await runDomainAgents(
      agentKeys,
      req.organizationId,
      req.role,
      req.department
    );

    const contextPacket = {
      userRole: req.role,
      department: req.department,
      organization: req.membership.organization.name,
      agentSummaries: summaries,
    };

    let answer;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (apiKey) {
      const client = new Anthropic({ apiKey });
      const msg = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: `You are Kess, the enterprise AI assistant for WatchTower.
You only use the provided agent summaries. Never invent confidential numbers.
Respect role restrictions (restricted:true means deny details).
Be concise, executive-ready, and suggest 1-2 concrete next actions.
If data is missing, say so clearly.`,
        messages: [
          {
            role: 'user',
            content: `Question: ${body.question}\n\nContext (JSON):\n${JSON.stringify(contextPacket, null, 2)}`,
          },
        ],
      });
      answer = msg.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    } else {
      // Offline / demo synthesis when Claude key is not configured
      answer = synthesizeLocal(body.question, summaries, req.role);
    }

    await logActivity(req, 'KESS_ASK', 'Kess', null, { agents: agentKeys });

    res.json({
      answer,
      agentsUsed: agentKeys,
      summaries,
      model: apiKey ? 'claude' : 'local-synthesis',
    });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors[0].message });
    console.error('Kess error', e);
    res.status(500).json({ error: 'Kess is temporarily unavailable' });
  }
});

function synthesizeLocal(question, summaries, role) {
  const lines = [
    `**Kess** (local synthesis — set ANTHROPIC_API_KEY for Claude)`,
    ``,
    `You asked: *${question}*`,
    ``,
    `Role context: ${role}`,
    ``,
  ];
  for (const s of summaries) {
    if (s.restricted) {
      lines.push(`### ${s.domain}`, `Access restricted for your role.`, ``);
      continue;
    }
    lines.push(`### ${s.domain}`);
    lines.push('```json');
    lines.push(JSON.stringify(s, null, 2));
    lines.push('```', ``);
  }
  lines.push(`**Suggested next steps**`);
  lines.push(`1. Review pending approvals and high-risk HR flags.`);
  lines.push(`2. Ask a more specific question (e.g. “Which deals are in negotiation?”).`);
  return lines.join('\n');
}

export default router;
