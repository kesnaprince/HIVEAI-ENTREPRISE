import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { api } from './api';

function AuthPage() {
  const { login, register, user } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('ceo@acme.com');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register({ email, password, fullName, organizationName: orgName || undefined });
      nav('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="logo" style={{ padding: 0, marginBottom: 24 }}>
          <div className="logo-mark">W</div>
          WatchTower
        </div>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h1>
        <p className="sub">
          {mode === 'login'
            ? 'Sign in to your enterprise command center.'
            : 'Spin up a new organization in seconds.'}
        </p>
        {error && <div className="err">{error}</div>}
        <form onSubmit={submit}>
          {mode === 'register' && (
            <>
              <div className="field">
                <label>Full name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="field">
                <label>Organization name</label>
                <input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Corp" />
              </div>
            </>
          )}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <div className="toggle">
          {mode === 'login' ? (
            <>Demo: ceo@acme.com / password123 ·{' '}
              <button type="button" className="btn-ghost" onClick={() => setMode('register')}>Create account</button>
            </>
          ) : (
            <button type="button" className="btn-ghost" onClick={() => setMode('login')}>Already have an account?</button>
          )}
        </div>
      </div>
    </div>
  );
}

const NAV = [
  { section: 'Overview', items: [
    { path: '/', label: 'Home', roles: ['CEO', 'MANAGER', 'EMPLOYEE'] },
    { path: '/kess', label: 'Kess AI', roles: ['CEO', 'MANAGER', 'EMPLOYEE'] },
    { path: '/agents', label: 'Department Agents', roles: ['CEO', 'MANAGER', 'EMPLOYEE'] },
  ]},
  { section: 'People', items: [
    { path: '/hr', label: 'People', roles: ['CEO', 'MANAGER', 'EMPLOYEE'] },
  ]},
  { section: 'Revenue', items: [
    { path: '/sales', label: 'Sales', roles: ['CEO', 'MANAGER'] },
  ]},
  { section: 'Operations', items: [
    { path: '/issues', label: 'Issue Tracker', roles: ['CEO', 'MANAGER', 'EMPLOYEE'] },
    { path: '/approvals', label: 'Approvals', roles: ['CEO', 'MANAGER', 'EMPLOYEE'] },
    { path: '/tickets', label: 'IT Tickets', roles: ['CEO', 'MANAGER', 'EMPLOYEE'] },
    { path: '/vendors', label: 'Vendors', roles: ['CEO', 'MANAGER', 'EMPLOYEE'] },
  ]},
  { section: 'Governance', items: [
    { path: '/legal', label: 'Contracts', roles: ['CEO', 'MANAGER'] },
    { path: '/automations', label: 'Automations', roles: ['CEO', 'MANAGER'] },
    { path: '/activity', label: 'Activity', roles: ['CEO', 'MANAGER'] },
  ]},
];

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('wt_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('wt_theme', theme);
  }, [theme]);
  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  return { theme, toggle };
}

function Shell({ children }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const { theme, toggle } = useTheme();
  const title = {
    '/': 'Home',
    '/kess': 'Kess',
    '/agents': 'Department Agents',
    '/hr': 'People',
    '/sales': 'Sales',
    '/issues': 'Issue Tracker',
    '/approvals': 'Approvals',
    '/tickets': 'IT Tickets',
    '/vendors': 'Vendors',
    '/legal': 'Contracts',
    '/automations': 'Automations',
    '/activity': 'Activity',
  }[loc.pathname] || 'WatchTower';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo"><div className="logo-mark">W</div> WatchTower</div>
        {NAV.map((g) => (
          <div key={g.section}>
            <div className="nav-section">{g.section}</div>
            {g.items.filter((i) => i.roles.includes(user.role)).map((i) => (
              <button
                key={i.path}
                className={`nav-item ${loc.pathname === i.path ? 'active' : ''}`}
                onClick={() => nav(i.path)}
              >
                {i.label}
              </button>
            ))}
          </div>
        ))}
      </aside>
      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1>{title}</h1>
            <span className="chip">{user.role}</span>
          </div>
          <div className="user-menu">
            <button type="button" className="theme-toggle" onClick={toggle} title="Toggle theme">
              {theme === 'light' ? '◐' : '◑'}
            </button>
            <span>{user.organizationName}</span>
            <div className="avatar">{(user.fullName || 'U')[0]}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => { logout(); nav('/login'); }}>Sign out</button>
          </div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-page"><div className="loading"><div className="spinner" /> Loading…</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
}

