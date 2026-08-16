#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline/promises';

const UNANSWERED = 'TBD';
const NONE = 'none';
const GDD_OUT_OF_SCOPE_END = '<!-- project-init:end:out-of-scope -->';
const ASSET_SECTION_END = '---\nAdd new entries above this line.';
const GDD_PLACEHOLDERS = new Set([
  '(deadline, team size, must-reuse assets, etc.)',
  '(optional)',
]);
const DEFAULT_ENGINE = 'phaser';
const ENGINE_MARKER_PATTERN = /<!--\s*engine:\s*([a-z0-9-]+)\s*-->/i;

function isArchitecturePlaceholder(value) {
  return `${value ?? ''}`.trim().endsWith('once decided.');
}

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function readText(path) {
  return readFileSync(path, 'utf8');
}

function writeText(path, content) {
  writeFileSync(path, content.replace(/\r\n/g, '\n'));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cleanValue(value, fallback = UNANSWERED) {
  const normalized = `${value ?? ''}`.trim();
  return normalized || fallback;
}

function cleanOptional(value) {
  const normalized = `${value ?? ''}`.trim();
  return normalized || NONE;
}

function stripTemplateValue(value, placeholders = new Set()) {
  const normalized = `${value ?? ''}`.trim();
  return placeholders.has(normalized) ? '' : normalized;
}

function parseBulletValue(content, label) {
  const pattern = new RegExp(`^- \\*\\*${escapeRegExp(label)}:\\*\\*(.*)$`, 'm');
  const match = content.match(pattern);
  return match ? match[1].trim() : '';
}

function getSection(content, startHeading, endHeading) {
  const start = content.indexOf(startHeading);
  if (start === -1) {
    throw new Error(`Missing heading: ${startHeading}`);
  }

  const sectionStart = start + startHeading.length;
  const end = endHeading ? content.indexOf(endHeading, sectionStart) : content.length;
  if (endHeading && end === -1) {
    throw new Error(`Missing heading: ${endHeading}`);
  }

  return content.slice(sectionStart, end).trim();
}

function replaceSection(content, startHeading, endHeading, newBody) {
  const start = content.indexOf(startHeading);
  if (start === -1) {
    throw new Error(`Missing heading: ${startHeading}`);
  }

  const sectionStart = start + startHeading.length;
  const end = endHeading ? content.indexOf(endHeading, sectionStart) : content.length;
  if (endHeading && end === -1) {
    throw new Error(`Missing heading: ${endHeading}`);
  }

  const prefix = content.slice(0, sectionStart);
  const suffix = endHeading ? content.slice(end) : '';
  return `${prefix}\n\n${newBody.trimEnd()}\n\n${suffix.replace(/^\n+/, '')}`;
}

function parseNamedBlocks(section) {
  const lines = section.split('\n');
  const blocks = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (current) blocks.push(current);
      current = { title: line.slice(4).trim(), lines: [] };
      continue;
    }

    if (current) current.lines.push(line);
  }

  if (current) blocks.push(current);
  return blocks;
}

function isTemplateMechanic(title) {
  return title === '[Mechanic name]';
}

function isTemplateLevel(title) {
  return title === '[name]';
}

function isTemplateAsset(asset) {
  return (
    asset.key === 'player-idle' ||
    asset.key === 'bg-music-main'
  );
}

