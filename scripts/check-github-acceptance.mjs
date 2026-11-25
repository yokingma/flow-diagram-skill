#!/usr/bin/env node
/**
 * Reuse the main-push acceptance gate for the exact release commit, or request a
 * fresh gate. GitHub API errors, missing jobs and bounded waits fall back to the
 * existing workflow; they never count as acceptance. Requires Node 20+.
 */
import assert from "node:assert/strict";
import { appendFileSync } from "node:fs";
import { setTimeout } from "node:timers/promises";
import { parseArgs } from "node:util";

const WORKFLOW_PATH = ".github/workflows/authoring-skill.yml";
const REQUIRED_JOBS = ["consumer (20)", "consumer (22)"];
const DEFAULT_WAIT_SECONDS = 900;
const DEFAULT_POLL_SECONDS = 15;
const REQUEST_TIMEOUT_MS = 10_000;
const PAGE_SIZE = 100;
const MILLISECONDS_PER_SECOND = 1000;

function readOptions() {
  const { values } = parseArgs({ options: {
    sha: { type: "string" }, "wait-seconds": { type: "string" }, "poll-seconds": { type: "string" },
  } });
  const repository = process.env.GITHUB_REPOSITORY;
  const waitSeconds = Number(values["wait-seconds"] ?? DEFAULT_WAIT_SECONDS);
  const pollSeconds = Number(values["poll-seconds"] ?? DEFAULT_POLL_SECONDS);
  assert.match(values.sha ?? "", /^[a-f0-9]{40}$/, "--sha must be a full commit SHA");
  assert.match(repository ?? "", /^[\w.-]+\/[\w.-]+$/, "GITHUB_REPOSITORY must identify owner/repository");
  assert.ok(Number.isFinite(waitSeconds) && waitSeconds >= 0, "--wait-seconds must be nonnegative");
  assert.ok(Number.isFinite(pollSeconds) && pollSeconds > 0, "--poll-seconds must be positive");
  return { sha: values.sha, repository, waitSeconds, pollSeconds };
}

async function request(repository, resource) {
  const base = process.env.GITHUB_API_URL ?? "https://api.github.com";
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  assert.ok(token, "GitHub token is required");
  const response = await fetch(`${base}/repos/${repository}/actions/${resource}`, {
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  assert.ok(response.ok, `GitHub API returned HTTP ${response.status}`);
  return response.json();
}

function matchesCandidate(run, options) {
  return run.head_sha === options.sha && run.head_branch === "main" && run.event === "push"
    && run.path === WORKFLOW_PATH && run.head_repository?.full_name === options.repository;
}

async function findMainRun(options) {
  const query = new URLSearchParams({ head_sha: options.sha, branch: "main", event: "push", per_page: String(PAGE_SIZE) });
  const data = await request(options.repository, `workflows/authoring-skill.yml/runs?${query}`);
  return data.workflow_runs.filter((run) => matchesCandidate(run, options))
    .sort((left, right) => right.id - left.id)[0];
}

async function requiredJobsPassed(run, repository) {
  assert.ok(Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0, "Missing run attempt");
  const jobs = [];
  for (let page = 1; ; page += 1) {
    const data = await request(repository,
      `runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=${PAGE_SIZE}&page=${page}`);
    assert.ok(Array.isArray(data.jobs) && Number.isSafeInteger(data.total_count), "Invalid jobs response");
    jobs.push(...data.jobs);
    if (jobs.length >= data.total_count) break;
    assert.ok(data.jobs.length > 0, "Incomplete jobs response");
  }
  return REQUIRED_JOBS.every((name) => jobs.some((job) => job.name === name
    && job.status === "completed" && job.conclusion === "success"));
}

async function checkAcceptance(options) {
  const selected = await findMainRun(options);
  if (!selected) return { reused: false, reason: "no-matching-main-run" };
  const deadline = Date.now() + options.waitSeconds * MILLISECONDS_PER_SECOND;
  while (true) {
    const run = await request(options.repository, `runs/${selected.id}`);
    if (!matchesCandidate(run, options) || run.id !== selected.id) {
      return { reused: false, reason: "main-run-identity-changed" };
    }
    const identity = { runId: run.id, runUrl: run.html_url };
    if (run.status === "completed") {
      if (run.conclusion !== "success") return { reused: false, reason: "main-run-unsuccessful", ...identity };
      const reused = await requiredJobsPassed(run, options.repository);
      return { reused, reason: reused ? "main-acceptance-passed" : "required-jobs-not-successful", ...identity };
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) return { reused: false, reason: "main-run-wait-expired", ...identity };
    console.error(`Waiting for main acceptance: ${run.html_url}`);
    await setTimeout(Math.min(options.pollSeconds * MILLISECONDS_PER_SECOND, remaining));
  }
}

try {
  const options = readOptions();
  // An unavailable prior result requests fresh acceptance rather than bypassing it.
  const result = await checkAcceptance(options).catch((error) => ({
    reused: false, reason: "api-unavailable", detail: error.message,
  }));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `reused=${result.reused}\n`);
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(`check-github-acceptance: ${error.message}`);
  process.exitCode = 1;
}
