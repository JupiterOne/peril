import fs from 'fs-extra';
import { get } from 'lodash';
import path from 'path';
import { getConfig } from './config';
import { findFiles, formatRisk, log, runCmd } from './helpers';
import {
  Config,
  DeferredMaintenanceFinding,
  ProjectFacts,
  ProjectValuesMaintenanceFindingsCheck,
  ProjectValuesSnykFindingsCheck,
  ProjectValuesThreatModelsCheck,
  Risk,
  SnykFinding,
  SortedFindings,
} from './types';

const riskCategory = 'project';

export async function codeRepoMaintenanceFindingsCheck(
  findings: DeferredMaintenanceFinding[],
  checkValues: ProjectValuesMaintenanceFindingsCheck,
  now: Date = new Date(),
  facts = getConfig().facts
): Promise<Risk> {
  const check = 'deferredMaintenanceFindings';
  const recommendations: string[] = [];

  const validFindings = findings.filter((f) => {
    const { closed, dueDate } = f.properties;
    if (closed) {
      return false; // ignore previously closed findings
    }
    const lapsedTime = now.getTime() - new Date(dueDate).getTime();
    const lapsedDays = lapsedTime / 1000 / 60 / 60 / 24.0;
    f.properties.lapsedDays = lapsedDays;
    return lapsedTime > 0; // ignore risk for maintenance within deferral period
  });

  const { daysLateRiskStep, daysLateRiskValuePerStep } = checkValues;
  const value = validFindings.reduce((acc, f) => {
    // risk is valuePerStep for every riskStep number of days late
    acc +=
      (f.properties.lapsedDays || 0) /
      (daysLateRiskStep / daysLateRiskValuePerStep);
    return acc;
  }, 0);

  if (validFindings.length) {
    let link = '';
    if (facts.j1.client) {
      link = await facts.j1.client.getQueryUrl(
        `Find deferred_maintenance with closed=false that HAS CodeRepo with name="${facts.project.name}" return TREE`
      );
    }
    recommendations.push(
      'Resolve and close open deferred_maintenance Findings. ' + link
    );
  }

  return formatRisk(
    {
      check,
      description: `${validFindings.length} past due maintenance items`,
      value,
      recommendations,
    },
    riskCategory,
    check
  );
}

