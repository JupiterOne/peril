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
}

export interface Flags {
  verbose: boolean;
  dir: string;
  mergeRef: string;
}

export interface ShortStat {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number
};

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

