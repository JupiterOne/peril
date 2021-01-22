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
