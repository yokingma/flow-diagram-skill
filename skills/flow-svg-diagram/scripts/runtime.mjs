/** Isolated, locked runtime preparation. Only complete, verified environments are reusable. */
import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { cp, mkdir, readFile, readdir, realpath, rename, stat, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const SKILL_ROOT = fileURLToPath(new URL("../", import.meta.url));
const LOCK_POLL_MS = 100;
const LOCK_TIMEOUT_MS = 120_000;
const OWNERLESS_GRACE_MS = 10_000;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Typed operational error; CLI diagnostics preserve stage, reason and recovery action. */
export class ToolError extends Error {
  constructor(stage, code, message, nextStep, location = "$", cause) {
    super(message, { cause });
    this.stage = stage; this.code = code; this.nextStep = nextStep; this.location = location;
  }
}

function findWindowsNpm() {
  const paths = [dirname(process.execPath), ...(process.env.PATH || "").split(delimiter)];
  for (const directory of paths) {
    const candidate = join(directory, "node_modules", "npm", "bin", "npm-cli.js");
    if (existsSync(candidate)) return candidate;
  }
  throw new ToolError("environment", "NPM_UNAVAILABLE", "npm CLI could not be located", "Install npm alongside Node and include its directory in PATH.");
}

/** Run npm without a shell; cancellation waits for the child to stop before cleanup. */
export function runNpm(args, cwd, signal) {
  return new Promise((resolveResult, reject) => {
    signal?.throwIfAborted();
    const invocation = process.platform === "win32" ? [process.execPath, [findWindowsNpm(), ...args]] : ["npm", args];
    const child = spawn(invocation[0], invocation[1], {
      cwd, shell: false, windowsHide: true, env: { ...process.env, npm_config_update_notifier: "false" }
    });
    let stdout = ""; let stderr = "";
    const abort = () => child.kill();
    signal?.addEventListener("abort", abort, { once: true });
    child.stdout.on("data", (bytes) => { stdout += bytes; });
    child.stderr.on("data", (bytes) => { stderr += bytes; });
    child.on("error", (cause) => {
      signal?.removeEventListener("abort", abort);
      reject(new ToolError("environment", "NPM_UNAVAILABLE", "npm could not start", "Install npm and make npm available on PATH.", "$", cause));
    });
    child.on("close", (code) => {
      signal?.removeEventListener("abort", abort);
      if (signal?.aborted) { reject(signal.reason); return; }
      if (code !== 0) {
        reject(new ToolError("environment", "INSTALL_FAILED", stderr.trim() || `npm exited with ${code}`,
          "Check cache write permissions, network access, registry availability and locked package integrity; then retry."));
        return;
      }
      resolveResult(stdout.trim());
    });
  });
}

/** Inspect prerequisites without importing the SDK or requiring an existing cache. */
export async function inspectEnvironment(signal) {
  if (Number(process.versions.node.split(".")[0]) < 20) {
    throw new ToolError("environment", "NODE_VERSION", `Node ${process.versions.node} is unsupported`, "Run this command with Node 20 or newer.");
  }
  return { node: process.versions.node, npm: await runNpm(["--version"], SKILL_ROOT, signal), platform: process.platform, architecture: process.arch };
}

function defaultCacheRoot() {
  if (process.platform === "darwin") return join(homedir(), "Library", "Caches", "flowsvg-authoring");
  if (process.platform === "win32") return join(process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"), "flowsvg-authoring", "Cache");
  return join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "flowsvg-authoring");
}

async function runtimeIdentity() {
  const source = join(SKILL_ROOT, "runtime");
  const manifestBytes = await readFile(join(source, "manifest.json"));
  const manifest = JSON.parse(manifestBytes);
  const lockBytes = await readFile(join(source, "package-lock.json"));
  const packageBytes = await readFile(join(source, "package.json"));
  const lock = JSON.parse(lockBytes);
  const lockedSdk = lock.packages?.["node_modules/flowsvg"];
  if (lockedSdk?.version !== manifest.sdk.version || lockedSdk.integrity !== manifest.sdk.integrity) {
    throw new ToolError("environment", "SDK_MANIFEST", "SDK manifest and lockfile disagree", "Restore the accepted runtime manifest and lockfile together.");
  }
  if (manifest.sdk.archive) {
    const archivePath = resolve(source, manifest.sdk.archive);
    const integrity = `sha512-${createHash("sha512").update(await readFile(archivePath)).digest("base64")}`;
    if (integrity !== manifest.sdk.integrity) throw new ToolError("environment", "SDK_INTEGRITY", "Bundled SDK archive integrity does not match the fixed baseline", "Restore the complete skill installation; do not substitute another SDK version.", archivePath);
  }
  const releaseFiles = await fileInventory(join(SKILL_ROOT, "scripts"));
  const identity = hash(Buffer.concat([manifestBytes, lockBytes, packageBytes, await readFile(join(source, "resolve.mjs")),
    Buffer.from(JSON.stringify(releaseFiles)), Buffer.from(`${process.platform}/${process.arch}`)]));
  const base = resolve(process.env.FLOWSVG_CACHE_DIR || defaultCacheRoot());
  return { source, manifest, directory: join(base, identity), identity, base };
}

async function fileInventory(directory, prefix = "") {
  const result = {};
  const entries = await readdir(join(directory, prefix), { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(result, await fileInventory(directory, relative));
    else if (entry.isFile()) result[relative] = hash(await readFile(join(directory, relative)));
  }
  return result;
}

async function inspectRuntime(directory, manifest) {
  const resolver = await import(pathToFileURL(join(directory, "resolve.mjs")).href);
  const entry = await realpath(fileURLToPath(resolver.resolvePublicEntry("flowsvg")));
  const expected = await realpath(join(directory, "node_modules", "flowsvg"));
  if (!entry.startsWith(expected + sep)) throw new Error("SDK entry resolved outside the isolated environment");
  const metadata = JSON.parse(await readFile(join(expected, "package.json"), "utf8"));
  if (metadata.version !== manifest.sdk.version) throw new Error(`Expected SDK ${manifest.sdk.version}, received ${metadata.version}`);
  return { ...manifest.sdk, path: expected, entry, baseline: manifest.baseline };
}

async function cachedRuntime(identity) {
  try {
    const receipt = JSON.parse(await readFile(join(identity.directory, "ready.json"), "utf8"));
    if (receipt.identity !== identity.identity) return null;
    for (const file of ["package.json", "package-lock.json", "manifest.json", "resolve.mjs"]) {
      const [cached, bundled] = await Promise.all([readFile(join(identity.directory, file)), readFile(join(identity.source, file))]);
      if (!cached.equals(bundled)) return null;
    }
    const inventory = await fileInventory(join(identity.directory, "node_modules"));
    if (JSON.stringify(inventory) !== JSON.stringify(receipt.files)) return null;
    return await inspectRuntime(identity.directory, identity.manifest);
  } catch { return null; } // An incomplete or altered cache is rebuilt under the installation lock.
}

function isProcessAlive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== "ESRCH"; }
}

