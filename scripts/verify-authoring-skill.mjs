#!/usr/bin/env node
/**
 * Consumer acceptance uses only a copied installation's CLI, its files and its installed
 * Playwright public entry. No workspace SDK imports, pnpm or test runner are needed.
 * Every required check contributes to the gate; unavailable checks remain incomplete.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, cp, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import { arch, platform, release, tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const TIMEOUT_MS = 120_000;
const MIN_BLUE_CHANNEL = 220;
const MAX_OTHER_CHANNEL = 30;
const OPAQUE_ALPHA = 255;
const { values } = parseArgs({ options: { skill: { type: 'string' }, output: { type: 'string' }, browser: { type: 'string' }, node18: { type: 'string' } } });
const browserPath = values.browser ?? process.env.FLOWSVG_TEST_BROWSER;
const node18 = values.node18 ?? process.env.FLOWSVG_TEST_NODE18;
const output = resolve(values.output ?? 'authoring-skill-evidence.json');
const evidence = { schemaVersion: 1, status: 'incomplete', startedAt: new Date().toISOString(), platform: platform(), release: release(), architecture: arch(), node: process.version,
  scope: 'Installed tool behavior; screenshots do not attest model visual judgment or host acceptance. Local tarball evidence does not establish registry distribution readiness.', checks: [], commands: [] };
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
let root;
let skill;
let cache;
let prepared;
let chromium;
const base = { version: 1, title: '独立验收', viewport: { width: 400, height: 200 }, nodes: [
  { id: 'group', kind: 'group', x: 10, y: 10, width: 380, height: 180 },
  { id: 'box', parentId: 'group', kind: 'rect', x: 20, y: 30, width: 50, height: 50, label: '状态', style: { fill: '#ff0000', strokeWidth: 0 } }
], edges: [], scenes: [{ id: 'moving', label: '变化', beats: [
  { durationMs: 500, transitionMs: 0, caption: 'Ready', actions: [] },
  { durationMs: 500, transitionMs: 200, caption: 'Done', actions: [{ type: 'updateNode', target: 'box', value: { x: 250, fill: '#0000ff' } }] }
] }] };

/** Resolve only after the child exits; a timeout is a failing contract, never a skip. */
function execute(executable, args, options = {}) {
  return new Promise((done, reject) => {
    const child = spawn(executable, args, { cwd: root, env: { ...process.env, ...options.env }, windowsHide: true });
    let stdout = '';
    let stderr = '';
    let interrupted = false;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, TIMEOUT_MS);
    child.stdout.on('data', (bytes) => { stdout += bytes; });
    child.stderr.on('data', (bytes) => {
      stderr += bytes;
      if (!interrupted && options.interrupt && stderr.includes(options.interrupt.at)) {
        interrupted = true;
        if (options.interrupt.browser) {
          const pid = Number([...stderr.matchAll(/<launched> pid=(\d+)/gu)].at(-1)?.[1]);
          if (pid) process.kill(pid, 'SIGKILL');
        } else child.kill('SIGINT');
      }
    });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code, signal) => { clearTimeout(timer); done({ code, signal, stdout, stderr, timedOut, interrupted }); });
  });
}

async function command(args, options = {}) {
  const result = await execute(options.node ?? process.execPath, [join(skill, 'scripts/flowsvg.mjs'), ...args], {
    ...options, env: { FLOWSVG_CACHE_DIR: cache, DEBUG: 'pw:browser', TMPDIR: join(root, 'browser temp'), TMP: join(root, 'browser temp'), TEMP: join(root, 'browser temp'), ...options.env }
  });
  assert.equal(result.timedOut, false, 'CLI timed out');
  const summary = JSON.parse(result.stdout);
  const report = summary.command === 'author' && summary.detailsPath
    ? JSON.parse(await readFile(summary.detailsPath, 'utf8')) : summary;
  evidence.commands.push({ args, code: result.code, status: report.status, stage: report.stage, stdoutSha256: digest(result.stdout), diagnostics: report.diagnostics?.map(({ code, stage }) => ({ code, stage })) });
  return { ...result, report, summary };
}

async function check(id, run) {
  const started = Date.now();
  try {
    const details = await run();
    const status = details?.status ?? 'passed';
    evidence.checks.push({ id, status, durationMs: Date.now() - started, ...details });
    process.stderr.write(`${status.toUpperCase()} ${id}\n`);
  } catch (error) {
    evidence.checks.push({ id, status: 'failed', durationMs: Date.now() - started, reason: error.message });
    process.stderr.write(`FAIL ${id}: ${error.message}\n`);
  }
}

async function saveInput(name, document = base) {
  const input = join(root, `${name}.json`);
  await writeFile(input, JSON.stringify(document, null, 2) + '\n');
  return input;
}

function hasDiagnostic(report, code) {
  assert.ok(report.diagnostics.some((issue) => issue.code === code), `Missing diagnostic ${code}`);
}

