import { parseGitDiffShortStat, getGitDiffStats, locCheck, filesChangedCheck } from './code';
import { ShortStat } from './types';

describe('code risks', () => {
  it('parseGitDiffShortStat parses git diff stats for numeric values', () => {
    const parsedOutput = parseGitDiffShortStat(' 9 files changed, 12 insertions(+), 43 deletions(-)');
    expect(parsedOutput.filesChanged).toEqual(9);
    expect(parsedOutput.linesAdded).toEqual(12);
    expect(parsedOutput.linesRemoved).toEqual(43);

    const nullOutput = parseGitDiffShortStat('');
    expect(nullOutput.filesChanged).toEqual(0);
    expect(nullOutput.linesAdded).toEqual(0);
    expect(nullOutput.linesRemoved).toEqual(0);
  });

  it('getGitDiffStats returns parsed git diff output with sentinel value', async () => {
    const failedStats = await getGitDiffStats('main', jest.fn().mockResolvedValueOnce({
      failed: true
    }));
    expect(failedStats.filesChanged).toEqual(-1); // signal failure to caller

    const stats = await getGitDiffStats('main', jest.fn().mockResolvedValueOnce({
      failed: false,
      stdout: ' 9 files changed, 12 insertions(+), 43 deletions(-)'
    }));
    expect(stats.filesChanged).toEqual(9);
    expect(stats.linesAdded).toEqual(12);
    expect(stats.linesRemoved).toEqual(43);
  });

  it('locCheck sets risk proportional to net new lines of code', async () => {
    const stats1: ShortStat = {
      filesChanged: 1,
      linesAdded: 100,
      linesRemoved: 0
    };
    const risk = await locCheck(stats1);
    expect(risk.value).toEqual(1);
    const stats2: ShortStat = {
      filesChanged: 1,
      linesAdded: 300,
      linesRemoved: 150
    };
    const risk2 = await locCheck(stats2);
    expect(risk2.value).toEqual(1.5);
  });

  it('filesChangedCheck sets risk proportional to number of changed files', async () => {
    const stats1: ShortStat = {
      filesChanged: 10,
      linesAdded: 100,
      linesRemoved: 100
    };
    const risk = await filesChangedCheck(stats1);
    expect(risk.value).toEqual(0.5);
    const stats2: ShortStat = {
      filesChanged: 40,
      linesAdded: 300,
      linesRemoved: 150
    };
    const risk2 = await filesChangedCheck(stats2);
    expect(risk2.value).toEqual(2);
  });


});