async function lockOwnerIsDead(lock) {
  try {
    const owner = JSON.parse(await readFile(join(lock, "owner.json"), "utf8"));
    return Number.isInteger(owner.pid) && !isProcessAlive(owner.pid);
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
    try { return Date.now() - (await stat(lock)).mtimeMs > OWNERLESS_GRACE_MS; }
    catch (statError) { if (statError.code === "ENOENT") return false; throw statError; }
  }
}

async function recoverLock(lock) {
  const recovery = `${lock}.recovery`;
  try { await mkdir(recovery); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    if (await lockOwnerIsDead(recovery)) await rm(recovery, { recursive: true, force: true });
    return;
  }
  try {
    await writeFile(join(recovery, "owner.json"), JSON.stringify({ pid: process.pid }));
    // Re-read under a recovery mutex so another recovery cannot remove a new owner's lock.
    if (!await lockOwnerIsDead(lock)) return;
    await rm(lock, { recursive: true, force: true });
  } finally { await rm(recovery, { recursive: true, force: true }); }
}

async function acquireLock(identity, signal) {
  const lock = `${identity.directory}.lock`;
  const started = Date.now();
  while (true) {
    signal?.throwIfAborted();
    try {
      await mkdir(lock);
      await writeFile(join(lock, "owner.json"), JSON.stringify({ pid: process.pid }));
      return async () => rm(lock, { recursive: true, force: true });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      await recoverLock(lock);
      if (Date.now() - started > LOCK_TIMEOUT_MS) throw new ToolError("environment", "INSTALL_LOCK", "Runtime preparation lock is still held", `Wait for the active installer or inspect ${lock} before retrying.`);
      await delay(LOCK_POLL_MS, undefined, { signal });
    }
  }
}

