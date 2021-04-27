import { LicenseFinding } from './../../src/types';

export const badLicenseFindings: LicenseFinding[] = [
  {
    purl: 'pkg:npm/babel/compat-data@7.13.15',
    licenses: [
      {
        license: {
          id: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
    ],
  },
  {
    purl: 'pkg:npm/caniuse-lite@1.0.30001208',
    licenses: [
      {
        license: {
          id: 'CC-BY-4.0',
          url: 'https://opensource.org/licenses/CC-BY-4.0',
        },
      },
    ],
  },
  {
    purl: 'pkg:npm/electron-to-chromium@1.3.713',
    licenses: [
      {
        license: {
          id: 'ISC',
          url: 'https://opensource.org/licenses/ISCq',
        },
      },
    ],
  },
  {
    purl: 'pkg:npm/babel/compat-data@7.13.15',
    licenses: [
      {
        license: {
          id: 'GPLv2',
          url: 'https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html',
        },
      },
    ],
  },
  {
    purl: 'pkg:npm/electron-to-bromium@1.3.713',
    licenses: [
      {
        license: {
          id: 'MS-RL',
          url: 'https://opensource.org/licenses/MS-RL',
        },
      },
    ],
  },
];

export const goodLicenseFindings: LicenseFinding[] = [
  {
    purl: 'pkg:npm/babel/compat-data@7.13.15',
    licenses: [
      {
        license: {
          id: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      },
    ],
  },
  {
    purl: 'pkg:npm/caniuse-lite@1.0.30001208',
    licenses: [
      {
        license: {
          id: 'CC-BY-4.0',
          url: 'https://opensource.org/licenses/CC-BY-4.0',
        },
      },
    ],
  },
  {
    purl: 'pkg:npm/electron-to-chromium@1.3.713',
    licenses: [
      {
        license: {
          id: 'ISC',
          url: 'https://opensource.org/licenses/ISCq',
        },
      },
    ],
  },
];
