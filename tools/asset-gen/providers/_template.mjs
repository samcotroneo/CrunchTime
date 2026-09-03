// Template for a provider (image, audio, or video).
//
// 1. Copy this file to providers/<name>.mjs
// 2. Implement generate() below
// 3. Set IMAGE_PROVIDER, AUDIO_PROVIDER, or VIDEO_PROVIDER to <name> in
//    tools/asset-gen/.env
//
// Optional capability declaration:
// export const categories = ['image']; // or ['audio'], ['video'], etc.
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
