import db from '../db/db.js';

const upsertAgent = db.prepare(`
  INSERT INTO agents (id, name, department, role, model_tier)
  VALUES (@id, @name, @department, @role, @model_tier)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    department = excluded.department,
    role = excluded.role,
    model_tier = excluded.model_tier
`);

export function syncAgentsToDb(agents) {
  for (const agent of agents) {
    upsertAgent.run({
      id: agent.id,
      name: agent.name,
      department: agent.department ?? null,
      role: agent.role,
      model_tier: agent.model_tier
    });
  }
}