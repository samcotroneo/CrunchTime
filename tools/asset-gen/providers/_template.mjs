// Template for a new provider (e.g. an audio/music provider).
//
// 1. Copy this file to providers/<name>.mjs
// 2. Implement generate() below
// 3. Set ART_PROVIDER or AUDIO_PROVIDER to <name> in .env
//
// No other file needs to change — generate.mjs and docs/ASSETS.md are
// already provider-agnostic.

export async function generate({ prompt, outputPath, dryRun }) {
  if (dryRun) {
    console.log(`[dry-run] would generate: "${prompt}" -> ${outputPath}`);
    return { dryRun: true, cost: null };
  }

  throw new Error('Not implemented. Fill in this provider before using it.');
}
