import { Risk, Config } from './types';
import { calculateRiskSubtotal, whereis, redactConfig } from './helpers';

describe('helpers', () => {
  it('calculateRiskSubtotal sums all Risk values', () => {
    const risks: Risk[] = [
      {
        source: 'test',
        description: 'test risk 1',
        value: 3
      },
      {
        source: 'test',
        description: 'test risk 2',
        value: 8
      }
    ];
    const defaultRiskValue = 0;
    expect(calculateRiskSubtotal(risks, defaultRiskValue)).toEqual(11);
  });

  it('whereis returns path to found executable', () => {
    expect(whereis('env')).toEqual('/usr/bin/env');
    expect(whereis('env')).toEqual('/usr/bin/env');
  });

  it('whereis returns undefined for unfound executable', () => {
    expect(whereis('waldo')).toEqual(undefined);
  });

  it('redactConfig protects sensitive ENV vars', () => {
    const sekretConfig: Config = {
      env: {
        j1AuthToken: 'sekretvalue',
        j1Account: 'mycorp',
        logLevel: 'info'
      },
      flags: {
        verbose: false,
        dir: ''
      },
      facts: {
        scm: {
          branch: '',
          remote: '',
          remoteUrl: '',
          gitPath: '',
          gpgPath: ''
        }
      }
    };
    const redacted = redactConfig(sekretConfig);
    expect(redacted.env.j1AuthToken).toEqual('REDACTED');
  });
});
