export interface Risk {
  source: string;
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

export type Facts = SCMFacts;

export interface ShortStat {
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number
};
