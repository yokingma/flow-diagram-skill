# Independent Skill releases

[Project](../README.md) · [Contributing](../CONTRIBUTING.md) · [Maintenance](development/flowsvg-skill-maintenance.md)

The GitHub repository distributes the Skill source and installation directory. The root package is private development tooling, not an npm distribution. The SDK has its own npm release cycle; publishing this Skill does not publish or upgrade `flowsvg`.

## Prepare a candidate

1. Select the exact candidate commit. Review `git status --short` and `git remote -v`; confirm the intended repository is `yokingma/flow-svg-diagram-skills`. Record the candidate commit in acceptance results.
2. Set the independent distribution version in root `package.json` and the root `CHANGELOG.md` when preparing a new version. Synchronize version statements in both READMEs and user guides. Runtime `toolVersion`, diagram format, and SDK baseline are separate contracts; change them only when their own contract changes.
3. Check source and license attribution in [snapshot provenance](snapshot-provenance.md). Root `LICENSE` and `skills/flow-svg-diagram/LICENSE` must match. Keep third-party package notices with those packages.
4. Verify that both README installation paths, user guides, examples, maintenance commands, and documentation links resolve from the candidate. Installed references, imports, metadata, and runtime resources must resolve inside a standalone copy of `skills/flow-svg-diagram/`.

The current `0.1.0` is an initial candidate version, not evidence that a matching Git tag or GitHub Release exists. Source publication and release acceptance are separate milestones.

## Verify the candidate

From a clean checkout with Node 20+ and pnpm `10.12.1`:

```sh
pnpm install --frozen-lockfile
pnpm test
```

For the complete browser run on macOS/Linux, supply a separately prepared browser and real Node 18 executable:

```sh
FLOWSVG_TEST_BROWSER="/path/to/chrome" FLOWSVG_TEST_NODE18="/path/to/node18" pnpm test:skill --maxWorkers=1
pnpm verify:consumer --browser "/path/to/chrome" --node18 "/path/to/node18" --output acceptance/evidence.json
```

In PowerShell, set the corresponding `$env:FLOWSVG_TEST_BROWSER` and `$env:FLOWSVG_TEST_NODE18` variables before the commands. Node 18 is only for testing rejection; run the suite itself with a supported Node version.

The complete regression and consumer gates must pass for each platform/runtime advertised as verified. Record actual execution, failures, skips, and unfinished checks. `pnpm test` without a browser is a useful partial run. It does not satisfy full browser acceptance. Inspect representative actual HTML/image outputs separately and record the viewed files, display conditions, and limits.


## Package and publish

GitHub's source archives contain the full repository; users install only `skills/flow-svg-diagram/`. An optional standalone archive should have this structure:

```text
flow-svg-diagram/
  LICENSE
  SKILL.md
  agents/
  scripts/
  references/
  examples/
  runtime/
```

Include every tracked file in that installation directory, including the npm lock and resolver. Exclude caches, `node_modules`, diagram workspaces, local tracker notes, and raw private evidence. Extract the intended archive outside the repository and rerun the documented `doctor`, browser-free `author`, and `finalize` flow before publishing. Verify that the extracted license matches the repository license.

After verification and maintainer authorization, tag the reviewed commit as `v<distribution-version>` and create a GitHub Release. Its notes should give the installation directory, requirements, exact SDK baseline, changes, verified environments, known limitations, and links to the corresponding checks. Attach a standalone archive only if that exact archive was tested; record its checksum. Keep release claims bounded by the evidence.

After publishing, check that the public repository, tag, release links, and downloadable archives are accessible, then update candidate wording in both READMEs, both user guides, the maintenance guide, provenance, and changelog to the factual release status. Preserve historical acceptance records as records of their original runs.
