import { runCmd } from './helpers';
import * as fs from 'fs-extra';
import { epochDaysFromNow } from './helpers';
import { createOverride } from './override';

const prompts = require('prompts');

export async function processOverrideCommand(): Promise<void> {
  const questions = [
    {
      type: 'number',
      name: 'credit',
      message: 'What credit should be granted to repo? (enter negative value)'
    },
    {
      type: "select",
      name: "expiry",
      message: "When should this credit expire?",
      choices: [
        { title: "Tomorrow", value: epochDaysFromNow(1) },
        { title: "In Three Days", value: epochDaysFromNow(3) },
        { title: "A Week", value: epochDaysFromNow(7) },
        { title: "Two Weeks", value: epochDaysFromNow(14) },
      ]
    },
    {
      type: 'text',
      name: 'justification',
      message: 'What is the business justification for this credit?',
    },
  ];
  const { credit, expiry, justification } = await prompts(questions);
  const override = await createOverride(credit, expiry, justification);
  const overrideFile = '.peril/override-until_' + (new Date(expiry)).toISOString() + '.asc';

  console.log(override);

  const { confirmed } = await prompts({
    type: "confirm",
    name: "confirmed",
    message: `Write this override to repo as '${overrideFile}'?`,
    initial: true
  });
  if (confirmed) {
    await fs.mkdirp('.peril');
    const sign = await runCmd('gpg --clear-sign', undefined, { input: JSON.stringify(override, null, 2) });
    if (sign.failed) {
      console.error("Oops! something went wrong: ", {sign});
      return;
    }
    await fs.writeFile(overrideFile, sign.stdout);
    console.log('Override written as ' + overrideFile + '. Please commit this to the repo!');
  } else {
    console.log('Override canceled.');
  }
}
