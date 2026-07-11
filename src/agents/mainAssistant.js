import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

function stripCodeFences(text) {
  return text.replace(/```json\s*|```\s*/g, '').trim();
}

const WORKERS_AVAILABLE = [
  { id: 'researcher-1', department: 'research', job: 'finds and scores freelance/gig leads matching the user\'s skills' },
  { id: 'researcher-2', department: 'research', job: 'brainstorms new side-hustle ideas and writes short plans for the best ones' }
];

export async function classifyRequest(userRequest, mainAssistantConfig) {
  const workerList = WORKERS_AVAILABLE.map((w) => `- ${w.id} (${w.department}): ${w.job}`).join('\n');

  const response = await client.messages.create({
    model: mainAssistantConfig.model_tier,
    max_tokens: 500,
    system: `${mainAssistantConfig.system_prompt}

Workers currently available:
${workerList}

Respond with ONLY a JSON object, no other text, in this shape:
{"assignments": [{"department": "research", "worker": "researcher-1", "task_title": "short title", "task_description": "one sentence"}], "reason": null}

Rules:
- A request can need MORE THAN ONE worker (e.g. "find me gigs and also brainstorm side hustles" needs both researcher-1 and researcher-2). Include one object per worker needed, each with its own task_title/task_description scoped to just that worker's part of the request.
- If nothing fits any available worker, return {"assignments": [], "reason": "short explanation"}.
- Never invent a worker id that isn't in the list above.`,
    messages: [{ role: 'user', content: userRequest }]
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error('Main Assistant did not return a text response.');
  }

  const parsed = JSON.parse(stripCodeFences(textBlock.text));

  return { assignments: parsed.assignments ?? [], reason: parsed.reason ?? null };
}