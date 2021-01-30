import {Command, flags} from '@oclif/command'
import { getConfig, initConfig } from './config';
import { redactConfig } from './helpers';
import { gatherLocalSCMRisk } from './scm';
import { gatherCodeRisk } from './code';
import { RiskCategory } from './types';

class Peril extends Command {
  static description = 'JupiterOne Project Risk-Analysis and Reporting Tool'

  static flags = {
    version: flags.version({char: 'V'}),
    help: flags.help({char: 'h'}),
    dir: flags.string({char: 'd', description: 'directory path to scan', default: process.cwd()}),
    mergeRef: flags.string({char: 'm', description: 'current git ref/tag of default branch (merge target)', default: 'master'}),
    config: flags.string({char: 'c', description: 'path to override config file'}),
    verbose: flags.boolean({char: 'v', description: 'enable verbose output'}),
  }

  async run() {
    const {flags} = this.parse(Peril)
    await initConfig(flags);

    if (flags.verbose) {
      console.log(JSON.stringify(redactConfig(getConfig()), null, 2));
    }

    const categories: RiskCategory[] = [];

    const scmRisk = await gatherLocalSCMRisk();
    const codeRisk = await gatherCodeRisk();
    categories.push(scmRisk);
    categories.push(codeRisk);

    if (flags.verbose) {
      console.log(scmRisk);
      console.log(codeRisk);
    }

    const riskTotal = Math.max(categories.reduce((acc, c) => {
      acc += c.scoreSubtotal;
      return acc;
    }, 0), 0);
    categories.forEach(riskCategory => {
      console.log(`${riskCategory.title}: ${riskCategory.scoreSubtotal}`);
    });
    console.log('----')
    console.log(riskTotal.toFixed(2));
  }
}

export = Peril
