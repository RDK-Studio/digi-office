import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

function stripCodeFences(text) {
  return text.replace(/```json\s*|```\s*/g, '').trim();
}

const WORKERS_AVAILABLE = [
  { id: 'researcher-1', department: 'research', job: 'finds and scores freelance/gig leads matching the user\'s skills' },
  { id: 'researcher-2', department: 'research', job: 'brainstorms new side-hustle ideas and writes short plans for the best ones' },
  { id: 'dev-assistant-1', department: 'dev-support', job: 'reads the user\'s own project files (code, config) to help debug, review, or explain them' }
];

export async function classifyRequest(userRequest, mainAssistantConfig) {
  const workerList = WORKERS_AVAILABLE.map((w) => `- ${w.id} (${w.department}): ${w.job}`).join('\n');
  const departments = [...new Set(WORKERS_AVAILABLE.map((w) => w.department))];

  const response = await client.messages.create({
    model: mainAssistantConfig.model_tier,
    max_tokens: 500,
    system: `${mainAssistantConfig.system_prompt}

Workers currently available:
${workerList}

Departments available for status updates: ${departments.join(', ')}.

There are two kinds of requests:
1. TASK requests — the user wants something done (find gigs, brainstorm ideas, help with code). Respond: {"type": "task", "assignments": [{"department": "research", "worker": "researcher-1", "task_title": "short title", "task_description": "one sentence"}]}
2. STATUS requests — the user is asking how a department is doing, not asking for new work (e.g. "how's research going", "any updates from dev support"). Respond: {"type": "status_query", "department": "research"}

If neither fits, respond: {"type": "none", "reason": "short explanation"}

Rules:
- A TASK request can need MORE THAN ONE worker — include one assignment object per worker needed, each scoped to just that worker's part of the request.
- Never invent a worker id or department that isn't listed above.
- Respond with ONLY the JSON object, no other text.`,
    messages: [{ role: 'user', content: userRequest }]
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error('Main Assistant did not return a text response.');
  }

  const parsed = JSON.parse(stripCodeFences(textBlock.text));

  return {
    type: parsed.type ?? 'none',
    assignments: parsed.assignments ?? [],
    department: parsed.department ?? null,
    reason: parsed.reason ?? null
  };
}