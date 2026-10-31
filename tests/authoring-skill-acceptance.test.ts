/** The maintainer harness must fail closed when real acceptance prerequisites are absent. */
import { expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

test("acceptance records missing browser and Node18 as incomplete rather than a passing matrix", async () => {
  const directory = await mkdtemp(join(tmpdir(), "flowsvg-evidence-"));
  try {
    const output = join(directory, "result.json");
    const environment = Object.fromEntries(Object.entries(process.env).filter(([key]) => !["FLOWSVG_TEST_BROWSER", "FLOWSVG_TEST_NODE18"].includes(key)));
    const result = spawnSync(process.execPath, [resolve("scripts/verify-authoring-skill.mjs"), "--skill", resolve("skills/flow-svg-diagram"), "--output", output], { env: environment, encoding: "utf8" });
    expect(result.status).toBe(1);
    const evidence = JSON.parse(await readFile(output, "utf8"));
    expect(evidence.status).toBe("incomplete");
    expect(evidence.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "prepared-browser", status: "not-run" }),
      expect.objectContaining({ id: "node18-rejection", status: "not-run" })
    ]));
    expect(evidence.checks.some((check: { status: string }) => check.status === "passed")).toBe(false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
