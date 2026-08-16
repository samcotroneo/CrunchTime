// Art provider backed by OpenAI's image generation API.
// Selected when ART_PROVIDER=openai (this file: providers/openai.mjs) in .env — see .env.example.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export async function generate({ prompt, outputPath, dryRun }) {
  if (dryRun) {
    console.log(`[dry-run] prompt: "${prompt}"`);
    return { dryRun: true, cost: null };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Add it to .env (see .env.example).');
  }

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: '1024x1024',
      n: 1,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${text}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image data returned from OpenAI API.');

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, Buffer.from(b64, 'base64'));

  return { dryRun: false, cost: 'see OpenAI usage dashboard' };
}
