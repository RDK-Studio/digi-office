-- Digi-Office database schema
-- Departments (Research, Dev Support, Trading) are just data (a TEXT column),
-- not baked into the schema — adding/renaming departments never requires a migration.

CREATE TABLE IF NOT EXISTS agents (
  id            TEXT PRIMARY KEY,        -- e.g. 'main-assistant', 'research-dept-manager', 'researcher-1'
  name          TEXT NOT NULL,           -- display name shown in Unity
  department    TEXT,                    -- 'research' | 'dev-support' | 'trading' | NULL for the Main Assistant
  role          TEXT NOT NULL,           -- 'main-assistant' | 'dept-manager' | 'worker'
  model_tier    TEXT NOT NULL,           -- Anthropic model string, e.g. 'claude-haiku-4-5-20251001'
  level         INTEGER NOT NULL DEFAULT 1,
  xp            INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'idle',  -- 'idle' | 'working' | 'reporting' | 'error'
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  department    TEXT NOT NULL,           -- 'research' | 'dev-support' | 'trading'
  assigned_to   TEXT REFERENCES agents(id),
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'backlog',  -- 'backlog' | 'assigned' | 'in-progress' | 'awaiting-approval' | 'done' | 'error'
  priority      TEXT NOT NULL DEFAULT 'normal',   -- 'low' | 'normal' | 'high'
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ledger (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id       INTEGER REFERENCES tasks(id),
  department    TEXT NOT NULL,
  description   TEXT NOT NULL,
  revenue       REAL NOT NULL DEFAULT 0,
  cost          REAL NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);