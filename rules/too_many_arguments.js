module.exports = function (context) {
  return {
    CallExpression: function (node) {
      if (node.callee.name === 'require' && node.arguments.length > 1) {
        context.report(node, 'require() called with extra arguments. Only one argument is expected', {});
      }
    }
  };
};
