import { Risk, Config } from './types';
import { getConfig } from './config';
import path from 'path';
import execa from 'execa';
import * as fs from 'fs-extra';
import { get, cloneDeep } from 'lodash';

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

// finds all files matching pattern at path
// returns empty array if no files match
export async function findFiles(searchPath: string, pattern: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const dirFiles = await fs.readdir(searchPath);
    for (const file of dirFiles) {
      if (RegExp(pattern).exec(file)) {
        files.push(path.join(searchPath, file));
      }
    }
  } catch (e) {
    // NOP
  }
  return files;
}

export function redactConfig(origConfig: Config): any {
  // dup original object for safety
  const config: Config = cloneDeep(origConfig);
  const sensitiveKeyStrings = [ 'auth', 'token', 'api', 'credential', 'secret' ];
  Object.keys(config.env).forEach(key => {
    if(sensitiveKeyStrings.find(sensitive => key.toLowerCase().indexOf(sensitive) > 0)) {
      (config.env as any)[key] = 'REDACTED';
    }
  });
  if (config.facts.j1.client) {
    (config.facts.j1.client as any).j1Client = 'REDACTED';
  }

  return config;
}

export function formatRisk(risk: Risk, category: string, check: string): Risk {
  const newRisk = { ...risk };
  newRisk.value = parseFloat(risk.value.toFixed(2)); // truncate to 2 digits past decimal
  const modifier = newRisk.value >= 0 ? '+' : '';
  newRisk.description = category.toUpperCase() + ' - ' + check + ': ' + risk.description + ` ${modifier}${newRisk.value.toFixed(2)}`;
  return newRisk;
}
