// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Render (and most hosts) sit behind a proxy, this is needed for secure cookies to work
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8 // 8 hours
  }
}));

// ---------- helpers ----------
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requireAuth(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

// ---------- public: lead submission ----------
app.post('/api/leads', (req, res) => {
  const { name, email, budget, message } = req.body;

  // server-side validation (never trust the client)
  const errors = [];
  if (!name || !name.trim()) errors.push('Name is required.');
  if (!email || !isValidEmail(email)) errors.push('A valid email is required.');
  if (!budget || !budget.trim()) errors.push('Budget range is required.');
  if (!message || !message.trim()) errors.push('Message is required.');

  if (errors.length) {
    return res.status(400).json({ error: errors.join(' ') });
  }

  const stmt = db.prepare(
    'INSERT INTO leads (name, email, budget, message, status) VALUES (?, ?, ?, ?, ?)'
  );
  const info = stmt.run(name.trim(), email.trim(), budget.trim(), message.trim(), 'New');

  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// ---------- admin: auth ----------
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  req.session.isAdmin = true;
  req.session.username = admin.username;
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/admin/me', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// ---------- admin: leads management (protected) ----------
app.get('/api/leads', requireAuth, (req, res) => {
  const { search = '', status = '' } = req.query;

  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR message LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const leads = db.prepare(query).all(...params);
  res.json(leads);
});

app.patch('/api/leads/:id', requireAuth, (req, res) => {
  const { status } = req.body;
  const allowed = ['New', 'Contacted', 'Closed'];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: 'Status must be one of: ' + allowed.join(', ') });
  }

  const result = db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Lead not found.' });
  }
  res.json({ ok: true });
});

// ---------- page routes ----------
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LeadDesk Mini running on port ${PORT}`);
});