export async function codeRepoSnykFindingsCheck(
  findings: SnykFinding[],
  checkValues: ProjectValuesSnykFindingsCheck,
  facts = getConfig().facts
): Promise<Risk> {
  const check = 'snykFindings';
  const recommendations: string[] = [];
  const { ignoreNonUpgradables } = checkValues;

  const validFindings = findings.filter((f) => {
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
  for (const severity of ['critical', 'high', 'medium', 'low']) {
    const sevCount = validFindings.filter(
      (f) => f.properties.severity.toLowerCase() === severity
    ).length;
    if (sevCount > 0) {
      validFindingCounts.push(`${sevCount} ${severity.toUpperCase()}`);
    }
  }
  if (!validFindingCounts.length) {
    validFindingCounts.push('None');
  } else {
    let link = '';
    if (facts.j1.client) {
      link = await facts.j1.client.getQueryUrl(
        `Find snyk_finding with open=true that HAS CodeRepo with name="${facts.project.name}" return TREE`
      );
    }
    recommendations.push('Upgrade vulnerable packages. ' + link);
  }

  return formatRisk(
    {
      check,
      description: validFindingCounts.join(', '),
      value,
      recommendations,
    },
    riskCategory,
    check
  );
}

export async function threatModelCheck(
  checkValues: ProjectValuesThreatModelsCheck,
  checkFacts: ProjectFacts['project']
): Promise<Risk> {
  const check = 'threatModels';
  const recommendations: string[] = [];
  const { enabled } = checkValues;
  let value = 0;

  if (!enabled) {
    return formatRisk(
      {
        check,
        description: 'threatModels check is disabled',
        value,
        recommendations,
      },
      riskCategory,
      check
    );
  }

  if (!checkFacts.threatDragonModels.length) {
    recommendations.push(
      `Perform threat analysis with OWASP ThreatDragon, and commit the JSON output to the '${checkFacts.threatDragonModelsDir}' folder.`
    );
    return formatRisk(
      {
        check,
        description: 'No ThreatDragon models found.',
        value: checkValues.missingValue,
        recommendations,
      },
      riskCategory,
      check
    );
  }

  interface Threat {
    severity: string;
    status: string;
    title: string;
    type: string;
  }

  const openThreats: Threat[] = [];
  const mitigatedThreats: Threat[] = [];
  const sevValues: { [index: string]: number } = {
    low: checkValues.lowRiskValue,
    medium: checkValues.mediumRiskValue,
    high: checkValues.highRiskValue,
  };

  try {
    for (const modelFile of checkFacts.threatDragonModels) {
      // json.detail.diagrams[0].diagramJson.cells[3].threats[1].severity = "Low";
      // json.detail.diagrams[0].diagramJson.cells[3].threats[1].status = "Open";
      const model = JSON.parse(await fs.readFile(String(modelFile), 'utf8'));
      for (const diagram of get(model, 'detail.diagrams', [])) {
        for (const cells of get(diagram, 'diagramJson.cells', [])) {
          for (const threat of get(cells, 'threats', []) as Threat[]) {
            if (String(threat.status).toLowerCase() === 'mitigated') {
              mitigatedThreats.push(threat);
              continue;
            }
            const sev = String(threat.severity).toLowerCase();
            if (['high', 'medium', 'low'].includes(sev)) {
              openThreats.push(threat);
              value += sevValues[sev];
            }
          }
        }
      }
    }
  } catch (e) {
    log('Could not parse one or more threatModel files: ' + e, 'WARN');
  }

  if (openThreats.length) {
    recommendations.push('Mitigate open design weakness(es) in threat model.');
  }

  const openThreatCounts: string[] = [];
  for (const severity of ['high', 'medium', 'low']) {
    const sevCount = openThreats.filter(
      (t) => t.severity.toLowerCase() === severity
    ).length;
    if (sevCount > 0) {
      openThreatCounts.push(`${sevCount} ${severity.toUpperCase()}`);
    }
  }

  if (!openThreatCounts.length && mitigatedThreats.length) {
    value += checkValues.allMitigatedCredit;
    openThreatCounts.push('All modeled threats have been mitigated! 🎉');
  }

  return formatRisk(
    {
      check,
      description: openThreatCounts.join(', '),
      value,
      recommendations,
    },
    riskCategory,
    check
  );
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
    if (types.includes('deferred_maintenance')) {
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
    unknownFindings,
  };
}

export async function getRepoNameFromGitConfig(
  cmdRunner: any = undefined
): Promise<string | undefined> {
  const cmd = await runCmd('git config --local remote.origin.url', cmdRunner);
  if (cmd.failed || !cmd.stdout.length) {
    return undefined;
  }
  const originUrl = cmd.stdout;
  // originUrl will be of form, e.g.: 'https://github.com/user/reponame.git'
  const repoName = (originUrl.split('/').pop() || '').split('.git')[0];
  return repoName;
}

export async function gatherFacts(
  config: Config = getConfig()
): Promise<ProjectFacts> {
  const { dir } = config.flags;
  const nameFile = path.join(dir, 'project.name');
  let name;
  if (await fs.pathExists(nameFile)) {
    name = (await fs.readFile(nameFile, 'utf8')).trim();
  } else {
    name = (await getRepoNameFromGitConfig()) || dir.split(path.sep).pop(); // fallback to directory name as last resort
  }

  const modelsDir = config.env.threatDragonDir || 'ThreatDragonModels';
  const threatDragonModelsPattern = '.*.json';
  const threatDragonModelsDir = path.join(config.flags.dir, modelsDir);
  let models: string[] = [];
  if (await fs.pathExists(threatDragonModelsDir)) {
    // check top-level dir
    models = models.concat(
      await findFiles(threatDragonModelsDir, threatDragonModelsPattern)
    );
    // check any sub-dirs
    for (const ent of await fs.readdir(threatDragonModelsDir)) {
      const subdir = path.join(threatDragonModelsDir, ent);
      if ((await fs.stat(subdir)).isDirectory()) {
        models = models.concat(
          await findFiles(subdir, threatDragonModelsPattern)
        );
      }
    }
  }
  return {
    project: {
      name,
      threatDragonModels: models,
      threatDragonModelsDir: modelsDir,
    },
  };
}
