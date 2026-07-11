import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 5 };

export async function findGigLeads(researcherConfig, taskDescription) {
  const skills = researcherConfig.skills ?? [];
  if (skills.length === 0) {
    throw new Error('researcher-1 has no "skills" array set in config/agents.local.json');
  }

  const response = await client.messages.create({
    model: researcherConfig.model_tier,
    max_tokens: 1024,
    system: researcherConfig.system_prompt,
    tools: [WEB_SEARCH_TOOL],
    messages: [
      {
        role: 'user',
        content: `Task: ${taskDescription}\n\nSearch for current freelance/gig opportunities matching these skills: ${skills.join(', ')}. List up to 5 leads, each with a 1-5 fit score and a short reason.`
      }
    ]
  });

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}