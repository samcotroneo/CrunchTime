#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline/promises';

const UNANSWERED = 'TBD';
const NONE = 'none';
const SPEC_OUT_OF_SCOPE_END = '<!-- project-init:end:out-of-scope -->';
const ASSET_SECTION_END = '---\nAdd new entries above this line.';
const SPEC_PLACEHOLDERS = new Set([
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

function readStyleProfileVersion(path, fallback) {
  if (!existsSync(path)) return fallback;
  const match = readText(path).match(/^## style_profile_version\s*\n+`([^`]+)`/m);
  return match ? match[1].trim() : fallback;
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
  const pattern = new RegExp(`^- (?:\\*\\*)?${escapeRegExp(label)}:(?:\\*\\*)?(.*)$`, 'm');
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

function isTemplateMilestone(title) {
  return title === '[Milestone name]';
}

function isTemplateAsset(asset) {
  return (
    asset.key === 'player-idle' ||
    asset.key === 'app-icon' ||
    asset.key === 'bg-music-main'
  );
}

function detectSpecType(content) {
  return content.includes('## Mechanics') ? 'game' : 'generic';
}

function tryGetSection(content, startHeading, endHeading) {
  const start = content.indexOf(startHeading);
  if (start === -1) return '';
  const sectionStart = start + startHeading.length;
  const end = endHeading ? content.indexOf(endHeading, sectionStart) : content.length;
  if (endHeading && end === -1) return '';
  return content.slice(sectionStart, end).trim();
}

function firstHeading(content, headings) {
  return headings.find((heading) => content.includes(heading)) || '';
}

function parseSpec(content) {
  const specType = detectSpecType(content);
  const outOfScope = tryGetSection(content, '## Out of scope', SPEC_OUT_OF_SCOPE_END)
    .replace(/^List things explicitly \*not\* being built, so agents don\'t scope-creep\.\s*/m, '')
    .trim();

  const milestonesSection = tryGetSection(content, '## Milestones', '## Out of scope');

  if (specType === 'game') {
    const mechanicsSection = tryGetSection(content, '## Mechanics', '## Levels / Content');
    const levelsSection = tryGetSection(content, '## Levels / Content', '## Progression & balancing');

    return {
      specType,
      overview: {
        title: parseBulletValue(content, 'Title'),
        elevatorPitch: parseBulletValue(content, 'Elevator pitch (one sentence)'),
        category: parseBulletValue(content, 'Genre'),
        coreValueProp: parseBulletValue(content, 'Core loop (one sentence)'),
        platformInput: parseBulletValue(content, 'Platform / input'),
        visualStyle: parseBulletValue(content, 'Visual style'),
        targetAudience: parseBulletValue(content, 'Target audience'),
        toneMood: parseBulletValue(content, 'Tone / mood'),
        targetSessionLength: parseBulletValue(content, 'Target session length'),
        scopeConstraints: stripTemplateValue(parseBulletValue(content, 'Scope & constraints'), SPEC_PLACEHOLDERS),
        inspirations: stripTemplateValue(
          parseBulletValue(content, 'Inspirations / reference games') ||
          parseBulletValue(content, 'Inspirations / references'),
          SPEC_PLACEHOLDERS
        ),
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
          newItemsIntroduced: parseBulletValue(block.lines.join('\n'), 'New mechanics introduced'),
        }))
        .filter((level) => !isTemplateLevel(level.name)),
      milestones: parseNamedBlocks(milestonesSection)
        .map((block) => ({
          name: block.title,
          target: parseBulletValue(block.lines.join('\n'), 'Target'),
          goal: parseBulletValue(block.lines.join('\n'), 'Goal'),
          exitCriteria: parseBulletValue(block.lines.join('\n'), 'Exit criteria'),
          status: parseBulletValue(block.lines.join('\n'), 'Status'),
        }))
        .filter((milestone) => !isTemplateMilestone(milestone.name)),
      progression: {
        difficultyCurve: parseBulletValue(content, 'Difficulty curve'),
        economyScoring: parseBulletValue(content, 'Economy / scoring (if any)'),
      },
      outOfScope,
    };
  }

  // generic spec type
  const featuresSection = tryGetSection(content, '## Features', '## Screens / Content');
  const screensSection = tryGetSection(content, '## Screens / Content', '## Progression & polish');

  return {
    specType,
    overview: {
      title: parseBulletValue(content, 'Title'),
      elevatorPitch: parseBulletValue(content, 'Elevator pitch (one sentence)'),
      category: parseBulletValue(content, 'Category') || parseBulletValue(content, 'Genre'),
      coreValueProp: parseBulletValue(content, 'Core value proposition (one sentence)') || parseBulletValue(content, 'Core loop (one sentence)'),
      platformInput: parseBulletValue(content, 'Platform / input'),
      visualStyle: parseBulletValue(content, 'Visual style'),
      targetAudience: parseBulletValue(content, 'Target audience'),
      toneMood: parseBulletValue(content, 'Tone / mood'),
      targetSessionLength: parseBulletValue(content, 'Target session length'),
      scopeConstraints: stripTemplateValue(parseBulletValue(content, 'Scope & constraints'), SPEC_PLACEHOLDERS),
      inspirations: stripTemplateValue(
        parseBulletValue(content, 'Inspirations / references') ||
        parseBulletValue(content, 'Inspirations / reference games'),
        SPEC_PLACEHOLDERS
      ),
    },
    mechanics: parseNamedBlocks(featuresSection)
      .map((block) => ({
        name: block.title,
        status: parseBulletValue(block.lines.join('\n'), 'Status'),
        description: parseBulletValue(block.lines.join('\n'), 'Description'),
        playerInput: parseBulletValue(block.lines.join('\n'), 'User interaction'),
        winFailCondition: parseBulletValue(block.lines.join('\n'), 'Success / failure state'),
        openQuestions: parseBulletValue(block.lines.join('\n'), 'Open questions'),
      }))
      .filter((feature) => !isTemplateMechanic(feature.name)),
    levels: parseNamedBlocks(screensSection)
      .map((block) => ({
        name: block.title,
        status: parseBulletValue(block.lines.join('\n'), 'Status'),
        goal: parseBulletValue(block.lines.join('\n'), 'Goal'),
        layoutNotes: parseBulletValue(block.lines.join('\n'), 'Layout notes'),
        newItemsIntroduced: parseBulletValue(block.lines.join('\n'), 'New features introduced'),
      }))
      .filter((screen) => !isTemplateLevel(screen.name)),
    milestones: parseNamedBlocks(milestonesSection)
      .map((block) => ({
        name: block.title,
        target: parseBulletValue(block.lines.join('\n'), 'Target'),
        goal: parseBulletValue(block.lines.join('\n'), 'Goal'),
        exitCriteria: parseBulletValue(block.lines.join('\n'), 'Exit criteria'),
        status: parseBulletValue(block.lines.join('\n'), 'Status'),
      }))
      .filter((milestone) => !isTemplateMilestone(milestone.name)),
    progression: {
      difficultyCurve: parseBulletValue(content, 'User flow / onboarding'),
      economyScoring: parseBulletValue(content, 'Economy / scoring (if any)'),
    },
    outOfScope,
  };
}

function parseArchitecture(content) {
  const sceneHeading = firstHeading(content, ['## Scene flow', '## App / screen flow', '## App / scene flow']);
  const stateHeading = '## State management';
  return {
    engine: detectEngine(content),
    sceneFlow: stripArchitecturePlaceholder(
      sceneHeading ? tryGetSection(content, sceneHeading, stateHeading).trim() : ''
    ),
    stateManagement: stripArchitecturePlaceholder(
      tryGetSection(content, stateHeading, '## Asset pipeline').trim()
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
        return {
          name: entry.name,
          label: asString(pack.label, entry.name),
          engineExpertQuestions: Array.isArray(pack.engineExpertQuestions) ? pack.engineExpertQuestions : [],
        };
      } catch {
        return { name: entry.name, label: entry.name, engineExpertQuestions: [] };
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
  const specCandidate = join(enginesRoot, name, 'SPEC.md');
  const artStylePath = join(enginesRoot, name, 'ART_STYLE.md');
  const squadTemplatePath = join(enginesRoot, name, 'SQUAD.md');
  const engineEntry = engines.find((e) => e.name === name);
  if (!existsSync(artStylePath)) {
    throw new Error(`Engine pack "${name}" is missing ART_STYLE.md.`);
  }
  if (!readStyleProfileVersion(artStylePath, '')) {
    throw new Error(`Engine pack "${name}" ART_STYLE.md is missing style_profile_version.`);
  }
  if (!existsSync(squadTemplatePath)) {
    throw new Error(`Engine pack "${name}" is missing SQUAD.md.`);
  }
  return {
    name,
    templatePath: join(enginesRoot, name, 'ARCHITECTURE.md'),
    specTemplatePath: existsSync(specCandidate) ? specCandidate : null,
    artStylePath,
    squadTemplatePath,
    engineExpertQuestions: engineEntry?.engineExpertQuestions ?? [],
  };
}

function parseAssets(content) {
  const assetsSection = getSection(content, '## Assets', ASSET_SECTION_END);
  return parseNamedBlocks(assetsSection)
    .map((block) => {
      const blockText = block.lines.join('\n');
      const rawFields = {};
      for (const line of block.lines) {
        const match = line.match(/^\s*-\s*([a-zA-Z0-9_-]+):\s*(.*)$/);
        if (match) rawFields[match[1].toLowerCase()] = match[2].trim();
      }
      return {
        key: block.title,
        rawFields,
        category: parseBulletValue(blockText, 'category').toLowerCase() === 'art'
          ? 'image'
          : parseBulletValue(blockText, 'category'),
        type: parseBulletValue(blockText, 'type'),
        status: parseBulletValue(blockText, 'status'),
        source: parseBulletValue(blockText, 'source'),
        sourceTool: parseBulletValue(blockText, 'source_tool'),
        briefSubject: parseBulletValue(blockText, 'brief_subject'),
        briefStyle: parseBulletValue(blockText, 'brief_style'),
        briefCamera: parseBulletValue(blockText, 'brief_camera'),
        briefPalette: parseBulletValue(blockText, 'brief_palette'),
        briefMood: parseBulletValue(blockText, 'brief_mood'),
        briefConstraints: parseBulletValue(blockText, 'brief_constraints'),
        briefNegativeConstraints: parseBulletValue(blockText, 'brief_negative_constraints'),
        briefOutputSpec: parseBulletValue(blockText, 'brief_output_spec'),
        briefTempo: parseBulletValue(blockText, 'brief_tempo'),
        briefLooping: parseBulletValue(blockText, 'brief_looping'),
        briefTimeline: parseBulletValue(blockText, 'brief_timeline'),
        outputPath: parseBulletValue(blockText, 'output_path'),
        outputFormat: parseBulletValue(blockText, 'output_format'),
        outputWidth: parseBulletValue(blockText, 'output_width'),
        outputHeight: parseBulletValue(blockText, 'output_height'),
        outputTransparentBackground: parseBulletValue(blockText, 'output_transparent_background'),
        outputFps: parseBulletValue(blockText, 'output_fps'),
        outputDurationSeconds: parseBulletValue(blockText, 'output_duration_seconds'),
        outputSampleRate: parseBulletValue(blockText, 'output_sample_rate'),
        outputChannels: parseBulletValue(blockText, 'output_channels'),
        styleProfileVersion: parseBulletValue(blockText, 'style_profile_version'),
        styleProfileRef: parseBulletValue(blockText, 'style_profile_ref'),
        engineStyleProfileVersion: parseBulletValue(blockText, 'engine_style_profile_version'),
        engineStyleProfileRef: parseBulletValue(blockText, 'engine_style_profile_ref'),
        referenceImages: parseBulletValue(blockText, 'reference_images'),
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

function asText(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return `${value}`;
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
    const entry = { ...current };

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

function buildSpecOverview(overview, specType) {
  if (specType === 'game') {
    return [
      '- **Title:** ' + cleanValue(overview.title),
      '- **Elevator pitch (one sentence):** ' + cleanValue(overview.elevatorPitch),
      '- **Genre:** ' + cleanValue(overview.category),
      '- **Core loop (one sentence):** ' + cleanValue(overview.coreValueProp),
      '- **Platform / input:** ' + cleanValue(overview.platformInput),
      '- **Visual style:** ' + cleanValue(overview.visualStyle),
      '- **Target audience:** ' + cleanValue(overview.targetAudience),
      '- **Tone / mood:** ' + cleanValue(overview.toneMood),
      '- **Target session length:** ' + cleanValue(overview.targetSessionLength),
      '- **Scope & constraints:** ' + cleanValue(overview.scopeConstraints),
      '- **Inspirations / reference games:** ' + cleanOptional(overview.inspirations),
    ].join('\n');
  }

  return [
    '- **Title:** ' + cleanValue(overview.title),
    '- **Elevator pitch (one sentence):** ' + cleanValue(overview.elevatorPitch),
    '- **Category:** ' + cleanValue(overview.category),
    '- **Core value proposition (one sentence):** ' + cleanValue(overview.coreValueProp),
    '- **Platform / input:** ' + cleanValue(overview.platformInput),
    '- **Visual style:** ' + cleanValue(overview.visualStyle),
    '- **Target audience:** ' + cleanValue(overview.targetAudience),
    '- **Tone / mood:** ' + cleanValue(overview.toneMood),
    '- **Target session length:** ' + cleanValue(overview.targetSessionLength),
    '- **Scope & constraints:** ' + cleanValue(overview.scopeConstraints),
    '- **Inspirations / references:** ' + cleanOptional(overview.inspirations),
  ].join('\n');
}

function buildMechanicsSection(mechanics, specType) {
  if (specType === 'game') {
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

  // generic (features)
  if (!mechanics.length) {
    return [
      '### TBD feature',
      '- **Status:** draft',
      '- **Description:** TBD',
      '- **User interaction:** TBD',
      '- **Success / failure state:** TBD',
      '- **Open questions:** none',
    ].join('\n');
  }

  return mechanics
    .map((feature) =>
      [
        `### ${cleanValue(feature.name, 'TBD feature')}`,
        `- **Status:** ${cleanValue(feature.status, 'draft')}`,
        `- **Description:** ${cleanValue(feature.description)}`,
        `- **User interaction:** ${cleanValue(feature.playerInput)}`,
        `- **Success / failure state:** ${cleanValue(feature.winFailCondition)}`,
        `- **Open questions:** ${cleanOptional(feature.openQuestions)}`,
      ].join('\n')
    )
    .join('\n\n');
}

function buildLevelsSection(levels, specType) {
  if (specType === 'game') {
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
          `- **New mechanics introduced:** ${cleanOptional(level.newItemsIntroduced)}`,
        ].join('\n')
      )
      .join('\n\n');
  }

  // generic (screens)
  if (!levels.length) {
    return [
      '### TBD screen',
      '- **Status:** draft',
      '- **Goal:** TBD',
      '- **Layout notes:** TBD',
      '- **New features introduced:** none',
    ].join('\n');
  }

  return levels
    .map((screen) =>
      [
        `### ${cleanValue(screen.name, 'TBD screen')}`,
        `- **Status:** ${cleanValue(screen.status, 'draft')}`,
        `- **Goal:** ${cleanValue(screen.goal)}`,
        `- **Layout notes:** ${cleanValue(screen.layoutNotes)}`,
        `- **New features introduced:** ${cleanOptional(screen.newItemsIntroduced)}`,
      ].join('\n')
    )
    .join('\n\n');
}

function buildProgressionSection(progression, specType) {
  if (specType === 'game') {
    return [
      `- **Difficulty curve:** ${cleanValue(progression.difficultyCurve)}`,
      `- **Economy / scoring (if any):** ${cleanOptional(progression.economyScoring)}`,
    ].join('\n');
  }

  return [
    `- **User flow / onboarding:** ${cleanValue(progression.difficultyCurve)}`,
    `- **Economy / scoring (if any):** ${cleanOptional(progression.economyScoring)}`,
  ].join('\n');
}

function buildMilestonesSection(milestones) {
  if (!milestones.length) {
    return [
      '### TBD milestone',
      '- **Target:** TBD',
      '- **Goal:** TBD',
      '- **Exit criteria:** TBD',
      '- **Status:** planned',
    ].join('\n');
  }

  return milestones
    .map((milestone) =>
      [
        `### ${cleanValue(milestone.name, 'TBD milestone')}`,
        `- **Target:** ${cleanValue(milestone.target)}`,
        `- **Goal:** ${cleanValue(milestone.goal)}`,
        `- **Exit criteria:** ${cleanValue(milestone.exitCriteria)}`,
        `- **Status:** ${cleanValue(milestone.status, 'planned')}`,
      ].join('\n')
    )
    .join('\n\n');
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
      const fieldValues = {
        ...(asset.rawFields || {}),
        category: asset.category,
        type: asset.type,
        status: asset.status,
        source: asset.source,
        source_tool: asset.sourceTool,
        brief_subject: asset.briefSubject,
        brief_style: asset.briefStyle,
        brief_camera: asset.briefCamera,
        brief_palette: asset.briefPalette,
        brief_mood: asset.briefMood,
        brief_constraints: asset.briefConstraints,
        brief_negative_constraints: asset.briefNegativeConstraints,
        brief_output_spec: asset.briefOutputSpec,
        brief_tempo: asset.briefTempo,
        brief_looping: asset.briefLooping,
        brief_timeline: asset.briefTimeline,
        output_path: asset.outputPath,
        output_format: asset.outputFormat,
        output_width: asset.outputWidth,
        output_height: asset.outputHeight,
        output_transparent_background: asset.outputTransparentBackground,
        output_fps: asset.outputFps,
        output_duration_seconds: asset.outputDurationSeconds,
        output_sample_rate: asset.outputSampleRate,
        output_channels: asset.outputChannels,
        style_profile_version: asset.styleProfileVersion,
        style_profile_ref: asset.styleProfileRef,
        engine_style_profile_version: asset.engineStyleProfileVersion,
        engine_style_profile_ref: asset.engineStyleProfileRef,
        reference_images: asset.referenceImages,
        generation: asset.generation,
      };
      const fieldOrder = [
        'category',
        'type',
        'status',
        'source',
        'source_tool',
        'brief_subject',
        'brief_style',
        'brief_camera',
        'brief_palette',
        'brief_mood',
        'brief_constraints',
        'brief_negative_constraints',
        'brief_output_spec',
        'brief_tempo',
        'brief_looping',
        'brief_timeline',
        'output_path',
        'output_format',
        'output_width',
        'output_height',
        'output_transparent_background',
        'output_fps',
        'output_duration_seconds',
        'output_sample_rate',
        'output_channels',
        'style_profile_version',
        'style_profile_ref',
        'engine_style_profile_version',
        'engine_style_profile_ref',
        'reference_images',
        'generation',
      ];
      const lines = [`### ${cleanValue(asset.key, 'tbd-asset')}`];
      for (const field of fieldOrder) {
        const value = fieldValues[field];
        if (value === undefined || value === '') continue;
        if (field === 'generation' && cleanOptional(value) === NONE) continue;
        lines.push(`- ${field}: ${cleanValue(value)}`);
      }
      const knownFields = new Set(['key', ...fieldOrder]);
      for (const [field, value] of Object.entries(fieldValues)) {
        if (knownFields.has(field) || value === undefined || value === '') continue;
        lines.push(`- ${field}: ${cleanValue(value)}`);
      }

      return lines.join('\n');
    })
    .join('\n\n');
}

function buildEngineNotesSection(engineExpert) {
  if (!engineExpert || Object.keys(engineExpert).length === 0) {
    return '_No engine-specific notes recorded. Re-run project init or ask the Engine Expert agent to populate this section._';
  }

  return Object.entries(engineExpert)
    .map(([key, value]) => `- **${key}:** ${cleanValue(value)}`)
    .join('\n');
}

function appendTaskEntry(content, answers, agentName) {
  const entry = [
    `### ${getTodayDateString()} — ${cleanValue(agentName, 'Project Init')} — project init`,
    `**Did:** Ran the project init questionnaire and updated \`docs/SPEC.md\`, \`docs/ARCHITECTURE.md\`, \`docs/SQUAD.md\`, and \`docs/ASSETS.md\` for "${cleanValue(answers.overview.title)}" (engine: ${cleanValue(answers.engine)}).`,
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
  console.log(`- Category: ${cleanValue(answers.overview.category)}`);
  console.log(`- Features: ${summarizeList(answers.mechanics, (item) => cleanValue(item.name, 'TBD'))}`);
  console.log(`- Screens: ${summarizeList(answers.levels, (item) => cleanValue(item.name, 'TBD'))}`);
  console.log(`- Milestones: ${summarizeList(answers.milestones, (item) => cleanValue(item.name, 'TBD milestone'))}`);
  console.log(`- Assets: ${summarizeList(answers.assets, (item) => cleanValue(item.key, 'tbd-asset'))}`);
  console.log(`- Open questions: ${collectOpenQuestionsSummary(answers)}`);
  if (answers.engineExpert && Object.keys(answers.engineExpert).length > 0) {
    console.log('- Engine expert answers:');
    for (const [key, value] of Object.entries(answers.engineExpert)) {
      console.log(`  - ${key}: ${cleanValue(value)}`);
    }
  }
}

async function collectInteractiveAnswers(existing, engines, repoRoot) {
  const rl = readline.createInterface({ input, output });

  try {
    const specType = existing.spec.specType;

    console.log('Stage 1 — project basics');
    const categoryLabel = specType === 'game' ? 'Genre' : 'Category';
    const valuePropLabel = specType === 'game' ? 'Core loop' : 'Core value proposition';
    const inspirationsLabel = specType === 'game' ? 'Inspirations / reference games' : 'Inspirations / references';
    const overview = {
      title: await ask(rl, 'Title', existing.spec.overview.title),
      elevatorPitch: await ask(rl, 'Elevator pitch', existing.spec.overview.elevatorPitch),
      category: await ask(rl, categoryLabel, existing.spec.overview.category),
      coreValueProp: await ask(rl, valuePropLabel, existing.spec.overview.coreValueProp),
      platformInput: await ask(rl, 'Platform / input', existing.spec.overview.platformInput),
      visualStyle: await ask(rl, 'Visual style', existing.spec.overview.visualStyle),
      targetAudience: await ask(rl, 'Target audience', existing.spec.overview.targetAudience),
      toneMood: await ask(rl, 'Tone / mood', existing.spec.overview.toneMood),
      targetSessionLength: await ask(rl, 'Target session length', existing.spec.overview.targetSessionLength),
      scopeConstraints: await ask(rl, 'Scope & constraints', existing.spec.overview.scopeConstraints),
      inspirations: await ask(rl, inspirationsLabel, existing.spec.overview.inspirations, { fallback: NONE }),
    };

    let mechanics;
    let levels;
    let progression;

    if (specType === 'game') {
      console.log('\nStage 2 — gameplay and progression');
      mechanics = await collectRepeatedEntries(
        rl,
        'mechanics',
        existing.spec.mechanics,
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

      levels = await collectRepeatedEntries(
        rl,
        'levels',
        existing.spec.levels,
        () => ({
          name: '',
          status: 'draft',
          goal: '',
          layoutNotes: '',
          newItemsIntroduced: NONE,
        }),
        () => [
          { key: 'name', label: 'Level name' },
          { key: 'status', label: 'Status', options: { fallback: 'draft' } },
          { key: 'goal', label: 'Goal' },
          { key: 'layoutNotes', label: 'Layout notes' },
          { key: 'newItemsIntroduced', label: 'New mechanics introduced', options: { fallback: NONE } },
        ]
      );

      progression = {
        difficultyCurve: await ask(rl, 'Difficulty curve', existing.spec.progression.difficultyCurve),
        economyScoring: await ask(rl, 'Economy / scoring', existing.spec.progression.economyScoring, { fallback: NONE }),
      };
    } else {
      console.log('\nStage 2 — features and screens');
      mechanics = await collectRepeatedEntries(
        rl,
        'features',
        existing.spec.mechanics,
        () => ({
          name: '',
          status: 'draft',
          description: '',
          playerInput: '',
          winFailCondition: '',
          openQuestions: NONE,
        }),
        () => [
          { key: 'name', label: 'Feature name' },
          { key: 'status', label: 'Status', options: { fallback: 'draft' } },
          { key: 'description', label: 'Description' },
          { key: 'playerInput', label: 'User interaction' },
          { key: 'winFailCondition', label: 'Success / failure state' },
          { key: 'openQuestions', label: 'Open questions', options: { fallback: NONE } },
        ]
      );

      levels = await collectRepeatedEntries(
        rl,
        'screens',
        existing.spec.levels,
        () => ({
          name: '',
          status: 'draft',
          goal: '',
          layoutNotes: '',
          newItemsIntroduced: NONE,
        }),
        () => [
          { key: 'name', label: 'Screen name' },
          { key: 'status', label: 'Status', options: { fallback: 'draft' } },
          { key: 'goal', label: 'Goal' },
          { key: 'layoutNotes', label: 'Layout notes' },
          { key: 'newItemsIntroduced', label: 'New features introduced', options: { fallback: NONE } },
        ]
      );

      progression = {
        difficultyCurve: await ask(rl, 'User flow / onboarding', existing.spec.progression.difficultyCurve),
        economyScoring: await ask(rl, 'Economy / scoring', existing.spec.progression.economyScoring, { fallback: NONE }),
      };
    }

    const milestones = await collectRepeatedEntries(
      rl,
      'milestones',
      existing.spec.milestones,
      () => ({
        name: '',
        target: '',
        goal: '',
        exitCriteria: '',
        status: 'planned',
      }),
      () => [
        { key: 'name', label: 'Milestone name (e.g. Prototype, Alpha, Beta, Release)' },
        { key: 'target', label: 'Target (date or condition)' },
        { key: 'goal', label: 'Goal (what exists when reached)' },
        { key: 'exitCriteria', label: 'Exit criteria' },
        { key: 'status', label: 'Status', options: { fallback: 'planned' } },
      ]
    );

    const outOfScope = await ask(rl, 'Out-of-scope items', existing.spec.outOfScope, { fallback: UNANSWERED });
    const projectOpenQuestions = await ask(rl, 'Project-wide open questions', '', { fallback: NONE });

    console.log('\nStage 3 — technical structure');
    const engineOptions = engines.map((engine) => `${engine.name} (${engine.label})`).join(', ');
    const engine = await ask(
      rl,
      `Engine — one of: ${engineOptions}`,
      existing.architecture.engine || DEFAULT_ENGINE
    );
    const sceneFlowLabel = ['capacitor', 'react-native'].includes(`${engine}`.trim().toLowerCase())
      ? 'App / screen flow'
      : 'Scene flow';
    const rootStyleVersion = readStyleProfileVersion(join(repoRoot, 'docs', 'ART_STYLE.md'), 'TBD');
    const engineStyleVersion = readStyleProfileVersion(
      join(repoRoot, 'engines', `${engine}`.trim().toLowerCase(), 'ART_STYLE.md'),
      'TBD'
    );
    const architecture = {
      sceneFlow: await ask(rl, sceneFlowLabel, existing.architecture.sceneFlow),
      stateManagement: await ask(rl, 'State management / persistence', existing.architecture.stateManagement),
    };

    console.log('\nStage 4 — starter assets');
    const resolvedEngineName = `${engine ?? ''}`.trim().toLowerCase() || DEFAULT_ENGINE;
    const assets = await collectRepeatedEntries(
      rl,
      'assets',
      existing.assets,
      () => ({
        key: '',
        category: 'image',
        type: '',
        status: 'placeholder',
        source: '',
        sourceTool: '',
        briefSubject: '',
        briefStyle: '',
        briefCamera: '',
        briefPalette: '',
        briefMood: '',
        briefConstraints: '',
        briefNegativeConstraints: '',
        briefOutputSpec: '',
        briefTempo: '',
        briefLooping: '',
        briefTimeline: '',
        outputPath: '',
        outputFormat: '',
        outputWidth: '',
        outputHeight: '',
        outputTransparentBackground: '',
        outputFps: '',
        outputDurationSeconds: '',
        outputSampleRate: '',
        outputChannels: '',
        styleProfileVersion: rootStyleVersion,
        styleProfileRef: 'docs/ART_STYLE.md#visual-pillars',
        engineStyleProfileVersion: engineStyleVersion,
        engineStyleProfileRef: '',
        referenceImages: '',
        generation: NONE,
      }),
      (current) => {
        const category = current.category.toLowerCase() === 'art' ? 'image' : current.category.toLowerCase();
        return [
        { key: 'key', label: 'Asset key' },
        { key: 'category', label: 'Category' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status', options: { fallback: 'placeholder' } },
        { key: 'source', label: 'Source' },
        { key: 'sourceTool', label: 'Source tool / provider', options: { fallback: NONE } },
        { key: 'briefSubject', label: 'Brief subject' },
        { key: 'briefStyle', label: 'Brief style' },
        ...(category === 'image' || category === 'video'
          ? [
              { key: 'briefCamera', label: 'Brief camera / framing' },
              { key: 'briefPalette', label: 'Brief palette' },
            ]
          : []),
        { key: 'briefMood', label: 'Brief mood' },
        { key: 'briefConstraints', label: 'Brief constraints' },
        { key: 'briefNegativeConstraints', label: 'Brief negative constraints' },
        { key: 'briefOutputSpec', label: 'Brief output spec' },
        ...(category === 'audio'
          ? [
              { key: 'briefTempo', label: 'Brief tempo / pacing' },
              { key: 'briefLooping', label: 'Brief looping' },
            ]
          : []),
        ...(category === 'video' ? [{ key: 'briefTimeline', label: 'Brief timeline' }] : []),
        { key: 'outputPath', label: 'Output path' },
        { key: 'outputFormat', label: 'Output format' },
        ...(category === 'image' || category === 'video'
          ? [
              { key: 'outputWidth', label: 'Output width (px)' },
              { key: 'outputHeight', label: 'Output height (px)' },
              { key: 'outputTransparentBackground', label: 'Transparent background (true/false)' },
            ]
          : []),
        ...(category === 'video'
          ? [
              { key: 'outputFps', label: 'Output frame rate (fps)' },
              { key: 'outputDurationSeconds', label: 'Output duration (seconds)' },
            ]
          : []),
        ...(category === 'audio'
          ? [
              { key: 'outputSampleRate', label: 'Output sample rate (Hz)', options: { fallback: NONE } },
              { key: 'outputChannels', label: 'Output channels', options: { fallback: NONE } },
            ]
          : []),
        { key: 'styleProfileVersion', label: 'Root style profile version', options: { fallback: rootStyleVersion } },
        { key: 'styleProfileRef', label: 'Root style profile reference' },
        { key: 'engineStyleProfileVersion', label: 'Engine style profile version', options: { fallback: engineStyleVersion } },
        { key: 'engineStyleProfileRef', label: 'Engine style profile reference' },
        { key: 'referenceImages', label: 'Reference images', options: { fallback: NONE } },
        { key: 'generation', label: 'Legacy generation prompt', options: { fallback: NONE } },
        ];
      }
    );

    // Stage 5 — engine-specific details (Engine Expert questions from pack.json)
    const engineEntry = engines.find((e) => e.name === resolvedEngineName);
    const expertQuestions = engineEntry?.engineExpertQuestions ?? [];
    const engineExpert = {};

    if (expertQuestions.length > 0) {
      console.log('\nStage 5 — engine-specific details');
      console.log(`(${engineEntry.label} — ${expertQuestions.length} question${expertQuestions.length === 1 ? '' : 's'})`);
      for (const question of expertQuestions) {
        if (question.hint) {
          console.log(`  Hint: ${question.hint}`);
        }
        engineExpert[question.key] = await ask(rl, question.label, '', { fallback: UNANSWERED });
      }
    }

    const answers = {
      overview,
      mechanics,
      levels,
      progression,
      milestones,
      outOfScope,
      projectOpenQuestions,
      engine,
      architecture,
      assets,
      engineExpert,
    };

    console.log(`\nStage ${expertQuestions.length > 0 ? 6 : 5} — confirmation`);
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

function normalizeAnswersFromFile(raw, repoRoot) {
  const data = asRecord(raw);
  const overview = asRecord(data.overview);
  const progression = asRecord(data.progression);
  const architecture = asRecord(data.architecture);
  const selectedEngine = asString(data.engine || architecture.engine).trim().toLowerCase() || DEFAULT_ENGINE;
  const rootStyleVersion = readStyleProfileVersion(join(repoRoot, 'docs', 'ART_STYLE.md'), 'TBD');
  const engineStyleVersion = readStyleProfileVersion(
    join(repoRoot, 'engines', selectedEngine, 'ART_STYLE.md'),
    'TBD'
  );

  return {
    overview: {
      title: asString(overview.title),
      elevatorPitch: asString(overview.elevatorPitch),
      // accept both new (category/coreValueProp) and legacy (genre/coreLoop) field names
      category: asString(overview.category || overview.genre),
      coreValueProp: asString(overview.coreValueProp || overview.coreLoop),
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
      newItemsIntroduced: asString(entry.newItemsIntroduced, NONE),
    })),
    progression: {
      difficultyCurve: asString(progression.difficultyCurve),
      economyScoring: asString(progression.economyScoring, NONE),
    },
    milestones: asObjectArray(data.milestones).map((entry) => ({
      name: asString(entry.name),
      target: asString(entry.target),
      goal: asString(entry.goal),
      exitCriteria: asString(entry.exitCriteria),
      status: asString(entry.status, 'planned'),
    })),
    outOfScope: asString(data.outOfScope),
    projectOpenQuestions: asString(data.projectOpenQuestions, NONE),
    engine: asString(data.engine),
    architecture: {
      sceneFlow: asString(architecture.sceneFlow),
      stateManagement: asString(architecture.stateManagement),
    },
    assets: asObjectArray(data.assets).map((entry) => ({
      ...entry,
      rawFields: Object.fromEntries(
        Object.entries(entry).filter(([key]) => key.includes('_'))
      ),
      key: asString(entry.key),
      category: asString(entry.category).toLowerCase() === 'art' ? 'image' : asString(entry.category),
      type: asString(entry.type),
      status: asString(entry.status, 'placeholder'),
      source: asString(entry.source),
      sourceTool: asString(entry.sourceTool || entry.source_tool),
      briefSubject: asString(entry.briefSubject || entry.brief_subject),
      briefStyle: asString(entry.briefStyle || entry.brief_style),
      briefCamera: asString(entry.briefCamera || entry.brief_camera),
      briefPalette: asString(entry.briefPalette || entry.brief_palette),
      briefMood: asString(entry.briefMood || entry.brief_mood),
      briefConstraints: asString(entry.briefConstraints || entry.brief_constraints),
      briefNegativeConstraints: asString(entry.briefNegativeConstraints || entry.brief_negative_constraints),
      briefOutputSpec: asString(entry.briefOutputSpec || entry.brief_output_spec),
      briefTempo: asString(entry.briefTempo || entry.brief_tempo),
      briefLooping: asString(entry.briefLooping || entry.brief_looping),
      briefTimeline: asString(entry.briefTimeline || entry.brief_timeline),
      outputPath: asString(entry.outputPath || entry.output_path),
      outputFormat: asString(entry.outputFormat || entry.output_format),
      outputWidth: asText(entry.outputWidth ?? entry.output_width),
      outputHeight: asText(entry.outputHeight ?? entry.output_height),
      outputTransparentBackground: asText(
        entry.outputTransparentBackground ?? entry.output_transparent_background
      ),
      outputFps: asText(entry.outputFps ?? entry.output_fps),
      outputDurationSeconds: asText(entry.outputDurationSeconds ?? entry.output_duration_seconds),
      outputSampleRate: asText(entry.outputSampleRate ?? entry.output_sample_rate),
      outputChannels: asText(entry.outputChannels ?? entry.output_channels),
      styleProfileVersion: asString(entry.styleProfileVersion || entry.style_profile_version, rootStyleVersion),
      styleProfileRef: asString(entry.styleProfileRef || entry.style_profile_ref),
      engineStyleProfileVersion: asString(
        entry.engineStyleProfileVersion || entry.engine_style_profile_version,
        engineStyleVersion
      ),
      engineStyleProfileRef: asString(entry.engineStyleProfileRef || entry.engine_style_profile_ref),
      referenceImages: asString(entry.referenceImages || entry.reference_images, NONE),
      generation: asString(entry.generation, NONE),
    })),
    engineExpert: asRecord(data.engineExpert),
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
    spec: join(docsRoot, 'SPEC.md'),
    architecture: join(docsRoot, 'ARCHITECTURE.md'),
    assets: join(docsRoot, 'ASSETS.md'),
    squad: join(docsRoot, 'SQUAD.md'),
    tasks: join(docsRoot, 'TASKS.md'),
  };

  for (const path of Object.values(paths)) {
    if (!existsSync(path)) {
      throw new Error(`Missing required docs file: ${path}. Recreate it from the repository template before running project init.`);
    }
  }

  const existing = {
    spec: parseSpec(readText(paths.spec)),
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

    answers = normalizeAnswersFromFile(parsedAnswers, repoRoot);
  } else {
    answers = await collectInteractiveAnswers(existing, engines, repoRoot);
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

  let updatedSpec = readText(paths.spec);

  // Stamp SPEC.md from engine pack if engine has changed or pack has a spec template
  if (selectedEngine.specTemplatePath && selectedEngine.name !== existing.architecture.engine) {
    updatedSpec = readText(selectedEngine.specTemplatePath);
    console.log(`\nStamping engines/${selectedEngine.name}/SPEC.md into docs/SPEC.md.`);
  }

  const newSpecType = detectSpecType(updatedSpec);
  updatedSpec = replaceSection(updatedSpec, '## Overview', '## Status legend', buildSpecOverview(answers.overview, newSpecType));

  if (newSpecType === 'game') {
    updatedSpec = replaceSection(updatedSpec, '## Mechanics', '## Levels / Content', buildMechanicsSection(answers.mechanics, 'game'));
    updatedSpec = replaceSection(updatedSpec, '## Levels / Content', '## Progression & balancing', buildLevelsSection(answers.levels, 'game'));
    updatedSpec = replaceSection(updatedSpec, '## Progression & balancing', '## Milestones', buildProgressionSection(answers.progression, 'game'));
  } else {
    updatedSpec = replaceSection(updatedSpec, '## Features', '## Screens / Content', buildMechanicsSection(answers.mechanics, 'generic'));
    updatedSpec = replaceSection(updatedSpec, '## Screens / Content', '## Progression & polish', buildLevelsSection(answers.levels, 'generic'));
    updatedSpec = replaceSection(updatedSpec, '## Progression & polish', '## Milestones', buildProgressionSection(answers.progression, 'generic'));
  }

  updatedSpec = replaceSection(updatedSpec, '## Milestones', '## Out of scope', buildMilestonesSection(answers.milestones));
  updatedSpec = replaceSection(updatedSpec, '## Out of scope', SPEC_OUT_OF_SCOPE_END, buildOutOfScopeSection(answers.outOfScope));

  let architectureBase = readText(paths.architecture);
  if (selectedEngine.name !== existing.architecture.engine) {
    architectureBase = readText(selectedEngine.templatePath);
    console.log(`\nStamping engines/${selectedEngine.name}/ARCHITECTURE.md into docs/ARCHITECTURE.md.`);
  }

  // Replace architecture sections only if the headings are present in the template
  let updatedArchitecture = architectureBase;
  const sceneHeading = firstHeading(updatedArchitecture, ['## Scene flow', '## App / screen flow', '## App / scene flow']);
  if (sceneHeading && updatedArchitecture.includes('## State management')) {
    updatedArchitecture = replaceSection(
      replaceSection(
        updatedArchitecture,
        sceneHeading,
        '## State management',
        buildArchitectureSection(answers.architecture.sceneFlow)
      ),
      '## State management',
      '## Asset pipeline',
      buildArchitectureSection(answers.architecture.stateManagement)
    );
  }

  // Write engine expert answers into ## Engine notes if that section is present
  if (updatedArchitecture.includes('## Engine notes')) {
    updatedArchitecture = replaceSection(
      updatedArchitecture,
      '## Engine notes',
      null,
      buildEngineNotesSection(answers.engineExpert)
    );
  }

  let updatedSquad = readText(paths.squad);
  if (selectedEngine.name !== existing.architecture.engine) {
    updatedSquad = readText(selectedEngine.squadTemplatePath);
    console.log(`Stamping engines/${selectedEngine.name}/SQUAD.md into docs/SQUAD.md.`);
  }

  const updatedAssets = replaceSection(
    readText(paths.assets),
    '## Assets',
    ASSET_SECTION_END,
    buildAssetsSection(answers.assets)
  );

  const updatedTasks = appendTaskEntry(readText(paths.tasks), answers, agentName);

  writeText(paths.spec, updatedSpec);
  writeText(paths.architecture, updatedArchitecture);
  writeText(paths.squad, updatedSquad);
  writeText(paths.assets, updatedAssets);
  writeText(paths.tasks, updatedTasks);

  console.log('\nUpdated:');
  console.log(`- ${paths.spec}`);
  console.log(`- ${paths.architecture}`);
  console.log(`- ${paths.squad}`);
  console.log(`- ${paths.assets}`);
  console.log(`- ${paths.tasks}`);
}

main().catch((error) => {
  console.error(`[error] ${error.message}`);
  process.exit(1);
});
