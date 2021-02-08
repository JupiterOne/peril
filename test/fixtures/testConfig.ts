import { Config } from '../../src/types';

export const config: Config = {
  env: {
    j1AuthToken: 'REDACTED',
    j1Account: 'j1test',
    logLevel: 'info'
  },
  flags: {
    verbose: true,
    dir: '/Users/test/repos/jupiterone/peril/reports',
    mergeRef: 'master',
    config: '/Users/test/repos/jupiterone/peril/testConfig.json'
  },
  facts: {
    scm: {
      branch: 'pr-100',
      remote: 'github',
      remoteUrl: 'git@github.com:JupiterOne/peril.git',
      gitPath: '/usr/local/bin/git',
      gpgPath: '/usr/local/bin/gpg',
      scans: {
        gitleaksScanReport: '/Users/test/repos/jupiterone/peril/reports/credscan-report.sarif'
      }
    },
    code: {
      scans: {
        depScanReport: '/Users/test/repos/jupiterone/peril/reports/depscan-report-nodejs.json'
      }
    },
    j1: {},
    project: {
      name: 'peril'
    }
  },
  values: {
    riskTolerance: 20,
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
        },
        gitleaksFindings: {
          perFindingValue: 10
        }
      },
      project: {
        snykFindings: {
          ignoreNonUpgradables: true
        },
        maintenanceFindings: {
          daysLateRiskStep: 10,
          daysLateRiskValuePerStep: 5
        }
      }
    }
  }
}
