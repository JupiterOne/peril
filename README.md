# Project Risk Analyzer

This is an NPM module and standalone CLI tool intended to analyze the overall
risk profile for the currently-checked-out branch of a code repository. It
will draw risk information from a configurable list of sources, including
JupiterOne before rendering an overall risk verdict for the code.

Use-cases include:

* CI/CD gates
* Local development and remediation
* Security analysis and code review

## Design

`project-risk-analyzer` is a CLI-driven tool that gathers inputs from the local
filesystem, the ENV, and J1, and uses these inputs to calculate risk. The
tool assumes:

* Git is used for SCM.
* Its PWD is the top-level of the checked-out git repo it should analyze.
* The currently checked-out branch is the one to analyze.
* SAST scan output, if available, is located in JSON files within a ./reports dir.
* Other configuration (such as J1 token) is available via ENV.
