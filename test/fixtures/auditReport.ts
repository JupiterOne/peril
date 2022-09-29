import { PackageAudit } from '../../src/types';

export const criticalIssues: PackageAudit[] = [
  {
    type: 'auditAdvisory',
    data: {
      resolution: {
        id: 1067316,
        path:
          '@jupiterone/jupiterone-client-nodejs>@pollyjs/adapter-node-http>@pollyjs/utils>url-parse',
        dev: false,
        optional: false,
        bundled: false,
      },
      advisory: {
        findings: [
          {
            version: '1.4.7',
            paths: [
              '@jupiterone/jupiterone-client-nodejs>@pollyjs/adapter-node-http>@pollyjs/utils>url-parse',
              '@jupiterone/jupiterone-client-nodejs>@pollyjs/adapter-node-http>@pollyjs/adapter>@pollyjs/utils>url-parse',
            ],
          },
        ],
        metadata: null,
        vulnerableVersions: '<1.5.8',
        moduleName: 'url-parse',
        severity: 'critical',
        githubAdvisoryId: 'GHSA-hgjh-723h-mx2j',
        cves: ['CVE-2022-0686'],
        access: 'public',
        patchedVersions: '>=1.5.8',
        cvss: {
          score: 9.1,
          vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N',
        },
        updated: new Date('2022-03-29T22:13:52.000Z'),
        recommendation: 'Upgrade to version 1.5.8 or later',
        cwe: ['CWE-639'],
        foundBy: null,
        deleted: null,
        id: 1067316,
        references:
          '- https://nvd.nist.gov/vuln/detail/CVE-2022-0686\n- https://github.com/unshiftio/url-parse/commit/d5c64791ef496ca5459ae7f2176a31ea53b127e5\n- https://huntr.dev/bounties/55fd06cd-9054-4d80-83be-eb5a454be78c\n- https://security.netapp.com/advisory/ntap-20220325-0006/\n- https://github.com/advisories/GHSA-hgjh-723h-mx2j',
        created: new Date('2022-02-21T00:00:21.000Z'),
        reportedBy: null,
        title: 'Authorization Bypass Through User-Controlled Key in url-parse',
        npmAdvisoryId: null,
        overview:
          'url-parse prior to version 1.5.8 is vulnerable to Authorization Bypass Through User-Controlled Key.',
        url: 'https://github.com/advisories/GHSA-hgjh-723h-mx2j',
      },
    },
  },
];

