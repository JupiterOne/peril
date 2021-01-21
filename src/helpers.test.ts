import { Risk } from './types';
import { calculateRiskSubtotal, whereis } from './helpers';

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
});
