# peril

![GitHub](https://img.shields.io/github/license/jupiterone/peril)
![Snyk Vulnerabilities for npm package version](https://img.shields.io/snyk/vulnerabilities/npm/@jupiterone/peril)

JupiterOne Project Risk Analysis and Reporting Tool

This is a standalone CLI tool intended to analyze the overall risk profile
for the currently-checked-out branch of a code repository. It will draw risk
information from a configurable list of sources, including JupiterOne, before
rendering an overall risk verdict for the code.

Use-cases include:

* CI/CD gates
* Local development and remediation
* Security analysis and code review

## Usage

```sh-session
$ npm install -g @jupiterone/peril
$ peril COMMAND
running command...
$ peril (-v|--version|version)
@jupiterone/peril/0.0.1 darwin-x64 node-v12.18.3
$ peril --help [COMMAND]
USAGE
  $ peril COMMAND
...
```

## Risk Scores

The Risk scores that `peril` produces are arbitrary. A more structured
calculation--the
[DREAD](https://en.wikipedia.org/wiki/DREAD_%28risk_assessment_model%29)
model--was considered but abandoned since that model lacks academic rigor and
is difficult to apply in a consistent fashion that produces sensible results.
Instead, `peril` takes the position that since risk evaluation will always be
subjective, the values it uses should be inherently arbitrary and easily
configured for tuning purposes (see below). It is recommended to run `peril`
with the `--accept` flag for some time to gather scoring metrics that assist
with tuning.

While the scores are arbitrary, they are not meaningless: they do correlate
tightly with the configured checks/practices.

## Configuration

`peril` ships with default risk values out-of-the-box, but these are all
configurable. You may override any of the values or facts found in the
`./test/fixtures/testConfig.ts` file, in JSON format, and specify a path to
your local config.json override with the `-c` | `--config` flag, e.g.:

```shell
peril --config ./path/to/my/config.json
```

NOTE: it is assumed that this override config file is trusted, and the code
`peril` is analyzing does not have permissions to write or modify this file!

Additionally, you may provide custom configuration via an executable script
or program that emits JSON on stdout. The path to this executable may also be
specified with the `--config` flag. An example script may be found at
`./test/fixtures/testConfig.sh`. Please ensure that the permissions to this
script or program are locked down prior to invoking with `peril --config`!

## Checks Performed

### SCM

Checks related to Git SCM:

| Check | Config Path | Notes |
| ----- | ----------- | ----- |
| git   | values.checks.scm.git | I think we can all agree code should be versioned. |
| enforceGpg | values.checks.scm.enforceGpg | Encourage code-signing at the repo-level. |
| verifyGpg | values.checks.scm.verifyGpg | Ensure recent commits have been signed. |
| gitleaksFindings | values.checks.scm.gitleaksFindings | Committing sensitive data to git is an information disclosure risk. |

### CODE

Checks related to the code being analyzed.

| Check | Config Path | Notes |
| ----- | ----------- | ----- |
| linesChanged | values.checks.code.linesChanged | Large PRs represent a strain on code reviewers, and increase risk of rubber-stamping. |
| filesChanged | values.checks.code.filesChanged | Large PRs represent a strain on code reviewers, and increase risk of rubber-stamping. |
| depscanFindings | values.checks.code.depscanFindings | 3rd-party dependency vulnerabilities represent a supply-chain risk. `**` |

### PROJECT

Checks related to the Project (CodeRepo in JupiterOne).

| Check | Config Path | Notes |
| ----- | ----------- | ----- |
| snykFindings | values.checks.project.snykFindings | 3rd-party dependency vulnerabilities represent a supply-chain risk. `++`
| maintenanceFindings | values.checks.project.maintenanceFindings | Overdue maintenance represents organizational risk. `@@`
| threatModels | values.checks.project.threatModels | Encourage threat modeling activities. Add risk for unmitigated design flaws. `!!`

#### Legend

| Symbol | Meaning |
| ------ | ------- |
| `**`   | Requires local use of [ShiftLeft/sast-scan](https://github.com/ShiftLeftSecurity/sast-scan/) prior to invoking `peril`. |
| `++`   | Requires the [Snyk integration](https://support.jupiterone.io/hc/en-us/articles/360024788554-Snyk) to be configured for JupiterOne. |
| `@@`   | Will add risk if the CodeRepo entity in JupiterOne relates to overdue [`deferred_maintenance`](https://github.com/JupiterOne/deferred-maintenance/) items. |
| `!!`   | Works with [OWASP Threat Dragon](http://docs.threatdragon.org/) models.
