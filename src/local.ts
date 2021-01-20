import { RiskCategory, Risk } from './types';
import { calculateRiskSubtotal } from './helpers';
import * as fs from 'fs-extra';
import * as path from 'path';

export async function gatherLocalSCMRisk(dir: string): Promise<RiskCategory> {
  const checks: Promise<Risk>[] = [];
  const defaultRiskValue = 5;

  checks.push(gitRepoCheck(dir));

  const risks = await Promise.all(checks);

  return {
    title: 'SCM Risk',
    defaultRiskValue,
    risks,
    scoreSubtotal: calculateRiskSubtotal(risks, defaultRiskValue)
  };
}

export async function gitRepoCheck(dir: string): Promise<Risk> {
  let value = 5;
  let description = 'Missing SCM - no git repo found!';

  if (await fs.pathExists(path.join(dir, '.git'))) {
    value = -5;
    description = 'SCM - git repo found.';
  }

  return {
    source: 'local',
    value,
    description
  };
}