function money(n) {
  return Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function Home() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setErr(e.message));
  }, []);
  if (err) return <div className="err">{err}</div>;
  if (!data) return <div className="loading"><div className="spinner" /> Loading workspace…</div>;

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <div className="hero">
        <h2>{greet}, {user.fullName.split(' ')[0]}</h2>
        <p>
          {user.organizationName} · Founder Score {data.founderScore}.
          Your workspace is live — ask Kess for a briefing or open any module.
        </p>
      </div>
      <div className="metrics">
        <div className="metric"><div className="label">People</div><div className="value">{data.employees}</div><div className="sub" style={{ marginTop: 6 }}>Active roster</div></div>
        <div className="metric"><div className="label">Pipeline</div><div className="value">{user.role === 'EMPLOYEE' ? '—' : money(data.pipeline)}</div><div className="sub" style={{ marginTop: 6 }}>Open deals</div></div>
        <div className="metric"><div className="label">Approvals</div><div className="value">{data.pendingApprovals}</div><div className="sub" style={{ marginTop: 6 }}>Awaiting decision</div></div>
        <div className="metric"><div className="label">IT tickets</div><div className="value">{data.openTickets}</div><div className="sub" style={{ marginTop: 6 }}>Open</div></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <h3>Today&apos;s focus</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.65 }}>
            Clear pending approvals, review elevated attrition risk in People, and ask Kess
            <em> “What needs my attention today?”</em>
          </p>
        </div>
        <div className="card">
          <h3>Notifications</h3>
          <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.65 }}>
            <strong style={{ color: 'var(--ink)', fontSize: 22 }}>{data.unreadNotifications}</strong>
            <span style={{ display: 'block', marginTop: 4 }}>unread · Act from the sidebar modules.</span>
          </p>
        </div>
      </div>
    </>
  );
}

function KessPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi — I\'m Kess. I pull live summaries from HR, Sales, Finance, Security, Legal, and Automations based on your role. What would you like to know?' },
  ]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const suggestions = [
    'What needs my attention today?',
    'Summarize pipeline and stalled deals',
    'Any elevated attrition risk?',
    'Which contracts expire soon?',
  ];

  async function ask(question) {
    const text = (question || q).trim();
    if (!text || busy) return;
    setQ('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setBusy(true);
    try {
      const res = await api.kessAsk(text);
      setMessages((m) => [...m, { role: 'assistant', text: res.answer, meta: res.agentsUsed }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: `Sorry — ${e.message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="kess-layout">
      <div className="kess-chat">
        <div className="kess-messages">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role === 'user' ? 'user' : 'assistant'}`}>
              <div className="who">{m.role === 'user' ? 'You' : 'Kess'}{m.meta ? ` · ${m.meta.join(', ')}` : ''}</div>
              <div className="bubble">{m.text}</div>
            </div>
          ))}
          {busy && <div className="loading"><div className="spinner" /> Thinking…</div>}
        </div>
        <div className="kess-input">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder="Ask about your organization…"
          />
          <button className="btn btn-primary btn-sm" style={{ width: 'auto', height: 44, padding: '0 20px' }} onClick={() => ask()} disabled={busy}>
            Send
          </button>
        </div>
      </div>
      <div className="suggestions">
        <h3>Suggested</h3>
        {suggestions.map((s) => (
          <button key={s} type="button" className="suggestion" onClick={() => ask(s)}>{s}</button>
        ))}
      </div>
    </div>
  );
}

