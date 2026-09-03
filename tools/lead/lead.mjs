#!/usr/bin/env node

// Lead wrapper: points to the Take the Lead custom agent when its profile is
// available, or prints a textual lead brief otherwise.

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Custom-agent profile detection
// ---------------------------------------------------------------------------

/**
 * Returns true when the repository contains the Take the Lead custom-agent
 * profile. The interactive host determines whether the profile can be
 * selected; the CLI companion must not guess that from environment variables.
 */
function customAgentAvailable(repoRoot) {
  return existsSync(join(repoRoot, '.github', 'agents', 'take-the-lead.agent.md'));
}

// ---------------------------------------------------------------------------
// Fallback textual brief
// ---------------------------------------------------------------------------

const VALID_STATUSES = new Set(['changes-requested', 'ready-for-review', 'reviewed', 'ready-for-qa', 'done']);

function parseField(block, label) {
  const pattern = new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.*)$`, 'm');
  const match = block.match(pattern);
  return match ? match[1].trim() : '';
}

function parseEntries(content) {
  const entries = [];
  const headingPattern = /^### (\d{4}-\d{2}-\d{2}) — ([^—]+) — (.+)$/gm;
  const headings = [...content.matchAll(headingPattern)];

  for (let index = 0; index < headings.length; index += 1) {
    const [, date, agent, area] = headings[index];
    const bodyStart = headings[index].index;
    const bodyEnd = index + 1 < headings.length ? headings[index + 1].index : content.length;
    const block = content.slice(bodyStart, bodyEnd);

    const status = parseField(block, 'Status');
    const openQuestions = parseField(block, 'Open questions');
    entries.push({
      date,
      agent: agent.trim(),
      area: area.trim(),
      status: VALID_STATUSES.has(status) ? status : 'unknown',
      openQuestions,
    });
  }

  return entries;
}

function parseBugs(content) {
  const bugs = [];
  // Matches: | BUG-NNN | … | severity | status | … |
  const rowPattern = /^\|\s*(BUG-\d+)\s*\|[^|]+\|\s*(\w+)\s*\|\s*(\w[\w-]*)\s*\|/gm;
  for (const match of content.matchAll(rowPattern)) {
    bugs.push({ id: match[1], severity: match[2].toLowerCase(), status: match[3].toLowerCase() });
  }
  return bugs;
}

function printBrief(repoRoot) {
  const tasksPath = join(repoRoot, 'docs', 'TASKS.md');
  const bugsPath = join(repoRoot, 'docs', 'BUGS.md');

  if (!existsSync(tasksPath)) {
    console.error(`[error] Missing required file: ${tasksPath}`);
    process.exit(1);
  }

  const entries = parseEntries(readFileSync(tasksPath, 'utf8'));

  // --- Blockers from BUGS.md ---
  const blockers = [];
  if (existsSync(bugsPath)) {
    const bugs = parseBugs(readFileSync(bugsPath, 'utf8'));
    for (const bug of bugs) {
      if ((bug.severity === 'blocker' || bug.severity === 'major') &&
          bug.status !== 'verified' && bug.status !== 'fixed') {
        blockers.push(bug);
      }
    }
  }

  // --- In-flight work (not done) ---
  const GATE_ORDER = ['changes-requested', 'ready-for-review', 'reviewed', 'ready-for-qa', 'unknown'];
  const inFlight = entries.filter((e) => e.status !== 'done').slice(0, 5);

  // --- Aging open questions ---
  const NOW = Date.now();
  const AGING_MS = 7 * 24 * 60 * 60 * 1000;
  const agingQs = entries.filter((e) => {
    const q = e.openQuestions.toLowerCase().trim();
    return q && q !== 'none' && (NOW - new Date(`${e.date}T00:00:00Z`)) > AGING_MS;
  }).slice(0, 5);

  // --- Print ---
  console.log('=== Lead brief (interactive custom agent unavailable) ===\n');

  if (blockers.length) {
    console.log('Blockers / major open bugs:');
    for (const bug of blockers) {
      console.log(`  ${bug.id}  severity=${bug.severity}  status=${bug.status}`);
    }
    console.log('');
  } else {
    console.log('No blocker or major open bugs.\n');
  }

  if (inFlight.length) {
    console.log('In-flight work (latest first):');
    for (const e of inFlight) {
      console.log(`  [${e.status}]  ${e.date}  ${e.agent} — ${e.area}`);
    }
    console.log('');
  }

  if (agingQs.length) {
    console.log('Aging open questions (>7d):');
    for (const e of agingQs) {
      const age = Math.floor((NOW - new Date(`${e.date}T00:00:00Z`)) / (24 * 60 * 60 * 1000));
      console.log(`  [${age}d]  ${e.agent} (${e.area}): ${e.openQuestions}`);
    }
    console.log('');
  }

  const agentPath = join(repoRoot, '.github', 'agents', 'take-the-lead.agent.md');
  if (existsSync(agentPath)) {
    console.log(`Tip: enter /agent and select "Take the Lead" in Copilot CLI, or\n` +
                `     run copilot --agent take-the-lead --prompt "Assess the milestone."`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage: node tools/lead/lead.mjs [--repo-root <path>]');
    console.log('');
    console.log('Points to the Take the Lead custom agent when its profile exists,');
    console.log('or prints a textual lead brief (in-flight work, blockers, aging questions).');
    return;
  }

  const rootIndex = argv.indexOf('--repo-root');
  const repoRoot = rootIndex !== -1
    ? resolve(argv[rootIndex + 1])
    : resolve(__dirname, '..', '..');

  if (customAgentAvailable(repoRoot)) {
    console.log('Take the Lead custom-agent profile found.');
    console.log('Enter /agent and select "Take the Lead", or run');
    console.log('copilot --agent take-the-lead --prompt "Assess the milestone."');
  } else {
    printBrief(repoRoot);
  }
}

try {
  main();
} catch (error) {
  console.error(`[error] ${error.message}`);
  process.exit(1);
}
