module.exports = {
  rules: {
    notEmpty: require('./rules/not_empty'),
    tooManyArguments: require('./rules/too_many_arguments'),
    exists: require('./rules/exists')
  },
  rulesConfig: {
    notEmpty: 2,
    tooManyArguments: 2,
    exists: 2
  }
};
