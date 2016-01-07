'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.exists = undefined;

var _fsPlus = require('fs-plus');

var _fsPlus2 = _interopRequireDefault(_fsPlus);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

var _child_process = require('child_process');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// TODO: any more correct way to do this?
var BUNDLED_MODULES = ['assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events', 'freelist', 'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'punycode', 'querystring', 'readline', 'repl', 'smalloc', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util', 'vm', 'zlib'];

var WEBPACK_CONFIG_NAMES = ['webpack.config.js', 'webpack.config.babel.js'];

var PACKAGE_JSON_NAME = 'package.json';
var NODE_MODULES_DIR_NAME = 'node_modules';
var MAIN_FILE_NAME = 'index';
var MAIN_FILE_NAME_JS = 'index.js';

function findInParents(absolutePath, targetFile) {
  var current = absolutePath.split(_path2.default.sep).filter(Boolean);
  while (current.length) {
    var pathname = current.join(_path2.default.sep);

    if (absolutePath.charAt(0) === _path2.default.sep) {
      pathname = _path2.default.sep + pathname;
    }

    if (_fsPlus2.default.readdirSync(pathname).indexOf(targetFile) >= 0) {
      return pathname;
    }

    current.pop();
  }

  return null;
}

function getModulesDir(fromDir) {
  if (!_fsPlus2.default.existsSync(fromDir)) {
    return null;
  }

  var pathname = findInParents(fromDir, PACKAGE_JSON_NAME);
  if (pathname !== null) {
    return _path2.default.join(pathname, NODE_MODULES_DIR_NAME);
  }

  return null;
}

function resolveModule(value, fromDir, modulesDir) {
  var pathname = _url2.default.parse(value).pathname || '';

  if (pathname.startsWith('.')) {
    // relative
    return _path2.default.join(fromDir, pathname);
  } else if (pathname.startsWith('/')) {
    // absolute
    return value;
  } else if (modulesDir) {
    // node_modules
    var moduleDir = _path2.default.join(modulesDir, value);
    var packageFilename = _path2.default.join(moduleDir, PACKAGE_JSON_NAME);

    if (_fsPlus2.default.existsSync(packageFilename)) {
      var pkg = undefined;
      try {
        pkg = JSON.parse(_fsPlus2.default.readFileSync(packageFilename));
      } catch (e) {
        pkg = false;
      }

      if (pkg && pkg.main && !Array.isArray(pkg.main) && pkg.main !== MAIN_FILE_NAME_JS) {
        return _path2.default.join(moduleDir, pkg.main);
      }
    }

    return moduleDir;
  }
}

function checkPath(pathname, extensions) {
  pathname = _fsPlus2.default.resolveExtension(pathname, extensions);

  if (!pathname) {
    return false;
  }

  if (_fsPlus2.default.isDirectorySync(pathname)) {
    pathname = _fsPlus2.default.resolveExtension(_path2.default.join(pathname, MAIN_FILE_NAME), extensions);
    if (!pathname) {
      return false;
    }
  }

  return true;
}

function getCurrentFilePath(context) {
  var filename = context.getFilename();
  if (!_fsPlus2.default.isAbsolute(filename)) {
    filename = _path2.default.join(process.cwd(), filename);
  }

  return _path2.default.dirname(filename);
}

function findWebpackConfig(fromDir) {
  var _iteratorNormalCompletion = true;
  var _didIteratorError = false;
  var _iteratorError = undefined;

  try {
    for (var _iterator = WEBPACK_CONFIG_NAMES[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
      var fileName = _step.value;

      var pathname = findInParents(fromDir, fileName);

      if (pathname) {
        return _path2.default.join(pathname, fileName);
      }
    }
  } catch (err) {
    _didIteratorError = true;
    _iteratorError = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion && _iterator.return) {
        _iterator.return();
      }
    } finally {
      if (_didIteratorError) {
        throw _iteratorError;
      }
    }
  }

  return null;
}

