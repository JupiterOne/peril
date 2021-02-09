# peril

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

<!-- usage -->
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
<!-- usagestop -->

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
configurable. You may override any of the values found in the
`defaultConfig.json` file in the root of the project, and specify a path to
your local config.json override with the `-c` flag, e.g.:

```shell
peril -c ./path/to/my/config.json
```
