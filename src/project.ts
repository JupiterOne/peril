import { RiskCategory, Risk, Config, SnykFinding, DeferredMaintenanceFinding, SortedFindings, ProjectFacts } from './types';
import { formatRisk, calculateRiskSubtotal } from './helpers';
import { getConfig } from './config';
import { get } from 'lodash';
import fs from 'fs-extra';
import path from 'path';

const riskCategory = 'project';

export async function gatherProjectRisk(config: Config = getConfig()): Promise<RiskCategory> {
  const checks: Promise<Risk>[] = [];
  const defaultRiskValue = 0;

  const j1Client = config.facts.j1.client;
  if (j1Client) {
    const projectName = config.facts.project.name;
    const findings = await j1Client.gatherEntities(`Find Finding that HAS CodeRepo with name='${projectName}'`);
    const { snykFindings, maintenanceFindings, unknownFindings } = sortFindings(findings as any[]);
    checks.push(codeRepoSnykFindingsCheck(snykFindings));
    checks.push(codeRepoMaintenanceFindingsCheck(maintenanceFindings));
    if (unknownFindings.length) {
      console.warn(`WARNING: ${projectName} CodeRepo has ${unknownFindings.length} Findings of unknown type. These do not currently contribute to risk scoring, but should be addressed.`);
    }
  }

  // gather risks
  const risks = await Promise.all(checks);

  return {
    title: 'PROJECT Risk',
    defaultRiskValue,
    risks,
    scoreSubtotal: calculateRiskSubtotal(risks, defaultRiskValue)
  };
}

export async function codeRepoMaintenanceFindingsCheck(
  findings: DeferredMaintenanceFinding[],
  config: Config = getConfig(),
  now: Date = new Date()
): Promise<Risk> {
  const check = 'deferredMaintenanceFindings';
  const recommendations: string[] = [];

  const validFindings = findings.filter(f => {
    const {closed, dueDate } = f.properties;
    if (closed) {
      return false;        // ignore previously closed findings
    }
    const lapsedTime = now.getTime() - (new Date(dueDate).getTime());
    const lapsedDays = lapsedTime / 1000 / 60 / 60 / 24.0;
    f.properties.lapsedDays = lapsedDays;
    return lapsedTime > 0; // ignore risk for maintenance within deferral period
  });

  const daysLateRiskStep = config.values.checks.project.maintenanceFindings.daysLateRiskStep;
  const daysLateRiskValuePerStep = config.values.checks.project.maintenanceFindings.daysLateRiskValuePerStep;
  const value = validFindings.reduce((acc, f) => {
    // risk is valuePerStep for every riskStep number of days late
    acc += (f.properties.lapsedDays || 0) / (daysLateRiskStep / daysLateRiskValuePerStep);
    return acc;
  }, 0);

  if (validFindings.length) {
    let link = '';
    if (config.facts.j1.client) {
      link = await config.facts.j1.client.getQueryUrl(`Find deferred_maintenance with closed=false that HAS CodeRepo with name="${config.facts.project.name}" return TREE`);
    }
    recommendations.push('Resolve and close open deferred_maintenance Findings. ' + link);
  }

  return formatRisk({
    check,
    description: `${validFindings.length} past due maintenance items`,
    value,
    recommendations
  }, riskCategory, check);

}

export async function codeRepoSnykFindingsCheck(
  findings: SnykFinding[],
  config: Config = getConfig()
): Promise<Risk> {
  const check = 'snykFindings';
  const recommendations: string[] = [];
  const ignoreNonUpgradables = config.values.checks.project.snykFindings.ignoreNonUpgradables;

  const validFindings = findings.filter(f => {
    const { open, isUpgradable } = f.properties;
    if (!open || (ignoreNonUpgradables && !isUpgradable)) {
      return false;
    }
    return true;
  });

  const value = validFindings.reduce((acc, f) => {
    acc += f.properties.score;
    return acc;
  }, 0);

  // summarize valid findings in description
  // e.g. 1 CRITICAL, 2 HIGH, etc.

  const validFindingCounts: string[] = [];
  for (const severity of [ 'critical', 'high', 'medium', 'low' ]) {
    const sevCount = validFindings.filter(f => f.properties.severity.toLowerCase() === severity).length;
    if (sevCount > 0) {
        validFindingCounts.push(`${sevCount} ${severity.toUpperCase()}`);
   }
  }
  if (!validFindingCounts.length) {
    validFindingCounts.push('None');
  } else {
    let link = '';
    if (config.facts.j1.client) {
      link = await config.facts.j1.client.getQueryUrl(`Find snyk_finding with open=true that HAS CodeRepo with name="${config.facts.project.name}" return TREE`);
    }
    recommendations.push('Upgrade vulnerable packages. ' + link);
  }

  return formatRisk({
    check,
    description: validFindingCounts.join(', '),
    value,
    recommendations
  }, riskCategory, check);
}

export function sortFindings(findings: any[]): SortedFindings {
  const snykFindings: SnykFinding[] = [];
  const maintenanceFindings: DeferredMaintenanceFinding[] = [];
  const unknownFindings: any[] = [];

  for (const finding of findings) {
    const types: string[] = get(finding, 'entity._type', []);
    let sorted = false;
    if (types.includes('snyk_finding')) {
      snykFindings.push(finding);
      sorted = true;
    }
    if (types.includes('deferred_maintenance')){
      maintenanceFindings.push(finding);
      sorted = true;
    }
    if (!sorted) {
      unknownFindings.push(finding);
    }
  }

  return {
    snykFindings,
    maintenanceFindings,
    unknownFindings
  };
}

export async function gatherFacts(config: Config = getConfig()): Promise<ProjectFacts> {
  const { dir } = config.flags;
  const nameFile = path.join(dir, 'project.name')
  let name;
  if (await fs.pathExists(nameFile)) {
    name = (await fs.readFile(nameFile, 'utf8')).trim();
  } else {
    name = dir.split(path.sep).pop(); // default to directory name
  }

  return {
    project: {
      name
    }
  };
}
