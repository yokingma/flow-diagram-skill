import { expect, test } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const read = (path: string) => readFile(resolve(path), "utf8");

test("installed guidance routes shared design knowledge and keeps formal records conditional", async () => {
  const [skill, english, chinese, fidelity, contexts, preferences, viewing] = await Promise.all([
    read("skills/flow-diagram/SKILL.md"),
    read("docs/guides/flow-diagram-guide.md"),
    read("docs/guides/flow-diagram-guide.zh-CN.md"),
    read("skills/flow-diagram/references/source-fidelity.md"),
    read("skills/flow-diagram/references/delivery-contexts.md"),
    read("skills/flow-diagram/references/preferences.md"),
    read("skills/flow-diagram/references/visual-checks.md")
  ]);

  expect(skill.match(/^### [1-5]\. /gmu)).toHaveLength(5);
  expect(skill).toContain("Start with the reader's question:");
  for (const target of ["document-model.md", "visual-design.md#shared-quality-standards", "visual-design.md#choose-a-visual-direction", "visual-design.md#inspect-the-visual-design"]) {
    expect(skill).toContain(target);
  }
  expect(skill).toContain("Only an explicit request for traceable review or audit");
  expect(skill).toContain("files, dimensions and animation stages");
  expect(skill).toContain("one editable source draft");
  expect(skill).toContain("one `issues.md`");
  expect(skill).toContain("Design standards guide the work");
  expect(fidelity).toContain("Ask before a proposed change alters a fact");
  expect(contexts).toContain("Missing display conditions use the existing defaults");
  expect(preferences).toContain("preference writes still require explicit future-reuse intent");
  expect(viewing).toContain("No separate stage form or review submission");

  expect(english).toContain("selected final diagram");
  expect(chinese).toContain("最终选定图解");
  for (const guide of [english, chinese]) {
    expect(guide).toContain(".diagrams/");
    expect(guide).toContain("issues.md");
    expect(guide).not.toContain("flowsvg-output/");
  }
  for (const text of [skill, fidelity, contexts, preferences, viewing]) expect(text).not.toContain("--decisions");
});
