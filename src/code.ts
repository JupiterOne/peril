import { Risk, RiskCategory, ShortStat, CodeFacts } from './types';
import { calculateRiskSubtotal, findFiles, runCmd } from './helpers';
import { getConfig } from './config';
import path from 'path';

export async function gatherCodeRisk(): Promise<RiskCategory> {
  const { mergeRef, verbose } = getConfig().flags;

  const defaultRiskValue = 0;
  const checks: Promise<Risk>[] = [];

  const gitStats = await getGitDiffStats(mergeRef);

  if (gitStats.filesChanged > 0) {
    checks.push(locCheck(gitStats));
    checks.push(filesChangedCheck(gitStats));
  } else {
    verbose && console.error(`Couldn't retrieve git stats for HEAD..${mergeRef}, skipping some checks.`);
  }

  // gather risks
  const risks = await Promise.all(checks);

  return {
    title: 'Code Risk',
    defaultRiskValue,
    risks,
    scoreSubtotal: calculateRiskSubtotal(risks, defaultRiskValue)
  };
}

export function parseGitDiffShortStat(shortStat: string): ShortStat {
  // expects input like:  9 files changed, 19 insertions(+), 49 deletions(-)
  let filesChanged = 0;
  let linesAdded = 0;
  let linesRemoved = 0;

  if (shortStat.indexOf(',') > 0) {
    // parseFloat, because JavaScript numbers are... special.
    [ filesChanged, linesAdded, linesRemoved ] = shortStat.split(',').map(parseFloat);
  }

  return {
    filesChanged,
    linesAdded,
    linesRemoved
  };
}

export async function getGitDiffStats(mergeRef: string, cmdRunner: any = undefined): Promise<ShortStat> {
  const excludePatterns = ['*.lock', '*.md', '*test*'];
  const excludeSyntax: string = excludePatterns.reduce((acc: string, p: string): string => {
    acc += `':(exclude)${p}' `;
    return acc;
  }, '');
  const cmd = `git diff --ignore-all-space --shortstat ${mergeRef} HEAD -- . ${excludeSyntax}`;
  // git syntax above requires shell to parse.
  // NOTE: this will likely not work on Microsoft Windows.
  const shellRequired = true;
  const { stdout: shortstat, failed } = await runCmd(cmd, cmdRunner, shellRequired);
  if (failed) {
    return {
      filesChanged: -1,
      linesAdded: 0,
      linesRemoved: 0
    };
  }
  return parseGitDiffShortStat(shortstat);
}

export async function locCheck(gitStats: ShortStat): Promise<Risk> {
  // Simple linear model for positive risk as net new lines of code:
  // Code is a liability. Therefore deletions actually represent (on average), negative risk.
  const netChangedLOC = gitStats.linesAdded - gitStats.linesRemoved;
  const riskLOCStep = 100;
  const riskValuePerStep = 1;

  // scale net changed lines (which may be negative) by a configurable ratio to determine risk value
  const value = netChangedLOC * (riskValuePerStep / riskLOCStep);

  return {
    source: 'code.lines.changed',
    value,
    description: `Code - Risk for ~${netChangedLOC} net lines of changed code.`,
  };
}

export async function filesChangedCheck(gitStats: ShortStat, cmdRunner: any = undefined): Promise<Risk> {
  // Simple linear model for increased risk due to many files changed (therefore hard to review/reason about).
  const riskFilesStep = 20;
  const riskValuePerStep = 1;

  // scale changed files by a configurable ratio to determine risk value
  const value = gitStats.filesChanged * (riskValuePerStep / riskFilesStep);

  return {
    source: 'code.files.changed',
    value,
    description: `Code - Risk for ${gitStats.filesChanged} changed files.`,
  };
}

export async function gatherFacts(cmdRunner: any = undefined): Promise<CodeFacts> {
  const config = getConfig();
  const dependencyReportsPattern = 'depscan-report.*.json';
  const dependencyReportsDir = path.join(config.flags.dir, 'reports');
  return {
    code: {
      scans: {
        dependencyReports: await findFiles(dependencyReportsDir, dependencyReportsPattern)
      }
    }
  };
}