export const highIssues: PackageAudit[] = [
  {
    type: 'auditAdvisory',
    data: {
      resolution: {
        id: 1081982,
        path: '@oclif/plugin-help>wrap-ansi>strip-ansi>ansi-regex',
        dev: false,
        optional: false,
        bundled: false,
      },
      advisory: {
        findings: [
          {
            version: '3.0.0',
            paths: [
              '@oclif/plugin-help>wrap-ansi>strip-ansi>ansi-regex',
              '@oclif/plugin-help>wrap-ansi>string-width>strip-ansi>ansi-regex',
              '@oclif/command>@oclif/plugin-help>wrap-ansi>string-width>strip-ansi>ansi-regex',
              '@oclif/dev-cli>@oclif/command>@oclif/plugin-help>wrap-ansi>string-width>strip-ansi>ansi-regex',
              '@oclif/command>@oclif/plugin-help>@oclif/command>@oclif/plugin-help>wrap-ansi>string-width>strip-ansi>ansi-regex',
            ],
          },
          {
            version: '3.0.0',
            paths: [
              '@jupiterone/jupiterone-client-nodejs>inquirer>strip-ansi>ansi-regex',
              '@jupiterone/jupiterone-client-nodejs>inquirer>string-width>strip-ansi>ansi-regex',
            ],
          },
          {
            version: '3.0.0',
            paths: [
              '@jupiterone/jupiterone-client-nodejs>strip-ansi>ansi-regex',
            ],
          },
        ],
        metadata: null,
        vulnerableVersions: '>=3.0.0 <3.0.1',
        moduleName: 'ansi-regex',
        severity: 'high',
        githubAdvisoryId: 'GHSA-93q8-gq69-wqmw',
        cves: ['CVE-2021-3807'],
        access: 'public',
        patchedVersions: '>=3.0.1',
        cvss: {
          score: 7.5,
          vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H',
        },
        updated: new Date('2022-08-10T20:02:27.000Z'),
        recommendation: 'Upgrade to version 3.0.1 or later',
        cwe: ['CWE-697', 'CWE-1333'],
        foundBy: null,
        deleted: null,
        id: 1081982,
        references:
          '- https://nvd.nist.gov/vuln/detail/CVE-2021-3807\n- https://github.com/chalk/ansi-regex/commit/8d1d7cdb586269882c4bdc1b7325d0c58c8f76f9\n- https://huntr.dev/bounties/5b3cf33b-ede0-4398-9974-800876dfd994\n- https://github.com/chalk/ansi-regex/issues/38#issuecomment-924086311\n- https://app.snyk.io/vuln/SNYK-JS-ANSIREGEX-1583908\n- https://github.com/chalk/ansi-regex/issues/38#issuecomment-925924774\n- https://github.com/chalk/ansi-regex/releases/tag/v6.0.1\n- https://www.oracle.com/security-alerts/cpuapr2022.html\n- https://github.com/advisories/GHSA-93q8-gq69-wqmw',
        created: new Date('2021-09-20T20:20:09.000Z'),
        reportedBy: null,
        title: 'Inefficient Regular Expression Complexity in chalk/ansi-regex',
        npmAdvisoryId: null,
        overview:
          'ansi-regex is vulnerable to Inefficient Regular Expression Complexity which could lead to a denial of service.',
        url: 'https://github.com/advisories/GHSA-93q8-gq69-wqmw',
      },
    },
  },
];

export const moderateIssues: PackageAudit[] = [
  {
    type: 'auditAdvisory',
    data: {
      resolution: {
        id: 1067956,
        path:
          '@jupiterone/typescript-tools>jest>@jest/core>jest-resolve>read-pkg-up>read-pkg>normalize-package-data>hosted-git-info',
        dev: false,
        optional: false,
        bundled: false,
      },
      advisory: {
        findings: [
          {
            version: '2.8.8',
            paths: [
              '@jupiterone/typescript-tools>jest>@jest/core>jest-resolve>read-pkg-up>read-pkg>normalize-package-data>hosted-git-info',
              '@jupiterone/typescript-tools>jest>@jest/core>@jest/reporters>jest-resolve>read-pkg-up>read-pkg>normalize-package-data>hosted-git-info',
              '@jupiterone/typescript-tools>jest>jest-cli>@jest/core>@jest/reporters>jest-resolve>read-pkg-up>read-pkg>normalize-package-data>hosted-git-info',
              '@jupiterone/typescript-tools>jest>@jest/core>jest-config>@jest/test-sequencer>jest-runner>jest-resolve>read-pkg-up>read-pkg>normalize-package-data>hosted-git-info',
              '@jupiterone/typescript-tools>jest>jest-cli>@jest/core>jest-config>@jest/test-sequencer>jest-runner>jest-resolve>read-pkg-up>read-pkg>normalize-package-data>hosted-git-info',
              '@jupiterone/typescript-tools>jest>jest-cli>@jest/core>jest-runner>jest-config>@jest/test-sequencer>jest-runner>jest-resolve>read-pkg-up>read-pkg>normalize-package-data>hosted-git-info',
            ],
          },
        ],
        metadata: null,
        vulnerableVersions: '<2.8.9',
        moduleName: 'hosted-git-info',
        severity: 'moderate',
        githubAdvisoryId: 'GHSA-43f8-2h32-f4cj',
        cves: ['CVE-2021-23362'],
        access: 'public',
        patchedVersions: '>=2.8.9',
        cvss: {
          score: 5.3,
          vectorString: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:L',
        },
        updated: new Date('2022-03-18T20:25:44.000Z'),
        recommendation: 'Upgrade to version 2.8.9 or later',
        cwe: ['CWE-400'],
        foundBy: null,
        deleted: null,
        id: 1067956,
        references:
          '- https://nvd.nist.gov/vuln/detail/CVE-2021-23362\n- https://github.com/npm/hosted-git-info/commit/bede0dc38e1785e732bf0a48ba6f81a4a908eba3\n- https://snyk.io/vuln/SNYK-JAVA-ORGWEBJARSNPM-1088356\n- https://snyk.io/vuln/SNYK-JS-HOSTEDGITINFO-1088355\n- https://github.com/npm/hosted-git-info/pull/76\n- https://github.com/npm/hosted-git-info/commit/29adfe5ef789784c861b2cdeb15051ec2ba651a7\n- https://github.com/npm/hosted-git-info/commit/8d4b3697d79bcd89cdb36d1db165e3696c783a01\n- https://github.com/npm/hosted-git-info/commits/v2\n- https://cert-portal.siemens.com/productcert/pdf/ssa-389290.pdf\n- https://github.com/advisories/GHSA-43f8-2h32-f4cj',
        created: new Date('2021-05-06T16:10:39.000Z'),
        reportedBy: null,
        title: 'Regular Expression Denial of Service in hosted-git-info',
        npmAdvisoryId: null,
        overview:
          'The npm package `hosted-git-info` before 3.0.8 are vulnerable to Regular Expression Denial of Service (ReDoS) via regular expression shortcutMatch in the fromUrl function in index.js. The affected regular expression exhibits polynomial worst-case time complexity',
        url: 'https://github.com/advisories/GHSA-43f8-2h32-f4cj',
      },
    },
  },
];

