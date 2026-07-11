import 'dotenv/config';
import db from './db/db.js';
import { loadAgentConfig } from './agents/agentConfig.js';
import { syncAgentsToDb } from './agents/syncAgents.js';
import { classifyRequest } from './agents/mainAssistant.js';
import { findGigLeads } from './agents/researcher.js';
import { planSideHustles } from './agents/sideHustlePlanner.js';

const insertTask = db.prepare(`
  INSERT INTO tasks (department, assigned_to, title, description, status)
  VALUES (@department, @assigned_to, @title, @description, @status)
`);

const completeTask = db.prepare(`
  UPDATE tasks SET status = 'done', updated_at = datetime('now') WHERE id = ?
`);

const WORKER_HANDLERS = {
  'researcher-1': findGigLeads,
  'researcher-2': planSideHustles
};

async function main() {
  const userRequest = process.argv.slice(2).join(' ') || 'Find me some freelance gigs this week.';
  const { agents, byId } = loadAgentConfig();
  syncAgentsToDb(agents);

  const mainAssistant = byId['main-assistant'];
  if (!mainAssistant) throw new Error('main-assistant not found in config/agents.local.json');

  console.log(`You: ${userRequest}\n`);

  const classification = await classifyRequest(userRequest, mainAssistant);

  if (classification.department !== 'research' || !classification.worker) {
    console.log(`Main Assistant: I can't route this yet — ${classification.reason ?? 'no matching worker.'}`);
    return;
  }

  const workerId = classification.worker;
  const handler = WORKER_HANDLERS[workerId];
  const worker = byId[workerId];

  if (!handler || !worker) {
    console.log(`Main Assistant: I tried to route this to "${workerId}", but that worker isn't set up yet.`);
    return;
  }

  console.log(`Main Assistant: Assigning this to ${worker.name} — "${classification.task_title}"\n`);

  const taskResult = insertTask.run({
    department: classification.department,
    assigned_to: workerId,
    title: classification.task_title,
    description: classification.task_description,
    status: 'in-progress'
  });

  const output = await handler(worker, classification.task_description);

  completeTask.run(taskResult.lastInsertRowid);

  console.log(`${worker.name}: Here's what I found —\n`);
  console.log(output);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});