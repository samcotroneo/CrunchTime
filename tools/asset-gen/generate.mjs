#!/usr/bin/env node
// Robust asset generation runner.
// - Default mode: manifest-driven batch generation from docs/ASSETS.md
// - Debug mode: single-key generation with explicit --key/--category/--prompt/--out
// - Structured briefs, deterministic prompt assembly, retries, provenance, and quality gates

import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import crypto from 'node:crypto';

const DEFAULT_MANIFEST = resolve(new URL('../../docs/ASSETS.md', import.meta.url).pathname);
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 90_000;
const VALID_CATEGORIES = new Set(['art', 'audio']);
const VALID_STATUSES = new Set(['needs-generation', 'placeholder', 'final']);
const KEY_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const NONE = 'none';

function loadDotEnv() {
  const envPath = new URL('./.env', import.meta.url);
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function appendLog(entry) {
  try {
    appendFileSync(new URL('./log.jsonl', import.meta.url), JSON.stringify(entry) + '\n');
  } catch {
    // non-fatal
  }
}

function parseAssetsManifest(content) {
  const sectionStart = content.indexOf('## Assets');
  if (sectionStart === -1) return [];
  const section = content.slice(sectionStart);

  const lines = section.split(/\r?\n/);
  const assets = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (current) assets.push(current);
      current = { key: line.slice(4).trim(), fields: {} };
      continue;
    }
    if (!current) continue;

    const bulletMatch = line.match(/^\s*-\s*([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (bulletMatch) {
      current.fields[bulletMatch[1].toLowerCase()] = bulletMatch[2].trim();
    }
  }

  if (current) assets.push(current);
  return assets;
}

function csvToArray(value) {
  if (!value || value.toLowerCase() === NONE) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeBool(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  const v = `${value}`.trim().toLowerCase();
  if (['1', 'true', 'yes', 'y'].includes(v)) return true;
  if (['0', 'false', 'no', 'n'].includes(v)) return false;
  return fallback;
}

function normalizeAssetFromManifest(asset, manifestPath) {
  const f = asset.fields;
  const legacyPrompt = f.generation && f.generation.toLowerCase() !== NONE ? f.generation : '';
  const category = (f.category || '').toLowerCase();

  return {
    mode: 'manifest',
    key: asset.key,
    category,
    type: f.type || '',
    status: (f.status || '').toLowerCase(),
    source: f.source || '',
    outputPath: f.output_path ? resolve(dirname(manifestPath), f.output_path) : '',
    brief: {
      style: f.brief_style || '',
      camera: f.brief_camera || '',
      palette: f.brief_palette || '',
      mood: f.brief_mood || '',
      constraints: f.brief_constraints || '',
      negativeConstraints: f.brief_negative_constraints || '',
      outputSpec: f.brief_output_spec || '',
      subject: f.brief_subject || legacyPrompt,
    },
    output: {
      format: (f.output_format || '').toLowerCase(),
      width: Number.parseInt(f.output_width || '', 10) || null,
      height: Number.parseInt(f.output_height || '', 10) || null,
      transparentBackground: normalizeBool(f.output_transparent_background, true),
    },
    referenceImages: csvToArray(f.reference_images).map((p) => resolve(dirname(manifestPath), p)),
    rawFields: f,
  };
}

function normalizeDebugAsset(args) {
  const width = Number.parseInt(args.width || '', 10) || null;
  const height = Number.parseInt(args.height || '', 10) || null;
  return {
    mode: 'debug',
    key: args.key,
    category: (args.category || '').toLowerCase(),
    type: '',
    status: 'needs-generation',
    source: 'debug',
    outputPath: resolve(args.out),
    brief: {
      style: args['brief-style'] || 'cohesive game-ready style',
      camera: args['brief-camera'] || 'centered gameplay framing',
      palette: args['brief-palette'] || 'readable game palette',
      mood: args['brief-mood'] || 'clear and readable',
      constraints: args['brief-constraints'] || 'clean silhouette, no text',
      negativeConstraints: args['brief-negative-constraints'] || 'no watermark, no UI text',
      outputSpec: args['brief-output-spec'] || 'single game-ready output',
      subject: args.prompt || '',
    },
    output: {
      format: ((args.format || extname(args.out).slice(1) || 'png') + '').toLowerCase(),
      width,
      height,
      transparentBackground: normalizeBool(args.transparent, true),
    },
    referenceImages: csvToArray(args['reference-images']).map((p) => resolve(p)),
    rawFields: {},
  };
}

function validateKey(key) {
  if (!KEY_PATTERN.test(key)) {
    throw new Error(`Invalid asset key "${key}". Use lowercase alphanumerics and dashes only.`);
  }
}

function validateAsset(asset) {
  const errors = [];

  if (!asset.key) errors.push('missing key');
  if (!VALID_CATEGORIES.has(asset.category)) errors.push(`invalid category "${asset.category}"`);
  if (asset.status && !VALID_STATUSES.has(asset.status)) errors.push(`invalid status "${asset.status}"`);
  if (!asset.outputPath) errors.push('missing output_path');
  if (!asset.brief.subject) errors.push('missing brief_subject (or legacy generation)');

  const requiredBriefFields = [
    ['style', 'brief_style'],
    ['camera', 'brief_camera'],
    ['palette', 'brief_palette'],
    ['mood', 'brief_mood'],
    ['constraints', 'brief_constraints'],
    ['negativeConstraints', 'brief_negative_constraints'],
    ['outputSpec', 'brief_output_spec'],
  ];

  for (const [field, label] of requiredBriefFields) {
    if (!asset.brief[field]) errors.push(`missing ${label}`);
  }

  if (!asset.output.format) errors.push('missing output_format');
  if (asset.output.width !== null && asset.output.width <= 0) errors.push('invalid output_width');
  if (asset.output.height !== null && asset.output.height <= 0) errors.push('invalid output_height');

  for (const referencePath of asset.referenceImages) {
    if (!existsSync(referencePath)) errors.push(`missing reference image: ${referencePath}`);
  }

  if (asset.key) {
    try {
      validateKey(asset.key);
    } catch (error) {
      errors.push(error.message);
    }
  }

  return errors;
}

function buildPromptLayers(asset) {
  const globalStyleGuide = [
    'Game production asset for a cohesive set.',
    'Preserve clean readability at gameplay scale.',
    'Avoid text, logos, signatures, or watermarks.',
  ];

  const categoryTemplate =
    asset.category === 'art'
      ? [
          'Deliver game-ready visual art.',
          'Transparent background when requested.',
          'Prioritize silhouette clarity over detail noise.',
        ]
      : [
          'Deliver game-ready audio.',
          'Avoid clipping and harsh transients.',
          'Keep loop boundaries clean when looped content is requested.',
        ];

  const briefLayer = [
    `Subject: ${asset.brief.subject}`,
    `Style: ${asset.brief.style}`,
    `Camera/framing: ${asset.brief.camera}`,
    `Palette/color treatment: ${asset.brief.palette}`,
    `Mood: ${asset.brief.mood}`,
    `Constraints: ${asset.brief.constraints}`,
    `Negative constraints: ${asset.brief.negativeConstraints}`,
    `Output spec: ${asset.brief.outputSpec}`,
  ];

  const referenceLayer = asset.referenceImages.length
    ? [`Reference images: ${asset.referenceImages.map((p) => basename(p)).join(', ')}`]
    : [];

  const outputLayer = [
    `Output format: ${asset.output.format}`,
    asset.output.width && asset.output.height
      ? `Target dimensions: ${asset.output.width}x${asset.output.height}`
      : 'Target dimensions: provider default',
    `Transparent background: ${asset.output.transparentBackground ? 'yes' : 'no'}`,
  ];

  return {
    global: globalStyleGuide,
    category: categoryTemplate,
    brief: briefLayer,
    references: referenceLayer,
    output: outputLayer,
  };
}

function composePromptFromLayers(layers, correctionNotes = []) {
  return [
    '# Global style guide',
    ...layers.global,
    '',
    '# Category requirements',
    ...layers.category,
    '',
    '# Asset brief',
    ...layers.brief,
    '',
    '# Reference guidance',
    ...(layers.references.length ? layers.references : ['No references provided.']),
    '',
    '# Output requirements',
    ...layers.output,
    ...(correctionNotes.length
      ? ['', '# Corrections for this retry', ...correctionNotes.map((item, idx) => `${idx + 1}. ${item}`)]
      : []),
  ].join('\n');
}

function critiqueAttempt({ prompt, qualityErrors }) {
  const findings = [];
  const correctionNotes = [];

  if (!prompt.includes('Style:')) {
    findings.push('Prompt missing style clause.');
    correctionNotes.push('Include explicit style alignment language.');
  }
  if (!prompt.includes('Negative constraints:')) {
    findings.push('Prompt missing negative constraints.');
    correctionNotes.push('Add strict "no watermark/no text" constraints.');
  }

  for (const err of qualityErrors) {
    findings.push(`Quality gate failed: ${err}`);
    correctionNotes.push(`Correct ${err}.`);
  }

  return {
    pass: findings.length === 0,
    rubric: ['style match', 'readability', 'silhouette', 'constraints compliance'],
    findings,
    correctionNotes,
  };
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function withTimeout(promise, ms) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`operation timed out after ${ms}ms`)), ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timer);
  }
}

