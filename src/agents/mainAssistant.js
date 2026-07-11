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
    max_tokens: 300,
    system: `${mainAssistantConfig.system_prompt}

Workers currently available:
${workerList}

Respond with ONLY a JSON object, no other text:
- If the request fits one of the available workers: {"department": "research", "worker": "researcher-1", "task_title": "short title", "task_description": "one sentence"}
- If it doesn't fit any available worker: {"department": null, "worker": null, "reason": "short explanation"}
- If the request genuinely needs both workers (e.g. "find me gigs AND brainstorm side hustles"), pick the single best-fitting worker for now and note the rest in task_description — routing to multiple workers isn't supported yet.`,
    messages: [{ role: 'user', content: userRequest }]
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) {
    throw new Error('Main Assistant did not return a text response.');
  }

  return JSON.parse(stripCodeFences(textBlock.text));
}