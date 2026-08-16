#!/usr/bin/env node
// CLI entrypoint for asset generation. Never touches provider credentials
// directly — that's each provider module's job, reading straight from
// process.env.

import { appendFileSync } from 'node:fs';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true; // flag, e.g. --dry-run
      } else {
        out[key] = next;
        i += 1;
      }
    }
  }
  return out;
}

function appendLog(entry) {
  try {
    appendFileSync(new URL('./log.jsonl', import.meta.url), JSON.stringify(entry) + '\n');
  } catch {
    // non-fatal — don't fail the whole run over a log write
  }
}

const args = parseArgs(process.argv.slice(2));
const { key, category, prompt, out, 'dry-run': dryRun } = args;

if (!key || !category || !prompt || !out) {
  console.error(
    'Usage: generate.mjs --key <asset-key> --category <art|audio> --prompt "<prompt>" --out <path> [--dry-run]'
  );
  process.exit(1);
}

const providerEnvVar = category === 'art' ? 'ART_PROVIDER' : 'AUDIO_PROVIDER';
const providerName = process.env[providerEnvVar];

if (!providerName) {
  console.log(
    `[skip] ${key}: no provider configured for category "${category}" (set ${providerEnvVar} in .env)`
  );
  process.exit(0);
}

let provider;
try {
  provider = await import(`./providers/${providerName}.mjs`);
} catch {
  console.error(
    `[error] no provider implementation found for "${providerName}" (looked for providers/${providerName}.mjs)`
  );
  process.exit(1);
}

async function main() {
  console.log(
    `[${category}] generating "${key}" via ${providerName}${dryRun ? ' (dry run)' : ''}`
  );
  const result = await provider.generate({ prompt, outputPath: out, dryRun: Boolean(dryRun) });

  appendLog({
    key,
    category,
    provider: providerName,
    prompt,
    cost: result.cost ?? null,
    dryRun: Boolean(result.dryRun),
    timestamp: new Date().toISOString(),
  });

  console.log(result.dryRun ? `[dry-run] would write ${out}` : `[done] wrote ${out}`);
}

main().catch((err) => {
  console.error(`[error] ${key}:`, err.message);
  process.exit(1);
});