function normalizeProviderResult(result, asset, providerName) {
  if (!result || typeof result !== 'object') {
    throw new Error(`Provider ${providerName} returned invalid result for ${asset.key}.`);
  }

  return {
    dryRun: Boolean(result.dryRun),
    cost: result.cost ?? null,
    model: result.model ?? null,
    params: result.params ?? {},
    outputFormat: result.outputFormat ?? asset.output.format,
    outputPath: result.outputPath ?? asset.outputPath,
    warnings: Array.isArray(result.warnings) ? result.warnings : [],
  };
}

function readPngDimensions(path) {
  const buffer = readFileSync(path);
  if (buffer.length < 24) return null;
  const signature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== signature) return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function validateOutput(asset, providerResult) {
  const errors = [];
  const outputPath = providerResult.outputPath;

  if (!existsSync(outputPath)) {
    errors.push(`output missing at ${outputPath}`);
    return errors;
  }

  const stat = statSync(outputPath);
  if (!stat.isFile() || stat.size <= 0) {
    errors.push('output file is empty or invalid');
  }

  const ext = extname(outputPath).slice(1).toLowerCase();
  if (asset.output.format && ext && asset.output.format !== ext) {
    errors.push(`output format mismatch expected ${asset.output.format} got ${ext}`);
  }

  if (asset.output.format === 'png' && asset.output.width && asset.output.height) {
    const dims = readPngDimensions(outputPath);
    if (!dims) {
      errors.push('could not read PNG dimensions');
    } else {
      if (dims.width !== asset.output.width || dims.height !== asset.output.height) {
        errors.push(
          `dimension mismatch expected ${asset.output.width}x${asset.output.height} got ${dims.width}x${dims.height}`
        );
      }
    }
  }

  return errors;
}

