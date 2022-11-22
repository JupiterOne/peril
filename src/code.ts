import * as fs from 'fs-extra';
import path from 'path';
import { getConfig } from './config';
import { findFiles, formatRisk, runCmd } from './helpers';
import {
  BOMLicenses,
  CodeFacts,
  CodeValuesBannedLicensesCheck,
  CodeValuesFileChangedCheck,
  CodeValuesLinesChangedCheck,
  CodeValuesPackageAuditCheck,
  Config,
  License,
  MaybeString,
  PackageAudit,
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

export async function bannedLicensesCheck(
  bomLicenses: BOMLicenses[],
  checkValues: CodeValuesBannedLicensesCheck
): Promise<Risk> {
  const check = 'bannedLicenseFindings';
  const recommendations: string[] = [];
  const { licenses, missingValue, noVulnerabilitiesCredit } = checkValues;

  let value = 0;

  if (!bomLicenses.length) {
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

  const licenseFindings: BOMLicenses[] = [];
  for (const entry of bomLicenses) {
    if (entry.licenses !== null) {
      const bannedLicenses = entry.licenses.filter((license: License) => {
        for (const licenseRegex of licenses) {
          const regex = new RegExp(licenseRegex);
          if (regex.exec(license.license.id) !== null) {
            value += highRiskLicenseValue;
            return true;
          }
        }
      });
      if (bannedLicenses.length > 0) {
        licenseFindings.push({
          purl: entry.purl,
          licenses: bannedLicenses,
        });
      }
    }
  }
  if (!licenseFindings.length) {
    value += noVulnerabilitiesCredit;
  } else {
    recommendations.push('Consider removing/replacing the following packages:');
    for (const finding of licenseFindings) {
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
      description:
        licenseFindings.length > 0
          ? licenseFindings.map((material) => material.purl).join(', ')
          : 'None 🎉',
      value,
      recommendations,
    },
    riskCategory,
    check
  );
}

export async function auditCheck(
  packages: PackageAudit[],
  checkValues: CodeValuesPackageAuditCheck
): Promise<Risk> {
  const check = 'packageAuditFindings';
  const recommendations: string[] = [];
  const { missingValue, ignoreSeverityList, noAuditsCredit } = checkValues;

  if (!packages.length) {
    recommendations.push('Ensure package audit runs prior to peril.');
    return formatRisk(
      {
        check,
        description: 'Missing Package Audit Scan',
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
    moderate: 0,
    low: 0,
  };

  const ignoreSeverities = ignoreSeverityList
    .toLowerCase()
    .split(',')
    .map((i) => i.trim());

  const packageList = new Map<string, string[]>();
  for (const p of packages) {
    if (p.type != 'auditAdvisory') {
      continue;
    }
    if (ignoreSeverities.includes(p.data.advisory.severity.toLowerCase())) {
      continue;
    }
    value += p.data.advisory.cvss.score;
    sevCounts[p.data.advisory.severity.toLowerCase()] += 1;
    const module = p.data.advisory.module_name;
    if (!packageList.has(module)) [packageList.set(module, [])];
    packageList
      .get(module)
      ?.push(
        `${p.data.advisory.title}: ${p.data.advisory.recommendation} (${p.data.advisory.url})`
      );
  }

  if (Array.from(packageList.values()).length > 0) {
    recommendations.push('Consider updating the following package:');
    for (const p of packageList) {
      recommendations.push(`- ${p[0]}`);
      for (const i of new Set(p[1])) {
        recommendations.push(`\t${i}`);
      }
    }
  } else {
    value += noAuditsCredit;
  }

  const validFindingCounts: string[] = [];
  for (const sevKey of Object.keys(sevCounts)) {
    if (sevCounts[sevKey] > 0) {
      validFindingCounts.push(`${sevCounts[sevKey]} ${sevKey.toUpperCase()}`);
    }
  }

  if (!validFindingCounts.length) {
    validFindingCounts.push('None 🎉');
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

export async function gatherFacts(
  cmdRunner: any = undefined,
  config: Config = getConfig()
): Promise<CodeFacts> {
  const licensesReportPattern = 'bom-nodejs.json';
  const packageAuditReportPattern = 'audit.json';
  const sarifReportPattern = 'codeql-scan.sarif';
  const reportDir = path.join(config.flags.dir, 'reports');
  return {
    code: {
      scans: {
        bomReport: (await findFiles(reportDir, licensesReportPattern))[0],
        auditReport: (await findFiles(reportDir, packageAuditReportPattern))[0],
        sarifReport: (await findFiles(reportDir, sarifReportPattern))[0],
      },
    },
  };
}

export async function parseBomLicenses(
  reportFile: MaybeString,
  readFile: typeof fs.readFile = fs.readFile
): Promise<BOMLicenses[]> {
  const bomLicenses: BOMLicenses[] = [];
  try {
    const reportString = await readFile(String(reportFile), 'utf8');
    const components = JSON.parse(reportString).components;
    // construct BOMLicenses[] from components array in the BOM
    for (const component of components) {
      bomLicenses.push({
        purl: component.purl,
        licenses: component.licenses,
      });
    }
  } catch (e) {
    return [];
  }
  return bomLicenses;
}

export async function parsePackageAudit(
  reportFile: MaybeString,
  readFile: typeof fs.readFile = fs.readFile
): Promise<PackageAudit[]> {
  const packages: PackageAudit[] = [];
  try {
    const reportString = await readFile(String(reportFile), 'utf8');
    const lines = reportString
      .trim()
      .split('\n')
      .filter((l) => l.length > 0);
    if (lines.length == 0) {
      return [];
    }
    lines.map((line) => {
      packages.push(JSON.parse(line) as PackageAudit);
    });
  } catch (e) {
    return [];
  }
  return packages;
}
