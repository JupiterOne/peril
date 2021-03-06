#!/bin/bash

set -euo pipefail

cat <<EOF
{
  "facts": {
    "production": false,
    "test": true
  },
  "values": {
    "riskTolerance": 1,
    "checks": {
      "code": {
        "linesChanged" : {
          "riskStep": 100,
          "riskValuePerStep": 1
        },
        "filesChanged" : {
          "riskStep": 20,
          "riskValuePerStep": 1
        },
        "depscanFindings" : {
          "ignoreSeverityList": "INFO, LOW",
          "ignoreUnfixable": true,
          "missingValue": 10,
          "noVulnerabilitiesCredit": -5
        }
      },
      "scm": {
        "git": {
          "missingValue": 5
        },
        "enforceGpg": {
          "missingValue": 0.5
        },
        "verifyGpg": {
          "missingValue": 0.5
        },
        "gitleaksFindings": {
          "perFindingValue": 10
        }
      },
      "project": {
        "snykFindings": {
          "ignoreNonUpgradables": true
        },
        "maintenanceFindings": {
          "daysLateRiskStep": 10,
          "daysLateRiskValuePerStep": 5
        },
        "threatModels": {
          "enabled": true,
          "highRiskValue": 10,
          "mediumRiskValue": 5,
          "lowRiskValue": 1,
          "allMitigatedCredit": -3,
          "missingValue": 5
        }
      }
    }
  }
}
EOF