function writeProvenance({ runId, asset, providerName, providerResult, promptLayers, prompt, attempts, critiqueHistory }) {
  const meta = {
    runId,
    key: asset.key,
    category: asset.category,
    provider: providerName,
    timestamp: new Date().toISOString(),
    prompt,
    promptLayers,
    referenceImages: asset.referenceImages,
    brief: asset.brief,
    outputSpec: asset.output,
    outputPath: providerResult.outputPath,
    model: providerResult.model,
    providerParams: providerResult.params,
    cost: providerResult.cost,
    attempts,
    critique: critiqueHistory,
  };

  writeFileSync(`${providerResult.outputPath}.meta.json`, JSON.stringify(meta, null, 2));
}

async function executeWithRetries({ provider, providerName, asset, dryRun, timeoutMs, maxRetries, runId }) {
  const promptLayers = buildPromptLayers(asset);
  let correctionNotes = [];
  let attempt = 0;
  const critiqueHistory = [];
  let lastError = null;

  while (attempt <= maxRetries) {
    const prompt = composePromptFromLayers(promptLayers, correctionNotes);
    const attemptNumber = attempt + 1;

    try {
      const rawResult = await withTimeout(
        provider.generate({
          prompt,
          outputPath: asset.outputPath,
          dryRun,
          output: asset.output,
          referenceImages: asset.referenceImages,
          key: asset.key,
          category: asset.category,
        }),
        timeoutMs
      );

      const providerResult = normalizeProviderResult(rawResult, asset, providerName);
      const qualityErrors = providerResult.dryRun ? [] : validateOutput(asset, providerResult);
      const critique = critiqueAttempt({ prompt, qualityErrors });

      critiqueHistory.push({
        attempt: attemptNumber,
        pass: critique.pass,
        findings: critique.findings,
        rubric: critique.rubric,
      });

      if (!critique.pass && attempt < maxRetries) {
        correctionNotes = critique.correctionNotes;
        attempt += 1;
        await sleep(800 * attemptNumber);
        continue;
      }

      if (!critique.pass && attempt >= maxRetries) {
        throw new Error(`quality checks failed after ${attemptNumber} attempts: ${critique.findings.join('; ')}`);
      }

      if (!providerResult.dryRun) {
        writeProvenance({
          runId,
          asset,
          providerName,
          providerResult,
          promptLayers,
          prompt,
          attempts: attemptNumber,
          critiqueHistory,
        });
      }

      return {
        prompt,
        promptLayers,
        attempts: attemptNumber,
        providerResult,
        critiqueHistory,
      };
    } catch (error) {
      lastError = error;
      if (attempt >= maxRetries) break;
      await sleep(1200 * (attempt + 1));
      correctionNotes = [`Previous attempt failed with: ${error.message}`];
      attempt += 1;
    }
  }

  throw lastError ?? new Error(`unknown failure generating ${asset.key}`);
}

