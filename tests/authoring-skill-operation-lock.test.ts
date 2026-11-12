/** Installed CLI processes compete through real task files; a preload controls filesystem scheduling only. */
import { expect, test } from "vitest";
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const preload = `import fs from 'node:fs/promises';
import {syncBuiltinESMExports} from 'node:module';
const read=fs.readFile,mkdirTemp=fs.mkdtemp;
let paused=false;
function pause(event){process.send(event);return new Promise(resolve=>process.once('message',resolve));}
fs.readFile=async function(path,...rest){
  const bytes=await read.call(this,path,...rest);
  if(!paused&&process.env.FLOWSVG_LOCK_TEST_ROLE==='first'&&String(path).endsWith('/.current.lock/owner.json')){
    paused=true;await pause('stale-read');
  }
  return bytes;
};
fs.mkdtemp=async function(prefix,...rest){
  if(!paused&&process.env.FLOWSVG_LOCK_TEST_ROLE==='second'&&String(prefix).includes('/.current-run-')){
    paused=true;await pause('owned');
  }
  return mkdirTemp.call(this,prefix,...rest);
};
syncBuiltinESMExports();`;

test("concurrent stale-owner retries cannot delete a newly acquired live operation lock", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "flowsvg-operation-race-")));
  const skill = join(root, "installed");
  const input = join(root, "draft.json");
  const series = join(root, "outputs", "race");
  const hook = join(root, "schedule.mjs");
  await cp(resolve("skills/flow-diagram"), skill, { recursive: true });
  await mkdir(join(series, ".current.lock"), { recursive: true });
  await writeFile(join(series, ".current.lock", "owner.json"), JSON.stringify({ pid: 2147483647 }));
  await writeFile(input, JSON.stringify({ version: 1, viewport: { width: 400, height: 240 }, nodes: [], edges: [], scenes: [] }));
  await writeFile(hook, preload);
  function launch(role: string) {
    const child = spawn(process.execPath, ["--import", hook, join(skill, "scripts/flowsvg.mjs"), "author", "--input", input,
      "--output", join(root, "outputs"), "--name", "race", "--browser", "none"], {
      cwd: root, env: { ...process.env, FLOWSVG_CACHE_DIR: join(root, "cache"), FLOWSVG_LOCK_TEST_ROLE: role }, stdio: ["ignore", "pipe", "pipe", "ipc"]
    });
    let output = "";
    child.stdout.on("data", (bytes) => { output += bytes; });
    child.stderr.resume();
    const event = new Promise<string>((done) => { child.once("message", (message) => done(String(message))); child.once("close", () => done("closed")); });
    const result = new Promise<{ code: number | null; output: string }>((done) => child.once("close", (code) => done({ code, output })));
    return { child, event, result };
  }
  const first = launch("first");
  let second: ReturnType<typeof launch> | undefined;
  try {
    expect(await first.event).toBe("stale-read");
    second = launch("second");
    const secondState = await second.event;
    first.child.send("continue");
    const firstResult = await first.result;
    if (secondState === "owned") {
      const owner = JSON.parse(await readFile(join(series, ".current.lock", "owner.json"), "utf8").catch(() => "null"));
      second.child.send("continue");
      expect(owner, "A paused live author must retain its operation lock").toMatchObject({ pid: second.child.pid });
    }
    const secondResult = await second.result;
    expect([firstResult, secondResult].filter((result) => result.code === 0), JSON.stringify([firstResult, secondResult])).toHaveLength(1);
    const recovery = join(series, ".current.lock.recovery");
    await mkdir(recovery);
    await writeFile(join(recovery, "owner.json"), JSON.stringify({ pid: 2147483647 }));
    await mkdir(join(series, ".current.lock"));
    await writeFile(join(series, ".current.lock", "owner.json"), JSON.stringify({ pid: 2147483647 }));
    const interrupted = await launch("interrupted").result;
    expect(interrupted.code, interrupted.output).toBe(1);
    expect(interrupted.output).toContain("Cannot reserve operation recovery");
    expect(JSON.parse(await readFile(join(recovery, "owner.json"), "utf8"))).toEqual({ pid: 2147483647 });
  } finally {
    first.child.kill("SIGKILL");
    second?.child.kill("SIGKILL");
    await Promise.all([first.result, ...(second ? [second.result] : [])]);
    await rm(root, { recursive: true, force: true });
  }
}, 60_000);
