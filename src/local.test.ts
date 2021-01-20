import { gitRepoCheck } from './local';

describe('local risks', () => {
  it('should count missing .git folder as SCM risk', async () => {
    const risk = await gitRepoCheck('/tmp');
    expect(risk.value).toBeGreaterThanOrEqual(5);
    expect(risk.description).toMatch(/missing scm/i);
  });
});