function printMigrationWarnings(assets) {
  const legacy = assets.filter(
    (asset) =>
      asset.rawFields.generation &&
      asset.rawFields.generation.toLowerCase() !== NONE &&
      (!asset.rawFields.brief_subject || !asset.rawFields.brief_style)
  );

  if (!legacy.length) return;

  console.log('\n[migration] Legacy generation prompts detected. Add structured fields for each asset:');
  console.log('  - brief_subject, brief_style, brief_camera, brief_palette, brief_mood');
  console.log('  - brief_constraints, brief_negative_constraints, brief_output_spec');
  console.log('  - output_path, output_format, output_width, output_height, output_transparent_background');
  console.log('  - reference_images (comma-separated relative paths, optional)\n');

  for (const asset of legacy) {
    console.log(`  * ${asset.key}`);
  }
}

function summarizeCounts(results) {
  const done = results.filter((item) => item.status === 'done').length;
  const skipped = results.filter((item) => item.status === 'skipped').length;
  const failed = results.filter((item) => item.status === 'failed').length;
  return { done, skipped, failed };
}

async function generateAsset({ provider, providerName, asset, dryRun, timeoutMs, maxRetries, runId }) {
  const record = {
    key: asset.key,
    category: asset.category,
    provider: providerName,
    dryRun,
    timestamp: new Date().toISOString(),
  };

  try {
    const result = await executeWithRetries({
      provider,
      providerName,
      asset,
      dryRun,
      timeoutMs,
      maxRetries,
      runId,
    });

    appendLog({
      ...record,
      status: 'done',
      attempts: result.attempts,
      cost: result.providerResult.cost,
      outputPath: result.providerResult.outputPath,
      model: result.providerResult.model,
      referenceImages: asset.referenceImages,
      critique: result.critiqueHistory,
    });

    return { status: 'done', key: asset.key, outputPath: result.providerResult.outputPath };
  } catch (error) {
    appendLog({
      ...record,
      status: 'failed',
      error: error.message,
      outputPath: asset.outputPath,
      referenceImages: asset.referenceImages,
    });

    return { status: 'failed', key: asset.key, error: error.message };
  }
}

async function loadProvider(category) {
  const providerEnvVar = category === 'art' ? 'ART_PROVIDER' : 'AUDIO_PROVIDER';
  const providerName = process.env[providerEnvVar];

  if (!providerName) {
    return { skipped: true, reason: `no provider configured (set ${providerEnvVar})` };
  }

  let provider;
  try {
    provider = await import(`./providers/${providerName}.mjs`);
  } catch {
    throw new Error(`no provider implementation found for "${providerName}" (providers/${providerName}.mjs)`);
  }

  if (typeof provider.generate !== 'function') {
    throw new Error(`provider "${providerName}" must export generate()`);
  }

  return { skipped: false, providerName, provider };
}

