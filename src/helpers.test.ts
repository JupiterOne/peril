import { Risk } from './types';
import {
  calculateRiskSubtotal,
  whereis,
  redactConfig,
  findFiles,
  log,
  getLogOutput,
  epochDaysFromNow
} from './helpers';
import { config } from '../test/fixtures/testConfig'
import { cloneDeep } from 'lodash';

describe('helpers', () => {
  it('calculateRiskSubtotal sums all Risk values', () => {
    const risks: Risk[] = [
      {
        check: 'test',
        description: 'test risk 1',
        value: 3,
        recommendations: []
      },
      {
        check: 'test',
        description: 'test risk 2',
        value: 8,
        recommendations: []
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
    const redacted = redactConfig(config);
    expect(redacted.env.j1AuthToken).toEqual('REDACTED');
  });

  it('log displays messages according to log level', () => {
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn()
    } as unknown as Console;
    log('infotest', 'INFO', config, logger);
    expect(logger.info).toHaveBeenCalledWith('infotest');

    log('warntest', 'WARN', config, logger);
    expect(logger.warn).toHaveBeenCalledWith('warntest');

    const cfg = cloneDeep(config);
    cfg.flags.debug = true;
    log('debugtest', 'DEBUG', cfg, logger);
    expect(logger.debug).toHaveBeenCalledWith('debugtest');

    log('errortest', 'ERROR', config, logger);
    expect(logger.error).toHaveBeenCalledWith('errortest');

    const output = getLogOutput();
    expect(output.length).toBeGreaterThan(0);
    expect(output).toMatch(/infotest/);
    expect(output).toMatch(/warntest/);
    expect(output).toMatch(/debugtest/);
    expect(output).toMatch(/errortest/);
  });

  it('epochDaysFromNow returns a future time (in days) as milliseconds since the UNIX epoch', () => {
    const now = Date.parse('2021-03-08T19:49:03.770Z');
    const thenEpoch = epochDaysFromNow(3, now);
    const thenDate = new Date(thenEpoch);
    expect(thenDate.getDate()).toBe(11);
  });
});
