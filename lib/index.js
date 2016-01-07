'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _notEmpty = require('./notEmpty');

var _tooManyArguments = require('./tooManyArguments');

var _exists = require('./exists');

exports.default = {
  rules: {
    notEmpty: _notEmpty.notEmpty,
    tooManyArguments: _tooManyArguments.tooManyArguments,
    exists: _exists.exists
  },
  rulesConfig: {
    notEmpty: 2,
    tooManyArguments: 2,
    exists: 2
  }
};