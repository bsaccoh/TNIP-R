import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';

/**
 * LLM seam. Today the assistant runs on a deterministic intent router
 * (see ai.service.js). When AI_PROVIDER=anthropic and a key is set, the same
 * router can hand free-form questions to Claude with the KPI/compliance data as
 * context — no architectural change needed elsewhere.
 */
export function llmEnabled() {
  return env.ai.provider === 'anthropic' && !!env.ai.anthropicKey;
}

/**
 * Call the Claude Messages API. Returns assistant text.
 * Kept dependency-free (global fetch, Node 18+). Used only when llmEnabled().
 */
export async function llmComplete({ system, user, maxTokens = 1024 }) {
  if (!llmEnabled()) {
    throw new Error('LLM provider not configured (set AI_PROVIDER=anthropic and ANTHROPIC_API_KEY)');
  }
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ai.anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.ai.anthropicModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    logger.error(`Anthropic API error ${resp.status}: ${text}`);
    throw new Error(`LLM request failed (${resp.status})`);
  }
  const json = await resp.json();
  return json.content?.map((c) => c.text).join('') ?? '';
}
