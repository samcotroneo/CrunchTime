#!/usr/bin/env node

import { resolve } from 'node:path';
import { DEFAULT_MANIFEST, validateManifest } from './generate.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).flatMap((token, index, values) => {
    if (!token.startsWith('--')) return [];
    const key = token.slice(2);
    const value = values[index + 1];
    return [[key, value && !value.startsWith('--') ? value : true]];
  })
);

const manifestPath = resolve(args.manifest || DEFAULT_MANIFEST);

try {
  const result = validateManifest(manifestPath, args.engine || '');
  if (result.failures.length > 0) {
    for (const failure of result.failures) {
      console.error(`[validation] ${failure.key}: ${failure.error}`);
    }
    process.exitCode = 1;
  } else {
    console.log(
      `[valid] ${result.assets.length} active asset${result.assets.length === 1 ? '' : 's'} ` +
      `against style profile ${result.styleProfile.rootVersion}` +
      `${result.styleProfile.engine ? ` + ${result.styleProfile.engine}:${result.styleProfile.engineVersion}` : ''}`
    );
  }
} catch (error) {
  console.error(`[error] ${error.message}`);
  process.exitCode = 1;
}
