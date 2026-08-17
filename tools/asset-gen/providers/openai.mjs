// Art provider backed by OpenAI image APIs.
// Selected when ART_PROVIDER=openai in tools/asset-gen/.env.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname } from 'node:path';

const OPENAI_API_URL = 'https://api.openai.com/v1';

function resolveSize(output) {
  const width = output?.width;
  const height = output?.height;

  if (!width || !height) return '1024x1024';

  const candidate = `${width}x${height}`;
  const supported = new Set(['1024x1024', '1536x1024', '1024x1536']);
  return supported.has(candidate) ? candidate : '1024x1024';
}

function ensureApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Add it to tools/asset-gen/.env (see .env.example).');
  }
  return apiKey;
}

async function postJson({ path, body, apiKey }) {
  const response = await fetch(`${OPENAI_API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: ['Bearer', apiKey].join(' '),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

async function postMultipart({ path, formData, apiKey }) {
  const response = await fetch(`${OPENAI_API_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: ['Bearer', apiKey].join(' '),
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

function decodeAndWrite({ b64, outputPath }) {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, Buffer.from(b64, 'base64'));
}

function guessMimeType(path) {
  const ext = extname(path).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.png':
    default:
      return 'image/png';
  }
}

function toBlob(path) {
  const bytes = readFileSync(path);
  return new Blob([bytes], { type: guessMimeType(path) });
}

export async function generate({ prompt, outputPath, dryRun, output, referenceImages }) {
  if (dryRun) {
    console.log(`[dry-run] prompt: "${prompt}"`);
    if (referenceImages?.length) {
      console.log(`[dry-run] references: ${referenceImages.join(', ')}`);
    }
    return {
      dryRun: true,
      cost: null,
      model: 'gpt-image-1',
      params: {
        size: resolveSize(output),
        references: referenceImages ?? [],
      },
      outputFormat: output?.format || 'png',
      outputPath,
      warnings: [],
    };
  }

  const apiKey = ensureApiKey();
  const size = resolveSize(output);
  const references = Array.isArray(referenceImages) ? referenceImages : [];
  const warnings = [];

  let data;
  if (references.length > 0) {
    if (references.length > 1) {
      warnings.push('OpenAI edits path currently guarantees only first reference image usage.');
    }

    const formData = new FormData();
    formData.append('model', 'gpt-image-1');
    formData.append('prompt', prompt);
    formData.append('size', size);
    formData.append('n', '1');

    const primaryRef = references[0];
    formData.append('image', toBlob(primaryRef), basename(primaryRef));

    data = await postMultipart({
      path: '/images/edits',
      formData,
      apiKey,
    });
  } else {
    data = await postJson({
      path: '/images/generations',
      body: {
        model: 'gpt-image-1',
        prompt,
        size,
        n: 1,
      },
      apiKey,
    });
  }

  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image data returned from OpenAI API.');

  decodeAndWrite({ b64, outputPath });

  return {
    dryRun: false,
    cost: 'see OpenAI usage dashboard',
    model: 'gpt-image-1',
    params: {
      size,
      endpoint: references.length ? '/images/edits' : '/images/generations',
      referencesUsed: references.length ? [references[0]] : [],
    },
    outputFormat: output?.format || 'png',
    outputPath,
    warnings,
  };
}