export const lowIssues: PackageAudit[] = [
  {
    type: 'auditAdvisory',
    data: {
      resolution: {
        id: 1070458,
        path: '@jupiterone/typescript-tools>husky>find-versions>semver-regex',
        dev: false,
        optional: false,
        bundled: false,
      },
      advisory: {
        findings: [
          {
            version: '3.1.2',
            paths: [
              '@jupiterone/typescript-tools>husky>find-versions>semver-regex',
            ],
          },
        ],
        metadata: null,
        vulnerableVersions: '<3.1.4',
        moduleName: 'semver-regex',
        severity: 'low',
        githubAdvisoryId: 'GHSA-4x5v-gmq8-25ch',
        cves: ['CVE-2021-43307'],
        access: 'public',
        patchedVersions: '>=3.1.4',
        cvss: {
          score: 0,
          vectorString: null,
        },
        updated: new Date('2022-06-03T22:26:34.000Z'),
        recommendation: 'Upgrade to version 3.1.4 or later',
        cwe: ['CWE-1333'],
        foundBy: null,
        deleted: null,
        id: 1070458,
        references:
          '- https://nvd.nist.gov/vuln/detail/CVE-2021-43307\n- https://research.jfrog.com/vulnerabilities/semver-regex-redos-xray-211349/\n- https://github.com/sindresorhus/semver-regex/commit/d8ba39a528c1027c43ab23f12eec28ca4d40dd0c\n- https://github.com/advisories/GHSA-4x5v-gmq8-25ch',
        created: new Date('2022-06-03T00:01:00.000Z'),
        reportedBy: null,
        title: 'Regular expression denial of service in semver-regex',
        npmAdvisoryId: null,
        overview:
          'An exponential ReDoS (Regular Expression Denial of Service) can be triggered in the semver-regex npm package, when an attacker is able to supply arbitrary input to the test() method',
        url: 'https://github.com/advisories/GHSA-4x5v-gmq8-25ch',
      },
    },
  },
];