function useList(loader) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const reload = () => loader().then(setRows).catch((e) => setError(e.message));
  useEffect(() => { reload(); }, []);
  return { rows, error, reload, setRows };
}

function PeoplePage() {
  const { user } = useAuth();
  const { rows, error, reload } = useList(api.employees);
  const [form, setForm] = useState({ name: '', title: '', department: '', email: '' });
  const canWrite = user.role === 'CEO' || user.role === 'MANAGER';

  async function create(e) {
    e.preventDefault();
    await api.createEmployee(form);
    setForm({ name: '', title: '', department: '', email: '' });
    reload();
  }

  if (error) return <div className="err">{error}</div>;
  if (!rows) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      {canWrite && (
        <div className="card">
          <h3>Add person</h3>
          <form onSubmit={create}>
            <div className="form-row">
              <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-sm" style={{ width: 'auto' }}>Add</button>
          </form>
        </div>
      )}
      <div className="card">
        <h3>Directory · {rows.length}</h3>
        {rows.length === 0 ? <div className="empty">No people yet</div> : (
          <table>
            <thead><tr><th>Name</th><th>Title</th><th>Dept</th><th>Engagement</th><th>Risk</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.name}</strong></td>
                  <td>{r.title || '—'}</td>
                  <td>{r.department || '—'}</td>
                  <td>{r.engagement}</td>
                  <td><span className={`pill ${r.attritionRisk === 'HIGH' ? 'pill-red' : r.attritionRisk === 'MEDIUM' ? 'pill-amber' : 'pill-green'}`}>{r.attritionRisk}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function SalesPage() {
  const { rows, error, reload } = useList(api.deals);
  const [form, setForm] = useState({ name: '', value: '', stage: 'PROSPECTING', owner: '' });
  async function create(e) {
    e.preventDefault();
    await api.createDeal({ ...form, value: Number(form.value) || 0 });
    setForm({ name: '', value: '', stage: 'PROSPECTING', owner: '' });
    reload();
  }
  if (error) return <div className="err">{error}</div>;
  if (!rows) return <div className="loading"><div className="spinner" /></div>;
  const pipeline = rows.filter((d) => d.stage !== 'CLOSED_LOST').reduce((s, d) => s + d.value, 0);
  return (
    <>
      <div className="metrics">
        <div className="metric"><div className="label">Open pipeline</div><div className="value">{money(pipeline)}</div></div>
        <div className="metric"><div className="label">Deals</div><div className="value">{rows.length}</div></div>
        <div className="metric"><div className="label">Won</div><div className="value">{rows.filter((d) => d.stage === 'CLOSED_WON').length}</div></div>
        <div className="metric"><div className="label">Negotiation</div><div className="value">{rows.filter((d) => d.stage === 'NEGOTIATION').length}</div></div>
      </div>
      <div className="card">
        <h3>New deal</h3>
        <form onSubmit={create}>
          <div className="form-row">
            <input placeholder="Deal name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input type="number" placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              <option value="PROSPECTING">Prospecting</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="CLOSED_WON">Closed won</option>
              <option value="CLOSED_LOST">Closed lost</option>
            </select>
            <input placeholder="Owner" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
          </div>
          <button className="btn btn-primary btn-sm" style={{ width: 'auto' }}>Add deal</button>
        </form>
      </div>
      <div className="card">
        <h3>Pipeline</h3>
        <table>
          <thead><tr><th>Deal</th><th>Stage</th><th>Value</th><th>Win %</th><th>Owner</th></tr></thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id}>
                <td><strong>{d.name}</strong></td>
                <td><span className="pill pill-blue">{d.stage.replace('_', ' ')}</span></td>
                <td>{money(d.value)}</td>
                <td>{d.winProbability}%</td>
                <td>{d.owner || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ApprovalsPage() {
  const { user } = useAuth();
  const { rows, error, reload } = useList(api.approvals);
  const [form, setForm] = useState({ type: 'Expense', title: '', details: '', amount: '', department: '' });
  async function create(e) {
    e.preventDefault();
    await api.createApproval({
      type: form.type,
      title: form.title,
      details: form.details,
      department: form.department,
      amount: form.amount === '' ? undefined : Number(form.amount),
    });
    setForm({ type: 'Expense', title: '', details: '', amount: '', department: '' });
    reload();
  }
  async function decide(id, status) {
    await api.decideApproval(id, status);
    reload();
  }
  if (error) return <div className="err">{error}</div>;
  if (!rows) return <div className="loading"><div className="spinner" /></div>;
  return (
    <>
      <div className="card">
        <h3>Submit request</h3>
        <form onSubmit={create}>
          <div className="form-row">
            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            <input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option>Expense</option><option>Travel</option><option>Software</option><option>Other</option>
            </select>
          </div>
          <div className="form-row">
            <textarea placeholder="Details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
          </div>
          <button className="btn btn-primary btn-sm" style={{ width: 'auto' }}>Submit</button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>Amounts ≤ $500 may auto-approve via automation.</p>
      </div>
      <div className="card">
        <h3>Requests</h3>
        <table>
          <thead><tr><th>Title</th><th>Amount</th><th>By</th><th>Status</th>{user.role === 'CEO' && <th />}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.title}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.details}</div></td>
                <td>{r.amount != null ? money(r.amount) : '—'}</td>
                <td>{r.requester?.fullName}</td>
                <td><span className={`pill ${r.status === 'APPROVED' ? 'pill-green' : r.status === 'REJECTED' ? 'pill-red' : 'pill-amber'}`}>{r.status}</span></td>
                {user.role === 'CEO' && (
                  <td>
                    {r.status === 'PENDING' && (
                      <>
                        <button className="btn btn-ok btn-sm" onClick={() => decide(r.id, 'APPROVED')}>Approve</button>{' '}
                        <button className="btn btn-bad btn-sm" onClick={() => decide(r.id, 'REJECTED')}>Reject</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SimpleCrud({ title, loader, create, fields, columns }) {
  const { rows, error, reload } = useList(loader);
  const [form, setForm] = useState({});
  async function onCreate(e) {
    e.preventDefault();
    await create(form);
    setForm({});
    reload();
  }
  if (error) return <div className="err">{error}</div>;
  if (!rows) return <div className="loading"><div className="spinner" /></div>;
  return (
    <>
      <div className="card">
        <h3>New {title.slice(0, -1)}</h3>
        <form onSubmit={onCreate}>
          <div className="form-row">
            {fields.map((f) => (
              f.type === 'select' ? (
                <select key={f.key} value={form[f.key] || f.options[0]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input key={f.key} type={f.type || 'text'} placeholder={f.label} value={form[f.key] || ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.required} />
              )
            ))}
          </div>
          <button className="btn btn-primary btn-sm" style={{ width: 'auto' }}>Create</button>
        </form>
      </div>
      <div className="card">
        <h3>{title}</h3>
        {rows.length === 0 ? <div className="empty">Nothing here yet</div> : (
          <table>
            <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>{columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function TicketsPage() {
  return (
    <SimpleCrud
      title="Tickets"
      loader={api.tickets}
      create={(f) => api.createTicket({ subject: f.subject, description: f.description, priority: f.priority || 'MEDIUM' })}
      fields={[
        { key: 'subject', label: 'Subject', required: true },
        { key: 'description', label: 'Description' },
        { key: 'priority', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
      ]}
      columns={[
        { key: 'subject', label: 'Subject' },
        { key: 'priority', label: 'Priority', render: (r) => <span className={`pill ${r.priority === 'CRITICAL' || r.priority === 'HIGH' ? 'pill-red' : 'pill-gray'}`}>{r.priority}</span> },
        { key: 'status', label: 'Status' },
      ]}
    />
  );
}

function VendorsPage() {
  return (
    <SimpleCrud
      title="Vendors"
      loader={api.vendors}
      create={(f) => api.createVendor({ name: f.name, category: f.category, contractValue: f.contractValue ? Number(f.contractValue) : undefined })}
      fields={[
        { key: 'name', label: 'Vendor name', required: true },
        { key: 'category', label: 'Category' },
        { key: 'contractValue', label: 'Contract value', type: 'number' },
      ]}
      columns={[
        { key: 'name', label: 'Vendor' },
        { key: 'category', label: 'Category' },
        { key: 'status', label: 'Status' },
        { key: 'contractValue', label: 'Value', render: (r) => r.contractValue != null ? money(r.contractValue) : '—' },
      ]}
    />
  );
}

function LegalPage() {
  return (
    <SimpleCrud
      title="Contracts"
      loader={api.contracts}
      create={(f) => api.createContract({ name: f.name, counterparty: f.counterparty, value: f.value ? Number(f.value) : undefined, expiryDate: f.expiryDate || null })}
      fields={[
        { key: 'name', label: 'Contract name', required: true },
        { key: 'counterparty', label: 'Counterparty', required: true },
        { key: 'value', label: 'Value', type: 'number' },
        { key: 'expiryDate', label: 'Expiry', type: 'date' },
      ]}
      columns={[
        { key: 'name', label: 'Contract' },
        { key: 'counterparty', label: 'Counterparty' },
        { key: 'status', label: 'Status' },
        { key: 'value', label: 'Value', render: (r) => r.value != null ? money(r.value) : '—' },
      ]}
    />
  );
}

function AutomationsPage() {
  const { rows, error, reload } = useList(api.automations);
  const [form, setForm] = useState({ name: '', trigger: 'approval_created', condition: 'amount_lte:500', action: 'auto_approve' });
  async function create(e) {
    e.preventDefault();
    await api.createAutomation(form);
    setForm({ name: '', trigger: 'approval_created', condition: 'amount_lte:500', action: 'auto_approve' });
    reload();
  }
  if (error) return <div className="err">{error}</div>;
  if (!rows) return <div className="loading"><div className="spinner" /></div>;
  return (
    <>
      <div className="card">
        <h3>New rule</h3>
        <form onSubmit={create}>
          <div className="form-row">
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Trigger" value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} />
            <input placeholder="Condition" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} />
            <input placeholder="Action" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} />
          </div>
          <button className="btn btn-primary btn-sm" style={{ width: 'auto' }}>Create</button>
        </form>
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
          Use <code>kess:</code> prefix on conditions for human-in-the-loop. Example: <code>amount_lte:500</code>
        </p>
      </div>
      <div className="card">
        <h3>Rules</h3>
        <table>
          <thead><tr><th>Name</th><th>Trigger</th><th>Condition</th><th>Action</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.name}</strong></td>
                <td>{r.trigger}</td>
                <td><code style={{ fontSize: 12 }}>{r.condition}</code></td>
                <td>{r.action}</td>
                <td><span className={`pill ${r.status === 'ACTIVE' ? 'pill-green' : 'pill-gray'}`}>{r.status}</span></td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={async () => { await api.toggleAutomation(r.id, r.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'); reload(); }}>
                    {r.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ActivityPage() {
  const { rows, error } = useList(api.activity);
  if (error) return <div className="err">{error}</div>;
  if (!rows) return <div className="loading"><div className="spinner" /></div>;
  return (
    <div className="card">
      <h3>Activity log</h3>
      <table>
        <thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.createdAt).toLocaleString()}</td>
              <td>{r.user?.fullName || '—'}</td>
              <td>{r.action}</td>
              <td>{r.entity}{r.entityId ? ` · ${r.entityId.slice(0, 8)}` : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


const DEPTS = ['Engineering', 'Sales', 'HR', 'Finance', 'Legal', 'IT', 'Marketing', 'Operations'];

function IssuesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [dept, setDept] = useState('All');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState(user.department || 'Engineering');
  const [severity, setSeverity] = useState('MEDIUM');

  async function load() {
    try {
      const params = dept !== 'All' ? { department: dept } : {};
      const [list, sum] = await Promise.all([api.issues(params), api.issuesSummary()]);
      setRows(list);
      setSummary(sum);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => { load(); }, [dept]);

  async function submit(e) {
    e.preventDefault();
    try {
      await api.createIssue({ title, description, department, severity });
      setTitle(''); setDescription('');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function resolve(id) {
    const resolution = prompt('Resolution note') || 'Resolved';
    await api.updateIssue(id, { status: 'RESOLVED', resolution });
    load();
  }

  if (error) return <div className="err">{error}</div>;
  if (!rows) return <div className="loading"><div className="spinner" /></div>;

  return (
    <>
      <div className="metrics" style={{ marginBottom: 16 }}>
        <div className="metric"><div className="label">Total issues</div><div className="value">{summary?.total ?? rows.length}</div></div>
        <div className="metric"><div className="label">Departments</div><div className="value">{summary?.departments?.length ?? '—'}</div></div>
        <div className="metric"><div className="label">Open (filter)</div><div className="value">{rows.filter((r) => r.status === 'OPEN' || r.status === 'IN_PROGRESS').length}</div></div>
        <div className="metric"><div className="label">High / critical</div><div className="value">{rows.filter((r) => r.severity === 'HIGH' || r.severity === 'CRITICAL').length}</div></div>
      </div>

      <div className="dept-filter">
        <button type="button" className={dept === 'All' ? 'active' : ''} onClick={() => setDept('All')}>All</button>
        {DEPTS.map((d) => (
          <button key={d} type="button" className={dept === d ? 'active' : ''} onClick={() => setDept(d)}>{d}</button>
        ))}
      </div>

      <div className="card">
        <h3>Raise an issue</h3>
        <form onSubmit={submit}>
          <div className="form-row">
            <div><label className="sub">Title</label><input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
            <div><label className="sub">Department</label>
              <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                {DEPTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div><label className="sub">Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the issue…" />
          <button className="btn btn-primary btn-sm" style={{ width: 'auto', marginTop: 8 }}>Submit issue</button>
        </form>
      </div>

      <div className="card">
        <h3>Issues {dept !== 'All' ? `· ${dept}` : ''}</h3>
        {rows.length === 0 ? <div className="empty">No issues for this filter</div> : (
          <table>
            <thead><tr><th>Title</th><th>Dept</th><th>Severity</th><th>Status</th><th>Raised by</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.title}</strong>{r.description ? <div className="sub">{r.description.slice(0, 80)}</div> : null}</td>
                  <td>{r.department}</td>
                  <td><span className={`pill ${r.severity === 'CRITICAL' || r.severity === 'HIGH' ? 'pill-bad' : 'pill-pend'}`}>{r.severity}</span></td>
                  <td><span className={`pill ${r.status === 'RESOLVED' || r.status === 'CLOSED' ? 'pill-ok' : 'pill-neutral'}`}>{r.status}</span></td>
                  <td>{r.raisedBy?.fullName || '—'}</td>
                  <td>
                    {(user.role === 'CEO' || user.role === 'MANAGER') && r.status !== 'RESOLVED' && r.status !== 'CLOSED' ? (
                      <button className="btn btn-ok btn-sm" onClick={() => resolve(r.id)}>Resolve</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

const AGENT_DEFS = [
  { key: 'hr', name: 'HR Agent', icon: '♟', blurb: 'Headcount, engagement, attrition risk.', prompt: 'Summarize people risk and what HR should prioritize.' },
  { key: 'sales', name: 'Sales Agent', icon: '↗', blurb: 'Pipeline, stalled deals, forecast.', prompt: 'Summarize pipeline health and stalled deals.' },
  { key: 'finance', name: 'Finance Agent', icon: '$', blurb: 'Approvals, spend, pending amounts.', prompt: 'What finance items need attention?' },
  { key: 'security', name: 'Security / IT Agent', icon: '⬡', blurb: 'High-priority tickets and incidents.', prompt: 'Any high-priority security or IT issues?' },
  { key: 'legal', name: 'Legal Agent', icon: '§', blurb: 'Contracts expiring and compliance.', prompt: 'Which contracts expire soon?' },
  { key: 'automations', name: 'Automations Agent', icon: '⚙', blurb: 'Rules, runs, paused automations.', prompt: 'Summarize automation health.' },
  { key: 'issues', name: 'Issues Agent', icon: '!', blurb: 'Cross-department open and critical issues.', prompt: 'Summarize open issues by department and severity.' },
];

function AgentsPage() {
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  function openAgent(a) {
    setActive(a);
    setMessages([{ role: 'assistant', text: `I'm the ${a.name}. I only use ${a.key} domain data for your organization and role. Ask me for a briefing or next actions.` }]);
    setQ(a.prompt);
  }

  async function ask(e) {
    e?.preventDefault();
    const text = q.trim();
    if (!text || !active || busy) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setQ('');
    setBusy(true);
    try {
      const res = await api.kessAsk(text, active.key);
      setMessages((m) => [...m, { role: 'assistant', text: res.answer, meta: res.agentsUsed }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: err.message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="hero">
        <h2>Department agents</h2>
        <p>Each agent queries only its domain tables, respects your role, and answers through Kess. Pick an agent to start a focused briefing.</p>
      </div>
      <div className="agent-grid">
        {AGENT_DEFS.map((a) => (
          <div key={a.key} className="agent-card" onClick={() => openAgent(a)}>
            <div className="icon">{a.icon}</div>
            <h4>{a.name}</h4>
            <p>{a.blurb}</p>
            <div className="status">● Online · domain-scoped</div>
          </div>
        ))}
      </div>
      {active && (
        <div className="kess-layout">
          <div className="kess-chat">
            <div style={{ padding: '16px 28px 0', fontWeight: 600 }}>{active.icon} {active.name}</div>
            <div className="kess-messages">
              {messages.map((m, i) => (
                <div key={i} className={`kess-msg ${m.role === 'user' ? 'user' : 'assistant'}`}>
                  <div className="bubble">{m.text}</div>
                  {m.meta ? <div className="meta">Agents: {m.meta.join(', ')}</div> : null}
                </div>
              ))}
            </div>
            <form className="kess-compose" onSubmit={ask}>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Ask ${active.name}…`} disabled={busy} />
              <button className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Ask'}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/" element={<Private><Home /></Private>} />
      <Route path="/kess" element={<Private><KessPage /></Private>} />
      <Route path="/hr" element={<Private><PeoplePage /></Private>} />
      <Route path="/sales" element={<Private><SalesPage /></Private>} />
      <Route path="/approvals" element={<Private><ApprovalsPage /></Private>} />
      <Route path="/tickets" element={<Private><TicketsPage /></Private>} />
      <Route path="/vendors" element={<Private><VendorsPage /></Private>} />
      <Route path="/legal" element={<Private><LegalPage /></Private>} />
      <Route path="/automations" element={<Private><AutomationsPage /></Private>} />
      <Route path="/activity" element={<Private><ActivityPage /></Private>} />
      <Route path="/issues" element={<Private><IssuesPage /></Private>} />
      <Route path="/agents" element={<Private><AgentsPage /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
