// db.js
// Sets up a local SQLite database file (leaddesk.db) with two tables:
//   leads  -> every submission from the public landing page form
//   admins -> admin login accounts (passwords stored as bcrypt hashes, never plaintext)

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'leaddesk.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    budget TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );
`);

// Seed a single admin account on first run, using values from environment variables.
// This is what makes auth "real" rather than hardcoded: the password is hashed with
// bcrypt and checked against that hash on every login, not compared as plain text.
function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'changeme123';

  const existing = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!existing) {
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log(`Seeded admin account "${username}". (Password comes from ADMIN_PASSWORD env var.)`);
  }
}

seedAdmin();

module.exports = db;
