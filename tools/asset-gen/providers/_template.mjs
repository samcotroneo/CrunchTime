// Template for a provider (art or audio).
//
// 1. Copy this file to providers/<name>.mjs
// 2. Implement generate() below
// 3. Set ART_PROVIDER or AUDIO_PROVIDER to <name> in tools/asset-gen/.env
//
// Provider contract:
// generate({ prompt, outputPath, dryRun, output, referenceImages, key, category })
// returns {
//   dryRun: boolean,
//   cost: string | null,
//   model: string | null,
//   params: object,
//   outputFormat: string,
//   outputPath: string,
//   warnings: string[]
// }

export async function generate({ prompt, outputPath, dryRun, output, referenceImages }) {
  if (dryRun) {
    console.log(`[dry-run] would generate: "${prompt}" -> ${outputPath}`);
    if (referenceImages?.length) {
      console.log(`[dry-run] references: ${referenceImages.join(', ')}`);
    }
    return {
      dryRun: true,
      cost: null,
      model: null,
      params: {
        output,
        referenceImages: referenceImages ?? [],
      },
      outputFormat: output?.format || '',
      outputPath,
      warnings: [],
    };
  }

  throw new Error('Not implemented. Fill in this provider before using it.');
}
