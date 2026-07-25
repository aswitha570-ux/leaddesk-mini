# LeadDesk Mini

A small full-stack lead-capture product: a public landing page with a lead form, and a
password-protected admin dashboard to review and manage submissions.

**Live URL:** _add your deployed Render URL here_
**GitHub repo:** _add your repo URL here_

---

## Tech Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (via `better-sqlite3`) — a single-file, zero-config relational database
- **Auth:** Server-side sessions (`express-session`) + `bcryptjs` password hashing
- **Frontend:** Plain HTML/CSS/JavaScript (no framework) — kept simple on purpose for a fast, dependency-light build

## Data Model

**`leads` table**

| Column     | Type    | Notes                                      |
|------------|---------|---------------------------------------------|
| id         | INTEGER | Primary key, auto-increment                |
| name       | TEXT    | Required                                    |
| email      | TEXT    | Required, validated                         |
| budget     | TEXT    | Required, one of a fixed set of ranges      |
| message    | TEXT    | Required                                    |
| status     | TEXT    | `New` (default) / `Contacted` / `Closed`    |
| created_at | TEXT    | Set automatically on insert                 |

**`admins` table**

| Column        | Type    | Notes                                  |
|---------------|---------|------------------------------------------|
| id            | INTEGER | Primary key, auto-increment             |
| username      | TEXT    | Unique                                  |
| password_hash | TEXT    | bcrypt hash — plaintext password is never stored |

On first run, `db.js` seeds one admin account using the `ADMIN_USERNAME` / `ADMIN_PASSWORD`
environment variables. The password is hashed with bcrypt before being saved, so even the
seeding step never stores or logs a plaintext password beyond that one env var.

## Auth Approach

1. Admin submits username/password on `/admin`.
2. Server looks up the admin by username, then uses `bcrypt.compareSync()` to check the
   submitted password against the stored hash — the plaintext password is never stored or
   compared directly.
3. On success, the server sets `req.session.isAdmin = true`. Express-session signs a session
   cookie (`connect.sid`) using `SESSION_SECRET` and sends it to the browser.
4. Every subsequent admin API call (`GET /api/leads`, `PATCH /api/leads/:id`) goes through a
   `requireAuth` middleware that checks `req.session.isAdmin` before doing anything. No
   session, no access — this is enforced server-side, not just hidden in the UI.
5. The cookie is `httpOnly` (not readable by JS) and marked `secure` in production (HTTPS only).
6. Logging out (`POST /api/admin/logout`) destroys the session server-side.

This means refreshing the admin page, or closing and reopening the tab, keeps you logged in
(the session persists), while an unauthenticated request to the leads API is correctly
rejected with a 401.

## Validation

- **Client-side** (`public/app.js`): checks required fields and email format before submitting,
  shows inline error messages.
- **Server-side** (`server.js`): re-validates everything independently of the client (required
  fields, email regex). This matters because client-side checks can always be bypassed (e.g. by
  calling the API directly) — the server is the real gatekeeper.

## Running Locally

```bash
npm install
cp .env.example .env
# edit .env and set your own SESSION_SECRET / ADMIN_USERNAME / ADMIN_PASSWORD
npm start
```

Then visit:
- `http://localhost:3000/` — public landing page
- `http://localhost:3000/admin` — admin login (use the ADMIN_USERNAME / ADMIN_PASSWORD from `.env`)

## Deployment Notes

Deployed on Render as a Web Service. Environment variables (`SESSION_SECRET`,
`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `NODE_ENV=production`) are set in the Render dashboard
rather than committed to the repo.

**Known limitation:** SQLite stores data in a local file (`leaddesk.db`). On Render's free
tier the filesystem is ephemeral, so data may reset if the service restarts or redeploys.
For a production system, the next step would be to move to a hosted Postgres database
(e.g. Render Postgres or Supabase) for durable storage.
