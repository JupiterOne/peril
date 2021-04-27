import { Config } from '../../src/types';

export const config: Config = {
  env: {
    j1AuthToken: 'REDACTED',
    j1Account: 'j1test',
    logLevel: 'info',
    threatDragonDir: 'ThreatDragonModels',
  },
  flags: {
    verbose: true,
    dir: '/Users/test/repos/jupiterone/peril/reports',
    mergeRef: 'master',
    config: '/Users/test/repos/jupiterone/peril/testConfig.json',
    debug: false,
    accept: false,
    override: false,
    pubkeyDir: '',
  },
  facts: {
    scm: {
      branch: 'pr-100',
      remote: 'github',
      remoteUrl: 'git@github.com:JupiterOne/peril.git',
      gitPath: '/usr/local/bin/git',
      gpgPath: '/usr/local/bin/gpg',
      scans: {
        gitleaksScanReport:
          '/Users/test/repos/jupiterone/peril/reports/credscan-report.sarif',
      },
    },
    code: {
      scans: {
        depScanReport:
          '/Users/test/repos/jupiterone/peril/reports/depscan-report-nodejs.json',
        bomReport: '/Users/test/repos/jupiterone/peril/reports/bom-nodejs.json',
      },
    },
    j1: {},
    project: {
      threatDragonModels: [__dirname + '/threatDragon.json'],
      threatDragonModelsDir: 'ThreatDragonModels',
      name: 'peril',
    },
    override: {
      trustedPubKeysDir: '',
      trustedPubKeys: [],
      repoOverrides: [],
    },
  },
  values: {
    riskTolerance: 20,
    checks: {
      code: {
        linesChanged: {
          riskStep: 100,
          riskValuePerStep: 1,
        },
        filesChanged: {
          riskStep: 20,
          riskValuePerStep: 1,
        },
        depscanFindings: {
          ignoreSeverityList: 'INFO, LOW',
          ignoreUnfixable: true,
          ignoreIndirects: true,
          missingValue: 10,
          noVulnerabilitiesCredit: 0,
        },
        bannedLicenses: {
          /*
           * HIGH risk licenses sourced from:
           * - https://www.synopsys.com/blogs/software-security/top-open-source-licenses/
           */
          licenses: [
            '^GPL',
            '^LGPL',
            '^AGPL',
            'SSPL-1.0',
            '^CC BY-SA',
            'MS-RL',
            'EUPL-1.2',
            'CC-BY-NC-3.0',
          ],
          missingValue: 10,
          noVulnerabilitiesCredit: -5,
        },
      },
      scm: {
        git: {
          missingValue: 5,
        },
        enforceGpg: {
          missingValue: 0.5,
        },
        verifyGpg: {
          missingValue: 0.5,
        },
        gitleaksFindings: {
          perFindingValue: 10,
        },
      },
      project: {
        snykFindings: {
          ignoreNonUpgradables: true,
        },
        maintenanceFindings: {
          daysLateRiskStep: 10,
          daysLateRiskValuePerStep: 5,
        },
        threatModels: {
          enabled: true,
          highRiskValue: 10,
          mediumRiskValue: 5,
          lowRiskValue: 1,
          allMitigatedCredit: -3,
          missingValue: 5,
        },
      },
    },
  },
};
