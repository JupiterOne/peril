import { DepScanFinding } from './types';

export const depScanFindings: DepScanFinding[] = [
  {
    id: 'NPM-1500',
    package: 'npm:yargs-parser',
    package_usage: 'optional',
    version: '<13.1.2',
    fix_version: '13.1.2',
    severity: 'LOW',
    cvss_score: '2.0',
    short_description: '# Prototype Pollution\n' +
      'Affected versions of `yargs parser` are vulnerable to prototype pollution. Arguments are not properly sanitized, allowing an attacker to modify the prototype of `Object`, causing the addition or modification of an existing property that will exist on all objects.  \n' +
      "Parsing the argument `  foo.__proto__.bar baz'` adds a `bar` property with value `baz` to all objects. This is only exploitable if attackers have control over the arguments being passed to `yargs parser`.\n" +
      '\n' +
      'Upgrade to versions 13.1.2, 15.0.1, 18.1.1 or later.'
  },
  {
    id: 'CVE-2020-28168',
    package: 'npm:axios',
    package_usage: 'optional',
    version: '<0.21.1',
    fix_version: '0.21.1',
    severity: 'HIGH',
    cvss_score: '7.5',
    short_description: '# Server Side Request Forgery\n' +
      'The `axios` NPM package before 0.21.1 contains a Server Side Request Forgery (SSRF) vulnerability where an attacker is able to bypass a proxy by providing a URL that responds with a redirect to a restricted host or IP address.\n' +
      'Upgrade to 0.21.1 or later.'
    },
    {
      id: 'NPM-1589',
      package: 'npm:ini',
      package_usage: 'optional',
      version: '<1.3.6',
      fix_version: null,
      severity: 'MEDIUM',
      cvss_score: '4.0',
      short_description: '# Prototype Pollution\n' +
        '`ini` before version 1.3.6 has a Prototype Pollution vulnerability.\n' +
       'Upgrade to version 1.3.6 or later.'
  }
]
