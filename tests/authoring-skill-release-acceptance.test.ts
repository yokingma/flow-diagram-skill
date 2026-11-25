import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const EXECUTE = promisify(execFile);
const SCRIPT = resolve(import.meta.dirname, "../scripts/check-github-acceptance.mjs");
const SHA = "a".repeat(40);
const REPOSITORY = "owner/skill";
const WORKFLOW_PATH = ".github/workflows/authoring-skill.yml";
const RUN = {
  id: 42, head_sha: SHA, head_branch: "main", event: "push", path: WORKFLOW_PATH,
  head_repository: { full_name: REPOSITORY }, status: "completed", conclusion: "success",
  run_attempt: 2, html_url: "https://github.com/owner/skill/actions/runs/42",
};
const JOBS = [
  { name: "consumer (20)", status: "completed", conclusion: "success" },
  { name: "consumer (22)", status: "completed", conclusion: "success" },
];
type Run = typeof RUN;
type Job = typeof JOBS[number];
type Scenario = {
  runs?: Run[];
  polls?: Run[];
  jobs?: Job[];
  apiFailure?: boolean;
  waitSeconds?: string;
};

function createGitHubApi(scenario: Scenario, requests: string[]) {
  let poll = 0;
  return createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    requests.push(url.pathname + url.search);
    response.setHeader("Content-Type", "application/json");
    if (scenario.apiFailure) {
      response.writeHead(403).end('{"message":"rate limited"}');
      return;
    }
    if (url.pathname.endsWith("/workflows/authoring-skill.yml/runs")) {
      if (url.searchParams.get("head_sha") !== SHA || url.searchParams.get("branch") !== "main"
        || url.searchParams.get("event") !== "push") {
        response.writeHead(400).end("{}");
        return;
      }
      response.end(JSON.stringify({ workflow_runs: scenario.runs ?? [RUN] }));
      return;
    }
    const runId = url.pathname.match(/\/runs\/(\d+)$/)?.[1];
    if (runId) {
      const states = scenario.polls ?? [RUN];
      const run = runId === "42" ? states[Math.min(poll++, states.length - 1)]
        : scenario.runs?.find((candidate) => candidate.id === Number(runId));
      response.end(JSON.stringify(run));
      return;
    }
    if (/\/runs\/\d+\/attempts\/2\/jobs$/.test(url.pathname)) {
      const jobs = scenario.jobs ?? JOBS;
      response.end(JSON.stringify({ total_count: jobs.length, jobs }));
      return;
    }
    response.writeHead(404).end("{}");
  });
}

async function checkAcceptance(scenario: Scenario = {}) {
  const directory = await mkdtemp(join(tmpdir(), "release acceptance "));
  const requests: string[] = [];
  const server = createGitHubApi(scenario, requests);
  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Missing test API address");
    const output = join(directory, "outputs");
    const { stdout } = await EXECUTE(process.execPath, [SCRIPT, "--sha", SHA,
      "--wait-seconds", scenario.waitSeconds ?? "1", "--poll-seconds", "0.01"], {
      env: { ...process.env, GITHUB_REPOSITORY: REPOSITORY,
        GITHUB_API_URL: `http://127.0.0.1:${address.port}`, GH_TOKEN: "test-token", GITHUB_OUTPUT: output },
      timeout: 10_000,
    });
    return { result: JSON.parse(stdout), output: await readFile(output, "utf8"), requests };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  }
}

test("release reuses a successful main push only for the exact SHA and both Node gates", async () => {
  const { result, output, requests } = await checkAcceptance();
  expect(result).toMatchObject({ reused: true, runId: 42, runUrl: RUN.html_url });
  expect(output).toContain("reused=true\n");
  expect(requests.some((path) => path.endsWith("/runs/42/attempts/2/jobs?per_page=100&page=1"))).toBe(true);
});

test("release waits for an in-progress main run and uses its successful result", async () => {
  const { result, requests } = await checkAcceptance({
    runs: [{ ...RUN, status: "in_progress", conclusion: "" }],
    polls: [{ ...RUN, status: "in_progress", conclusion: "" }, RUN],
  });
  expect(result.reused).toBe(true);
  expect(requests.filter((path) => path.endsWith("/runs/42"))).toHaveLength(2);
});

test("release requests full acceptance when no matching main run exists", async () => {
  const { result, output } = await checkAcceptance({ runs: [] });
  expect(result).toMatchObject({ reused: false, reason: "no-matching-main-run" });
  expect(output).toContain("reused=false\n");
});

test.each([
  { head_sha: "b".repeat(40) }, { head_branch: "feature" }, { event: "pull_request" },
  { path: ".github/workflows/other.yml" }, { head_repository: { full_name: "fork/skill" } },
])("release ignores runs with a different identity: %j", async (change) => {
  const { result } = await checkAcceptance({ runs: [{ ...RUN, ...change }] });
  expect(result).toMatchObject({ reused: false, reason: "no-matching-main-run" });
});

test.each(["failure", "cancelled", "skipped", "timed_out"])(
  "release requests full acceptance for a %s main run", async (conclusion) => {
    const { result } = await checkAcceptance({ polls: [{ ...RUN, conclusion }] });
    expect(result).toMatchObject({ reused: false, reason: "main-run-unsuccessful" });
  },
);

test("release does not reuse an older success when a newer run failed", async () => {
  const { result } = await checkAcceptance({ runs: [{ ...RUN, id: 41 }, RUN],
    polls: [{ ...RUN, conclusion: "failure" }] });
  expect(result).toMatchObject({ reused: false, reason: "main-run-unsuccessful" });
});

test.each([
  JOBS.slice(0, 1),
  [JOBS[0], { ...JOBS[1], conclusion: "skipped" }],
  [JOBS[0], { ...JOBS[1], conclusion: "failure" }],
])("release requires both successful Node jobs: %j", async (...jobs: Job[]) => {
  const { result } = await checkAcceptance({ jobs });
  expect(result).toMatchObject({ reused: false, reason: "required-jobs-not-successful" });
});

test("release rechecks run identity while waiting", async () => {
  const { result } = await checkAcceptance({ polls: [{ ...RUN, head_sha: "b".repeat(40) }] });
  expect(result.reused).toBe(false);
});

test("release falls back after the main-run wait deadline", async () => {
  const { result } = await checkAcceptance({ waitSeconds: "0",
    polls: [{ ...RUN, status: "in_progress", conclusion: "" }] });
  expect(result).toMatchObject({ reused: false, reason: "main-run-wait-expired" });
});

test("release falls back to full acceptance when the GitHub API is unavailable", async () => {
  const { result } = await checkAcceptance({ apiFailure: true });
  expect(result).toMatchObject({ reused: false, reason: "api-unavailable" });
});
