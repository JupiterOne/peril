import * as fs from 'fs-extra';
import path from 'path';
import { getConfig } from './config';
import { findFiles, formatRisk, runCmd } from './helpers';
import {
  CodeFacts,
  CodeValuesBannedLicensesCheck,
  CodeValuesDepScanCheck,
  CodeValuesFileChangedCheck,
  CodeValuesLinesChangedCheck,
  Config,
  DepScanFinding,
  License,
  LicenseFinding,
  MaybeString,
  Risk,
  ShortStat,
} from './types';

const riskCategory = 'code';
const highRiskLicenseValue = 1000; // High risk licenses should break the build

export function parseGitDiffShortStat(shortStat: string): ShortStat {
  // expects input like:  9 files changed, 19 insertions(+), 49 deletions(-)
  let filesChanged = 0;
  let linesAdded = 0;
  let linesRemoved = 0;

  if (shortStat.indexOf(',') > 0) {
    // parseFloat, because JavaScript numbers are... special.
    [filesChanged, linesAdded, linesRemoved] = shortStat
      .split(',')
      .map(parseFloat);
  }

  return {
    filesChanged,
    linesAdded,
    linesRemoved,
  };
}

export async function getGitDiffStats(
  mergeRef: string,
  cmdRunner: any = undefined
): Promise<ShortStat> {
  const excludePatterns = ['*.lock', '*.md', '*test*'];
  const excludeSyntax: string = excludePatterns.reduce(
    (acc: string, p: string): string => {
      acc += `':(exclude)${p}' `;
      return acc;
    },
    ''
  );
  const cmd = `git diff --ignore-all-space --shortstat ${mergeRef} HEAD -- . ${excludeSyntax}`;
  // git syntax above requires shell to parse.
  // NOTE: this will likely not work on Microsoft Windows.
  const { stdout: shortstat, failed } = await runCmd(cmd, cmdRunner, {
    shell: true,
  });
  if (failed) {
    return {
      filesChanged: -1,
      linesAdded: 0,
      linesRemoved: 0,
    };
  }
  return parseGitDiffShortStat(shortstat);
}

export async function locCheck(
  gitStats: ShortStat,
  checkValues: CodeValuesLinesChangedCheck
): Promise<Risk> {
  const check = 'linesChanged';
  const recommendations: string[] = [];

  // Simple linear model for positive risk as net new lines of code:
  // Code is a liability. Therefore deletions actually represent (on average), negative risk.
  const netChangedLOC =
    (gitStats.linesAdded || 0) - (gitStats.linesRemoved || 0);

  // scale net changed lines (which may be negative) by a configurable ratio to determine risk value
  const value =
    netChangedLOC * (checkValues.riskValuePerStep / checkValues.riskStep);

  if (value > 10) {
    recommendations.push(
      'Aim for smaller PRs: this makes them easier to review.'
    );
  }

  return formatRisk(
    {
      check,
      value,
      description: `~${netChangedLOC} net lines of changed code.`,
      recommendations,
    },
    riskCategory,
    check
  );
}

export async function filesChangedCheck(
  gitStats: ShortStat,
  checkValues: CodeValuesFileChangedCheck
): Promise<Risk> {
  const check = 'filesChanged';
  const recommendations: string[] = [];
  // Simple linear model for increased risk due to many files changed (therefore hard to review/reason about).

  // scale changed files by a configurable ratio to determine risk value
  const value =
    gitStats.filesChanged *
    (checkValues.riskValuePerStep / checkValues.riskStep);

  if (value > 10) {
    recommendations.push(
      'Change fewer files per PR: this helps your reviewer(s).'
    );
  }

  return formatRisk(
    {
      check,
      value,
      description: `${gitStats.filesChanged} changed files.`,
      recommendations,
    },
    riskCategory,
    check
  );
}

