// import { Config } from '../../src/types';
export const config = {
  env: {
    j1AuthToken: 'REDACTED',
    j1Account: 'j1test',
    logLevel: 'info'
  },
  flags: {
    verbose: true,
    dir: '/Users/test/repos/jupiterone/peril/reports',
    mergeRef: 'master'
  },
  facts: {
    scm: {
      branch: 'pr-100',
      remote: 'github',
      remoteUrl: 'git@github.com:JupiterOne/peril.git',
      gitPath: '/usr/local/bin/git',
      gpgPath: '/usr/local/bin/gpg'
    },
    code: {
      scans: {
        depScanReport: '/Users/test/repos/jupiterone/peril/reports/depscan-report-nodejs.json'
      }
    }
  },
  values: {
    checks: {
      code: {
        linesChanged: {
          riskStep: 100,
          riskValuePerStep: 1
        },
        filesChanged: {
          riskStep: 20,
          riskValuePerStep: 1
        },
        depscanFindings: {
          ignoreSeverityList: 'INFO, LOW',
          ignoreUnfixable: true,
          missingValue: 10
        }
      },
      scm: {
        git: {
          missingValue: 5
        },
        enforceGpg: {
          missingValue: 0.5
        },
        verifyGpg: {
          missingValue: 0.5
        }
      }
    }
  }
}
