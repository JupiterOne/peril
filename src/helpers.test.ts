import { Risk, Config } from './types';
import { calculateRiskSubtotal, whereis, redactConfig, findFiles } from './helpers';

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

  it('findFiles returns array of matching files at path', async () => {
    const thisFile = (__filename.split('/').pop() as string);
    const thisFileDir = __dirname;
    const matches = await findFiles(thisFileDir, thisFile);
    expect(matches.length).toEqual(1);
    const noMatches = await findFiles(thisFileDir, 'SZYZYGY');
    expect(noMatches.length).toEqual(0);
  });

  it('redactConfig protects sensitive ENV vars', () => {
    const sekretConfig: Config = {
      env: {
        j1AuthToken: 'sekretvalue',
        j1Account: 'mycorp',
        logLevel: 'info'
      },
      flags: {
        mergeRef: 'main',
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
        },
        code: {
          scans: {
            depScanReport: ''
          }
        }
      }
    };
    const redacted = redactConfig(sekretConfig);
    expect(redacted.env.j1AuthToken).toEqual('REDACTED');
  });
});
