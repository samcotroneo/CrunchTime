#!/usr/bin/env node
// Robust asset generation runner.
// - Default mode: manifest-driven batch generation from docs/ASSETS.md
// - Debug mode: single-key generation with explicit --key/--category/--prompt/--out
// - Structured briefs, deterministic prompt assembly, retries, provenance, and quality gates

import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DEFAULT_MANIFEST = fileURLToPath(new URL('../../docs/ASSETS.md', import.meta.url));
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 90_000;
const VALID_CATEGORIES = new Set(['image', 'audio', 'video']);
const CATEGORY_ALIASES = new Map([['art', 'image']]);
const VALID_STATUSES = new Set(['needs-generation', 'placeholder', 'final']);
const VALID_SOURCES = new Set(['kenney.nl (CC0)', 'commissioned', 'generated', 'placeholder']);
const VALID_TYPES = {
  image: new Set(['spritesheet', 'atlas', 'icon', 'illustration', 'texture']),
  audio: new Set(['sfx', 'music', 'loop']),
  video: new Set(['clip', 'loop', 'cutscene', 'background']),
};
const KEY_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const NONE = 'none';

function stripOptionalQuotes(value) {
  const trimmed = `${value ?? ''}`.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

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
    const value = stripOptionalQuotes(line.slice(idx + 1));
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

function parseMaxRetries(args) {
  const maxRetries = Number.parseInt(args['max-retries'] || '', 10);
  return Number.isNaN(maxRetries) ? DEFAULT_MAX_RETRIES : Math.max(0, maxRetries);
}

function normalizeAssetFromManifest(asset, manifestPath) {
  const f = asset.fields;
  const rawCategory = (f.category || '').toLowerCase();
  const category = CATEGORY_ALIASES.get(rawCategory) || rawCategory;

  return {
    mode: 'manifest',
    key: asset.key,
    category,
    type: f.type || '',
    status: (f.status || '').toLowerCase(),
    source: f.source || '',
    sourceTool: f.source_tool || '',
    styleProfileVersion: f.style_profile_version || '',
    engineStyleProfileVersion: f.engine_style_profile_version || '',
    styleProfileRef: f.style_profile_ref || '',
    engineStyleProfileRef: f.engine_style_profile_ref || '',
    outputPath: f.output_path ? resolve(dirname(manifestPath), f.output_path) : '',
    brief: {
      style: f.brief_style || '',
      camera: f.brief_camera || '',
      palette: f.brief_palette || '',
      mood: f.brief_mood || '',
      constraints: f.brief_constraints || '',
      negativeConstraints: f.brief_negative_constraints || '',
      outputSpec: f.brief_output_spec || '',
      tempo: f.brief_tempo || '',
      looping: f.brief_looping || '',
      timeline: f.brief_timeline || '',
      subject: f.brief_subject || '',
    },
    output: {
      format: (f.output_format || '').toLowerCase(),
      width: Number.parseInt(f.output_width || '', 10) || null,
      height: Number.parseInt(f.output_height || '', 10) || null,
      transparentBackground: normalizeBool(f.output_transparent_background, true),
      fps: Number.parseInt(f.output_fps || '', 10) || null,
      durationSeconds: Number.parseFloat(f.output_duration_seconds || '') || null,
      sampleRate: Number.parseInt(f.output_sample_rate || '', 10) || null,
      channels: Number.parseInt(f.output_channels || '', 10) || null,
    },
    referenceImages: csvToArray(f.reference_images).map((p) => resolve(dirname(manifestPath), p)),
    rawFields: f,
  };
}

function normalizeDebugAsset(args) {
  const category = CATEGORY_ALIASES.get((args.category || '').toLowerCase()) || (args.category || '').toLowerCase();
  const width = Number.parseInt(args.width || '', 10) || null;
  const height = Number.parseInt(args.height || '', 10) || null;
  return {
    mode: 'debug',
    key: args.key,
    category,
    type: category === 'image' ? 'illustration' : category === 'video' ? 'clip' : 'sfx',
    status: 'needs-generation',
    source: 'generated',
    sourceTool: 'debug',
    outputPath: resolve(args.out),
    brief: {
      style:
        args['brief-style'] ||
        (category === 'audio'
          ? 'cohesive sonic style'
          : category === 'video'
            ? 'cohesive motion style'
            : 'cohesive visual style'),
      camera: args['brief-camera'] || 'centered framing',
      palette: args['brief-palette'] || 'readable product palette',
      mood: args['brief-mood'] || 'clear and purposeful',
      constraints: args['brief-constraints'] || 'clean composition, no text',
      negativeConstraints: args['brief-negative-constraints'] || 'no watermark, no UI text',
      outputSpec: args['brief-output-spec'] || 'single production-ready output',
      tempo: args['brief-tempo'] || 'steady and unobtrusive',
      looping: args['brief-looping'] || 'not required',
      timeline: args['brief-timeline'] || 'clear beginning, middle, and end',
      subject: args.prompt || '',
    },
    output: {
      format: ((args.format || extname(args.out).slice(1) || 'png') + '').toLowerCase(),
      width: width || (category === 'image' ? 1024 : category === 'video' ? 1920 : null),
      height: height || (category === 'image' ? 1024 : category === 'video' ? 1080 : null),
      transparentBackground: normalizeBool(args.transparent, true),
      fps: Number.parseInt(args.fps || '', 10) || (category === 'video' ? 24 : null),
      durationSeconds: Number.parseFloat(args.duration || '') || (category === 'video' ? 5 : null),
      sampleRate: Number.parseInt(args['sample-rate'] || '', 10) || null,
      channels: Number.parseInt(args.channels || '', 10) || null,
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

function readStyleProfileVersion(content, path) {
  const match = `${content ?? ''}`.match(/^## style_profile_version\s*\n+`([^`]+)`/m);
  if (!match) {
    throw new Error(`Missing style_profile_version in ${path}`);
  }
  return match[1].trim();
}

function loadStyleProfile(repoRoot, engineName = '') {
  const rootPath = resolve(repoRoot, 'docs/ART_STYLE.md');
  if (!existsSync(rootPath)) throw new Error(`style policy not found: ${rootPath}`);
  const rootContent = readFileSync(rootPath, 'utf8');
  const rootVersion = readStyleProfileVersion(rootContent, rootPath);
  const normalizedEngine = `${engineName ?? ''}`.trim().toLowerCase();
  if (!normalizedEngine) {
    return {
      engine: '',
      rootPath,
      rootContent,
      rootVersion,
      enginePath: '',
      engineContent: '',
      engineVersion: '',
      digest: crypto.createHash('sha256').update(rootContent).digest('hex'),
    };
  }

  const enginePath = resolve(repoRoot, 'engines', normalizedEngine, 'ART_STYLE.md');
  if (!existsSync(enginePath)) throw new Error(`engine art-style overlay not found: ${enginePath}`);
  const engineContent = readFileSync(enginePath, 'utf8');
  const engineVersion = readStyleProfileVersion(engineContent, enginePath);
  const digest = crypto
    .createHash('sha256')
    .update(rootContent)
    .update('\0')
    .update(engineContent)
    .digest('hex');

  return {
    engine: normalizedEngine,
    rootPath,
    rootContent,
    rootVersion,
    enginePath,
    engineContent,
    engineVersion,
    digest,
  };
}

function detectEngine(repoRoot, explicitEngine = '') {
  if (`${explicitEngine ?? ''}`.trim()) return `${explicitEngine}`.trim().toLowerCase();
  const architecturePath = resolve(repoRoot, 'docs/ARCHITECTURE.md');
  if (!existsSync(architecturePath)) return '';
  const match = readFileSync(architecturePath, 'utf8').match(/<!--\s*engine:\s*([a-z0-9-]+)\s*-->/i);
  return match ? match[1].toLowerCase() : '';
}

function headingSlug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

function validateStyleProfileRef(ref, repoRoot, expectedRelativePath) {
  const [relativePath, fragment] = `${ref ?? ''}`.split('#', 2);
  if (!relativePath || !fragment) return 'style profile references must include a document and section';
  if (relativePath !== expectedRelativePath) {
    return `style profile reference must point to ${expectedRelativePath}`;
  }

  const path = resolve(repoRoot, relativePath);
  if (!existsSync(path)) return `style profile reference document not found: ${relativePath}`;
  const content = readFileSync(path, 'utf8');
  const headings = [...content.matchAll(/^##\s+(.+)$/gm)].map((match) => headingSlug(match[1]));
  if (!headings.includes(fragment.toLowerCase())) {
    return `style profile section not found: ${ref}`;
  }
  return '';
}

function validateAsset(asset, styleProfile = null) {
  const errors = [];

  if (!asset.key) errors.push('missing key');
  if (!VALID_CATEGORIES.has(asset.category)) errors.push(`invalid category "${asset.category}"`);
  if (!asset.status) errors.push('missing status');
  if (asset.status && !VALID_STATUSES.has(asset.status)) errors.push(`invalid status "${asset.status}"`);
  if (asset.status === 'placeholder') return errors;
  if (!asset.type) errors.push('missing type');
  if (asset.type && VALID_TYPES[asset.category] && !VALID_TYPES[asset.category].has(asset.type)) {
    errors.push(`invalid type "${asset.type}" for category "${asset.category}"`);
  }
  if (!asset.source) errors.push('missing source');
  if (asset.source && !VALID_SOURCES.has(asset.source)) errors.push(`invalid source "${asset.source}"`);
  if (['generated', 'commissioned'].includes(asset.source) && !asset.sourceTool) {
    errors.push('missing source_tool for generated or commissioned asset');
  }
  if (!asset.outputPath) errors.push('missing output_path');
  if (!asset.brief.subject) errors.push('missing brief_subject');
  if (asset.status === 'final' && asset.outputPath && !existsSync(asset.outputPath)) {
    errors.push(`final output not found at ${asset.outputPath}`);
  }

  const requiredBriefFields = [
    ['style', 'brief_style'],
    ['mood', 'brief_mood'],
    ['constraints', 'brief_constraints'],
    ['negativeConstraints', 'brief_negative_constraints'],
    ['outputSpec', 'brief_output_spec'],
  ];

  for (const [field, label] of requiredBriefFields) {
    if (!asset.brief[field]) errors.push(`missing ${label}`);
  }

  if (asset.category === 'image' || asset.category === 'video') {
    for (const [field, label] of [
      ['camera', 'brief_camera'],
      ['palette', 'brief_palette'],
    ]) {
      if (!asset.brief[field]) errors.push(`missing ${label}`);
    }
  }

  if (asset.category === 'audio') {
    for (const [field, label] of [
      ['tempo', 'brief_tempo'],
      ['looping', 'brief_looping'],
    ]) {
      if (!asset.brief[field]) errors.push(`missing ${label}`);
    }
  }

  if (asset.category === 'video' && !asset.brief.timeline) {
    errors.push('missing brief_timeline');
  }

  if (asset.category === 'image' && (!asset.output.width || !asset.output.height)) {
    errors.push('image assets require output_width and output_height');
  }
  if (asset.category === 'video') {
    if (!asset.output.width || !asset.output.height) errors.push('video assets require output_width and output_height');
    if (!asset.output.fps || asset.output.fps <= 0) errors.push('video assets require output_fps');
    if (!asset.output.durationSeconds || asset.output.durationSeconds <= 0) {
      errors.push('video assets require output_duration_seconds');
    }
  }

  if (styleProfile && asset.mode === 'manifest') {
    if (!asset.styleProfileVersion) errors.push('missing style_profile_version');
    if (asset.styleProfileVersion && asset.styleProfileVersion !== styleProfile.rootVersion) {
      errors.push(`style_profile_version (${asset.styleProfileVersion}) does not match current profile (${styleProfile.rootVersion})`);
    }
    if (!asset.styleProfileRef) errors.push('missing style_profile_ref');
    if (asset.styleProfileRef) {
      const refError = validateStyleProfileRef(
        asset.styleProfileRef,
        dirname(dirname(styleProfile.rootPath)),
        'docs/ART_STYLE.md'
      );
      if (refError) errors.push(refError);
    }
    if (styleProfile.engine) {
      if (!asset.engineStyleProfileVersion) errors.push('missing engine_style_profile_version');
      if (
        asset.engineStyleProfileVersion &&
        asset.engineStyleProfileVersion !== styleProfile.engineVersion
      ) {
        errors.push(
          `engine_style_profile_version (${asset.engineStyleProfileVersion}) does not match current overlay (${styleProfile.engineVersion})`
        );
      }
      if (!asset.engineStyleProfileRef) errors.push('missing engine_style_profile_ref');
      if (asset.engineStyleProfileRef) {
        const refError = validateStyleProfileRef(
          asset.engineStyleProfileRef,
          dirname(dirname(styleProfile.rootPath)),
          `engines/${styleProfile.engine}/ART_STYLE.md`
        );
        if (refError) errors.push(refError);
      }
    }
  }

  if (!asset.output.format) errors.push('missing output_format');
  if (asset.output.format) {
    const pathExt = extname(asset.outputPath).slice(1).toLowerCase();
    if (pathExt && pathExt !== asset.output.format) {
      errors.push(`output_path extension (${pathExt}) does not match output_format (${asset.output.format})`);
    }
  }
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

function validateManifest(manifestPath, explicitEngine = '') {
  const resolvedManifestPath = resolve(manifestPath);
  if (!existsSync(resolvedManifestPath)) {
    throw new Error(`manifest not found: ${resolvedManifestPath}`);
  }

  const repoRoot = resolve(dirname(resolvedManifestPath), '..');
  const engine = detectEngine(repoRoot, explicitEngine);
  const styleProfile = loadStyleProfile(repoRoot, engine);
  const assets = parseAssetsManifest(readFileSync(resolvedManifestPath, 'utf8'))
    .map((asset) => normalizeAssetFromManifest(asset, resolvedManifestPath))
    .filter((asset) => ['needs-generation', 'final'].includes(asset.status));
  const seenKeys = new Set();
  const failures = assets.flatMap((asset) => {
    const errors = validateAsset(asset, styleProfile);
    if (seenKeys.has(asset.key)) errors.push('duplicate asset key');
    seenKeys.add(asset.key);
    return errors.map((error) => ({ key: asset.key, error }));
  });
  return { assets, failures, styleProfile };
}

function buildPromptLayers(asset, styleProfile = null) {
  const globalStyleGuide = [
    'Create a cohesive product asset that follows the supplied art-direction policy.',
    'Avoid text, logos, signatures, or watermarks.',
  ];

  const categoryTemplate = {
    image: [
      'Deliver a production-ready image asset.',
      'Transparent background when requested.',
      'Prioritize clear composition and legibility at the target size.',
    ],
    audio: [
      'Deliver a production-ready audio asset.',
      'Avoid clipping and harsh transients.',
      'Keep loop boundaries clean when looped content is requested.',
    ],
    video: [
      'Deliver a production-ready video asset.',
      'Keep motion, framing, and timing coherent throughout the clip.',
      'Avoid embedded text, logos, signatures, or watermarks unless explicitly requested.',
    ],
  }[asset.category] || [];

  const briefLayer = [
    `Subject: ${asset.brief.subject}`,
    `Style: ${asset.brief.style}`,
    `Mood: ${asset.brief.mood}`,
    `Constraints: ${asset.brief.constraints}`,
    `Negative constraints: ${asset.brief.negativeConstraints}`,
    `Output spec: ${asset.brief.outputSpec}`,
  ];
  if (asset.category === 'image' || asset.category === 'video') {
    briefLayer.push(`Camera/framing: ${asset.brief.camera}`, `Palette/color treatment: ${asset.brief.palette}`);
  }
  if (asset.category === 'audio') {
    briefLayer.push(`Tempo/pacing: ${asset.brief.tempo}`, `Looping: ${asset.brief.looping}`);
  }
  if (asset.category === 'video') {
    briefLayer.push(`Timeline/motion: ${asset.brief.timeline}`);
  }

  const referenceLayer = asset.referenceImages.length
    ? [`Reference images: ${asset.referenceImages.map((p) => basename(p)).join(', ')}`]
    : [];

  const outputLayer = [
    `Output format: ${asset.output.format}`,
    asset.output.width && asset.output.height
      ? `Target dimensions: ${asset.output.width}x${asset.output.height}`
      : 'Target dimensions: provider default',
  ];
  if (asset.category === 'image' || asset.category === 'video') {
    outputLayer.push(`Transparent background: ${asset.output.transparentBackground ? 'yes' : 'no'}`);
  }
  if (asset.category === 'video') {
    outputLayer.push(`Frame rate: ${asset.output.fps} fps`, `Duration: ${asset.output.durationSeconds} seconds`);
  }
  if (asset.category === 'audio') {
    if (asset.output.sampleRate) outputLayer.push(`Sample rate: ${asset.output.sampleRate} Hz`);
    if (asset.output.channels) outputLayer.push(`Channels: ${asset.output.channels}`);
  }

  return {
    global: styleProfile
      ? [
          ...globalStyleGuide,
          '',
          `Root art-direction policy (${styleProfile.rootVersion}):`,
          styleProfile.rootContent.trim(),
          ...(styleProfile.engine
            ? [`Engine overlay (${styleProfile.engine}, ${styleProfile.engineVersion}):`, styleProfile.engineContent.trim()]
            : []),
        ]
      : globalStyleGuide,
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

function critiqueAttempt({ asset, qualityErrors }) {
  const findings = [];
  const correctionNotes = [];
  const placeholderValues = new Set(['none', 'tbd', 'todo', 'n/a']);

  if (placeholderValues.has(asset.brief.style.trim().toLowerCase())) {
    findings.push('Style brief is placeholder-like and too weak for consistency.');
    correctionNotes.push('Replace style with concrete visual style direction.');
  }
  if (placeholderValues.has(asset.brief.negativeConstraints.trim().toLowerCase())) {
    findings.push('Negative constraints are placeholder-like and too weak for safety.');
    correctionNotes.push('Provide explicit negative constraints (watermark/text/logo exclusions).');
  }

  for (const err of qualityErrors) {
    findings.push(`Quality gate failed: ${err}`);
    correctionNotes.push(`Correct ${err}.`);
  }

  return {
    pass: findings.length === 0,
    rubric:
      asset.category === 'audio'
        ? ['sonic style match', 'clarity', 'looping', 'constraints compliance']
        : asset.category === 'video'
          ? ['visual style match', 'readability', 'motion continuity', 'constraints compliance']
          : ['style match', 'readability', 'composition', 'constraints compliance'],
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

function writeProvenance({
  runId,
  asset,
  providerName,
  providerResult,
  promptLayers,
  prompt,
  attempts,
  critiqueHistory,
  styleProfile,
}) {
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
    styleProfile: styleProfile
      ? {
          rootVersion: styleProfile.rootVersion,
          engine: styleProfile.engine || null,
          engineVersion: styleProfile.engineVersion || null,
          digest: styleProfile.digest,
        }
      : null,
  };

  writeFileSync(`${providerResult.outputPath}.meta.json`, JSON.stringify(meta, null, 2));
}

async function executeWithRetries({
  provider,
  providerName,
  asset,
  dryRun,
  timeoutMs,
  maxRetries,
  runId,
  styleProfile,
}) {
  const promptLayers = buildPromptLayers(asset, styleProfile);
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
      const critique = critiqueAttempt({ asset, qualityErrors });

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

      if (!critique.pass) {
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
          styleProfile,
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
  console.log('  - common: brief_subject, brief_style, brief_mood, brief_constraints, brief_negative_constraints, brief_output_spec');
  console.log('  - image/video: brief_camera, brief_palette, output_width, output_height');
  console.log('  - audio: brief_tempo, brief_looping');
  console.log('  - video: brief_timeline, output_fps, output_duration_seconds');
  console.log('  - all: output_path, output_format, style profile pins, reference_images (optional)\n');

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

async function generateAsset({
  provider,
  providerName,
  asset,
  dryRun,
  timeoutMs,
  maxRetries,
  runId,
  styleProfile,
}) {
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
      styleProfile,
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
  const providerEnvVar = {
    image: 'IMAGE_PROVIDER',
    audio: 'AUDIO_PROVIDER',
    video: 'VIDEO_PROVIDER',
  }[category];
  const legacyProviderEnvVar = category === 'image' ? 'ART_PROVIDER' : '';
  const providerName = process.env[providerEnvVar] || (legacyProviderEnvVar ? process.env[legacyProviderEnvVar] : '');

  if (!providerName) {
    return {
      skipped: true,
      reason: `no provider configured (set ${providerEnvVar}${legacyProviderEnvVar ? ` or ${legacyProviderEnvVar}` : ''})`,
    };
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
  if (Array.isArray(provider.categories) && !provider.categories.includes(category)) {
    throw new Error(
      `provider "${providerName}" does not support ${category} assets (supports: ${provider.categories.join(', ') || 'none'})`
    );
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
  const repoRoot = resolve(dirname(manifestPath), '..');
  const engine = detectEngine(repoRoot, args.engine);
  const manifestValidation = validateManifest(manifestPath, engine);
  const styleProfile = manifestValidation.styleProfile;
  const validationFailures = manifestValidation.failures;
  const invalidKeys = new Set(validationFailures.map((item) => item.key));

  const keyFilter = args.key ? args.key.trim() : '';
  const candidates = parsed.filter((asset) => {
    if (keyFilter) return asset.key === keyFilter && !invalidKeys.has(asset.key);
    return asset.status === 'needs-generation' && !invalidKeys.has(asset.key);
  });

  for (const item of validationFailures) {
    appendLog({
      key: item.key,
      status: 'failed',
      stage: 'validation',
      errors: [item.error],
      timestamp: new Date().toISOString(),
    });
    console.error(`[validation] ${item.key}: ${item.error}`);
  }

  const continueOnError = normalizeBool(args['continue-on-error'], true);
  if (validationFailures.length) process.exitCode = 1;
  if (validationFailures.length && !continueOnError) {
    throw new Error('validation failed and continue-on-error is false');
  }
  const validAssets = candidates;

  if (!candidates.length) {
    console.log('[skip] no assets to generate');
    return;
  }

  const runId = args['run-id'] || crypto.randomUUID();
  const dryRun = Boolean(args['dry-run']);
  const timeoutMs = Number.parseInt(args['timeout-ms'] || '', 10) || DEFAULT_TIMEOUT_MS;
  const boundedRetries = parseMaxRetries(args);

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
      styleProfile,
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
      'Debug usage: generate.mjs --key <asset-key> --category <image|audio|video> --prompt "<prompt>" --out <path> [--dry-run]'
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
  const boundedRetries = parseMaxRetries(args);

  console.log(`[${asset.category}] generating "${asset.key}" via ${providerLoad.providerName}${dryRun ? ' (dry run)' : ''}`);

  const result = await generateAsset({
    provider: providerLoad.provider,
    providerName: providerLoad.providerName,
    asset,
    dryRun,
    timeoutMs,
    maxRetries: boundedRetries,
    runId: args['run-id'] || crypto.randomUUID(),
    styleProfile: loadStyleProfile(resolve(process.cwd()), detectEngine(resolve(process.cwd()), args.engine)),
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
  console.log('  node generate.mjs --key <key> --category <image|audio|video> --prompt "..." --out <path> [--dry-run]');
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

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`[error] ${err.message}`);
    process.exit(1);
  });
}

export {
  DEFAULT_MANIFEST,
  detectEngine,
  loadStyleProfile,
  normalizeAssetFromManifest,
  parseAssetsManifest,
  validateManifest,
  validateAsset,
};