var webpackConfigCache = {};
function getWebpackConfig(fromDir) {
  var pathname = findWebpackConfig(fromDir);
  if (webpackConfigCache[pathname]) {
    return webpackConfigCache[pathname];
  }

  if (pathname !== null) {
    var webpackConfigLoadCode = '\n      var config = \'\';\n      try {\n        config = JSON.stringify(require(\'' + pathname + '\'));\n      } catch (e) {}\n      console.log(config);\n    ';

    var nodePath = process.argv[0];
    if (/\.babel\.js$/.test(pathname)) {
      nodePath = require.resolve('babel-cli/bin/babel-node');
    } else if (!/\/node$/.test(nodePath)) {
      nodePath = 'node';
    }

    var result = undefined;
    try {
      result = (0, _child_process.execFileSync)(nodePath, ['-e', webpackConfigLoadCode]);
      result = result.toString().trim();
    } catch (e) {
      return {};
    }

    if (!result) {
      return {};
    }

    try {
      result = JSON.parse(result);
      webpackConfigCache[pathname] = result;
    } catch (e) {
      return {};
    }

    return result;
  }

  return {};
}

function testModulePath(value, fileDir) {
  var configExtensions = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

  if (BUNDLED_MODULES.indexOf(value) >= 0) {
    return;
  }

  var modulesDir = getModulesDir(fileDir) || '';
  var webpackConfig = getWebpackConfig(fileDir);

  var extensions = Object.keys(require.extensions).concat(configExtensions);
  if (extensions.indexOf('') === -1) {
    extensions.push('');
  }

  var alias = {};
  if (_typeof(webpackConfig.resolve) === 'object') {
    if (_typeof(webpackConfig.resolve.alias) === 'object') {
      alias = webpackConfig.resolve.alias;
    }

    if (Array.isArray(webpackConfig.resolve.extensions)) {
      webpackConfig.resolve.extensions.forEach(function (ext) {
        if (extensions.indexOf(ext) === -1) {
          extensions.unshift(ext);
        }
      });
    }
  }

  if (alias[value] !== undefined) {
    value = alias[value];
  } else {
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = Object.keys(alias)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var key = _step2.value;

        if (value.startsWith(key + '/')) {
          value = value.replace(key + '/', alias[key] + '/');
          break;
        }
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2.return) {
          _iterator2.return();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }
  }

  value = resolveModule(value, fileDir, modulesDir);

  if (checkPath(value, extensions)) {
    return;
  }

  value = value.replace(fileDir + (/\/$/.test(fileDir) ? '' : _path2.default.sep), './');
  value = value.replace(modulesDir + (/\/$/.test(modulesDir) ? '' : _path2.default.sep), '');

  return 'Cannot find module \'' + value + '\'';
}

// Gets extensions array from rule config options, e.g. "require-path-exists/exists" : [1, { "extensions" : [".jsx"] }]
// https://github.com/yannickcr/eslint-plugin-react/blob/master/lib/rules/require-extension.js#L42
function getConfigExtensions(context) {
  return context.options[0] && context.options[0].extensions || [];
}

function testRequirePath(fileName, node, context) {
  var configExtensions = getConfigExtensions(context);

  var _iteratorNormalCompletion3 = true;
  var _didIteratorError3 = false;
  var _iteratorError3 = undefined;

  try {
    for (var _iterator3 = fileName.split('!')[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
      var value = _step3.value;

      var fileDir = getCurrentFilePath(context);
      if (!fileDir) {
        continue;
      }

      try {
        var result = testModulePath(value, fileDir, configExtensions);
        if (result) {
          context.report(node, result, {});
        }
      } catch (e) {
        context.report(node, 'Unexpected error in eslint-plugin-require-path-exists: ' + e.message + '\n' + e.stack, {});
      }
    }
  } catch (err) {
    _didIteratorError3 = true;
    _iteratorError3 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion3 && _iterator3.return) {
        _iterator3.return();
      }
    } finally {
      if (_didIteratorError3) {
        throw _iteratorError3;
      }
    }
  }
}

var exists = exports.exists = function exists(context) {
  return {
    ImportDeclaration: function ImportDeclaration(node) {
      testRequirePath(node.source.value, node, context);
    },
    CallExpression: function CallExpression(node) {
      if (node.callee.name !== 'require' || !node.arguments.length || typeof node.arguments[0].value !== 'string' || !node.arguments[0].value) {
        return;
      }

      testRequirePath(node.arguments[0].value, node, context);
    }
  };
};