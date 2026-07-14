import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const client = new Anthropic();

const SENSITIVE_PATH_PATTERNS = [
  /(^|[\\/])\.env(\.|$)/i,
  /(^|[\\/])\.git[\\/]/i,
  /id_rsa/i,
  /\.pem$/i,
  /\.key$/i,
  /\.pfx$/i,
  /\.p12$/i,
  /credentials/i,
  /secrets?\.json$/i,
  /agents\.local\.json$/i
];

function readProjectFile(allowedRoot, relativePath) {
  const resolvedRoot = resolve(allowedRoot);
  const resolvedTarget = resolve(resolvedRoot, relativePath);

  if (!resolvedTarget.startsWith(resolvedRoot)) {
    return { error: 'Path is outside the allowed project root.' };
  }
  if (SENSITIVE_PATH_PATTERNS.some((pattern) => pattern.test(resolvedTarget))) {
    return { error: 'This file looks like it may contain secrets/credentials and is blocked from reading.' };
  }
  if (!existsSync(resolvedTarget)) {
    return { error: 'File not found.' };
  }
  if (statSync(resolvedTarget).isDirectory()) {
    return { error: 'That path is a directory, not a file.' };
  }

  try {
    return { content: readFileSync(resolvedTarget, 'utf-8') };
  } catch (err) {
    return { error: `Could not read file: ${err.message}` };
  }
}

const READ_FILE_TOOL = {
  name: 'read_project_file',
  description: "Reads the contents of a text file from the user's project, given a path relative to the project root.",
  input_schema: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path relative to the project root, e.g. "Assets/Scripts/PlayerController.cs"' }
    },
    required: ['path']
  }
};

export async function helpWithProject(workerConfig, taskDescription) {
  const allowedRoot = workerConfig.allowed_project_root;
  if (!allowedRoot) {
    throw new Error('dev-assistant-1 has no "allowed_project_root" set in config/agents.local.json');
  }

  const messages = [
    {
      role: 'user',
      content: `Task: ${taskDescription}\n\nUse the read_project_file tool as needed to look at real files before answering. If you need a file and aren't sure of its exact path, say so and ask rather than guessing.`
    }
  ];

  for (let turn = 0; turn < 5; turn++) {
    const response = await client.messages.create({
      model: workerConfig.model_tier,
      max_tokens: 1536,
      system: workerConfig.system_prompt,
      tools: [READ_FILE_TOOL],
      messages
    });

    const toolUseBlocks = response.content.filter((b) => b.type === 'tool_use');

    if (toolUseBlocks.length === 0) {
      return response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
    }

    messages.push({ role: 'assistant', content: response.content });

    const toolResults = toolUseBlocks.map((block) => {
      const result = readProjectFile(allowedRoot, block.input.path);
      return {
        type: 'tool_result',
        tool_use_id: block.id,
        content: result.error ? `Error: ${result.error}` : result.content
      };
    });

    messages.push({ role: 'user', content: toolResults });
  }

  return 'Reached the tool-use turn limit before finishing — try breaking the task into smaller steps.';
}