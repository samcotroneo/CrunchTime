#!/usr/bin/env node

// Lead wrapper: routes to the take-the-lead chatmode when the calling
// environment supports chatmodes, or prints a textual lead brief otherwise.

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Chatmode support detection
// ---------------------------------------------------------------------------

/**
 * Returns true when the calling environment is likely chatmode-capable.
 *
 * Heuristics (any one is sufficient):
 *   1. GITHUB_COPILOT_CHATMODE env var is set (GitHub Copilot Chat).
 *   2. VSCODE_PID or CURSOR_SESSION_ID env var is set (VS Code / Cursor).
 *   3. The script is NOT attached to a TTY, meaning it was invoked from an
 *      editor terminal that typically runs agent tooling with chatmode support.
 *
 * If the `.github/chatmodes/take-the-lead.chatmode.md` file does not exist
 * the function always returns false regardless of the above.
 */
function chatmodesSupported(repoRoot) {
  const chatmodePath = join(repoRoot, '.github', 'chatmodes', 'take-the-lead.chatmode.md');
  if (!existsSync(chatmodePath)) return false;

  const env = process.env;
  if (env.GITHUB_COPILOT_CHATMODE) return true;
  if (env.VSCODE_PID || env.CURSOR_SESSION_ID) return true;
  // TERM_PROGRAM is set by VS Code's integrated terminal
  if (env.TERM_PROGRAM === 'vscode') return true;

  return false;
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
  console.log('=== Lead brief (chatmode unavailable — run take-the-lead.chatmode.md for full flow) ===\n');

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

  const chatmodePath = join(repoRoot, '.github', 'chatmodes', 'take-the-lead.chatmode.md');
  if (existsSync(chatmodePath)) {
    console.log(`Tip: open .github/chatmodes/take-the-lead.chatmode.md in your IDE for the full\n` +
                `     interactive Lead flow with chatmode support.`);
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
    console.log('Routes to the take-the-lead chatmode when the environment supports it,');
    console.log('or prints a textual lead brief (in-flight work, blockers, aging questions).');
    return;
  }

  const rootIndex = argv.indexOf('--repo-root');
  const repoRoot = rootIndex !== -1
    ? resolve(argv[rootIndex + 1])
    : resolve(__dirname, '..', '..');

  if (chatmodesSupported(repoRoot)) {
    const chatmodePath = join(repoRoot, '.github', 'chatmodes', 'take-the-lead.chatmode.md');
    console.log('Chatmodes are supported in this environment.');
    console.log(`Open: ${chatmodePath}`);
    console.log('');
    console.log('Or use your IDE\'s chatmode picker and select "Take the Lead".');
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
