import { depScanFindings } from '../test/fixtures/depscanFindings';
import { config } from '../test/fixtures/testConfig';
import {
  badLicenseFindings,
  goodLicenseFindings,
} from './../test/fixtures/bomReport';
import {
  bannedLicensesCheck,
  depScanCheck,
  filesChangedCheck,
  getGitDiffStats,
  locCheck,
  parseBomLicenses,
  parseGitDiffShortStat,
  parseShiftLeftDepScan,
} from './code';
import { ShortStat } from './types';

const {
  depscanFindings,
  linesChanged,
  filesChanged,
  bannedLicenses,
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

  it('parseShiftLeftDepScan parses file of newline-delimited JSON strings into DepScanFinding[]', async () => {
    const reportString = depScanFindings
      .map((f) => JSON.stringify(f))
      .join('\n');
    const findings = await parseShiftLeftDepScan(
      'testReport',
      jest.fn().mockResolvedValueOnce(reportString)
    );
    expect(findings).toEqual(depScanFindings);
    expect(
      await parseShiftLeftDepScan(
        'testReport',
        jest.fn().mockResolvedValueOnce('')
      )
    ).toEqual([]);
  });

  it('parseShiftLeftDepScan returns empty Array on error/missing report', async () => {
    const findings = await parseShiftLeftDepScan(undefined);
    expect(findings).toEqual([]);
  });

  it('depScanCheck penalizes for missing scans', async () => {
    const missingScanRisk = await depScanCheck([], depscanFindings);
    expect(missingScanRisk.value).toBeGreaterThanOrEqual(1);
  });

  it('depScanCheck ignores risk for <MEDIUM severity or unfixable findings', async () => {
    const konfig = Object.assign({}, depscanFindings);
    konfig.ignoreIndirects = false;
    const risk = await depScanCheck(depScanFindings, konfig);
    expect(risk.value).toEqual(7.5);
    expect(risk.description).toMatch(/1 HIGH/);
  });

  it('depScanCheck ignores risk for optional/indirect findings if ignoreIndirects is set', async () => {
    const konfig = Object.assign({}, depscanFindings);
    konfig.ignoreIndirects = true;
    const risk = await depScanCheck(depScanFindings, konfig);
    expect(risk.value).toEqual(0);
    expect(risk.description).toMatch(/None/);
  });

  it('parseBomLicenses parses JSON file into LicenseFinding[]', async () => {
    const reportString = badLicenseFindings.map((f) => JSON.stringify(f));
    const findings = await parseBomLicenses(
      'testReport',
      jest.fn().mockResolvedValueOnce('{"components": [' + reportString + ']}')
    );
    expect(findings).toEqual(badLicenseFindings);
    expect(
      await parseBomLicenses('testReport', jest.fn().mockResolvedValueOnce(''))
    ).toEqual([]);
  });

  it('parseBomLicenses returns empty Array on error/missing report', async () => {
    const findings = await parseBomLicenses(undefined);
    expect(findings).toEqual([]);
  });

  it('bannedLicensesCheck penalizes for missing scans', async () => {
    const missingScanRisk = await bannedLicensesCheck([], bannedLicenses);
    expect(missingScanRisk.value).toBeGreaterThanOrEqual(1);
  });

  it('bannedLicensesCheck successfully identifies high risk licenses', async () => {
    const konfig = Object.assign({}, bannedLicenses);
    const risk = await bannedLicensesCheck(badLicenseFindings, konfig);
    expect(risk.value).toEqual(2000);
    expect(risk.description).toMatch(
      'CODE - bannedLicenseFindings: pkg:npm/babel/compat-data@7.13.15, pkg:npm/electron-to-bromium@1.3.713 +2000.00'
    );
  });

  it('bannedLicensesCheck passes when no high risk licenses are found', async () => {
    const konfig = Object.assign({}, bannedLicenses);
    const risk = await bannedLicensesCheck(goodLicenseFindings, konfig);
    expect(risk.value).toEqual(-5);
    expect(risk.description).toMatch('None 🎉');
  });
});
