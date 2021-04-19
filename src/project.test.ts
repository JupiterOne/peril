import { cloneDeep } from 'lodash';
import maintenanceFindings from '../test/fixtures/j1RepoDMFindings.json';
import repoFindings from '../test/fixtures/j1RepoFindings.json';
import snykFindings from '../test/fixtures/j1RepoSnykFindings.json';
import { config } from '../test/fixtures/testConfig';
import {
  codeRepoMaintenanceFindingsCheck,
  codeRepoSnykFindingsCheck,
  sortFindings,
  threatModelCheck,
} from './project';
import { DeferredMaintenanceFinding, SnykFinding } from './types';

describe('project risks', () => {
  it('sortFindings sorts finding entities by _type', () => {
    const sorted = sortFindings(repoFindings);
    expect(sorted.snykFindings.length).toEqual(3);
    expect(sorted.maintenanceFindings.length).toEqual(2);
    expect(sorted.unknownFindings.length).toEqual(0);
    const repoFindingsClone = cloneDeep(repoFindings);
    repoFindingsClone.push({} as any);
    const sort2 = sortFindings(repoFindingsClone);
    expect(sort2.snykFindings.length).toEqual(3);
    expect(sort2.maintenanceFindings.length).toEqual(2);
    expect(sort2.unknownFindings.length).toEqual(1);
  });

  it('codeRepoSnykFindingsCheck respects ignoreNonUpgradables config flag', async () => {
    const {
      snykFindings: snykFindingsCheckValues,
    } = config.values.checks.project;
    const risk = await codeRepoSnykFindingsCheck(
      (snykFindings as unknown) as SnykFinding[],
      snykFindingsCheckValues
    );
    expect(
      config.values.checks.project.snykFindings.ignoreNonUpgradables
    ).toBeTruthy();
    expect(risk.description).toMatch(/snykFindings: 2 HIGH/);
    const snykFindingsCheckValues2 = cloneDeep(snykFindingsCheckValues);
    snykFindingsCheckValues2.ignoreNonUpgradables = false;
    const risk2 = await codeRepoSnykFindingsCheck(
      (snykFindings as unknown) as SnykFinding[],
      snykFindingsCheckValues2
    );
    expect(risk2.description).toMatch(/snykFindings: 2 HIGH, 1 MEDIUM/);
  });

  it('codeRepoSnykFindingsCheck does not penalize for zero findings', async () => {
    const findings = cloneDeep(snykFindings);
    for (const f of findings) {
      f.properties.isUpgradable = false;
    }
    const {
      snykFindings: snykFindingsCheckValues,
    } = config.values.checks.project;
    const risk = await codeRepoSnykFindingsCheck(
      (findings as unknown) as SnykFinding[],
      snykFindingsCheckValues
    );
    expect(snykFindingsCheckValues.ignoreNonUpgradables).toBeTruthy();
    expect(risk.value).toEqual(0);
    expect(risk.description).toMatch(/None/);
  });

  it('codeRepoMaintenanceFindingsCheck scales risk linearly by days overdue for open items', async () => {
    const findings = (cloneDeep(
      maintenanceFindings
    ) as unknown) as DeferredMaintenanceFinding[];
    expect(findings.length).toEqual(2);
    findings[0].properties.closed = true; // ignore first finding
    const dueDate = new Date(findings[1].properties.dueDate);
    const riskStep =
      config.values.checks.project.maintenanceFindings.daysLateRiskStep;
    // mock current time as 1 riskStep days past dueDate
    const mockNow = new Date(
      dueDate.getTime() + riskStep * 24 * 60 * 60 * 1000
    );
    const {
      maintenanceFindings: maintenanceFindingsCheckValues,
    } = config.values.checks.project;
    const risk = await codeRepoMaintenanceFindingsCheck(
      findings,
      maintenanceFindingsCheckValues,
      mockNow
    );
    const riskValuePerStep =
      maintenanceFindingsCheckValues.daysLateRiskValuePerStep;
    expect(risk.value).toEqual(riskValuePerStep);
  });

  it('threatModelCheck assigns configurable risk based on unmitigated threats from ThreatDragon models', async () => {
    const {
      threatModels: threatModelsCheckValues,
    } = config.values.checks.project;
    const { project: projectFacts } = config.facts;
    const risk = await threatModelCheck(threatModelsCheckValues, projectFacts);
    const {
      highRiskValue,
      mediumRiskValue,
      lowRiskValue,
    } = config.values.checks.project.threatModels;
    const highs = 1;
    const mediums = 1;
    const lows = 0;
    const expectedValue =
      highRiskValue * highs + mediumRiskValue * mediums + lowRiskValue * lows;
    expect(risk.value).toEqual(expectedValue);
  });

  it('threatModelCheck returns zero risk when disabled', async () => {
    const cfg = cloneDeep(config);
    const { threatModels: threatModelsCheckValues } = cfg.values.checks.project;
    const { project: projectFacts } = cfg.facts;
    threatModelsCheckValues.enabled = false;
    const risk = await threatModelCheck(threatModelsCheckValues, projectFacts);
    expect(risk.value).toEqual(0);
  });

  it('threatModelCheck returns configurable missing value when no models are discovered at fact-time', async () => {
    const cfg = cloneDeep(config);
    const { threatModels: threatModelsCheckValues } = cfg.values.checks.project;
    const { project: projectFacts } = cfg.facts;
    projectFacts.threatDragonModels = [];
    const risk = await threatModelCheck(threatModelsCheckValues, projectFacts);
    expect(risk.value).toEqual(threatModelsCheckValues.missingValue);
  });

  it('threatModelCheck returns configurable credit value when all threats have been mitigated', async () => {
    const cfg = cloneDeep(config);
    const { threatModels: threatModelsCheckValues } = cfg.values.checks.project;
    const { project: projectFacts } = cfg.facts;
    projectFacts.threatDragonModels = [
      __dirname + '/../test/fixtures/threatDragonMitigated.json',
    ];
    const risk = await threatModelCheck(threatModelsCheckValues, projectFacts);
    expect(risk.value).toEqual(threatModelsCheckValues.allMitigatedCredit);
  });
});
