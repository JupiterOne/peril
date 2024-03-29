import { J1Client } from './jupiterone';
export type Risk = {
  check: string;
  value: number;
  description: string;
  recommendations: string[];
};

export type RiskCategory = {
  title: string;
  defaultRiskValue: number;
  risks: Risk[];
  scoreSubtotal: number;
};

export type MaybeString = string | undefined;
export type SCMFacts = {
  scm: {
    branch: MaybeString;
    remote: MaybeString;
    remoteUrl: MaybeString;
    gitPath: MaybeString;
    gpgPath: MaybeString;
    scans: {
      gitleaksScanReport: MaybeString;
    };
  };
};

export type CodeFacts = {
  code: {
    scans: {
      bomReport: MaybeString;
      auditReport: MaybeString;
    };
  };
};

export type ProjectFacts = {
  project: {
    name: MaybeString;
    threatDragonModels: MaybeString[];
    threatDragonModelsDir: string;
  };
};

export type JupiterOneFacts = {
  j1: {
    client?: J1Client;
  };
};

export type OverrideFacts = {
  override: {
    trustedPubKeysDir: MaybeString;
    trustedPubKeys: string[];
    repoOverrides: string[];
  };
};

export type Facts = SCMFacts &
  CodeFacts &
  JupiterOneFacts &
  ProjectFacts &
  OverrideFacts;

export type Config = {
  env: {
    j1AuthToken: MaybeString;
    j1Account: MaybeString;
    logLevel: string;
    threatDragonDir: MaybeString;
  };
  flags: Flags;
  facts: Facts;
  values: {
    checks: SCMValues & CodeValues & ProjectValues;
    riskTolerance: number;
  };
};

export type SCMValues = {
  scm: {
    git: SCMValuesGitCheck;
    enforceGpg: SCMValuesEnforceGPGCheck;
    verifyGpg: SCMValuesVerifyGPGCheck;
    gitleaksFindings: SCMValuesGitleaksFindingsCheck;
  };
};

export type SCMValuesEnforceGPGCheck = {
  missingValue: number;
};

export type SCMValuesVerifyGPGCheck = {
  missingValue: number;
};

export type SCMValuesGitleaksFindingsCheck = {
  perFindingValue: number;
};

export type SCMValuesGitCheck = {
  missingValue: number;
};

export type CodeValues = {
  code: {
    linesChanged: CodeValuesLinesChangedCheck;
    filesChanged: CodeValuesFileChangedCheck;
    bannedLicenses: CodeValuesBannedLicensesCheck;
    auditFindings: CodeValuesPackageAuditCheck;
  };
};

export type CodeValuesBannedLicensesCheck = {
  licenses: string[];
  missingValue: number;
  noVulnerabilitiesCredit: number;
};

export type CodeValuesPackageAuditCheck = {
  ignoreSeverityList: string;
  missingValue: number;
  noAuditsCredit: number;
};

export type CodeValuesLinesChangedCheck = {
  riskStep: number;
  riskValuePerStep: number;
};

export type CodeValuesFileChangedCheck = {
  riskStep: number;
  riskValuePerStep: number;
};

export type ProjectValues = {
  project: {
    snykFindings: ProjectValuesSnykFindingsCheck;
    maintenanceFindings: ProjectValuesMaintenanceFindingsCheck;
    threatModels: ProjectValuesThreatModelsCheck;
  };
};

export type ProjectValuesSnykFindingsCheck = {
  ignoreNonUpgradables: boolean;
};

export type ProjectValuesMaintenanceFindingsCheck = {
  daysLateRiskStep: number;
  daysLateRiskValuePerStep: number;
};

export type ProjectValuesThreatModelsCheck = {
  enabled: boolean;
  highRiskValue: number;
  mediumRiskValue: number;
  lowRiskValue: number;
  allMitigatedCredit: number;
  missingValue: number;
};

export type Flags = {
  verbose: boolean;
  dir: string;
  mergeRef: string;
  config: string;
  debug: boolean;
  accept: boolean;
  override: boolean;
  pubkeyDir: string;
};

export type ShortStat = {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
};

export type CodeRepoFinding = SnykFinding | DeferredMaintenanceFinding;

export type SortedFindings = {
  snykFindings: SnykFinding[];
  maintenanceFindings: DeferredMaintenanceFinding[];
  unknownFindings: any[];
};

export type DeferredMaintenanceFinding = {
  entity: {
    _type: string[];
  };
  properties: {
    weblink: string;
    dueDate: string;
    description: string;
    shortDescription: string;
    createdBy: string;
    closed: boolean;
    lapsedDays?: number;
  };
};

export type SnykFinding = {
  entity: {
    _type: string[];
  };
  properties: {
    category: string;
    score: number;
    cwe: string;
    cve: string;
    description: string;
    weblink: string;
    isUpgradable: boolean;
    isPatchable: boolean;
    publicationTime: string;
    open: boolean;
    severity: string;
    package: string;
    version: string;
  };
};

export type BOMLicenses = {
  licenses: License[];
  purl: string;
};

export type License = {
  license: LicenseDetails;
};

export type LicenseDetails = {
  id: string;
  url: string;
};

export type GitleaksMetrics = {
  [index: string]: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export type LogLevelValues = {
  info: string;
  warn: string;
  error: string;
  debug: string;
};

export type Override = {
  signedBy: string;
  exp: number;
  expires: string;
  rootSHA: string;
  justification: string;
  credit: number;
};

export type PackageInfo = {
  module_name: string;
  issues: PackageIssue[];
};

export type PackageIssue = {
  recommendation: string;
  title: string;
};

export type PackageAudit = {
  type: string;
  data: PackageAuditData;
};

export type PackageAuditData = {
  resolution: PackageAuditResolution;
  advisory: PackageAuditAdvisory;
};

export type PackageAuditResolution = {
  id: number;
  path: string;
  dev: boolean;
  optional: boolean;
  bundled: boolean;
};

export type PackageAuditAdvisory = {
  findings: PackageAuditFindings[];
  metadata: any;
  vulnerable_versions: string;
  module_name: string;
  severity: string;
  github_advisory_id: string;
  cves: string[];
  access: string;
  patched_versions: string;
  cvss: CVSS;
  updated: Date;
  recommendation: string;
  cwe: string[];
  found_by: any;
  deleted: any;
  id: number;
  references: string;
  created: Date;
  reported_by: any;
  title: string;
  npm_advisory_id: any;
  overview: string;
  url: string;
};

export type PackageAuditFindings = {
  version: string;
  paths: string[];
};

export type CVSS = {
  score: number;
  vectorString: string | null;
};
