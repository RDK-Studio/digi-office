import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 5 };

export async function planSideHustles(researcherConfig, taskDescription) {
  const skills = researcherConfig.skills ?? [];

  const skillsSection = skills.length > 0
    ? `These are the user's skills, for the skill-matched bucket only: ${skills.join(', ')}.`
    : 'No skills are configured — skip the skill-matched bucket and focus on bucket 2 only.';

  const response = await client.messages.create({
    model: researcherConfig.model_tier,
    max_tokens: 2048,
    system: researcherConfig.system_prompt,
    tools: [WEB_SEARCH_TOOL],
    messages: [
      {
        role: 'user',
        content: `Task: ${taskDescription}

${skillsSection}

Research and brainstorm side-hustle ideas in TWO separate buckets — keep them clearly labeled and don't mix them:

BUCKET 1 — Skill-matched: 2-3 ideas suited to the user's own skills listed above.

BUCKET 2 — Skill-independent: 3-5 ideas that do NOT need to match the user's skills at all. Search for what's currently new, trending, or easily automated right now — things a beginner could pick up quickly or run with minimal ongoing effort. This bucket exists specifically to surface ideas outside the user's current skillset, so don't filter for fit here.

For EACH idea in both buckets, give a 1-5 realism score and a one-line reason.

Then, across both buckets combined, pick the single most promising idea overall and write a short actionable plan for it: first step, rough time investment, and realistic income potential.`
      }
    ]
  });

  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n');
}