async function verifySaved(result) {
  const report = result.report;
  assert.deepEqual(JSON.parse(await readFile(join(report.revision.directory, 'report.json'), 'utf8')), report);
  assert.equal(digest(await readFile(join(report.revision.directory, 'diagram.json'))), report.input.sha256);
  const markdown = await readFile(join(report.revision.directory, 'report.md'), 'utf8');
  assert.ok(markdown.includes(report.status));
}

/** Process IDs come from Playwright's real launch logs, independent of reported cleanup flags. */
async function resourcesReleased(result) {
  const pids = [...result.stderr.matchAll(/<launched> pid=(\d+)/gu)].map((match) => Number(match[1]));
  assert.ok(pids.length > 0, 'No actual browser launch observed');
  for (const pid of pids) assert.throws(() => process.kill(pid, 0), `Owned browser ${pid} is still alive`);
  const remaining = (await readdir(join(root, 'browser temp'))).filter((name) => name.startsWith('flowsvg-gif-') || name.startsWith('playwright_chromiumdev_profile-'));
  assert.deepEqual(remaining, []);
}

const environmentChecks = [
  ['clean-isolated-install', async () => {
    const result = await command(['prepare']);
    assert.equal(result.code, 0);
    prepared = result.report;
    assert.equal(prepared.reused, false);
    assert.ok(prepared.sdk.path.startsWith(cache + sep));
    evidence.npm = prepared.environment.npm;
    evidence.sdk = prepared.sdk;
    const lockBytes = await readFile(join(skill, 'runtime/package-lock.json'));
    evidence.lockfileSha256 = digest(lockBytes);
    const manifest = JSON.parse(await readFile(join(skill, 'runtime/manifest.json')));
    evidence.toolVersion = manifest.toolVersion;
    evidence.baseline = manifest.baseline;
    assert.equal(prepared.sdk.version, manifest.sdk.version);
    assert.equal(prepared.sdk.integrity, manifest.sdk.integrity);
  }],
  ['node18-rejection', async () => {
    const version = await execute(node18, ['--version']);
    assert.match(version.stdout, /^v18\./u);
    const result = await command(['doctor'], { node: node18 });
    assert.equal(result.code, 1);
    hasDiagnostic(result.report, 'NODE_VERSION');
    return { node: version.stdout.trim() };
  }],
  ['missing-npm-preserves-draft', async () => {
    const input = await saveInput('no npm');
    const noNpm = join(root, 'no npm executable');
    await mkdir(noNpm);
    let executable = process.execPath;
    if (process.platform === 'win32') {
      executable = join(noNpm, 'node.exe');
      await cp(process.execPath, executable);
    }
    const result = await command(['author', '--browser', 'none', '--input', input, '--name', 'no npm'], { node: executable, env: { PATH: noNpm, Path: noNpm, path: noNpm } });
    assert.equal(result.code, 1);
    hasDiagnostic(result.report, 'NPM_UNAVAILABLE');
    assert.equal(await readFile(join(result.report.revision.directory, 'diagram.json'), 'utf8'), await readFile(input, 'utf8'));
  }],
  ['complete-cache-offline-and-empty-cache-failure', async () => {
    const offline = { npm_config_offline: 'true', npm_config_cache: join(root, 'empty npm cache') };
    const cached = await command(['prepare'], { env: offline });
    assert.equal(cached.code, 0);
    assert.equal(cached.report.reused, true);
    const input = await saveInput('offline');
    const result = await command(['author', '--input', input, '--name', 'offline', '--browser', 'none'], { env: { ...offline, FLOWSVG_CACHE_DIR: join(root, 'never prepared') } });
    assert.equal(result.code, 1);
    hasDiagnostic(result.report, 'INSTALL_FAILED');
    assert.equal(result.report.checks.validation, 'not-run');
    assert.equal(await readFile(join(result.report.revision.directory, 'diagram.json'), 'utf8'), await readFile(input, 'utf8'));
  }],
  ['wrong-sdk-and-damaged-cache-rebuild', async () => {
    const metadata = join(prepared.sdk.path, 'package.json');
    const original = JSON.parse(await readFile(metadata));
    await writeFile(metadata, JSON.stringify({ ...original, version: '999.0.0' }));
    const repaired = await command(['prepare']);
    assert.equal(repaired.code, 0);
    assert.equal(repaired.report.reused, false);
    assert.equal(repaired.report.sdk.version, original.version);
    const marker = join(root, 'damaged resolver executed');
    await writeFile(join(prepared.directory, 'resolve.mjs'), `import {writeFileSync} from 'node:fs'; writeFileSync(${JSON.stringify(marker)},'bad'); throw Error('damaged');`);
    const result = await command(['prepare']);
    assert.equal(result.code, 0);
    assert.equal(result.report.reused, false);
    await assert.rejects(access(marker));
  }],
  ['locked-artifact-integrity', async () => {
    const manifest = JSON.parse(await readFile(join(skill, 'runtime/manifest.json')));
    const lockPath = join(skill, 'runtime/package-lock.json');
    const lockBytes = await readFile(lockPath);
    const lock = JSON.parse(lockBytes);
    lock.packages['node_modules/flowsvg'].integrity = 'sha512-invalid';
    await writeFile(lockPath, JSON.stringify(lock));
    try {
      const result = await command(['prepare']);
      assert.equal(result.code, 1);
      hasDiagnostic(result.report, 'SDK_MANIFEST');
    } finally { await writeFile(lockPath, lockBytes); }
    if (manifest.sdk.archive) {
      const archive = join(skill, 'runtime', manifest.sdk.archive);
      const bytes = await readFile(archive);
      const damaged = Buffer.from(bytes);
      damaged[Math.floor(damaged.length / 2)] ^= 0xff;
      await writeFile(archive, damaged);
      try {
        const result = await command(['prepare']);
        assert.equal(result.code, 1);
        hasDiagnostic(result.report, 'SDK_INTEGRITY');
      } finally { await writeFile(archive, bytes); }
    }
  }],
  ['parallel-prepare-and-independent-drafts', async () => {
    const input = await saveInput('parallel');
    const env = { FLOWSVG_CACHE_DIR: join(root, 'parallel cache') };
    const results = await Promise.all([0, 1].map((index) => command(['author', '--browser', 'none', '--input', input, '--name', `parallel-${index}`, '--output', join(root, 'parallel history')], { env })));
    assert.deepEqual(results.map((result) => result.code), [0, 0]);
    assert.ok(results.every((result) => result.report.workingDraft.id === 'current'));
    assert.equal(new Set(results.map((result) => result.report.workingDraft.directory)).size, 2);
    assert.equal(new Set(results.map((result) => result.report.sdk.path)).size, 1);
    assert.deepEqual(results.map((result) => result.report.environment.reused).sort(), [false, true]);
  }],
  ['abandoned-installation-recovery', async () => {
    await rm(prepared.directory, { recursive: true });
    const abandoned = `${prepared.directory}.tmp-2147483647-abandoned`;
    await mkdir(abandoned);
    await mkdir(`${prepared.directory}.lock`);
    await writeFile(join(`${prepared.directory}.lock`, 'owner.json'), '{"pid":2147483647}');
    const result = await command(['prepare']);
    assert.equal(result.code, 0);
    await assert.rejects(access(abandoned));
    await assert.rejects(access(`${prepared.directory}.lock`));
  }],
];

