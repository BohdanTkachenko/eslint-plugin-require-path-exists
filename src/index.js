import { notEmpty } from './notEmpty';
import { tooManyArguments } from './tooManyArguments';
import { exists } from './exists';

export default {
  rules: {
    notEmpty,
    tooManyArguments,
    exists
  },
  configs: {
    recommended: {
      plugins: ['require-path-exists'],
      rules: {
        'require-path-exists/notEmpty': 2,
        'require-path-exists/tooManyArguments': 2,
        'require-path-exists/exists': [ 2, { extensions: ['', '.js', '.json', '.node'] }] 
      }
    }
  }
};
