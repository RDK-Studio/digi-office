import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', '..', 'config', 'agents.local.json');

export function loadAgentConfig() {
  if (!existsSync(configPath)) {
    throw new Error(
      'Missing config/agents.local.json. Run: cp config/agent-template.json config/agents.local.json ' +
      'then fill in your real skills and details before running this again.'
    );
  }

  const raw = readFileSync(configPath, 'utf-8');
  const { agents } = JSON.parse(raw);
  const byId = Object.fromEntries(agents.map((a) => [a.id, a]));

  return { agents, byId };
}