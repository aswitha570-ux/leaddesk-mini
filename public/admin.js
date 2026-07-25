const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const leadsBody = document.getElementById('leadsBody');
const emptyState = document.getElementById('emptyState');

async function checkAuth() {
  const res = await fetch('/api/admin/me');
  const data = await res.json();
  if (data.isAdmin) {
    showDashboard();
  } else {
    showLogin();
  }
}

function showLogin() {
  loginView.hidden = false;
  dashboardView.hidden = true;
}

function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  loadLeads();
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginStatus.textContent = '';
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await res.json();

    if (!res.ok) {
      loginStatus.textContent = result.error || 'Login failed.';
      loginStatus.className = 'form-status error';
    } else {
      loginForm.reset();
      showDashboard();
    }
  } catch (err) {
    loginStatus.textContent = 'Network error. Please try again.';
    loginStatus.className = 'form-status error';
  }
});

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  showLogin();
});

async function loadLeads() {
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
  if (statusFilter.value) params.set('status', statusFilter.value);

  const res = await fetch(`/api/leads?${params.toString()}`);
  if (res.status === 401) {
    showLogin();
    return;
  }
  const leads = await res.json();
  renderLeads(leads);
}

function renderLeads(leads) {
  leadsBody.innerHTML = '';
  emptyState.hidden = leads.length !== 0;

  leads.forEach(lead => {
    const tr = document.createElement('tr');

    const created = new Date(lead.created_at + 'Z').toLocaleString();

    tr.innerHTML = `
      <td>${escapeHtml(lead.name)}</td>
      <td>${escapeHtml(lead.email)}</td>
      <td>${escapeHtml(lead.budget)}</td>
      <td>${escapeHtml(lead.message)}</td>
      <td>${created}</td>
      <td>
        <select data-id="${lead.id}" class="statusSelect">
          <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
          <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
          <option value="Closed" ${lead.status === 'Closed' ? 'selected' : ''}>Closed</option>
        </select>
      </td>
    `;
    leadsBody.appendChild(tr);
  });

  document.querySelectorAll('.statusSelect').forEach(select => {
    select.addEventListener('change', async (e) => {
      const id = e.target.getAttribute('data-id');
      const status = e.target.value;
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadLeads, 300);
});
statusFilter.addEventListener('change', loadLeads);

checkAuth();