export async function depScanCheck(
  findings: DepScanFinding[],
  checkValues: CodeValuesDepScanCheck
): Promise<Risk> {
  const check = 'depscanFindings';
  const recommendations: string[] = [];
  const {
    missingValue,
    ignoreSeverityList,
    ignoreUnfixable,
    ignoreIndirects,
    noVulnerabilitiesCredit,
  } = checkValues;

  if (!findings.length) {
    recommendations.push(
      'Ensure ShiftLeft/scan dependency check runs prior to peril.'
    );
    return formatRisk(
      {
        check,
        description: 'Code - Missing Dependency Scan',
        value: missingValue,
        recommendations,
      },
      riskCategory,
      check
    );
  }

  let value = 0;
  const sevCounts: { [key: string]: number } = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };

  const ignoreSeverities = ignoreSeverityList
    .toLowerCase()
    .split(',')
    .map((i) => i.trim());

  const validFindings: DepScanFinding[] = [];

  for (const finding of findings) {
    if (!finding.fix_version && ignoreUnfixable) {
      continue;
    }
    if (finding.package_usage === 'optional' && ignoreIndirects) {
      continue;
    }
    if (ignoreSeverities.includes(finding.severity.toLowerCase())) {
      continue;
    }
    value += parseFloat(finding.cvss_score);
    validFindings.push(finding);
    sevCounts[finding.severity.toLowerCase()] += 1;
  }

  // summarize valid findings in description
  // e.g. 1 CRITICAL, 2 HIGH, etc.
  const validFindingCounts: string[] = [];
  for (const sevKey of Object.keys(sevCounts)) {
    if (sevCounts[sevKey] > 0) {
      validFindingCounts.push(`${sevCounts[sevKey]} ${sevKey.toUpperCase()}`);
    }
  }
  if (!validFindingCounts.length) {
    validFindingCounts.push('None 🎉');
    value += noVulnerabilitiesCredit;
  } else {
    recommendations.push('Upgrade vulnerable packages:');
    for (const finding of validFindings) {
      recommendations.push(
        `  - ${finding.package}@${finding.version} can be upgraded to ${finding.fix_version}`
      );
    }
  }

  return formatRisk(
    {
      check,
      description: validFindingCounts.join(', '),
      value,
      recommendations,
    },
    riskCategory,
    check
  );
}

export async function bannedLicensesCheck(
  findings: LicenseFinding[],
  checkValues: CodeValuesBannedLicensesCheck
): Promise<Risk> {
  const check = 'bannedLicenseFindings';
  const recommendations: string[] = [];
  const { licenses, missingValue, noVulnerabilitiesCredit } = checkValues;

  let value = 0;

  if (!findings.length) {
    recommendations.push(
      'Ensure ShiftLeft/scan dependency check runs prior to peril.'
    );
    return formatRisk(
      {
        check,
        description: 'Code - Missing BOM Scan',
        value: missingValue,
        recommendations,
      },
      riskCategory,
      check
    );
  }

  const invalidMaterials: LicenseFinding[] = [];
  for (const finding of findings) {
    if (finding.licenses !== null) {
      const bannedLicenses = finding.licenses.filter((license: License) => {
        for (const licenseRegex of licenses) {
          const regex = new RegExp(licenseRegex);
          if (regex.exec(license.license.id) !== null) {
            value += highRiskLicenseValue;
            return true;
          }
        }
      });
      if (bannedLicenses.length > 0) {
        invalidMaterials.push({
          purl: finding.purl,
          licenses: bannedLicenses,
        });
      }
    }
  }
  if (!invalidMaterials.length) {
    value += noVulnerabilitiesCredit;
  } else {
    recommendations.push('Consider removing/replacing the following packages:');
    for (const finding of invalidMaterials) {
      recommendations.push(
        `  - ${
          finding.purl
        } contains the following banned licenses (${finding.licenses.map(
          (license) => license.license.id
        )})`
      );
    }
  }

  return formatRisk(
    {
      check,
      description: invalidMaterials.map((material) => material.purl).join(', '),
      value,
      recommendations,
    },
    riskCategory,
    check
  );
}

export async function gatherFacts(
  cmdRunner: any = undefined,
  config: Config = getConfig()
): Promise<CodeFacts> {
  const depScanReportPattern = 'depscan-report.*.json';
  const licensesReportPattern = 'bom-nodejs.json';
  const reportDir = path.join(config.flags.dir, 'reports');
  return {
    code: {
      scans: {
        depScanReport: (await findFiles(reportDir, depScanReportPattern))[0],
        bomReport: (await findFiles(reportDir, licensesReportPattern))[0],
      },
    },
  };
}

export async function parseShiftLeftDepScan(
  reportFile: MaybeString,
  readFile: typeof fs.readFile = fs.readFile
): Promise<DepScanFinding[]> {
  const depFindings: DepScanFinding[] = [];
  try {
    const report = await readFile(String(reportFile), 'utf8');
    // each line in report is a stringified JSON finding expression
    const lines = report
      .trim()
      .split('\n')
      .filter((l) => l.length > 0);
    if (!lines.length) {
      return [];
    }
    lines.map((line) => {
      depFindings.push(JSON.parse(line) as DepScanFinding);
    });
  } catch (e) {
    return [];
  }
  return depFindings;
}

export async function parseBomLicenses(
  reportFile: MaybeString,
  readFile: typeof fs.readFile = fs.readFile
): Promise<LicenseFinding[]> {
  const licenceFindings: LicenseFinding[] = [];
  try {
    const reportString = await readFile(String(reportFile), 'utf8');
    const components = JSON.parse(reportString).components;
    // each line in report is a stringified JSON finding expression
    for (const component of components) {
      licenceFindings.push({
        purl: component.purl,
        licenses: component.licenses,
      });
    }
  } catch (e) {
    return [];
  }
  return licenceFindings;
}
