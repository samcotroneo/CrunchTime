#!/usr/bin/env node

// Bootstrap for fresh copies of this scaffold. Idempotent: safe to re-run.
//   node tools/setup.mjs            check + install + create missing files
//   node tools/setup.mjs --sync     rewrite mirrors (CLAUDE.md, copilot-instructions) from AGENTS.md
//   node tools/setup.mjs --symlinks replace mirrors with symlinks to AGENTS.md (falls back to --sync)

import { existsSync, readFileSync, writeFileSync, copyFileSync, symlinkSync, rmSync, lstatSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const MIRRORS = {
  'CLAUDE.md': '<!-- Mirrors /AGENTS.md. Keep in sync, or replace with a symlink:\n     ln -sf AGENTS.md CLAUDE.md\n     (node tools/setup.mjs --sync refreshes this copy) -->',
  '.github/copilot-instructions.md': '<!-- Mirrors /AGENTS.md. Keep in sync, or replace with a symlink:\n     ln -sf ../../AGENTS.md .github/copilot-instructions.md\n     (node tools/setup.mjs --sync refreshes this copy) -->',
};

const args = new Set(process.argv.slice(2));
let failures = 0;

function ok(message) { console.log(`  ok    ${message}`); }
function warn(message) { console.log(`  warn  ${message}`); }
function fail(message) { failures += 1; console.log(`  FAIL  ${message}`); }

function stripHeader(content) {
  return content.replace(/^\s*<!--[\s\S]*?-->\s*/, '').trim();
}

function isSymlink(path) {
  try { return lstatSync(path).isSymbolicLink(); } catch { return false; }
}

function checkNode() {
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (major >= 18) ok(`node ${process.versions.node}`);
  else fail(`node ${process.versions.node} — this scaffold requires node >= 18`);
}

function checkMirrors() {
  const agentsPath = join(repoRoot, 'AGENTS.md');
  if (!existsSync(agentsPath)) {
    fail('AGENTS.md missing — mirrors have no source');
    return;
  }
  const agentsBody = readFileSync(agentsPath, 'utf8').trim();

  for (const [mirror, header] of Object.entries(MIRRORS)) {
    const mirrorPath = join(repoRoot, mirror);
    if (args.has('--symlinks')) {
      try {
        if (existsSync(mirrorPath) || isSymlink(mirrorPath)) rmSync(mirrorPath);
        symlinkSync(relative(dirname(mirrorPath), agentsPath), mirrorPath);
        ok(`${mirror} → symlink to AGENTS.md`);
        continue;
      } catch {
        warn(`symlink failed for ${mirror} (Windows?), falling back to copy`);
      }
    }

    if (!existsSync(mirrorPath) || args.has('--sync')) {
      writeFileSync(mirrorPath, `${header}\n\n${agentsBody}\n`);
      ok(`${mirror} written from AGENTS.md`);
      continue;
    }

    if (isSymlink(mirrorPath)) {
      ok(`${mirror} is a symlink`);
    } else if (stripHeader(readFileSync(mirrorPath, 'utf8')) === agentsBody) {
      ok(`${mirror} in sync`);
    } else {
      warn(`${mirror} has drifted from AGENTS.md — run node tools/setup.mjs --sync`);
    }
  }
}

function installTools() {
  const toolsDir = join(repoRoot, 'tools');
  const toolPackages = readdirSync(toolsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(toolsDir, entry.name, 'package.json')));

  for (const tool of toolPackages) {
    const dir = join(toolsDir, tool.name);
    try {
      execFileSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: dir, stdio: 'pipe' });
      ok(`tools/${tool.name} dependencies installed`);
    } catch {
      fail(`npm install failed in tools/${tool.name}`);
    }
  }
}

function checkEnv() {
  const example = join(repoRoot, 'tools', 'asset-gen', '.env.example');
  const env = join(repoRoot, 'tools', 'asset-gen', '.env');
  if (existsSync(env)) {
    ok('tools/asset-gen/.env exists');
  } else if (existsSync(example)) {
    copyFileSync(example, env);
    ok('tools/asset-gen/.env created from .env.example — add your OPENAI_API_KEY');
  } else {
    warn('tools/asset-gen/.env.example missing — create .env manually');
  }
}

console.log('CrunchTime scaffold setup\n');
checkNode();
checkMirrors();
installTools();
checkEnv();

console.log('\nNext steps:');
console.log('  1. node tools/project-init/init-project.mjs   (seed the design docs)');
console.log('  2. Edit tools/asset-gen/.env                  (asset generation keys)');
console.log('  3. Read docs/SQUAD.md                          (how the agent team works)');

if (failures > 0) {
  console.error(`\n${failures} step(s) failed.`);
  process.exit(1);
}
