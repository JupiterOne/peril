import {Command, flags} from '@oclif/command'
import { getConfig, initConfig } from './config';
import { redactConfig } from './helpers';

class Peril extends Command {
  static description = 'JupiterOne Project Risk-Analysis and Reporting Tool'

  static flags = {
    version: flags.version({char: 'V'}),
    help: flags.help({char: 'h'}),
    name: flags.string({char: 'n', description: 'name to print'}),
    dir: flags.string({char: 'd', description: 'directory path to scan', default: process.cwd()}),
    verbose: flags.boolean({char: 'v', description: 'enable verbose output'}),
  }

  async run() {
    const {flags} = this.parse(Peril)
    await initConfig(flags);

    if (flags.verbose) {
      console.log(redactConfig(getConfig()));
    }
  }
}

export = Peril
