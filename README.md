# peril

![GitHub](https://img.shields.io/github/license/jupiterone/peril)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/jupiterone/peril/Build)
![GitHub top language](https://img.shields.io/github/languages/top/jupiterone/peril)
![npm (scoped)](https://img.shields.io/npm/v/@jupiterone/peril)
![Docker Image Size (latest by date)](https://img.shields.io/docker/image-size/jupiterone/peril)
![OSS Lifecycle](https://img.shields.io/osslifecycle/jupiterone/peril)

Project Risk Analysis and Reporting Tool

This is a standalone CLI tool intended to analyze the overall risk profile for
the currently-checked-out branch of a code repository. It will draw risk
information from a configurable list of sources, including JupiterOne, before
rendering an overall risk verdict for the code.

Use-cases include:

- CI/CD gates
- Local development and remediation
- Security analysis and code review

## Usage

### Via NPM

```sh-session
$ npm install -g @jupiterone/peril
$ peril --help
JupiterOne Project Risk-Analysis and Reporting Tool

USAGE
  $ peril

OPTIONS
  -V, --version            Show CLI version
  -c, --config=config      Path to override config file
  -d, --dir=dir            [default: /Users/erichs/repos/jupiterone/peril] directory path to scan
  -h, --help               Show CLI help
  -l, --log=log            Path to output log file
  -m, --mergeRef=mergeRef  [default: master] Current git ref/tag of default branch (merge target)
  -p, --pubkeyDir=pubkeyDir  Full path to directory containing trusted public GPG keys
  -v, --verbose            Enable verbose output
  --accept                 Accept all risk (do not exit with non-zero status)
  --debug                  Debug mode, very verbose
  --noBanner               Do not display splash banner
  --override               Create a project override object
```

### Via Docker

```sh-session
docker run -v $PWD:/app -e 'J1_API_TOKEN=<token>' -e 'J1_ACCOUNT=<accountname>' jupiterone/peril peril --verbose --dir /app
```

## Assumptions

`peril` assumes that:

- You are using `git`.
- The present working directory is the top-level of the git project to be
  analyzed, or the `--dir` flag points to this top-level.

## Risk Scores

The Risk scores that `peril` produces are arbitrary. A more structured
calculation--the
[DREAD](https://en.wikipedia.org/wiki/DREAD_%28risk_assessment_model%29)
model--was considered but abandoned since that model lacks academic rigor and is
difficult to apply in a consistent fashion that produces sensible results.
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
`./test/fixtures/testConfig.ts` file, in JSON format, and specify a path to your
local config.json override with the `-c` | `--config` flag, e.g.:

```shell
peril --config ./path/to/my/config.json
```

NOTE: it is assumed that this override config file is trusted, and the code
`peril` is analyzing does not have permissions to write or modify this file!

Additionally, you may provide custom configuration via an executable script or
program that emits JSON on stdout. The path to this executable may also be
specified with the `--config` flag. An example script may be found at
`./test/fixtures/testConfig.sh`. Please ensure that the permissions to this
script or program are locked down prior to invoking with `peril --config`!

## Supported Checks

### SCM

Checks related to Git SCM:

| Check            | Config Path                        | Notes                                                               |
| ---------------- | ---------------------------------- | ------------------------------------------------------------------- |
| git              | values.checks.scm.git              | I think we can all agree code should be versioned.                  |
| enforceGpg       | values.checks.scm.enforceGpg       | Encourage code-signing at the repo-level.                           |
| verifyGpg        | values.checks.scm.verifyGpg        | Ensure recent commits have been signed.                             |
| gitleaksFindings | values.checks.scm.gitleaksFindings | Committing sensitive data to git is an information disclosure risk. |

### CODE

Checks related to the code being analyzed.

| Check           | Config Path                        | Notes                                                                                 |
| --------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| linesChanged    | values.checks.code.linesChanged    | Large PRs represent a strain on code reviewers, and increase risk of rubber-stamping. |
| filesChanged    | values.checks.code.filesChanged    | Large PRs represent a strain on code reviewers, and increase risk of rubber-stamping. |
| depscanFindings | values.checks.code.depscanFindings | 3rd-party dependency vulnerabilities represent a supply-chain risk. `**`              |

### PROJECT

Checks related to the Project (CodeRepo in JupiterOne).

| Check               | Config Path                               | Notes                                                                             |
| ------------------- | ----------------------------------------- | --------------------------------------------------------------------------------- |
| snykFindings        | values.checks.project.snykFindings        | 3rd-party dependency vulnerabilities represent a supply-chain risk. `++`          |
| maintenanceFindings | values.checks.project.maintenanceFindings | Overdue maintenance represents organizational risk. `@@`                          |
| threatModels        | values.checks.project.threatModels        | Encourage threat modeling activities. Add risk for unmitigated design flaws. `!!` |

#### Legend

| Symbol | Meaning                                                                                                                                                    |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `**`   | Requires local use of [ShiftLeft/sast-scan](https://github.com/ShiftLeftSecurity/sast-scan/) prior to invoking `peril`.                                    |
| `++`   | Requires the [Snyk integration](https://support.jupiterone.io/hc/en-us/articles/360024788554-Snyk) to be configured for JupiterOne.                        |
| `@@`   | Will add risk if the CodeRepo entity in JupiterOne relates to overdue [`deferred_maintenance`](https://github.com/JupiterOne/deferred-maintenance/) items. |
| `!!`   | Works with [OWASP Threat Dragon](http://docs.threatdragon.org/) models.                                                                                    |

## Manual Overrides

From time-to-time, it may be necessary or desirable to override the risk
calculations `peril` provides. Calling `peril --override` can be used locally to
create an override object that may be committed to the `.peril/` folder of the
target git repository.

To use this feature, you will need to be a trusted staff member authorized by
your business for this purpose. `peril` signs the override files with `gpg`, so
your public key will need to be provisioned in advance in CI/CD. See "Trusting
pubkeys" below.

### Generating a local override

1. Clone the target repo that is failing in CI/CD
2. Check out the target branch.
3. Issue `peril --override`
4. Answer the interactive prompts.
5. Commit the resulting file in the `.peril/` folder to git.
6. Push this change to the remote target branch.

### Trusting pubkeys in CI/CD

Provision your trusted pubkeys in a directory (in binary format, via
`gpg --export`) reachable by `peril` in CI/CD. This directory, and all pubkey
files within it MUST NOT be world writable. To enable the override feature, you
must invoke `peril` with the `--pubkeyDir` flag, and specify a full path to the
trusted pubkey directory you've previously provisioned.

For example, if your pubkeys are available in the `/usr/local/gpgkeys` directory
of your CI/CD host, you should specify the following parameter:

```sh-session
--pubkeyDir /usr/local/gpgkeys
```

If using `peril` with `docker`, you will likely need to mount this folder into
the container with the `-v` flag.

e.g.:

```sh-session
docker run -v /usr/local/gpgkeys:/gpgkeys -v $PWD:/app -e 'J1_API_TOKEN=<token>' -e 'J1_ACCOUNT=<accountname>' jupiterone/peril peril --verbose --dir /app --pubkeyDir /gpgkeys
```
