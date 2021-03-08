import { Risk, Config, LogLevel, LogLevelValues } from './types';
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

export const execaCommand = execa.command;

export async function runCmd(cmd: string, execaCommand = execa.command, options: any = { shell: false }): Promise<execa.ExecaReturnValue | execa.ExecaReturnValue & Error> {
  let res;
  const dir = get(getConfig(), 'flags.dir', process.cwd());  // respect dir flag if present
  try {
  res = await execaCommand(cmd, Object.assign(options, { cwd: dir }));
  } catch (e) {
    // don't propagate exception here since execa Errors also
    // contain ExecaReturnValue properties like failed, stderr, etc.
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
    config.facts.j1.client.accessToken = 'REDACTED';
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

const logLines: string[] = [];

export function log(msg: any, level: LogLevel = 'INFO', config: Config = getConfig(), consoleObj = console): void {
  const logMsg = new Date() + ': ' + String(msg);
  if (level === 'DEBUG'){
    if (config.flags.debug) {
      consoleObj.debug(msg);
    }
    logLines.push(logMsg);
    return;
  }
  consoleObj[level.toLowerCase() as keyof LogLevelValues](msg);
  logLines.push(logMsg);
}

export function getLogOutput(): string {
  return logLines.join('\n');
}

export function epochDaysFromNow(days: number, now = Date.now()): number {
  return now + days
    * 24    // hours/day
    * 60    // minutes/hour
    * 60    // seconds/minute
    * 1000; // millis/second
    // What's 1000 times more awesome than a UNIX epoch?
}
