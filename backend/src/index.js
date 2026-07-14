import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import db from './db/db.js';
import { loadAgentConfig } from './agents/agentConfig.js';
import { syncAgentsToDb } from './agents/syncAgents.js';
import { classifyRequest } from './agents/mainAssistant.js';
import { findGigLeads } from './agents/researcher.js';
import { planSideHustles } from './agents/sideHustlePlanner.js';
import { helpWithProject } from './agents/devAssistant.js';
import { summarizeDepartment } from './agents/deptManager.js';

const insertTask = db.prepare(`
  INSERT INTO tasks (department, assigned_to, title, description, status)
  VALUES (@department, @assigned_to, @title, @description, @status)
`);

const setTaskStatus = db.prepare(`
  UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?
`);

const completeTaskWithOutput = db.prepare(`
  UPDATE tasks SET status = 'awaiting-approval', output = ?, updated_at = datetime('now') WHERE id = ?
`);

const WORKER_HANDLERS = {
  'researcher-1': findGigLeads,
  'researcher-2': planSideHustles,
  'dev-assistant-1': helpWithProject
};

async function runAssignment(assignment, byId, rl) {
  const workerId = assignment.worker;
  const handler = WORKER_HANDLERS[workerId];
  const worker = byId[workerId];

  if (!handler || !worker) {
    console.log(`Main Assistant: I tried to route this to "${workerId}", but that worker isn't set up yet.\n`);
    return;
  }

  console.log(`Main Assistant: Assigning to ${worker.name} — "${assignment.task_title}"\n`);

  const taskResult = insertTask.run({
    department: assignment.department,
    assigned_to: workerId,
    title: assignment.task_title,
    description: assignment.task_description,
    status: 'in-progress'
  });
  const taskId = taskResult.lastInsertRowid;

  const output = await handler(worker, assignment.task_description);
  completeTaskWithOutput.run(output, taskId);

  console.log(`${worker.name}: Here's what I found —\n`);
  console.log(output);
  console.log();

  const answer = (await rl.question(`Approve this result? (y/n) `)).trim().toLowerCase();

  if (answer === 'y' || answer === 'yes') {
    setTaskStatus.run('done', taskId);
    console.log(`Marked task #${taskId} as done.\n`);
  } else {
    setTaskStatus.run('rejected', taskId);
    console.log(`Marked task #${taskId} as rejected — it'll stay in the database for reference, but won't count as completed.\n`);
  }
}

async function main() {
  const userRequest = process.argv.slice(2).join(' ') || 'Find me some freelance gigs this week.';
  const { agents, byId } = loadAgentConfig();
  syncAgentsToDb(agents);

  const mainAssistant = byId['main-assistant'];
  if (!mainAssistant) throw new Error('main-assistant not found in config/agents.local.json');

  console.log(`You: ${userRequest}\n`);

  const classification = await classifyRequest(userRequest, mainAssistant);

  if (classification.type === 'status_query') {
    const deptManagerId = `${classification.department}-dept-manager`;
    const deptManager = byId[deptManagerId];

    if (!deptManager) {
      console.log(`Main Assistant: No department manager set up for "${classification.department}" yet.`);
      return;
    }

    const summary = await summarizeDepartment(deptManager, classification.department);
    console.log(`${deptManager.name}: ${summary}`);
    return;
  }

  if (classification.type !== 'task' || classification.assignments.length === 0) {
    console.log(`Main Assistant: I can't route this yet — ${classification.reason ?? 'no matching worker.'}`);
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });

  try {
    for (const assignment of classification.assignments) {
      await runAssignment(assignment, byId, rl);
    }
  } finally {
    rl.close();
  }
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});