function parseGdd(content) {
  const mechanicsSection = getSection(content, '## Mechanics', '## Levels / Content');
  const levelsSection = getSection(content, '## Levels / Content', '## Progression & balancing');
  const outOfScope = getSection(content, '## Out of scope', GDD_OUT_OF_SCOPE_END)
    .replace(/^List things explicitly \*not\* being built, so agents don\'t scope-creep\.\s*/m, '')
    .trim();

  return {
    overview: {
      title: parseBulletValue(content, 'Title'),
      elevatorPitch: parseBulletValue(content, 'Elevator pitch (one sentence)'),
      genre: parseBulletValue(content, 'Genre'),
      coreLoop: parseBulletValue(content, 'Core loop (one sentence)'),
      platformInput: parseBulletValue(content, 'Platform / input'),
      visualStyle: parseBulletValue(content, 'Visual style'),
      targetAudience: parseBulletValue(content, 'Target audience'),
      toneMood: parseBulletValue(content, 'Tone / mood'),
      targetSessionLength: parseBulletValue(content, 'Target session length'),
      scopeConstraints: stripTemplateValue(parseBulletValue(content, 'Scope & constraints'), GDD_PLACEHOLDERS),
      inspirations: stripTemplateValue(parseBulletValue(content, 'Inspirations / reference games'), GDD_PLACEHOLDERS),
    },
    mechanics: parseNamedBlocks(mechanicsSection)
      .map((block) => ({
        name: block.title,
        status: parseBulletValue(block.lines.join('\n'), 'Status'),
        description: parseBulletValue(block.lines.join('\n'), 'Description'),
        playerInput: parseBulletValue(block.lines.join('\n'), 'Player input'),
        winFailCondition: parseBulletValue(block.lines.join('\n'), 'Win/fail condition'),
        openQuestions: parseBulletValue(block.lines.join('\n'), 'Open questions'),
      }))
      .filter((mechanic) => !isTemplateMechanic(mechanic.name)),
    levels: parseNamedBlocks(levelsSection)
      .map((block) => ({
        name: block.title.replace(/^Level \d+ — /, ''),
        status: parseBulletValue(block.lines.join('\n'), 'Status'),
        goal: parseBulletValue(block.lines.join('\n'), 'Goal'),
        layoutNotes: parseBulletValue(block.lines.join('\n'), 'Layout notes'),
        newMechanicsIntroduced: parseBulletValue(block.lines.join('\n'), 'New mechanics introduced'),
      }))
      .filter((level) => !isTemplateLevel(level.name)),
    progression: {
      difficultyCurve: parseBulletValue(content, 'Difficulty curve'),
      economyScoring: parseBulletValue(content, 'Economy / scoring (if any)'),
    },
    outOfScope,
  };
}

function parseArchitecture(content) {
  return {
    engine: detectEngine(content),
    sceneFlow: stripArchitecturePlaceholder(
      getSection(content, '## Scene flow', '## State management').trim()
    ),
    stateManagement: stripArchitecturePlaceholder(
      getSection(content, '## State management', '## Asset pipeline').trim()
    ),
  };
}

function detectEngine(content) {
  const match = `${content ?? ''}`.match(ENGINE_MARKER_PATTERN);
  return match ? match[1].toLowerCase() : '';
}

function stripArchitecturePlaceholder(value) {
  const normalized = `${value ?? ''}`.trim();
  return isArchitecturePlaceholder(normalized) ? '' : normalized;
}

function listEngines(enginesRoot) {
  if (!existsSync(enginesRoot)) return [];
  return readdirSync(enginesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(enginesRoot, entry.name, 'pack.json')))
    .map((entry) => {
      try {
        const pack = JSON.parse(readText(join(enginesRoot, entry.name, 'pack.json')));
        return { name: entry.name, label: asString(pack.label, entry.name) };
      } catch {
        return { name: entry.name, label: entry.name };
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function resolveEngine(engineName, engines, enginesRoot) {
  const name = `${engineName ?? ''}`.trim().toLowerCase() || DEFAULT_ENGINE;
  if (!engines.some((engine) => engine.name === name)) {
    const available = engines.map((engine) => engine.name).join(', ') || 'none';
    throw new Error(`Unknown engine "${name}". Available packs in engines/: ${available}`);
  }
  return { name, templatePath: join(enginesRoot, name, 'ARCHITECTURE.md') };
}

function parseAssets(content) {
  const assetsSection = getSection(content, '## Assets', ASSET_SECTION_END);
  return parseNamedBlocks(assetsSection)
    .map((block) => {
      const blockText = block.lines.join('\n');
      return {
        key: block.title,
        category: parseBulletValue(blockText, 'category'),
        type: parseBulletValue(blockText, 'type'),
        status: parseBulletValue(blockText, 'status'),
        source: parseBulletValue(blockText, 'source'),
        generation: parseBulletValue(blockText, 'generation'),
      };
    })
    .filter((asset) => !isTemplateAsset(asset));
}

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function asRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asObjectArray(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object' && !Array.isArray(item)) : [];
}

async function ask(rl, label, currentValue, options = {}) {
  const { fallback = UNANSWERED } = options;
  const current = `${currentValue ?? ''}`.trim();
  const promptSuffix = current ? ` [${current}]` : '';
  const answer = (await rl.question(`${label}${promptSuffix}: `)).trim();
  if (!answer) return current || fallback;
  return answer;
}

async function askCount(rl, label, currentCount) {
  for (;;) {
    const raw = (await rl.question(`${label} [${currentCount}]: `)).trim();
    if (!raw) return currentCount;

    const count = Number.parseInt(raw, 10);
    if (Number.isInteger(count) && count >= 0) {
      return count;
    }

    console.log('Enter a whole number 0 or greater.');
  }
}

async function collectRepeatedEntries(rl, label, existingEntries, defaultsFactory, questionFactory) {
  const count = await askCount(rl, `How many ${label}?`, existingEntries.length);
  const entries = [];

  for (let index = 0; index < count; index += 1) {
    const current = existingEntries[index] ?? defaultsFactory(index);
    console.log(`\n${label.slice(0, 1).toUpperCase()}${label.slice(1)} ${index + 1}`);
    const questions = questionFactory(current, index);
    const entry = {};

    for (const question of questions) {
      entry[question.key] = await ask(rl, question.label, current[question.key], question.options);
    }

    entries.push(entry);
  }

  return entries;
}

function summarizeList(items, formatter) {
  if (!items.length) return 'none';
  return items.map(formatter).join(', ');
}

function collectOpenQuestionsSummary(answers) {
  const openQuestions = [];

  for (const mechanic of answers.mechanics) {
    const value = cleanOptional(mechanic.openQuestions);
    if (value !== NONE) {
      openQuestions.push(`${mechanic.name}: ${value}`);
    }
  }

  if (cleanOptional(answers.projectOpenQuestions) !== NONE) {
    openQuestions.push(answers.projectOpenQuestions.trim());
  }

  return openQuestions.length ? openQuestions.join('; ') : NONE;
}

function buildGddOverview(overview) {
  return [
    '- **Title:** ' + cleanValue(overview.title),
    '- **Elevator pitch (one sentence):** ' + cleanValue(overview.elevatorPitch),
    '- **Genre:** ' + cleanValue(overview.genre),
    '- **Core loop (one sentence):** ' + cleanValue(overview.coreLoop),
    '- **Platform / input:** ' + cleanValue(overview.platformInput),
    '- **Visual style:** ' + cleanValue(overview.visualStyle),
    '- **Target audience:** ' + cleanValue(overview.targetAudience),
    '- **Tone / mood:** ' + cleanValue(overview.toneMood),
    '- **Target session length:** ' + cleanValue(overview.targetSessionLength),
    '- **Scope & constraints:** ' + cleanValue(overview.scopeConstraints),
    '- **Inspirations / reference games:** ' + cleanOptional(overview.inspirations),
  ].join('\n');
}

function buildMechanicsSection(mechanics) {
  if (!mechanics.length) {
    return [
      '### TBD mechanic',
      '- **Status:** draft',
      '- **Description:** TBD',
      '- **Player input:** TBD',
      '- **Win/fail condition:** TBD',
      '- **Open questions:** none',
    ].join('\n');
  }

  return mechanics
    .map((mechanic) =>
      [
        `### ${cleanValue(mechanic.name, 'TBD mechanic')}`,
        `- **Status:** ${cleanValue(mechanic.status, 'draft')}`,
        `- **Description:** ${cleanValue(mechanic.description)}`,
        `- **Player input:** ${cleanValue(mechanic.playerInput)}`,
        `- **Win/fail condition:** ${cleanValue(mechanic.winFailCondition)}`,
        `- **Open questions:** ${cleanOptional(mechanic.openQuestions)}`,
      ].join('\n')
    )
    .join('\n\n');
}

function buildLevelsSection(levels) {
  if (!levels.length) {
    return [
      '### Level 1 — TBD',
      '- **Status:** draft',
      '- **Goal:** TBD',
      '- **Layout notes:** TBD',
      '- **New mechanics introduced:** none',
    ].join('\n');
  }

  return levels
    .map((level, index) =>
      [
        `### Level ${index + 1} — ${cleanValue(level.name, 'TBD')}`,
        `- **Status:** ${cleanValue(level.status, 'draft')}`,
        `- **Goal:** ${cleanValue(level.goal)}`,
        `- **Layout notes:** ${cleanValue(level.layoutNotes)}`,
        `- **New mechanics introduced:** ${cleanOptional(level.newMechanicsIntroduced)}`,
      ].join('\n')
    )
    .join('\n\n');
}

function buildProgressionSection(progression) {
  return [
    `- **Difficulty curve:** ${cleanValue(progression.difficultyCurve)}`,
    `- **Economy / scoring (if any):** ${cleanOptional(progression.economyScoring)}`,
  ].join('\n');
}

function buildOutOfScopeSection(outOfScope) {
  return cleanValue(outOfScope);
}

function buildArchitectureSection(value) {
  return cleanValue(value);
}

function buildAssetsSection(assets) {
  if (!assets.length) {
    return '_No starter assets defined yet._';
  }

  return assets
    .map((asset) => {
      const lines = [
        `### ${cleanValue(asset.key, 'tbd-asset')}`,
        `- category: ${cleanValue(asset.category)}`,
        `- type: ${cleanValue(asset.type)}`,
        `- status: ${cleanValue(asset.status)}`,
        `- source: ${cleanValue(asset.source)}`,
      ];

      const generation = cleanOptional(asset.generation);
      if (generation !== NONE) {
        lines.push(`- generation: ${generation}`);
      }

      return lines.join('\n');
    })
    .join('\n\n');
}

function appendTaskEntry(content, answers, agentName) {
  const entry = [
    `### ${getTodayDateString()} — ${cleanValue(agentName, 'Project Init')} — project init`,
    `**Did:** Ran the project init questionnaire and updated \`docs/GDD.md\`, \`docs/ARCHITECTURE.md\`, and \`docs/ASSETS.md\` for "${cleanValue(answers.overview.title)}" (engine: ${cleanValue(answers.engine)}).`,
    '**Why:** Establish a usable project brief and seed the design docs before implementation starts.',
    '**Status:** done',
    '**Review cycles:** 0',
    '**Scope changed:** no',
    `**Open questions:** ${collectOpenQuestionsSummary(answers)}`,
    '',
  ].join('\n');

  const formatHeading = '## Format';
  const formatIndex = content.indexOf(formatHeading);
  if (formatIndex === -1) {
    throw new Error('Could not find TASKS format heading.');
  }

  const divider = '\n---\n\n';
  const dividerIndex = content.indexOf(divider, formatIndex);
  if (dividerIndex === -1) {
    throw new Error('Could not find TASKS divider.');
  }

  return `${content.slice(0, dividerIndex + divider.length)}${entry}${content.slice(dividerIndex + divider.length)}`;
}

function printSummary(answers) {
  console.log('\nSummary');
  console.log(`- Engine: ${cleanValue(answers.engine)}`);
  console.log(`- Title: ${cleanValue(answers.overview.title)}`);
  console.log(`- Genre: ${cleanValue(answers.overview.genre)}`);
  console.log(`- Mechanics: ${summarizeList(answers.mechanics, (item) => cleanValue(item.name, 'TBD mechanic'))}`);
  console.log(`- Levels: ${summarizeList(answers.levels, (item) => cleanValue(item.name, 'TBD'))}`);
  console.log(`- Assets: ${summarizeList(answers.assets, (item) => cleanValue(item.key, 'tbd-asset'))}`);
  console.log(`- Open questions: ${collectOpenQuestionsSummary(answers)}`);
}

async function collectInteractiveAnswers(existing, engines) {
  const rl = readline.createInterface({ input, output });

  try {
    console.log('Stage 1 — project basics');
    const overview = {
      title: await ask(rl, 'Title', existing.gdd.overview.title),
      elevatorPitch: await ask(rl, 'Elevator pitch', existing.gdd.overview.elevatorPitch),
      genre: await ask(rl, 'Genre', existing.gdd.overview.genre),
      coreLoop: await ask(rl, 'Core loop', existing.gdd.overview.coreLoop),
      platformInput: await ask(rl, 'Platform / input', existing.gdd.overview.platformInput),
      visualStyle: await ask(rl, 'Visual style', existing.gdd.overview.visualStyle),
      targetAudience: await ask(rl, 'Target audience', existing.gdd.overview.targetAudience),
      toneMood: await ask(rl, 'Tone / mood', existing.gdd.overview.toneMood),
      targetSessionLength: await ask(rl, 'Target session length', existing.gdd.overview.targetSessionLength),
      scopeConstraints: await ask(rl, 'Scope & constraints', existing.gdd.overview.scopeConstraints),
      inspirations: await ask(rl, 'Inspirations / reference games', existing.gdd.overview.inspirations, { fallback: NONE }),
    };

    console.log('\nStage 2 — gameplay and progression');
    const mechanics = await collectRepeatedEntries(
      rl,
      'mechanics',
      existing.gdd.mechanics,
      () => ({
        name: '',
        status: 'draft',
        description: '',
        playerInput: '',
        winFailCondition: '',
        openQuestions: NONE,
      }),
      () => [
        { key: 'name', label: 'Mechanic name' },
        { key: 'status', label: 'Status', options: { fallback: 'draft' } },
        { key: 'description', label: 'Description' },
        { key: 'playerInput', label: 'Player input' },
        { key: 'winFailCondition', label: 'Win/fail condition' },
        { key: 'openQuestions', label: 'Open questions', options: { fallback: NONE } },
      ]
    );

    const levels = await collectRepeatedEntries(
      rl,
      'levels',
      existing.gdd.levels,
      () => ({
        name: '',
        status: 'draft',
        goal: '',
        layoutNotes: '',
        newMechanicsIntroduced: NONE,
      }),
      () => [
        { key: 'name', label: 'Level name' },
        { key: 'status', label: 'Status', options: { fallback: 'draft' } },
        { key: 'goal', label: 'Goal' },
        { key: 'layoutNotes', label: 'Layout notes' },
        { key: 'newMechanicsIntroduced', label: 'New mechanics introduced', options: { fallback: NONE } },
      ]
    );

    const progression = {
      difficultyCurve: await ask(rl, 'Difficulty curve', existing.gdd.progression.difficultyCurve),
      economyScoring: await ask(rl, 'Economy / scoring', existing.gdd.progression.economyScoring, { fallback: NONE }),
    };

    const outOfScope = await ask(rl, 'Out-of-scope items', existing.gdd.outOfScope, { fallback: UNANSWERED });
    const projectOpenQuestions = await ask(rl, 'Project-wide open questions', '', { fallback: NONE });

    console.log('\nStage 3 — technical structure');
    const engineOptions = engines.map((engine) => `${engine.name} (${engine.label})`).join(', ');
    const engine = await ask(
      rl,
      `Engine — one of: ${engineOptions}`,
      existing.architecture.engine || DEFAULT_ENGINE
    );
    const architecture = {
      sceneFlow: await ask(rl, 'Scene flow', existing.architecture.sceneFlow),
      stateManagement: await ask(rl, 'State management / persistence', existing.architecture.stateManagement),
    };

    console.log('\nStage 4 — starter assets');
    const assets = await collectRepeatedEntries(
      rl,
      'assets',
      existing.assets,
      () => ({
        key: '',
        category: '',
        type: '',
        status: 'placeholder',
        source: '',
        generation: NONE,
      }),
      () => [
        { key: 'key', label: 'Asset key' },
        { key: 'category', label: 'Category' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status', options: { fallback: 'placeholder' } },
        { key: 'source', label: 'Source' },
        { key: 'generation', label: 'Generation prompt', options: { fallback: NONE } },
      ]
    );

    const answers = {
      overview,
      mechanics,
      levels,
      progression,
      outOfScope,
      projectOpenQuestions,
      engine,
      architecture,
      assets,
    };

    console.log('\nStage 5 — confirmation');
    printSummary(answers);
    const confirm = (await rl.question('\nWrite these answers into the docs? [y/N]: ')).trim().toLowerCase();
    if (!['y', 'yes'].includes(confirm)) {
      console.log('\nCancelled without writing files.');
      return null;
    }

    return answers;
  } finally {
    rl.close();
  }
}

function normalizeAnswersFromFile(raw) {
  const data = asRecord(raw);
  const overview = asRecord(data.overview);
  const progression = asRecord(data.progression);
  const architecture = asRecord(data.architecture);

  return {
    overview: {
      title: asString(overview.title),
      elevatorPitch: asString(overview.elevatorPitch),
      genre: asString(overview.genre),
      coreLoop: asString(overview.coreLoop),
      platformInput: asString(overview.platformInput),
      visualStyle: asString(overview.visualStyle),
      targetAudience: asString(overview.targetAudience),
      toneMood: asString(overview.toneMood),
      targetSessionLength: asString(overview.targetSessionLength),
      scopeConstraints: asString(overview.scopeConstraints),
      inspirations: asString(overview.inspirations, NONE),
    },
    mechanics: asObjectArray(data.mechanics).map((entry) => ({
      name: asString(entry.name),
      status: asString(entry.status, 'draft'),
      description: asString(entry.description),
      playerInput: asString(entry.playerInput),
      winFailCondition: asString(entry.winFailCondition),
      openQuestions: asString(entry.openQuestions, NONE),
    })),
    levels: asObjectArray(data.levels).map((entry) => ({
      name: asString(entry.name),
      status: asString(entry.status, 'draft'),
      goal: asString(entry.goal),
      layoutNotes: asString(entry.layoutNotes),
      newMechanicsIntroduced: asString(entry.newMechanicsIntroduced, NONE),
    })),
    progression: {
      difficultyCurve: asString(progression.difficultyCurve),
      economyScoring: asString(progression.economyScoring, NONE),
    },
    outOfScope: asString(data.outOfScope),
    projectOpenQuestions: asString(data.projectOpenQuestions, NONE),
    engine: asString(data.engine),
    architecture: {
      sceneFlow: asString(architecture.sceneFlow),
      stateManagement: asString(architecture.stateManagement),
    },
    assets: asObjectArray(data.assets).map((entry) => ({
      key: asString(entry.key),
      category: asString(entry.category),
      type: asString(entry.type),
      status: asString(entry.status, 'placeholder'),
      source: asString(entry.source),
      generation: asString(entry.generation, NONE),
    })),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node init-project.mjs [--repo-root <path>] [--answers-file <path> --yes] [--agent <name>]');
    console.log('Run without --answers-file for the interactive staged questionnaire.');
    return;
  }

  const repoRoot = args['repo-root'] ? resolve(args['repo-root']) : resolve(__dirname, '..', '..');
  const agentName = asString(args.agent, 'Project Init');
  const docsRoot = join(repoRoot, 'docs');
  const enginesRoot = join(repoRoot, 'engines');
  const engines = listEngines(enginesRoot);
  const paths = {
    gdd: join(docsRoot, 'GDD.md'),
    architecture: join(docsRoot, 'ARCHITECTURE.md'),
    assets: join(docsRoot, 'ASSETS.md'),
    tasks: join(docsRoot, 'TASKS.md'),
  };

  for (const path of Object.values(paths)) {
    if (!existsSync(path)) {
      throw new Error(`Missing required docs file: ${path}. Recreate it from the repository template before running project init.`);
    }
  }

  const existing = {
    gdd: parseGdd(readText(paths.gdd)),
    architecture: parseArchitecture(readText(paths.architecture)),
    assets: parseAssets(readText(paths.assets)),
  };

  if (args.yes && !args['answers-file']) {
    console.log('--yes is only supported with --answers-file.');
    return;
  }

  let answers;
  if (args['answers-file']) {
    const answersPath = resolve(args['answers-file']);
    let parsedAnswers;
    try {
      parsedAnswers = JSON.parse(readText(answersPath));
    } catch (error) {
      throw new Error(`Failed to parse answers file "${answersPath}": ${error.message}`);
    }

    answers = normalizeAnswersFromFile(parsedAnswers);
  } else {
    answers = await collectInteractiveAnswers(existing, engines);
  }

  if (!answers) {
    return;
  }

  const selectedEngine = resolveEngine(answers.engine || existing.architecture.engine, engines, enginesRoot);
  answers.engine = selectedEngine.name;

  if (args['answers-file']) {
    printSummary(answers);
  }

  if (args['answers-file'] && !args.yes) {
    console.log(`\nPreview complete. Re-run with --yes to write answers from ${resolve(args['answers-file'])}.`);
    return;
  }

  let updatedGdd = readText(paths.gdd);
  updatedGdd = replaceSection(updatedGdd, '## Overview', '## Status legend', buildGddOverview(answers.overview));
  updatedGdd = replaceSection(updatedGdd, '## Mechanics', '## Levels / Content', buildMechanicsSection(answers.mechanics));
  updatedGdd = replaceSection(updatedGdd, '## Levels / Content', '## Progression & balancing', buildLevelsSection(answers.levels));
  updatedGdd = replaceSection(updatedGdd, '## Progression & balancing', '## Out of scope', buildProgressionSection(answers.progression));
  updatedGdd = replaceSection(updatedGdd, '## Out of scope', GDD_OUT_OF_SCOPE_END, buildOutOfScopeSection(answers.outOfScope));

  let architectureBase = readText(paths.architecture);
  if (selectedEngine.name !== existing.architecture.engine) {
    architectureBase = readText(selectedEngine.templatePath);
    console.log(`\nStamping engines/${selectedEngine.name}/ARCHITECTURE.md into docs/ARCHITECTURE.md.`);
  }

  const updatedArchitecture = replaceSection(
    replaceSection(
      architectureBase,
      '## Scene flow',
      '## State management',
      buildArchitectureSection(answers.architecture.sceneFlow)
    ),
    '## State management',
    '## Asset pipeline',
    buildArchitectureSection(answers.architecture.stateManagement)
  );

  const updatedAssets = replaceSection(
    readText(paths.assets),
    '## Assets',
    ASSET_SECTION_END,
    buildAssetsSection(answers.assets)
  );

  const updatedTasks = appendTaskEntry(readText(paths.tasks), answers, agentName);

  writeText(paths.gdd, updatedGdd);
  writeText(paths.architecture, updatedArchitecture);
  writeText(paths.assets, updatedAssets);
  writeText(paths.tasks, updatedTasks);

  console.log('\nUpdated:');
  console.log(`- ${paths.gdd}`);
  console.log(`- ${paths.architecture}`);
  console.log(`- ${paths.assets}`);
  console.log(`- ${paths.tasks}`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exit(1);
});
