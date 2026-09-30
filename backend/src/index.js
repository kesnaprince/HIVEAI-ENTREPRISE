import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import dealRoutes from './routes/deals.js';
import approvalRoutes from './routes/approvals.js';
import moduleRoutes from './routes/modules.js';
import automationRoutes from './routes/automations.js';
import kessRoutes from './routes/kess.js';
import issueRoutes from './routes/issues.js';

const app = express();
const port = Number(process.env.PORT) || 4000;

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }), authRoutes);
app.use('/api/kess', rateLimit({ windowMs: 60 * 1000, max: 20 }), kessRoutes);

app.use('/api/employees', employeeRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api', moduleRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'watchtower-api', time: new Date().toISOString() });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`WatchTower API on http://localhost:${port}`);
});
