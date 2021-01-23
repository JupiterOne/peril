import { Risk, Config } from './types';
import { getConfig } from './config';
import path from 'path';
import execa from 'execa';
import * as fs from 'fs-extra';
import get from 'lodash/get';

export function calculateRiskSubtotal(risks: Risk[], defaultRiskValue: number): number {
  const reducer = (acc: number, val: number) => acc + val;
  return risks.map(r => r.value).reduce(reducer, defaultRiskValue);
}

// memoize paths to minimize fs access
const seenPaths: { [id: string]: string } = {};

export function whereis(exe: string): string|undefined {
  if (seenPaths[exe]) {
    return seenPaths[exe];
  }

  const foundPath = (process.env.PATH || '').split(':').find(p => fs.existsSync(path.join(p, exe)));

  if (foundPath) {
    const exePath = path.join(foundPath, exe);
    seenPaths[exe] = exePath;
    return exePath;
  }
  return undefined;
}

export async function runCmd(cmd: string, execaCommand = execa.command, shell = false): Promise<execa.ExecaReturnValue | execa.ExecaReturnValue & Error> {
  let res;
  const dir = get(getConfig(), 'flags.dir', process.cwd());  // respect dir flag if present
  try {
  res = await execaCommand(cmd, { cwd: dir, shell });
  } catch (e) {
    return e;
  }
  return res;
}

export function redactConfig(origConfig: Config): Config {
  // dup original object for safety
  const config: Config = JSON.parse(JSON.stringify(origConfig));
  const sensitiveKeyStrings = [ 'auth', 'token', 'api', 'credential', 'secret' ];
  Object.keys(config.env).forEach(key => {
    if(sensitiveKeyStrings.find(sensitive => key.toLowerCase().indexOf(sensitive) > 0)) {
      (config.env as any)[key] = 'REDACTED';
    }
  });
  return config;
}