const diagnosisChecks = [
  ['validation-without-design-snapshots', async () => {
    const input = await saveInput('read only validation');
    const history = join(root, 'validation must not create history');
    const bytes = await readFile(input);
    for (const round of [1, 2]) {
      const result = await command(['validate', '--input', input, '--output', history]);
      assert.equal(result.code, 0);
      assert.equal(result.report.revision, null);
      assert.equal(result.report.validation.snapshotCreated, false);
      assert.equal(result.report.input.sha256, digest(bytes));
      assert.equal(result.report.checks.validation, 'passed');
      assert.equal(result.report.checks.compilation, 'passed');
      assert.equal(result.report.checks.layout, 'not-run');
      assert.equal(result.report.layout, undefined);
      assert.deepEqual(result.report.artifacts, []);
      assert.deepEqual(await readFile(input), bytes);
      await assert.rejects(access(history));
    }
    return { diagramFilesWritten: 0, sourceUnchanged: true, browser: 'not-run', scope: 'Structural and compilation checks; geometry is optional, visual judgment belongs to the viewer.' };
  }],
  ['field-and-compilation-failures', async () => {
    const input = await saveInput('invalid', { ...base, edges: [{ id: 'bad', from: 'unknown', to: 'absent' }] });
    const invalid = await command(['author', '--input', input, '--name', 'invalid', '--browser', 'none']);
    assert.equal(invalid.code, 1);
    assert.equal(invalid.report.checks.validation, 'failed');
    assert.ok(invalid.report.diagnostics.some((issue) => issue.location === 'edges[0].from'));
    await verifySaved(invalid);
    const compileInput = await saveInput('compile', { ...base, nodes: [{ id: 'a', kind: 'rect', x: 0, y: 0, width: 50, height: 50 }, { id: 'b', kind: 'rect', x: 1e308, y: 0, width: 50, height: 50 }],
      edges: [{ id: 'e', from: 'a', to: 'b' }], scenes: [{ id: 's', label: 'send', beats: [{ durationMs: 1000, actions: [{ type: 'flow', target: 'e', direction: 'forward' }] }] }] });
    const compile = await command(['author', '--browser', 'none', '--input', compileInput, '--name', 'compile']);
    assert.equal(compile.code, 1);
    assert.equal(compile.report.checks.validation, 'passed');
    assert.equal(compile.report.checks.compilation, 'failed');
    await verifySaved(compile);
  }],
  ['optional-geometry-facts-and-counterexamples', async () => {
    const nodes = [
      { id: 'g', kind: 'group', x: 20, y: 20, width: 300, height: 250 },
      { id: 'a', parentId: 'g', kind: 'rect', x: 20, y: 50, width: 100, height: 60, label: '很长的中文说明文字'.repeat(20) },
      { id: 'b', parentId: 'g', kind: 'rect', x: 80, y: 50, width: 100, height: 60 },
      { id: 'outside', parentId: 'g', kind: 'rect', x: 280, y: 100, width: 100, height: 60 },
      { id: 'clip', kind: 'rect', x: 470, y: 330, width: 100, height: 60 }
    ];
    const input = await saveInput('warnings', { ...base, viewport: { width: 500, height: 400 }, nodes, edges: [], scenes: [] });
    const result = await command(['author', '--input', input, '--name', 'warnings', '--browser', 'none', '--geometry', '--checkpoint']);
    assert.equal(result.code, 0);
    for (const code of ['text-overflow', 'node-overlap', 'child-outside-parent', 'canvas-clipping']) hasDiagnostic(result.report, code);
    assert.equal(result.report.checks.layout, 'computed');
    assert.ok(result.report.diagnostics.filter((item) => item.stage === 'layout').every((item) => item.severity === 'info' && item.method && item.limitations));
    assert.equal(result.report.completion.quality, undefined);
    await verifySaved(result);
    assert.equal(await readFile(input, 'utf8'), await readFile(join(result.report.revision.directory, 'diagram.json'), 'utf8'));
    const negative = await saveInput('negative', { ...base, viewport: { width: 500, height: 400 }, nodes: [nodes[0], { ...nodes[1], label: '短' }, { ...nodes[2], x: 120 }, { id: 'hidden', kind: 'rect', x: -10, y: 0, width: 500, height: 500, visible: false }],
      scenes: [{ id: 'focus', label: '局部', beats: [{ durationMs: 500, actions: [{ type: 'focus', target: 'a' }] }, { durationMs: 500, actions: [{ type: 'hide', target: 'g' }] }] }] });
    const noWarnings = await command(['validate', '--input', negative, '--name', 'negative', '--geometry']);
    assert.equal(noWarnings.code, 0);
    assert.deepEqual(noWarnings.report.diagnostics, []);
  }],
  ['explicit-checkpoints-and-current-retry-protection', async () => {
    const parent = join(root, '.diagrams/.history/warnings/v001');
    const reportBytes = await readFile(join(parent, 'report.json'));
    await writeFile(join(parent, 'diagram.html'), 'USER EXTERNAL EDIT');
    const revised = await command(['author', '--from', 'v001', '--name', 'warnings', '--checkpoint', '--geometry', '--browser', 'none']);
    assert.equal(revised.code, 0);
    assert.equal(revised.report.revision.parent, 'v001');
    hasDiagnostic(revised.report, 'canvas-clipping');
    assert.equal(revised.report.revision.id, 'v002');
    assert.equal(await readFile(join(parent, 'diagram.html'), 'utf8'), 'USER EXTERNAL EDIT');
    assert.deepEqual(await readFile(join(parent, 'report.json')), reportBytes);
    const invalid = await saveInput('invalid retry', { version: 1 });
    const failed = await command(['author', '--browser', 'none', '--input', invalid, '--name', 'failed retry']);
    assert.equal(failed.code, 1);
    assert.equal(failed.report.workingDraft.id, 'current');
    assert.equal(JSON.parse(await readFile(join(failed.report.revision.directory, 'report.json'))).status, 'failed');
    const good = await saveInput('good retry');
    const retried = await command(['author', '--browser', 'none', '--input', good, '--name', 'failed retry']);
    assert.equal(retried.code, 0);
    assert.equal(retried.report.workingDraft.directory, failed.report.workingDraft.directory);
    assert.deepEqual(await readdir(join(root, '.diagrams/.history/failed retry')), ['current']);
  }],
];

