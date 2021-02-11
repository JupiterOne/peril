import {Command, flags} from '@oclif/command'
import { getConfig, initConfig } from './config';
import { redactConfig } from './helpers';
import { gatherLocalSCMRisk } from './scm';
import { gatherCodeRisk } from './code';
import { gatherProjectRisk } from './project';
import { RiskCategory } from './types';
import { log, getLogOutput } from './helpers';
import fs from 'fs-extra';

class Peril extends Command {
  static description = 'JupiterOne Project Risk-Analysis and Reporting Tool'

  static flags = {
    version: flags.version({char: 'V'}),
    help: flags.help({char: 'h'}),
    debug: flags.boolean({description: 'debug mode, very verbose'}),
    dir: flags.string({char: 'd', description: 'directory path to scan', default: process.cwd()}),
    mergeRef: flags.string({char: 'm', description: 'current git ref/tag of default branch (merge target)', default: 'master'}),
    config: flags.string({char: 'c', description: 'path to override config file'}),
    log: flags.string({char: 'l', description: 'path to output log file'}),
    verbose: flags.boolean({char: 'v', description: 'enable verbose output'}),
    accept: flags.boolean({description: 'accept all risk (do not exit with non-zero status)'})
  }

  async run() {
    const {flags} = this.parse(Peril)
    await initConfig(flags);

    log('peril invoked with: peril ' + process.argv.slice(2).join(' '));
    log(JSON.stringify(redactConfig(getConfig()), null, 2), 'DEBUG');

    const riskCategories: RiskCategory[] = [];

    log('Analyzing risk factors...');

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
    let exitCode = 0;

    if (riskTotal > tolerance) {
      log(`\nFinal score is ${(riskTotal - tolerance).toFixed(2)} points over the limit configured by ${business} (${tolerance}).`);
      if (flags.accept) {
        log(`🚧 The risk associated with these changes has been force-approved by ${business}.`);
      } else {
        log('❌ These changes are too risky! Please attend to the recommendations above to lower the overall risk.');
        exitCode = 1;
      }
    } else {
      log(`\n✅ The risk associated with these changes is accepted by ${business}.`);
    }
    if (flags.log) {
      await writeLogFile(String(flags.log));
      console.log('output logged to: ' + flags.log);
    }
    process.exit(exitCode);
  }
}

function displayOutput(riskCategories: RiskCategory[], riskTotal: number, flags: any): void {
  const recommendations = extractRecommendations(riskCategories);

  riskCategories.forEach(riskCategory => {
    if (flags.verbose) {
      log(`\n${riskCategory.title}:`);
      riskCategory.risks.forEach(risk => {
        log(risk.description);
      });
    }
    log(`${riskCategory.title}: ${riskCategory.scoreSubtotal.toFixed(2)}`);
  });
  log('-----------------')
  log('Total Score: ' + riskTotal.toFixed(2));

  if (recommendations.length) {
    log('\nRecommended actions to reduce risk:');
    recommendations.forEach(recommendation => {
      log('* ' + recommendation);
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

async function writeLogFile(logFile: string): Promise<void> {
  return fs.writeFile(logFile, getLogOutput());
}

export = Peril

