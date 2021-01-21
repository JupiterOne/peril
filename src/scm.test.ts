import { gitRepoDirCheck, gitConfigGPGCheck, gpgVerifyCommit } from './scm';

describe('local risks', () => {
  it('gitRepoDirCheck should count missing .git folder as SCM risk', async () => {
    const risk = await gitRepoDirCheck('/tmp');
    expect(risk.value).toBeGreaterThanOrEqual(5);
    expect(risk.description).toMatch(/missing scm/i);
  });

  it('gitConfigGPGCheck should follow commit.gpgsign setting', async () => {
    const risk1 = await gitConfigGPGCheck(jest.fn().mockResolvedValue({failed: false, stdout: 'false'}));
    expect(risk1.description).toMatch(/not set to true/i);
    const risk2 = await gitConfigGPGCheck(jest.fn().mockResolvedValue({failed: false, stdout: 'true'}));
    expect(risk2.description).toMatch(/enabled/i);
    const risk3 = await gitConfigGPGCheck(jest.fn().mockResolvedValue({failed: true, stdout: ''}));
    expect(risk3.description).toMatch(/not set to true/i);
  });

  it('gpgVerifyCommit should return true if a valid signature is found', async () => {
    expect(await gpgVerifyCommit('someref', jest.fn().mockResolvedValueOnce(
    {
        command: 'git verify-commit --raw someref',
        exitCode: 0,
        stdout: '',
        stderr: '[GNUPG:] NEWSIG erich.smith@jupiterone.com\n' +
          '[GNUPG:] KEY_CONSIDERED 628AD0CFB783B10FE198CF61E73869E02AE60C1E 0\n' +
          '[GNUPG:] SIG_ID HX5IIPi1P8M6qTxOklRhs8cNg/Q 2021-01-21 1611239974\n' +
          '[GNUPG:] KEY_CONSIDERED 628AD0CFB783B10FE198CF61E73869E02AE60C1E 0\n' +
          '[GNUPG:] GOODSIG E73869E02AE60C1E Erich Smith <erich.smith@jupiterone.com>\n' +
          '[GNUPG:] VALIDSIG 628AD0CFB783B10FE198CF61E73869E02AE60C1E 2021-01-21 1611239974 0 4 0 1 8 00 628AD0CFB783B10FE198CF61E73869E02AE60C1E\n' +
          '[GNUPG:] KEY_CONSIDERED 628AD0CFB783B10FE198CF61E73869E02AE60C1E 0\n' +
          '[GNUPG:] TRUST_ULTIMATE 0 pgp\n' +
          '[GNUPG:] VERIFICATION_COMPLIANCE_MODE 23',
        all: undefined,
        failed: false,
        timedOut: false,
        isCanceled: false,
        killed: false
      }
    ))).toBeTruthy();
    expect(await gpgVerifyCommit('otherref', jest.fn().mockResolvedValueOnce(
      {
        shortMessage: 'Command failed with exit code 1: git verify-commit --raw otherref',
        command: 'git verify-commit --raw otherref',
        exitCode: 1,
        signal: undefined,
        signalDescription: undefined,
        stdout: '',
        stderr: '',
        failed: true,
        timedOut: false,
        isCanceled: false,
        killed: false
      }
    ))).toBeFalsy();

  });
});
