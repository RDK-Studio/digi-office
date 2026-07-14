import Anthropic from '@anthropic-ai/sdk';
import db from '../db/db.js';

const client = new Anthropic();

const getRecentTasksForDept = db.prepare(`
  SELECT title, description, status, output, created_at
  FROM tasks
  WHERE department = ?
  ORDER BY id DESC
  LIMIT 10
`);

export async function summarizeDepartment(deptManagerConfig, department) {
  const tasks = getRecentTasksForDept.all(department);

  if (tasks.length === 0) {
    return `No tasks have run in ${department} yet.`;
  }

  const taskListText = tasks
    .map((t, i) => {
      const outputPreview = t.output ? `\n   Output: ${t.output.slice(0, 500)}` : '';
      return `${i + 1}. [${t.status}] ${t.title} — ${t.description}${outputPreview}`;
    })
    .join('\n\n');

  const response = await client.messages.create({
    model: deptManagerConfig.model_tier,
    max_tokens: 500,
    system: deptManagerConfig.system_prompt,
    messages: [
      {
        role: 'user',
        content: `Here are the ${tasks.length} most recent tasks in your department:\n\n${taskListText}\n\nWrite a short status summary (2-4 sentences) of what's been happening. Explicitly flag anything that needs the user's attention — rejected tasks, repeated errors, or anything still awaiting approval.`
      }
    ]
  });

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}