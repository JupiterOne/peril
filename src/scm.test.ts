import { config } from '../test/fixtures/testConfig';
import {
  gatherFacts,
  getBranch,
  getRemote,
  gitConfigGPGCheck,
  gitleaksCheck,
  gitRepoDirCheck,
  gpgVerifyCommit,
  gpgVerifyRecentCommitsCheck,
  parseGitleaksScan,
} from './scm';
import { GitleaksMetrics } from './types';

describe('local risks', () => {
  it('gitRepoDirCheck counts missing .git folder as SCM risk', async () => {
    const { git: gitCheckValues } = config.values.checks.scm;
    const risk = await gitRepoDirCheck('/tmp', gitCheckValues);
    expect(risk.value).toBeGreaterThanOrEqual(5);
    expect(risk.description).toMatch(/missing/i);
    const risk2 = await gitRepoDirCheck(process.cwd(), gitCheckValues);
    expect(risk2.description).toMatch(/repo found/i);
    expect(risk2.value).toBeLessThan(0);
  });

  it('gitConfigGPGCheck follows commit.gpgsign setting', async () => {
    const { enforceGpg: enforceGPGCheckValues } = config.values.checks.scm;
    const risk1 = await gitConfigGPGCheck(
      enforceGPGCheckValues,
      jest.fn().mockResolvedValue({ failed: false, stdout: 'false' })
    );
    expect(risk1.description).toMatch(/not set to true/i);
    const risk2 = await gitConfigGPGCheck(
      enforceGPGCheckValues,
      jest.fn().mockResolvedValue({ failed: false, stdout: 'true' })
    );
    expect(risk2.description).toMatch(/enabled/i);
    const risk3 = await gitConfigGPGCheck(
      enforceGPGCheckValues,
      jest.fn().mockResolvedValue({ failed: true, stdout: '' })
    );
    expect(risk3.description).toMatch(/not set to true/i);
  });

  it('gpgVerifyCommit returns true if a valid signature is found', async () => {
    expect(
      await gpgVerifyCommit(
        'someref',
        jest.fn().mockResolvedValueOnce({
          command: 'git verify-commit --raw someref',
          exitCode: 0,
          stdout: '',
          failed: false,
          stderr:
            '[GNUPG:] NEWSIG leet.coder@mycorp.com\n' +
            '[GNUPG:] KEY_CONSIDERED 628AD0CFB783B10FE198CF61E73869E02AE60C1E 0\n' +
            '[GNUPG:] SIG_ID HX5IIPi1P8M6qTxOklRhs8cNg/Q 2021-01-21 1611239974\n' +
            '[GNUPG:] KEY_CONSIDERED 628AD0CFB783B10FE198CF61E73869E02AE60C1E 0\n' +
            '[GNUPG:] GOODSIG E73869E02AE60C1E Leet Coder <leet.coder@mycorp.com>\n' +
            '[GNUPG:] VALIDSIG 628AD0CFB783B10FE198CF61E73869E02AE60C1E 2021-01-21 1611239974 0 4 0 1 8 00 628AD0CFB783B10FE198CF61E73869E02AE60C1E\n' +
            '[GNUPG:] KEY_CONSIDERED 628AD0CFB783B10FE198CF61E73869E02AE60C1E 0\n' +
            '[GNUPG:] TRUST_ULTIMATE 0 pgp\n' +
            '[GNUPG:] VERIFICATION_COMPLIANCE_MODE 23',
        })
      )
    ).toBeTruthy();
    expect(
      await gpgVerifyCommit(
        'otherref',
        jest.fn().mockResolvedValueOnce({
          shortMessage:
            'Command failed with exit code 1: git verify-commit --raw otherref',
          command: 'git verify-commit --raw otherref',
          exitCode: 1,
          failed: true,
          stdout: '',
          stderr: '',
        })
      )
    ).toBeFalsy();
  });

  it('gpgVerifyRecentCommitsCheck() lowers risk when commits are signed', async () => {
    const mockRunCmd = jest.fn();
    mockRunCmd
      .mockResolvedValueOnce({
        command: 'git verify-commit --raw HEAD',
        failed: true,
        shortMessage:
          'Command failed with exit code 1: git verify-commit --raw otherref',
        exitCode: 1,
      })
      .mockResolvedValueOnce({
        command: 'git verify-commit --raw HEAD~1',
        failed: false,
        stderr:
          '[GNUPG:] NEWSIG leet.coder@mycorp.com\n' +
          '[GNUPG:] KEY_CONSIDERED 628AD0CFB783B10FE198CF61E73869E02AE60C1E 0\n' +
          '[GNUPG:] SIG_ID HX5IIPi1P8M6qTxOklRhs8cNg/Q 2021-01-21 1611239974\n' +
          '[GNUPG:] KEY_CONSIDERED 628AD0CFB783B10FE198CF61E73869E02AE60C1E 0\n' +
          '[GNUPG:] GOODSIG E73869E02AE60C1E Leet Coder <leet.coder@mycorp.com>\n' +
          '[GNUPG:] VALIDSIG 628AD0CFB783B10FE198CF61E73869E02AE60C1E 2021-01-21 1611239974 0 4 0 1 8 00 628AD0CFB783B10FE198CF61E73869E02AE60C1E\n' +
          '[GNUPG:] KEY_CONSIDERED 628AD0CFB783B10FE198CF61E73869E02AE60C1E 0\n' +
          '[GNUPG:] TRUST_ULTIMATE 0 pgp\n' +
          '[GNUPG:] VERIFICATION_COMPLIANCE_MODE 23',
      });
    const { verifyGpg: verifyGpgCheckValues } = config.values.checks.scm;
    const check = await gpgVerifyRecentCommitsCheck(
      verifyGpgCheckValues,
      mockRunCmd
    );
    expect(check.value).toBeLessThan(0.5);
    expect(check.description).toMatch(
      /one or more recent signed commits found/i
    );
  });

  it('getBranch returns currenly checked-out branch', async () => {
    expect(
      await getBranch(
        jest.fn().mockResolvedValueOnce({
          exitCode: 0,
          stdout: 'main',
          stderr: '',
          failed: false,
        })
      )
    ).toEqual('main');

    expect(
      await getBranch(
        jest.fn().mockResolvedValueOnce({
          shortMessage:
            'fatal: not a git repository (or any of the parent directories): .git',
          exitCode: 1,
          failed: true,
        })
      )
    ).toEqual(undefined);
  });

  it('getRemote returns remote details for origin', async () => {
    const url = 'git@bitbucket.org:myorg/myproject.git';
    const cmd = await getRemote(
      jest.fn().mockResolvedValueOnce({
        command: 'git config --get remote.origin.url',
        exitCode: 0,
        stdout: url,
        stderr: '',
        failed: false,
      })
    );
    expect(cmd.remote).toEqual('bitbucket');
    expect(cmd.remoteUrl).toEqual(url);

    const cmd2 = await getRemote(
      jest.fn().mockResolvedValueOnce({
        command: 'git config --get remote.origin.url',
        exitCode: 1,
        stdout: '',
        stderr: '',
        failed: true,
      })
    );
    expect(cmd2.remote).toEqual(undefined);
    expect(cmd2.remoteUrl).toEqual(undefined);
  });

  it('gatherFacts gathers basic SCM facts', async () => {
    const url = 'git@bitbucket.org:myorg/myproject.git';
    const mockRunCmd = jest.fn();
    mockRunCmd
      .mockResolvedValueOnce({
        command: 'git config --get remote.origin.url',
        stdout: url,
        failed: false,
      })
      .mockResolvedValueOnce({
        command: 'git symbolic-ref --short HEAD',
        stdout: 'main',
        failed: false,
      });
    const facts = await gatherFacts(mockRunCmd, config);
    expect(facts.scm.branch).toEqual('main');
    expect(facts.scm.remote).toEqual('bitbucket');
    expect(facts.scm.remoteUrl).toEqual(url);
    expect(facts.scm.gitPath).toBeTruthy();
  });

  it('gitleaksCheck does NOT penalize for missing scans', async () => {
    const { gitleaksFindings: gitleaksCheckValues } = config.values.checks.scm;
    const missingScanRisk = await gitleaksCheck(
      {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      gitleaksCheckValues
    );
    expect(missingScanRisk.value).toEqual(0);
  });

  it('gitleaksCheck calculates 100% of perFindingValue for criticals', async () => {
    const { gitleaksFindings: gitleaksCheckValues } = config.values.checks.scm;
    const risk = await gitleaksCheck(
      {
        total: 1,
        critical: 1,
        high: 0,
        medium: 0,
        low: 0,
      },
      gitleaksCheckValues
    );
    expect(risk.value).toEqual(
      config.values.checks.scm.gitleaksFindings.perFindingValue
    );
  });

  it('gitleaksCheck calculates less than 100% of perFindingValue for sub-criticals', async () => {
    const { gitleaksFindings: gitleaksCheckValues } = config.values.checks.scm;
    const risk = await gitleaksCheck(
      {
        total: 2,
        critical: 0,
        high: 1,
        medium: 1,
        low: 0,
      },
      gitleaksCheckValues
    );
    expect(risk.value).toBeLessThan(
      2 * config.values.checks.scm.gitleaksFindings.perFindingValue
    );
  });

  it('parseGitleaksScan returns zero metrics upon error reading file', async () => {
    const risk = await parseGitleaksScan(
      'testReport',
      jest.fn().mockRejectedValueOnce(new Error('Unknown error reading file'))
    );
    expect(risk).toEqual({
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    });
  });

  it('parseGitleaksScan parses SARIF file into GitleaksMetrics', async () => {
    const metrics: GitleaksMetrics = {
      total: 3,
      critical: 1,
      high: 0,
      medium: 1,
      low: 1,
    };
    const parsed = await parseGitleaksScan(
      'testReport',
      jest.fn().mockResolvedValueOnce(
        JSON.stringify({
          runs: [
            {
              properties: {
                metrics: {
                  total: 3,
                  ...metrics,
                },
              },
            },
          ],
        })
      )
    );
    expect(parsed).toEqual(metrics);
  });
});
