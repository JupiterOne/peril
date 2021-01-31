export interface Risk {
  check: string;
  value: number;
  description: string;
}

export interface RiskCategory {
  title: string;
  defaultRiskValue: number;
  risks: Risk[];
  scoreSubtotal: number;
}

export type MaybeString = string | undefined;
export interface SCMFacts {
  scm: {
    branch: MaybeString;
    remote: MaybeString;
    remoteUrl: MaybeString;
    gitPath: MaybeString;
    gpgPath: MaybeString;
    scans: {
      gitleaksScanReport: MaybeString;
    }
  }
}

export interface CodeFacts {
  code: {
    scans: {
      depScanReport: MaybeString;
    }
  }
}

export type Facts = SCMFacts & CodeFacts;

export interface Config {
  env: {
    j1AuthToken: MaybeString;
    j1Account: MaybeString;
    logLevel: string;
  };
  flags: Flags;
  facts: Facts;
  values: {
    checks: SCMValues & CodeValues & ProjectValues
  }
}

export interface SCMValues {
  scm: {
    git: {
      missingValue: number;
    },
    enforceGpg: {
      missingValue: number;
    },
    verifyGpg: {
      missingValue: number;
    },
    gitleaksFindings: {
      perFindingValue: number;
    }
  }
}

export interface CodeValues {
  code: {
    linesChanged : {
      riskStep: number;
      riskValuePerStep: number;
    },
    filesChanged : {
      riskStep: number;
      riskValuePerStep: number;
    },
    depscanFindings : {
      ignoreSeverityList: string;
      ignoreUnfixable: boolean;
      missingValue: number;
    }
  }
}

export interface ProjectValues {
  project: {
    snykFindings: {
      ignoreNonUpgradables: boolean;
    },
    maintenanceFindings: {
      daysLateRiskStep: number;
      daysLateRiskValuePerStep: number;
    }
  }
}
export interface Flags {
  verbose: boolean;
  dir: string;
  mergeRef: string;
  config: string;
}

export interface ShortStat {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number
};

export type CodeRepoFinding = SnykFinding | DeferredMaintenanceFinding;

export interface SortedFindings {
  snykFindings: SnykFinding[];
  maintenanceFindings: DeferredMaintenanceFinding[];
  unknownFindings: any[];
}

export interface DeferredMaintenanceFinding {
  entity: {
    _type: string[]
  },
  properties: {
    weblink: string;
    dueDate: string;
    description: string;
    shortDescription: string;
    createdBy: string;
    closed: boolean;
    lapsedDays?: number;
  }
}

export interface SnykFinding {
  entity: {
    _type: string[]
  },
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
  }
}

export interface DepScanFinding {
  id: string;
  package: string;
  package_usage: string;
  version: string;
  fix_version: string | null;
  severity: string;
  cvss_score: string;
  short_description: string;
}

export interface GitleaksMetrics {
  [index: string]: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}