async function runBatch(args) {
  const manifestPath = resolve(args.manifest || DEFAULT_MANIFEST);
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest not found: ${manifestPath}`);
  }

  const manifestContent = readFileSync(manifestPath, 'utf8');
  const parsed = parseAssetsManifest(manifestContent).map((asset) => normalizeAssetFromManifest(asset, manifestPath));
  printMigrationWarnings(parsed);

  const keyFilter = args.key ? args.key.trim() : '';
  const candidates = parsed.filter((asset) => {
    if (keyFilter) return asset.key === keyFilter;
    return asset.status === 'needs-generation';
  });

  if (!candidates.length) {
    console.log('[skip] no assets to generate');
    return;
  }

  const validationFailures = [];
  const validAssets = [];
  for (const asset of candidates) {
    const errors = validateAsset(asset);
    if (errors.length) {
      validationFailures.push({ key: asset.key, errors });
    } else {
      validAssets.push(asset);
    }
  }

  for (const item of validationFailures) {
    appendLog({
      key: item.key,
      status: 'failed',
      stage: 'validation',
      errors: item.errors,
      timestamp: new Date().toISOString(),
    });
    console.error(`[validation] ${item.key}: ${item.errors.join('; ')}`);
  }

  const continueOnError = normalizeBool(args['continue-on-error'], true);
  if (validationFailures.length && !continueOnError) {
    throw new Error('validation failed and continue-on-error is false');
  }

  const runId = args['run-id'] || crypto.randomUUID();
  const dryRun = Boolean(args['dry-run']);
  const timeoutMs = Number.parseInt(args['timeout-ms'] || '', 10) || DEFAULT_TIMEOUT_MS;
  const maxRetries = Number.parseInt(args['max-retries'] || '', 10);
  const boundedRetries = Number.isNaN(maxRetries) ? DEFAULT_MAX_RETRIES : Math.max(0, maxRetries);

  const results = [];

  for (const asset of validAssets) {
    const providerLoad = await loadProvider(asset.category);
    if (providerLoad.skipped) {
      console.log(`[skip] ${asset.key}: ${providerLoad.reason}`);
      appendLog({
        key: asset.key,
        category: asset.category,
        status: 'skipped',
        reason: providerLoad.reason,
        timestamp: new Date().toISOString(),
      });
      results.push({ status: 'skipped', key: asset.key });
      continue;
    }

    console.log(
      `[${asset.category}] generating "${asset.key}" via ${providerLoad.providerName}${dryRun ? ' (dry run)' : ''}`
    );

    const result = await generateAsset({
      provider: providerLoad.provider,
      providerName: providerLoad.providerName,
      asset,
      dryRun,
      timeoutMs,
      maxRetries: boundedRetries,
      runId,
    });

    if (result.status === 'failed') {
      console.error(`[error] ${asset.key}: ${result.error}`);
      if (!continueOnError) {
        throw new Error(`generation failed for ${asset.key}: ${result.error}`);
      }
    } else {
      console.log(result.outputPath ? `[done] wrote ${result.outputPath}` : `[done] ${asset.key}`);
    }

    results.push(result);
  }

  const summary = summarizeCounts(results);
  console.log(`\nSummary: done=${summary.done} skipped=${summary.skipped} failed=${summary.failed}`);
  if (summary.failed > 0) process.exitCode = 1;
}

async function runDebugSingle(args) {
  const { key, category, prompt, out } = args;
  if (!key || !category || !prompt || !out) {
    console.error(
      'Debug usage: generate.mjs --key <asset-key> --category <art|audio> --prompt "<prompt>" --out <path> [--dry-run]'
    );
    process.exit(1);
  }

  const asset = normalizeDebugAsset(args);
  const errors = validateAsset(asset);
  if (errors.length) {
    throw new Error(`validation failed for ${asset.key}: ${errors.join('; ')}`);
  }

  const providerLoad = await loadProvider(asset.category);
  if (providerLoad.skipped) {
    console.log(`[skip] ${asset.key}: ${providerLoad.reason}`);
    return;
  }

  const dryRun = Boolean(args['dry-run']);
  const timeoutMs = Number.parseInt(args['timeout-ms'] || '', 10) || DEFAULT_TIMEOUT_MS;
  const maxRetries = Number.parseInt(args['max-retries'] || '', 10);
  const boundedRetries = Number.isNaN(maxRetries) ? DEFAULT_MAX_RETRIES : Math.max(0, maxRetries);

  console.log(`[${asset.category}] generating "${asset.key}" via ${providerLoad.providerName}${dryRun ? ' (dry run)' : ''}`);

  const result = await generateAsset({
    provider: providerLoad.provider,
    providerName: providerLoad.providerName,
    asset,
    dryRun,
    timeoutMs,
    maxRetries: boundedRetries,
    runId: args['run-id'] || crypto.randomUUID(),
  });

  if (result.status === 'failed') {
    throw new Error(result.error);
  }

  console.log(result.outputPath ? `[done] wrote ${result.outputPath}` : `[done] ${asset.key}`);
}

function printHelp() {
  console.log('Asset generation runner');
  console.log('');
  console.log('Default (manifest batch):');
  console.log('  node generate.mjs [--manifest <path>] [--dry-run] [--continue-on-error true|false]');
  console.log('  node generate.mjs --key <asset-key> [--manifest <path>]   # single-key from manifest');
  console.log('');
  console.log('Debug single asset mode:');
  console.log('  node generate.mjs --key <key> --category <art|audio> --prompt "..." --out <path> [--dry-run]');
  console.log('');
  console.log('Common options:');
  console.log('  --max-retries <n> --timeout-ms <ms> --run-id <id>');
  console.log('  --reference-images <comma,separated,paths> (debug mode)');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadDotEnv();
  if (args.help) {
    printHelp();
    return;
  }

  const debugSingle = Boolean(args.key && args.category && args.prompt && args.out);
  if (debugSingle) {
    await runDebugSingle(args);
    return;
  }

  await runBatch(args);
}

main().catch((err) => {
  console.error(`[error] ${err.message}`);
  process.exit(1);
});
