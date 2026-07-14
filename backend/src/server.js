import 'dotenv/config';
import express from 'express';
import db from './db/db.js';
import { loadAgentConfig } from './agents/agentConfig.js';
import { syncAgentsToDb } from './agents/syncAgents.js';
import { classifyRequest } from './agents/mainAssistant.js';
import { findGigLeads } from './agents/researcher.js';
import { planSideHustles } from './agents/sideHustlePlanner.js';
import { helpWithProject } from './agents/devAssistant.js';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(express.json());

const insertTask = db.prepare(`
  INSERT INTO tasks (department, assigned_to, title, description, status)
  VALUES (@department, @assigned_to, @title, @description, @status)
`);

const setTaskStatus = db.prepare(`
  UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?
`);

const getTask = db.prepare(`SELECT * FROM tasks WHERE id = ?`);

const getLatestTaskForAgent = db.prepare(`
  SELECT status FROM tasks WHERE assigned_to = ? ORDER BY id DESC LIMIT 1
`);

const WORKER_HANDLERS = {
  'researcher-1': findGigLeads,
  'researcher-2': planSideHustles,
  'dev-assistant-1': helpWithProject
};

const { agents, byId } = loadAgentConfig();
syncAgentsToDb(agents);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', agentsLoaded: agents.length });
});

app.post('/api/request', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Request body must include a "message" string.' });
  }

  const mainAssistant = byId['main-assistant'];
  if (!mainAssistant) {
    return res.status(500).json({ error: 'main-assistant not found in config/agents.local.json' });
  }

  try {
    const { assignments, reason } = await classifyRequest(message, mainAssistant);

    if (assignments.length === 0) {
      return res.json({ results: [], reason: reason ?? 'No matching worker for this request.' });
    }

    const results = [];

    for (const assignment of assignments) {
      const workerId = assignment.worker;
      const handler = WORKER_HANDLERS[workerId];
      const worker = byId[workerId];

      if (!handler || !worker) {
        results.push({ worker: workerId, error: 'Worker not set up yet.' });
        continue;
      }

      const taskResult = insertTask.run({
        department: assignment.department,
        assigned_to: workerId,
        title: assignment.task_title,
        description: assignment.task_description,
        status: 'in-progress'
      });
      const taskId = taskResult.lastInsertRowid;

      const output = await handler(worker, assignment.task_description);
      setTaskStatus.run('awaiting-approval', taskId);

      results.push({
        taskId,
        workerId,
        workerName: worker.name,
        title: assignment.task_title,
        output,
        status: 'awaiting-approval'
      });
    }

    res.json({ results, reason: null });
  } catch (err) {
    console.error('Error handling /api/request:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/agents/status', (req, res) => {
  const workers = agents.filter((a) => a.role === 'worker');

  const statuses = workers.map((agent) => {
    const latest = getLatestTaskForAgent.get(agent.id);

    let state = 'idle';
    if (latest) {
      if (latest.status === 'in-progress') state = 'working';
      else if (latest.status === 'awaiting-approval') state = 'reporting';
    }

    return { agentId: agent.id, state };
  });

  res.json({ agents: statuses });
});

app.post('/api/tasks/:id/approve', (req, res) => {
  const task = getTask.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  setTaskStatus.run('done', req.params.id);
  res.json({ ...task, status: 'done' });
});

app.post('/api/tasks/:id/reject', (req, res) => {
  const task = getTask.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });

  setTaskStatus.run('rejected', req.params.id);
  res.json({ ...task, status: 'rejected' });
});

app.listen(PORT, () => {
  console.log(`Digi-Office backend server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});