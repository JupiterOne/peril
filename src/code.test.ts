import { config } from '../test/fixtures/testConfig';
import {
  criticalIssues,
  highIssues,
  lowIssues,
  moderateIssues,
} from './../test/fixtures/auditReport';
import { badLicenses, goodLicenses } from './../test/fixtures/bomReport';
import {
  auditCheck,
  bannedLicensesCheck,
  filesChangedCheck,
  getGitDiffStats,
  locCheck,
  parseBomLicenses,
  parseGitDiffShortStat,
} from './code';
import { ShortStat } from './types';

const {
  linesChanged,
  filesChanged,
  bannedLicenses,
  auditFindings,
} = config.values.checks.code;

describe('code risks', () => {
  it('parseGitDiffShortStat parses git diff stats for numeric values', () => {
    const parsedOutput = parseGitDiffShortStat(
      ' 9 files changed, 12 insertions(+), 43 deletions(-)'
    );
    expect(parsedOutput.filesChanged).toEqual(9);
    expect(parsedOutput.linesAdded).toEqual(12);
    expect(parsedOutput.linesRemoved).toEqual(43);

    const nullOutput = parseGitDiffShortStat('');
    expect(nullOutput.filesChanged).toEqual(0);
    expect(nullOutput.linesAdded).toEqual(0);
    expect(nullOutput.linesRemoved).toEqual(0);
  });

  it('getGitDiffStats returns parsed git diff output with sentinel value', async () => {
    const failedStats = await getGitDiffStats(
      'main',
      jest.fn().mockResolvedValueOnce({
        failed: true,
      })
    );
    expect(failedStats.filesChanged).toEqual(-1); // signal failure to caller

    const stats = await getGitDiffStats(
      'main',
      jest.fn().mockResolvedValueOnce({
        failed: false,
        stdout: ' 9 files changed, 12 insertions(+), 43 deletions(-)',
      })
    );
    expect(stats.filesChanged).toEqual(9);
    expect(stats.linesAdded).toEqual(12);
    expect(stats.linesRemoved).toEqual(43);
  });

  it('locCheck sets risk proportional to net new lines of code', async () => {
    const stats1: ShortStat = {
      filesChanged: 1,
      linesAdded: 100,
      linesRemoved: 0,
    };
    const risk = await locCheck(stats1, linesChanged);
    expect(risk.value).toEqual(1);
    const stats2: ShortStat = {
      filesChanged: 1,
      linesAdded: 300,
      linesRemoved: 150,
    };
    const risk2 = await locCheck(stats2, linesChanged);
    expect(risk2.value).toEqual(1.5);
  });

  it('filesChangedCheck sets risk proportional to number of changed files', async () => {
    const stats1: ShortStat = {
      filesChanged: 10,
      linesAdded: 100,
      linesRemoved: 100,
    };
    const risk = await filesChangedCheck(stats1, filesChanged);
    expect(risk.value).toEqual(0.5);
    const stats2: ShortStat = {
      filesChanged: 40,
      linesAdded: 300,
      linesRemoved: 150,
    };
    const risk2 = await filesChangedCheck(stats2, filesChanged);
    expect(risk2.value).toEqual(2);
  });

  it('parseBomLicenses parses JSON file into BOMLicenses[]', async () => {
    const reportString = badLicenses.map((f) => JSON.stringify(f));
    const licenses = await parseBomLicenses(
      'testReport',
      jest.fn().mockResolvedValueOnce('{"components": [' + reportString + ']}')
    );
    expect(licenses).toEqual(badLicenses);
    expect(
      await parseBomLicenses('testReport', jest.fn().mockResolvedValueOnce(''))
    ).toEqual([]);
  });

  it('parseBomLicenses returns empty Array on error/missing report', async () => {
    const licenses = await parseBomLicenses(undefined);
    expect(licenses).toEqual([]);
  });

  it('bannedLicensesCheck penalizes for missing scans', async () => {
    const missingScanRisk = await bannedLicensesCheck([], bannedLicenses);
    expect(missingScanRisk.value).toBeGreaterThanOrEqual(1);
  });

  it('bannedLicensesCheck successfully identifies high risk licenses', async () => {
    const konfig = Object.assign({}, bannedLicenses);
    const risk = await bannedLicensesCheck(badLicenses, konfig);
    expect(risk.value).toEqual(2000);
    expect(risk.description).toMatch(
      'CODE - bannedLicenseFindings: pkg:npm/babel/compat-data@7.13.15, pkg:npm/electron-to-bromium@1.3.713 +2000.00'
    );
  });

  it('bannedLicensesCheck passes when no high risk licenses are found', async () => {
    const konfig = Object.assign({}, bannedLicenses);
    const risk = await bannedLicensesCheck(goodLicenses, konfig);
    expect(risk.value).toEqual(-5);
    expect(risk.description).toMatch('None 🎉');
  });

  it('auditCheck reports severities', async () => {
    const konfig = Object.assign({}, auditFindings);
    const issues = [
      ...criticalIssues,
      ...highIssues,
      ...moderateIssues,
      ...lowIssues,
    ];
    const risk = await auditCheck(issues, konfig);
    expect(risk.value).toEqual(21.9);
    expect(risk.description).toMatch(/1 CRITICAL, 1 HIGH, 1 MODERATE, 1 LOW/);
  });

  it('auditCheck skips provided severities', async () => {
    const konfig = Object.assign({}, auditFindings);
    konfig.ignoreSeverityList = 'CRITICAL, LOW';
    const issues = [
      ...criticalIssues,
      ...highIssues,
      ...moderateIssues,
      ...lowIssues,
    ];
    const risk = await auditCheck(issues, konfig);
    expect(risk.value).toEqual(12.8);
    expect(risk.description).toMatch(/1 HIGH, 1 MODERATE/);
  });
});