const browserArtifacts = [
  ['review-template-and-no-write-preflight', async () => {
    const name = 'review-template';
    const workspace = join(root, '.diagrams/.work', name, 'acceptance');
    const history = join(workspace, 'history');
    const input = await saveInput(name, { ...base, scenes: [] });
    const source = await command(['author', '--input', input, '--name', name, '--output', history, '--browser', browserPath, '--formal-review']);
    assert.equal(source.code, 0);
    const template = join(workspace, 'html-review.json');
    const form = await command(['review-template', '--name', name, '--from', 'v001', '--output', history, '--kind', 'html', '--template', template]);
    assert.equal(form.code, 0);
    const review = JSON.parse(await readFile(template, 'utf8'));
    assert.equal(review.viewed, false);
    assert.equal(review.reviewer, '');
    assert.equal(review.states[0].sha256, source.report.htmlInspection.states[0].sha256);
    const before = await readFile(join(source.report.revision.directory, 'report.json'));
    const rejected = await command(['author', '--name', name, '--from', 'v001', '--output', history, '--html-review', template, '--browser', browserPath]);
    assert.equal(rejected.code, 1);
    assert.equal(rejected.report.revision, null);
    assert.deepEqual((await readdir(join(history, name))).filter((entry) => /^v\d+$/u.test(entry)), ['v001']);
    assert.deepEqual(await readFile(join(source.report.revision.directory, 'report.json')), before);
    assert.doesNotMatch(rejected.stderr, /<launched> pid=/u);
    review.reviewer = 'synthetic contract fixture; not visual acceptance';
    review.viewed = true;
    for (const state of review.states) state.observations = { readingOrder: 'Fixture.', density: 'Fixture.', occlusion: 'Fixture.', narrative: 'Fixture.' };
    await writeFile(template, JSON.stringify(review));
    const reviewed = await command(['review', '--name', name, '--from', 'v001', '--output', history, '--html-review', template], { env: { FLOWSVG_CACHE_DIR: input } });
    assert.equal(reviewed.code, 0);
    assert.equal(reviewed.report.revision, null);
    assert.match(reviewed.report.record.id, /^review-[a-f0-9]{64}$/u);
    assert.doesNotMatch(reviewed.stderr, /<launched> pid=/u);
    const repeated = await command(['review', '--name', name, '--from', 'v001', '--output', history, '--html-review', template], { env: { FLOWSVG_CACHE_DIR: input } });
    assert.equal(repeated.code, 0);
    assert.equal(repeated.report.record.id, reviewed.report.record.id);
    assert.equal(repeated.report.record.reused, true);
    assert.deepEqual(await readFile(join(source.report.revision.directory, 'report.json')), before);
    return { actualViewing: 'not-performed; synthetic fixture attestations are not acceptance', invalidSubmissionNewFiles: 0, independentRecord: reviewed.report.record.id, repeatReused: true };
  }],
  ['independent-formal-image-review', async () => {
    const name = 'formal-review';
    const workspace = join(root, '.diagrams/.work', name, 'acceptance');
    const history = join(workspace, 'history');
    const input = await saveInput(name, { ...base, scenes: [] });
    const source = await command(['author', '--input', input, '--name', name, '--output', history, '--svg', '--png', '--background', 'transparent', '--browser', browserPath, '--formal-review']);
    assert.equal(source.code, 0);
    const artifacts = source.report.artifacts.filter((item) => ['svg', 'png'].includes(item.kind));
    const settings = join(workspace, 'settings.json');
    await writeFile(settings, JSON.stringify({ items: artifacts.flatMap((item) => [
      { artifactId: item.artifactId, displayWidth: 300, backdrop: '#ffffff' },
      { artifactId: item.artifactId, displayWidth: 600, backdrop: '#111827' }
    ]) }));
    const captured = await command(['evidence', '--name', name, '--from', 'v001', '--output', history, '--artifact-preview-settings', settings, '--browser', browserPath]);
    assert.equal(captured.code, 0);
    assert.equal(captured.report.revision, null);
    assert.equal(captured.report.artifactEvidence.items.length, 4);
    const evidenceId = captured.report.record.id;
    const reuse = await command(['evidence', '--name', name, '--from', 'v001', '--output', history, '--browser', '/missing/browser'], { env: { FLOWSVG_CACHE_DIR: input } });
    assert.equal(reuse.code, 0);
    assert.equal(reuse.report.status, 'evidence-reused');
    assert.equal(reuse.report.artifacts.length, 0);
    assert.doesNotMatch(reuse.stderr, /<launched> pid=|Capturing|Preparing the isolated/u);
    const path = join(workspace, 'artifact-review.json');
    const generated = await command(['review-template', '--name', name, '--from', 'v001', '--evidence-from', evidenceId, '--output', history, '--kind', 'artifact', '--template', path]);
    assert.equal(generated.code, 0);
    const form = JSON.parse(await readFile(path));
    assert.equal(form.viewed, false);
    form.viewed = true;
    form.reviewer = 'synthetic contract fixture; not visual acceptance';
    for (const item of form.items) item.observations = { readingOrder: 'Fixture.', density: 'Fixture.', occlusion: 'Fixture.', narrative: 'Fixture.' };
    await writeFile(path, JSON.stringify(form));
    const before = await readFile(join(source.report.revision.directory, 'report.json'));
    const args = ['review', '--name', name, '--from', 'v001', '--evidence-from', evidenceId, '--output', history, '--artifact-review', path];
    const reviewed = await command(args, { env: { FLOWSVG_CACHE_DIR: input } });
    assert.equal(reviewed.code, 0);
    assert.equal(reviewed.report.revision, null);
    assert.equal(reviewed.report.visual.artifactReviews.length, 4);
    assert.doesNotMatch(reviewed.stderr, /<launched> pid=|Preparing the isolated/u);
    const repeated = await command(args, { env: { FLOWSVG_CACHE_DIR: input } });
    assert.equal(repeated.code, 0);
    assert.equal(repeated.report.record.reused, true);
    assert.deepEqual(await readFile(join(source.report.revision.directory, 'report.json')), before);
    assert.equal((await readdir(join(history, name))).filter((entry) => /^v\d+$/u.test(entry)).length, 1);
    const originalSvg = await readFile(join(source.report.revision.directory, 'diagram.svg'));
    const originalPng = await readFile(join(source.report.revision.directory, 'diagram.png'));
    const finalized = await command(['finalize', '--name', name, '--workspace', workspace, '--from', 'v001']);
    assert.equal(finalized.code, 0);
    const summary = JSON.parse(await readFile(join(root, '.diagrams', name, 'report.json')));
    assert.equal(summary.visual.surfaces.length, 4);
    assert.ok(summary.visual.surfaces.every((item) => item.artifactSourceRevision === 'v001' && item.evidenceSource.id === evidenceId));
    assert.deepEqual(await readFile(join(root, '.diagrams', name, 'diagram.svg')), originalSvg);
    assert.deepEqual(await readFile(join(root, '.diagrams', name, 'diagram.png')), originalPng);
    return { surfaces: 4, evidenceSource: evidenceId, repeatedEvidence: 'no-runtime-browser-or-writes', independentRecord: reviewed.report.record.id, repeated: 'reused', browserDuringReview: 'not-run', actualViewing: 'not-performed; synthetic attestations are not acceptance' };
  }],
  ['compiled-beat-screenshot-sampling', async () => {
    const input = await saveInput('compiled beats', { ...base, viewport: { width: 820, height: 320 }, nodes: [
      { id: 'a', kind: 'roundedRect', x: 20, y: 100, width: 180, height: 160 },
      { id: 'b', kind: 'roundedRect', x: 620, y: 100, width: 180, height: 160 }
    ], edges: [{ id: 'request', from: 'a', to: 'b', fromPort: 'right', toPort: 'left' }], scenes: [
      { id: 'request', label: '发送', beats: [{ durationMs: 40, actions: [{ type: 'flow', target: 'request', direction: 'forward' }] }] },
      { id: 'response', label: '返回', beats: [{ durationMs: 1000, transitionMs: 400, actions: [{ type: 'updateNode', target: 'b', value: { label: '完成', x: 580 } }] }] }
    ] });
    const result = await command(['author', '--input', input, '--name', 'compiled beats', '--browser', browserPath]);
    assert.equal(result.code, 0);
    assert.ok(result.report.compilation.totalDurationMs > 1040);
    const secondStart = result.report.compilation.beats[1].startMs;
    const points = result.report.htmlInspection.plan.points;
    assert.ok(points.some((point) => point.timeMs === secondStart && point.reasons.includes('content-change')));
    assert.ok(points.some((point) => point.timeMs === secondStart + 200 && point.reasons.includes('transition-midpoint')));
    assert.equal(result.report.htmlInspection.states.length, points.length);
    assert.deepEqual(result.report.visual.capturedFrames, []);
    const again = await command(['author', '--input', input, '--name', 'compiled beats', '--browser', 'none']);
    assert.deepEqual(again.report.htmlInspection.plan, result.report.htmlInspection.plan);
    assert.equal(again.report.revision.directory, result.report.revision.directory);
    assert.equal(result.report.completion.quality, undefined);
    await resourcesReleased(result);
    return { compiledDurationMs: result.report.compilation.totalDurationMs, authorDurationMs: 1040, points };
  }],
  ['prepared-browser-and-real-artifacts', async () => {
    const { chromium: installedChromium } = await import(pathToFileURL(join(prepared.directory, 'node_modules/playwright-core/index.mjs')).href);
    chromium = installedChromium;
    const input = await saveInput('browser artifacts');
    const settings = join(root, 'gif options.json');
    await writeFile(settings, JSON.stringify({ startMs: 700, endMs: 1000, fps: 2, width: 400, captionHeight: 60, finalHoldMs: 200 }));
    const result = await command(['author', '--input', input, '--name', 'browser artifacts', '--svg', '--time', '1000', '--gif', '--gif-options', settings, '--browser', browserPath, '--preview', '--checkpoint']);
    assert.equal(result.code, 0);
    assert.equal(result.report.completion.delivery, 'complete');
    assert.equal(result.report.checks.visual, 'not-run');
    assert.ok(result.report.visual.capturedFrames.length > 0);
    assert.deepEqual(result.report.visual.viewedFrames, []);
    await verifySaved(result);
    const files = [];
    for (const artifact of result.report.artifacts) {
      const bytes = await readFile(artifact.path);
      files.push({ kind: artifact.kind, bytes: bytes.length, sha256: digest(bytes) });
    }
    for (const frame of result.report.visual.capturedFrames) {
      const bytes = await readFile(frame.path);
      assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
      assert.equal(digest(bytes), frame.sha256);
      assert.equal(frame.fonts.ready, true);
      assert.equal(frame.fonts.glyphCoverage, 'not-verified');
    }
    const points = result.report.visual.plan.points;
    assert.ok(points.some((point) => point.timeMs === 600 && point.reasons.includes('transition-midpoint')));
    assert.ok(points.some((point) => point.timeMs === 1000 && point.reasons.includes('final')));
    const svg = await readFile(join(result.report.revision.directory, 'diagram.svg'), 'utf8');
    assert.match(svg, /<rect[^>]*rx="\d+"[^>]*data-id="group"/u);
    const gif = await readFile(join(result.report.revision.directory, 'diagram.gif'));
    assert.equal(gif.subarray(0, 6).toString(), 'GIF89a');
    assert.equal(gif.readUInt16LE(6), 400);
    assert.equal(gif.readUInt16LE(8), 260);
    assert.equal(gif.at(-1), 0x3b);
    await resourcesReleased(result);
    return { artifacts: files, frames: result.report.visual.capturedFrames.map(({ timeMs, view, sha256, fonts }) => ({ timeMs, view, sha256, fonts })) };
  }],
  ['offline-paused-playback-svg-and-gif-decoding', async () => {
    const browser = await chromium.launch({ executablePath: browserPath, headless: true });
    try {
      evidence.browser = { path: browserPath, version: browser.version(), preparedBy: 'caller; tool downloads disabled' };
      const context = await browser.newContext({ offline: true });
      const page = await context.newPage();
      const requests = [];
      const errors = [];
      page.on('request', (request) => { if (/^https?:/u.test(request.url())) requests.push(request.url()); });
      page.on('pageerror', (error) => errors.push(error.message));
      const directory = join(root, '.diagrams/.history/browser artifacts/v001');
      await page.goto(pathToFileURL(join(directory, 'diagram.html')).href);
      await page.locator('svg').waitFor();
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.getByRole('button', { name: 'Play', exact: true }).count(), 1);
      assert.equal(await page.getByRole('slider', { name: 'Progress' }).inputValue(), '0');
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await page.waitForFunction(() => Number(document.querySelector('input[aria-label="Progress"]')?.value) > 0);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.goto(pathToFileURL(join(directory, 'diagram.svg')).href);
      assert.ok(Number(await page.locator('rect[data-id="group"]').getAttribute('rx')) > 0);
      await page.goto(pathToFileURL(join(directory, 'diagram.gif')).href);
      await page.locator('img').waitFor();
      const decoded = await page.evaluate(async () => {
        const image = document.querySelector('img');
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        return { width: image.naturalWidth, height: image.naturalHeight, pixel: Array.from(context.getImageData(280, 60, 1, 1).data) };
      });
      assert.equal(decoded.width, 400);
      assert.equal(decoded.height, 260);
      // GIF palette quantization may shift channels; verify the requested blue state, not exact pixels.
      assert.ok(decoded.pixel[2] > MIN_BLUE_CHANNEL && decoded.pixel[0] < MAX_OTHER_CHANNEL && decoded.pixel[1] < MAX_OTHER_CHANNEL && decoded.pixel[3] === OPAQUE_ALPHA);
      assert.deepEqual(errors, []);
      assert.deepEqual(requests, []);
    } finally { await browser.close(); }
  }],
];

