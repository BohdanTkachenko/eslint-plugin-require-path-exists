import { notEmpty } from './notEmpty';
import { tooManyArguments } from './tooManyArguments';
import { exists } from './exists';

export default {
  rules: {
    notEmpty,
    tooManyArguments,
    exists
  },
  rulesConfig: {
    notEmpty: 2,
    tooManyArguments: 2,
    exists: [ 2, { extensions: [ '', '.js', '.json', '.node' ] }] 
  },
  configs: {
    recommended: {
      plugins: ['require-path-exists'],
      rules: {
        notEmpty: 2,
        tooManyArguments: 2,
        exists: [ 2, { extensions: [ '', '.js', '.json', '.node' ] }] 
      },
    },
  },
};
