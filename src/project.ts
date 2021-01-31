import { RiskCategory, Risk, Config, SnykFinding, DeferredMaintenanceFinding, SortedFindings } from './types';
import { calculateRiskSubtotal, formatRisk } from './helpers';
import { getConfig } from './config';
import { get } from 'lodash';

const riskCategory = 'project';

export async function gatherProjectRisk(config: Config = getConfig()): Promise<RiskCategory> {
  const checks: Promise<Risk>[] = [];
  const defaultRiskValue = 0;

  // TODO gather repo name, j1Client facts
  /*
  const codeRepo = config.facts.repoName;
  const j1Client = config.facts.j1Client;

  // perform appropriate checks
  if (j1Client) {
    const findings = await j1Client.queryV1(`Find Finding that HAS CodeRepo with name='${codeRepo}'`);
    checks.push(codeRepoFindingsCheck(findings));
  }

  */
  // gather risks
  const risks = await Promise.all(checks);

  return {
    title: 'Project Risk',
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

  return formatRisk({
    check,
    description: `${validFindings.length} past due maintenance items`,
    value
  }, riskCategory, check);

}

export async function codeRepoSnykFindingsCheck(
  findings: SnykFinding[],
  config: Config = getConfig()
): Promise<Risk> {
  const check = 'snykFindings';
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
  }

  return formatRisk({
    check,
    description: validFindingCounts.join(', '),
    value
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
