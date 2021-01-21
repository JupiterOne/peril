import { Risk } from './types';
import path from 'path';
import execa from 'execa';
import * as fs from 'fs-extra';

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

export async function runCmd(cmd: string, execaCommand = execa.command): Promise<execa.ExecaReturnValue | execa.ExecaReturnValue & Error> {
  let res;
  try {
  res = await execaCommand(cmd);
  } catch (e) {
    return e;
  }
  return res;
}