const failureChecks = [
  ['historical-extra-export-protection', async () => {
    const directory = join(root, '.diagrams/.history/browser artifacts/v001');
    const names = ['diagram.json', 'diagram.html', 'diagram.gif', 'report.json', 'report.md'];
    const before = await Promise.all(names.map((name) => readFile(join(directory, name))));
    const settings = join(root, 'history gif options.json');
    await writeFile(settings, JSON.stringify({ fps: 2, width: 400, includeCaptions: false }));
    const result = await command(['author', '--from', 'v001', '--name', 'browser artifacts', '--gif', '--gif-options', settings, '--browser', browserPath, '--checkpoint']);
    assert.equal(result.code, 0);
    assert.equal(result.report.revision.id, 'v002');
    assert.equal(result.report.revision.parent, 'v001');
    const after = await Promise.all(names.map((name) => readFile(join(directory, name))));
    assert.deepEqual(after, before);
    assert.equal(digest(before[0]), result.report.input.sha256);
    await resourcesReleased(result);
    await verifySaved(result);
  }],
  ['no-browser-degradation-and-requested-gif-incomplete', async () => {
    const input = await saveInput('no browser');
    const normal = await command(['author', '--input', input, '--name', 'no browser', '--browser', 'none', '--svg']);
    assert.equal(normal.code, 0);
    assert.equal(normal.report.checks.visual, 'not-run');
    assert.equal(normal.report.completion.delivery, 'complete');
    const gif = await command(['author', '--from', 'current', '--name', 'no browser', '--gif', '--browser', 'none']);
    assert.equal(gif.code, 1);
    assert.equal(gif.report.workingDraft.id, 'current');
    assert.equal(gif.report.completion.delivery, 'incomplete');
    hasDiagnostic(gif.report, 'GIF_BROWSER_UNAVAILABLE');
    assert.ok(!gif.report.artifacts.some((artifact) => artifact.kind === 'gif'));
    await verifySaved(gif);
  }],
  ['real-browser-gif-failure-cleans-resources', async () => {
    const input = await saveInput('overflow');
    const settings = join(root, 'overflow options.json');
    await writeFile(settings, JSON.stringify({ fps: 1, captionHeight: 1 }));
    const result = await command(['author', '--input', input, '--name', 'overflow', '--gif', '--gif-options', settings, '--browser', browserPath]);
    assert.equal(result.code, 1);
    hasDiagnostic(result.report, 'GIF_CAPTION_OVERFLOW');
    assert.equal(result.report.completion.delivery, 'incomplete');
    assert.ok(result.report.htmlInspection.states.length > 0);
    await resourcesReleased(result);
    await verifySaved(result);
  }],
  ['screenshot-failure-preserves-static-files', async () => {
    const input = await saveInput('screenshot crash');
    const result = await command(['author', '--input', input, '--name', 'screenshot crash', '--browser', browserPath, '--preview'], { interrupt: { at: 'Capturing screenshot', browser: true } });
    assert.equal(result.interrupted, true);
    assert.equal(result.code, 1);
    hasDiagnostic(result.report, 'PREVIEW_FAILED');
    assert.equal(result.report.completion.delivery, 'complete');
    await resourcesReleased(result);
    await verifySaved(result);
  }],
  ['graceful-cancellation-and-resource-release', async () => {
    if (process.platform === 'win32') return { status: 'not-run', reason: 'Node child.kill(SIGINT) force-terminates Windows children. A real console Ctrl+C runner is required; forced termination does not establish graceful cancellation.' };
    const input = await saveInput('cancel', { ...base, scenes: [{ id: 'long', label: 'Cancel', beats: [{ durationMs: 60000, caption: 'Cancel', actions: [] }] }] });
    const settings = join(root, 'cancel options.json');
    await writeFile(settings, JSON.stringify({ fps: 30, width: 400, includeCaptions: false }));
    const result = await command(['author', '--input', input, '--name', 'cancel', '--gif', '--gif-options', settings, '--browser', browserPath], { interrupt: { at: '"phase":"sampling"' } });
    assert.equal(result.interrupted, true);
    assert.equal(result.code, 1);
    assert.equal(result.report.status, 'cancelled');
    assert.equal(result.report.completion.delivery, 'incomplete');
    assert.ok(!result.report.artifacts.some((artifact) => artifact.kind === 'gif'));
    await resourcesReleased(result);
    await verifySaved(result);
  }],
  ['application-and-original-input-unchanged', async () => {
    assert.equal(await readFile(join(root, 'package.json'), 'utf8'), '{"dependencies":{"flowsvg":"0.0.0"}}');
    assert.equal(await readFile(join(root, 'package-lock.json'), 'utf8'), 'application lock unchanged');
    assert.equal(await readFile(join(root, 'browser artifacts.json'), 'utf8'), JSON.stringify(base, null, 2) + '\n');
  }],
];

