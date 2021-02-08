import {Command, flags} from '@oclif/command'
import { getConfig, initConfig } from './config';
import { redactConfig } from './helpers';
import { gatherLocalSCMRisk } from './scm';
import { gatherCodeRisk } from './code';
import { gatherProjectRisk } from './project';
import { RiskCategory } from './types';

class Peril extends Command {
  static description = 'JupiterOne Project Risk-Analysis and Reporting Tool'

  static flags = {
    version: flags.version({char: 'V'}),
    help: flags.help({char: 'h'}),
    debug: flags.boolean({description: 'debug mode, very verbose'}),
    dir: flags.string({char: 'd', description: 'directory path to scan', default: process.cwd()}),
    mergeRef: flags.string({char: 'm', description: 'current git ref/tag of default branch (merge target)', default: 'master'}),
    config: flags.string({char: 'c', description: 'path to override config file'}),
    verbose: flags.boolean({char: 'v', description: 'enable verbose output'}),
  }

  async run() {
    const {flags} = this.parse(Peril)
    await initConfig(flags);

    if (flags.debug) {
      console.log(JSON.stringify(redactConfig(getConfig()), null, 2));
    }

    const riskCategories: RiskCategory[] = [];

    console.log('Analyzing risk factors...');

    riskCategories.push(await gatherLocalSCMRisk());
    riskCategories.push(await gatherCodeRisk());
    riskCategories.push(await gatherProjectRisk());

    const riskTotal = Math.max(riskCategories.reduce((acc, c) => {
      acc += c.scoreSubtotal;
      return acc;
    }, 0), 0); // floor of 0 as minimum risk value

    displayOutput(riskCategories, riskTotal, flags);
    const config = getConfig();
    const tolerance = config.values.riskTolerance;
    const business = config.env.j1Account ? config.env.j1Account : 'the business';
    if (riskTotal > tolerance) {
      console.log(`\nFinal score is ${(riskTotal - tolerance).toFixed(2)} points over the limit configured by ${business} (${tolerance}).`);
      console.log('❌ These changes are too risky! Please attend to the recommendations above to lower the overall risk.');
      process.exit(1);
    } else {
      console.log(`\n✅ The risk associated with these changes is accepted by ${business}.`);
    }
    process.exit(0);
  }
}

function displayOutput(riskCategories: RiskCategory[], riskTotal: number, flags: any): void {
  const recommendations = extractRecommendations(riskCategories);

  riskCategories.forEach(riskCategory => {
    if (flags.verbose) {
      console.log(`\n${riskCategory.title}:`);
      riskCategory.risks.forEach(risk => {
        console.log(risk.description);
      });
    }
    console.log(`${riskCategory.title}: ${riskCategory.scoreSubtotal.toFixed(2)}`);
  });
  console.log('-----------------')
  console.log('Total Score: ' + riskTotal.toFixed(2));

  if (recommendations.length) {
    console.log('\nRecommended actions to reduce risk:');
    recommendations.forEach(recommendation => {
      console.log('* ' + recommendation);
    });
  }
}

function extractRecommendations(categories: RiskCategory[]): string[] {
  const recommendationsSet: Set<string> = new Set();
  categories.forEach(riskCategory => {
    riskCategory.risks.forEach(risk => {
      risk.recommendations.forEach(recommendation => {
        recommendationsSet.add(recommendation);
      });
    });
  });
  return Array.from(recommendationsSet);
}

export = Peril

