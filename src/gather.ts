import { RiskCategory, Risk, Config } from './types';
import { getConfig } from './config';
import { calculateRiskSubtotal, log } from './helpers';
import * as scm from './scm';
import * as code from './code';
import * as project from './project';
import * as override from './override';

export async function localSCMRisk(): Promise<RiskCategory> {
  const checks: Promise<Risk>[] = [];
  const defaultRiskValue = 5;

  const config = getConfig();

  // perform appropriate checks
  checks.push(scm.gitRepoDirCheck(config.flags.dir, config));

  if (config.facts.scm.gitPath) {
    checks.push(scm.gitConfigGPGCheck());
  }
  if (config.facts.scm.gitPath && config.facts.scm.gpgPath) {
    checks.push(scm.gpgVerifyRecentCommitsCheck());
  }

  checks.push(scm.gitleaksCheck(await scm.parseGitleaksScan(config.facts.scm.scans.gitleaksScanReport)));

  // gather risks
  const risks = await Promise.all(checks);

  return {
    title: 'SCM Risk',
    defaultRiskValue,
    risks,
    scoreSubtotal: calculateRiskSubtotal(risks, defaultRiskValue)
  };
}

export async function codeRisk(): Promise<RiskCategory> {
  const config = getConfig();

  // TODO: allow category risk config override
  const defaultRiskValue = 0;
  const checks: Promise<Risk>[] = [];

  const gitStats = await code.getGitDiffStats(config.flags.mergeRef);

  if (gitStats.filesChanged > 0) {
    checks.push(code.locCheck(gitStats));
    checks.push(code.filesChangedCheck(gitStats));
  } else {
    config.flags.verbose && log(`Couldn't retrieve git stats for HEAD..${config.flags.mergeRef}, skipping some checks.`, 'WARN');
  }
  checks.push(code.depScanCheck(await code.parseShiftLeftDepScan(config.facts.code.scans.depScanReport)));

  // gather risks
  const risks = await Promise.all(checks);

  return {
    title: 'CODE Risk',
    defaultRiskValue,
    risks,
    scoreSubtotal: calculateRiskSubtotal(risks, defaultRiskValue)
  };
}

export async function projectRisk(config: Config = getConfig()): Promise<RiskCategory> {
  const checks: Promise<Risk>[] = [];
  const defaultRiskValue = 0;

  const j1Client = config.facts.j1.client;
  if (j1Client) {
    const projectName = config.facts.project.name;
    const findings = await j1Client.gatherEntities(`Find Finding that HAS CodeRepo with name='${projectName}'`);
    const { snykFindings, maintenanceFindings, unknownFindings } = project.sortFindings(findings as any[]);
    checks.push(project.codeRepoSnykFindingsCheck(snykFindings));
    checks.push(project.codeRepoMaintenanceFindingsCheck(maintenanceFindings));
    if (unknownFindings.length) {
      log(`WARNING: ${projectName} CodeRepo has ${unknownFindings.length} Findings of unknown type. These do not currently contribute to risk scoring, but should be addressed.`, 'WARN');
    }
  }
  checks.push(project.threatModelCheck());

  // gather risks
  const risks = await Promise.all(checks);

  return {
    title: 'PROJECT Risk',
    defaultRiskValue,
    risks,
    scoreSubtotal: calculateRiskSubtotal(risks, defaultRiskValue)
  };
}

export async function riskOverrides(config: Config = getConfig()): Promise<RiskCategory> {
  const checks: Promise<Risk>[] = [];
  const defaultRiskValue = 0;

  const riskOverrides: RiskCategory = {
    title: 'Manual Risk OVERRIDES',
    defaultRiskValue: 0,
    risks: [],
    scoreSubtotal: 0
  };

  const { trustedPubKeys, repoOverrides } = config.facts.override;

  if (! trustedPubKeys.length || ! repoOverrides.length) {
    return riskOverrides;
  }

  await override.importPublicKeys(trustedPubKeys);

  for (const repoOverride of repoOverrides) {
    checks.push(override.manualOverrideCheck(repoOverride));
  }

  // gather valid overrides
  const validOverrides = await Promise.all(checks);

  await override.removePublicKeyring();

  riskOverrides.risks = validOverrides;
  riskOverrides.scoreSubtotal = calculateRiskSubtotal(validOverrides, defaultRiskValue);

  return riskOverrides;
}