async function removeAbandonedEnvironments(identity) {
  const prefix = `${identity.identity}.tmp-`;
  for (const entry of await readdir(identity.base)) {
    if (!entry.startsWith(prefix)) continue;
    const pid = Number(entry.slice(prefix.length).split("-")[0]);
    if (Number.isInteger(pid) && !isProcessAlive(pid)) await rm(join(identity.base, entry), { recursive: true, force: true });
  }
}

/** Prepare a pinned environment, then load public package entries from its verified location only. */
export async function prepareRuntime(signal) {
  const environment = await inspectEnvironment(signal);
  const identity = await runtimeIdentity();
  await mkdir(identity.base, { recursive: true });
  const cached = await cachedRuntime(identity);
  if (cached) return { environment, sdk: cached, directory: identity.directory, reused: true };
  const release = await acquireLock(identity, signal);
  const temporary = `${identity.directory}.tmp-${process.pid}-${randomUUID()}`;
  try {
    await removeAbandonedEnvironments(identity);
    const prepared = await cachedRuntime(identity);
    if (prepared) return { environment, sdk: prepared, directory: identity.directory, reused: true };
    process.stderr.write("Preparing the isolated FlowSVG runtime…\n");
    await cp(identity.source, temporary, { recursive: true });
    await runNpm(["ci", "--prefix", temporary, "--global=false", "--ignore-scripts", "--no-audit", "--no-fund", "--registry=https://registry.npmjs.org/"], temporary, signal);
    await inspectRuntime(temporary, identity.manifest);
    const files = await fileInventory(join(temporary, "node_modules"));
    await writeFile(join(temporary, "ready.json"), JSON.stringify({ identity: identity.identity, files }));
    signal?.throwIfAborted();
    await rm(identity.directory, { recursive: true, force: true });
    await rename(temporary, identity.directory);
    return { environment, sdk: await inspectRuntime(identity.directory, identity.manifest), directory: identity.directory, reused: false };
  } finally {
    await rm(temporary, { recursive: true, force: true });
    await release();
  }
}

/** Import a public SDK entry with resolution rooted at the isolated package manifest. */
export async function importSdk(runtime, subpath = "") {
  const resolver = await import(pathToFileURL(join(runtime.directory, "resolve.mjs")).href);
  const entry = await realpath(fileURLToPath(resolver.resolvePublicEntry(`flowsvg${subpath}`)));
  if (!entry.startsWith(runtime.sdk.path + sep)) throw new ToolError("environment", "SDK_SOURCE", "SDK resolved outside its expected cache", "Prepare the isolated runtime again.");
  return import(pathToFileURL(entry).href);
}

/** Diagnose cache availability without installing the SDK or downloading packages. */
export async function diagnoseRuntime(signal) {
  const environment = await inspectEnvironment(signal);
  const identity = await runtimeIdentity();
  await mkdir(identity.base, { recursive: true });
  const probe = join(identity.base, `.write-probe-${randomUUID()}`);
  try { await writeFile(probe, "", { flag: "wx" }); }
  catch (cause) { throw new ToolError("environment", "CACHE_PERMISSION", cause.message, "Select a writable FLOWSVG_CACHE_DIR or repair its permissions.", identity.base, cause); }
  finally { await rm(probe, { force: true }); }
  const sdk = await cachedRuntime(identity);
  let state = sdk ? "ready" : "missing";
  if (!sdk) {
    try { await stat(identity.directory); state = "invalid"; }
    catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return { status: "ready", stage: "environment", environment, sdk,
    runtime: { state, directory: identity.directory, expectedSdk: identity.manifest.sdk,
      nextStep: sdk ? "The complete cache can be reused offline." : "Run prepare or validate to install the pinned runtime; network access is required for uncached packages." },
    diagnostics: [], artifacts: [] };
}
