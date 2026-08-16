#!/usr/bin/env node

// Retro scorecard: parses docs/TASKS.md handoff entries and reports team
// effectiveness metrics defined in docs/EVAL.md. Read-only.

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGING_DAYS = 7;
const VALID_STATUSES = new Set(['changes-requested', 'ready-for-review', 'reviewed', 'ready-for-qa', 'done']);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function parseField(block, label) {
  const pattern = new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.*)$`, 'm');
  const match = block.match(pattern);
  return match ? match[1].trim() : '';
}

function parseEntries(content) {
  const entries = [];
  // Entry headings look like: ### 2026-08-16 — Lead — project init
  const headingPattern = /^### (\d{4}-\d{2}-\d{2}) — ([^—]+) — (.+)$/gm;
  const headings = [...content.matchAll(headingPattern)];

  for (let index = 0; index < headings.length; index += 1) {
    const [, date, agent, area] = headings[index];
    const bodyStart = headings[index].index;
    const bodyEnd = index + 1 < headings.length ? headings[index + 1].index : content.length;
    const block = content.slice(bodyStart, bodyEnd);

    const status = parseField(block, 'Status');
    const scopeValue = parseField(block, 'Scope changed').toLowerCase();
    entries.push({
      date,
      agent: agent.trim(),
      area: area.trim(),
      status: VALID_STATUSES.has(status) ? status : 'unknown',
      reviewCycles: Number.parseInt(parseField(block, 'Review cycles'), 10),
      scopeChanged: scopeValue === '' ? null : scopeValue === 'yes',
      openQuestions: parseField(block, 'Open questions'),
    });
  }

  return entries;
}

function isoWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const day = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - day + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const firstDay = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((date - firstThursday) / (7 * 24 * 60 * 60 * 1000));
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function daysSince(dateString, today) {
  return Math.floor((today - new Date(`${dateString}T00:00:00Z`)) / (24 * 60 * 60 * 1000));
}

function hasOpenQuestions(entry) {
  const value = entry.openQuestions.trim().toLowerCase();
  return value !== '' && value !== 'none';
}

function buildScorecard(entries, since, today) {
  const scoped = since ? entries.filter((entry) => entry.date >= since) : entries;

  const statusCounts = {};
  for (const entry of scoped) {
    statusCounts[entry.status] = (statusCounts[entry.status] ?? 0) + 1;
  }

  const rework = statusCounts['changes-requested'] ?? 0;
  const reworkRate = scoped.length ? rework / scoped.length : 0;

  const withCycles = scoped.filter((entry) => Number.isInteger(entry.reviewCycles));
  const avgReviewCycles = withCycles.length
    ? withCycles.reduce((sum, entry) => sum + entry.reviewCycles, 0) / withCycles.length
    : null;

  const perAgent = {};
  for (const entry of scoped) {
    perAgent[entry.agent] ??= { total: 0, changesRequested: 0 };
    perAgent[entry.agent].total += 1;
    if (entry.status === 'changes-requested') perAgent[entry.agent].changesRequested += 1;
  }

  // Entries predating the format extension have no Scope changed field;
  // scope drift only counts entries where the field is present.
  const withScopeField = scoped.filter((entry) => entry.scopeChanged !== null);

  const openQuestions = scoped
    .filter(hasOpenQuestions)
    .map((entry) => ({ ...entry, ageDays: daysSince(entry.date, today) }))
    .sort((a, b) => b.ageDays - a.ageDays);

  const throughput = {};
  for (const entry of scoped) {
    if (entry.status !== 'done') continue;
    const week = isoWeek(entry.date);
    throughput[week] = (throughput[week] ?? 0) + 1;
  }

  return {
    period: { since: since ?? 'all time', generated: today.toISOString().slice(0, 10) },
    totalEntries: scoped.length,
    statusCounts,
    reworkRate,
    avgReviewCycles,
    scopeDrift: withScopeField.length
      ? withScopeField.filter((entry) => entry.scopeChanged).length / withScopeField.length
      : null,
    perAgent: Object.fromEntries(
      Object.entries(perAgent).map(([agent, counts]) => [
        agent,
        { ...counts, reworkRate: counts.total ? counts.changesRequested / counts.total : 0 },
      ])
    ),
    openQuestions,
    agingOpenQuestions: openQuestions.filter((entry) => entry.ageDays > AGING_DAYS).length,
    throughput,
  };
}

function percent(value) {
  return value === null ? 'n/a' : `${Math.round(value * 100)}%`;
}

function printScorecard(scorecard) {
  console.log(`Retro scorecard (${scorecard.period.since} → ${scorecard.period.generated})`);
  console.log(`- Entries: ${scorecard.totalEntries}`);
  const statusLine = Object.entries(scorecard.statusCounts)
    .map(([status, count]) => `${status}: ${count}`)
    .join(', ');
  console.log(`- Statuses: ${statusLine || 'none'}`);
  console.log(`- Rework rate: ${percent(scorecard.reworkRate)} (target < 25%)`);
  console.log(`- Avg review cycles: ${scorecard.avgReviewCycles === null ? 'n/a' : scorecard.avgReviewCycles.toFixed(1)} (target ≤ 1)`);
  console.log(`- Scope drift: ${percent(scorecard.scopeDrift)} (target < 20%)`);
  console.log(`- Open questions: ${scorecard.openQuestions.length} open, ${scorecard.agingOpenQuestions} aging (>${AGING_DAYS}d)`);

  const agents = Object.entries(scorecard.perAgent);
  if (agents.length) {
    console.log('\nPer agent:');
    for (const [agent, counts] of agents) {
      console.log(`- ${agent}: ${counts.total} entries, rework ${percent(counts.reworkRate)}`);
    }
  }

  const weeks = Object.entries(scorecard.throughput).sort();
  if (weeks.length) {
    console.log('\nThroughput (done/week):');
    for (const [week, count] of weeks) {
      console.log(`- ${week}: ${count}`);
    }
  }

  if (scorecard.openQuestions.length) {
    console.log('\nOpen questions:');
    for (const entry of scorecard.openQuestions) {
      console.log(`- [${entry.ageDays}d] ${entry.date} ${entry.agent} (${entry.area}): ${entry.openQuestions}`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node retro.mjs [--repo-root <path>] [--since YYYY-MM-DD] [--json]');
    console.log('Reads docs/TASKS.md and prints the docs/EVAL.md scorecard. Read-only.');
    return;
  }

  const repoRoot = args['repo-root'] ? resolve(args['repo-root']) : resolve(__dirname, '..', '..');
  const tasksPath = join(repoRoot, 'docs', 'TASKS.md');
  if (!existsSync(tasksPath)) {
    throw new Error(`Missing required file: ${tasksPath}`);
  }

  const since = typeof args.since === 'string' ? args.since : null;
  if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    throw new Error('--since must be YYYY-MM-DD');
  }

  const entries = parseEntries(readFileSync(tasksPath, 'utf8'));
  const scorecard = buildScorecard(entries, since, new Date());

  if (args.json) {
    console.log(JSON.stringify(scorecard, null, 2));
    return;
  }

  printScorecard(scorecard);
}

try {
  main();
} catch (error) {
  console.error(`[error] ${error.message}`);
  process.exit(1);
}