/** Missing environment evidence prevents execution rather than silently reducing the matrix. */
async function main() {
  if (!browserPath) evidence.checks.push({ id: 'prepared-browser', status: 'not-run', reason: 'Supply --browser with prepared Chrome/Chromium. The tool never downloads browsers.' });
  if (!node18) evidence.checks.push({ id: 'node18-rejection', status: 'not-run', reason: 'Supply --node18 with a real Node18 executable.' });
  if (evidence.checks.length) return;
  root = await realpath(await mkdtemp(join(tmpdir(), 'FlowSVG 独立 acceptance ')));
  skill = join(root, 'installed skill');
  cache = join(root, '缓存 cache');
  evidence.consumerDirectory = root;
  await cp(resolve(values.skill ?? 'skills/flow-diagram'), skill, { recursive: true });
  await mkdir(join(root, 'browser temp'));
  await writeFile(join(root, 'package.json'), '{"dependencies":{"flowsvg":"0.0.0"}}');
  await writeFile(join(root, 'package-lock.json'), 'application lock unchanged');
  evidence.harnessSha256 = digest(await readFile(new URL(import.meta.url)));
  evidence.manifestSha256 = digest(await readFile(join(skill, 'runtime/manifest.json')));
  for (const [id, run] of [...environmentChecks, ...diagnosisChecks, ...browserArtifacts, ...failureChecks]) await check(id, run);
  evidence.status = evidence.checks.every((item) => item.status === 'passed') ? 'passed' : evidence.checks.some((item) => item.status === 'failed') ? 'failed' : 'incomplete';
}

try { await main(); }
catch (error) { evidence.checks.push({ id: 'harness-execution', status: 'failed', reason: error.message }); evidence.status = 'failed'; }
finally {
  evidence.finishedAt = new Date().toISOString();
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(evidence, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ status: evidence.status, output, checks: evidence.checks }) + '\n');
  process.exitCode = evidence.status === 'passed' ? 0 : 1;
}
