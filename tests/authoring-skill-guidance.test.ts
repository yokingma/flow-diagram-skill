import { expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const read = (path: string) => readFile(resolve(path), "utf8");

test("authoring guidance keeps the source-scoped, decision-gated final delivery flow", async () => {
  const [skill, english, chinese] = await Promise.all([
    read("skills/flow-diagram/SKILL.md"),
    read("docs/guides/flow-diagram-guide.md"),
    read("docs/guides/flow-diagram-guide.zh-CN.md")
  ]);

  expect(skill).toContain("Start with the reader's question:");
  expect(skill).toContain("### 2. Design the visual explanation");
  expect(skill).toContain("Read the user's designated sources or existing diagram within the authorized scope");
  expect(skill).toContain("Clarify corrections that would change the explanation's meaning with the user");
  expect(skill).toContain("references/review-inputs.md");
  expect(skill).toContain("images actually viewed");
  expect(skill).toContain("Report file completion and quality coverage separately");
  expect(skill).toContain("record the unperformed checks and their impact explicitly");
  expect(skill).toContain(".diagrams/<diagram-name>/");

  expect(english).toContain("selected final diagram");
  expect(chinese).toContain("最终选定图解");
  expect(english).toContain(".diagrams/");
  expect(chinese).toContain(".diagrams/");

  expect(english).not.toContain("flowsvg-output/");
  expect(chinese).not.toContain("flowsvg-output/");
});
