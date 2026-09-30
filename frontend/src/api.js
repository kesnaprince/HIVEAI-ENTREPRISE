const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function headers() {
  const token = localStorage.getItem('wt_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function req(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...headers(), ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  register: (body) => req('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => req('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => req('/auth/me'),
  logout: () => req('/auth/logout', { method: 'POST' }),
  dashboard: () => req('/dashboard'),
  employees: () => req('/employees'),
  createEmployee: (body) => req('/employees', { method: 'POST', body: JSON.stringify(body) }),
  deals: () => req('/deals'),
  createDeal: (body) => req('/deals', { method: 'POST', body: JSON.stringify(body) }),
  approvals: () => req('/approvals'),
  createApproval: (body) => req('/approvals', { method: 'POST', body: JSON.stringify(body) }),
  decideApproval: (id, status) => req(`/approvals/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  tickets: () => req('/tickets'),
  createTicket: (body) => req('/tickets', { method: 'POST', body: JSON.stringify(body) }),
  contracts: () => req('/contracts'),
  createContract: (body) => req('/contracts', { method: 'POST', body: JSON.stringify(body) }),
  vendors: () => req('/vendors'),
  createVendor: (body) => req('/vendors', { method: 'POST', body: JSON.stringify(body) }),
  notifications: () => req('/notifications'),
  readAllNotifications: () => req('/notifications/read-all', { method: 'POST' }),
  activity: () => req('/activity'),
  automations: () => req('/automations'),
  createAutomation: (body) => req('/automations', { method: 'POST', body: JSON.stringify(body) }),
  toggleAutomation: (id, status) => req(`/automations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  kessAsk: (question, domain) => req('/kess/ask', { method: 'POST', body: JSON.stringify({ question, ...(domain ? { domain } : {}) }) }),
  issues: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req('/issues' + (q ? `?${q}` : ''));
  },
  issuesSummary: () => req('/issues/summary'),
  createIssue: (body) => req('/issues', { method: 'POST', body: JSON.stringify(body) }),
  updateIssue: (id, body) => req(`/issues/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};

