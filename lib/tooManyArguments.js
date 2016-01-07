'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var tooManyArguments = exports.tooManyArguments = function tooManyArguments(context) {
  return {
    CallExpression: function CallExpression(node) {
      if (node.callee.name === 'require' && node.arguments.length > 1) {
        context.report(node, 'require() called with extra arguments. Only one argument is expected', {});
      }
    }
  };
};