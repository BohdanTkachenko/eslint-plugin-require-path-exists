/* global window */

var fs = require('fs-plus');
var path = require('path');
var url = require('url');

// TODO: any more correct way to do this?
var BUNDLED_MODULES = [
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events',
  'freelist', 'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'punycode', 'querystring', 'readline', 'repl',
  'smalloc', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util', 'vm', 'zlib'
];

function getModulesDir(fromDir) {
  if (!fs.existsSync(fromDir)) {
    return null;
  }

  var current = fromDir.split(path.sep).filter(Boolean);
  var pathname;


  while (current.length) {
    pathname = path.sep + current.join(path.sep);
    if (fs.readdirSync(pathname).indexOf('package.json') >= 0) {
      return path.join(pathname, 'node_modules');
    }

    current.pop();
  }

  return null;
}

function resolveModule(value, fromDir, modulesDir) {
  var pathname = url.parse(value).pathname;

  if (pathname[0] === '.') { // relative
    return path.join(fromDir, pathname);
  } else if (pathname[0] === '/') { // absolute
    return value;
  } else if (modulesDir) { // node_modules
    var moduleDir = path.join(modulesDir, value);
    var packageFilename = path.join(moduleDir, 'package.json');

    if (fs.existsSync(packageFilename)) {
      var pkg;

      try {
        pkg = JSON.parse(fs.readFileSync(packageFilename));
      } catch (e) {
        pkg = false;
      }

      if (pkg && pkg.main && !Array.isArray(pkg.main) && pkg.main !== 'index.js') {
        return path.join(moduleDir, pkg.main);
      }
    }

    return moduleDir;
  }
}

function checkPath(pathname, extensions) {
  pathname = fs.resolveExtension(pathname, extensions);

  if (!pathname) {
    return false;
  }

  if (fs.isDirectorySync(pathname)) {
    pathname = fs.resolveExtension(path.join(pathname, 'index'), extensions);
    if (!pathname) {
      return false;
    }
  }

  return true;
}

function isAtom() {
  try {
    if (typeof window !== undefined && typeof window.atom !== undefined) {
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
}

function getCurrentFilePath(context) {
  if (!isAtom()) {
    return path.dirname(path.join(process.cwd(), context.getFilename()));
  }

  var editor = window.atom.workspace.getActivePaneItem();
  if (!editor) {
    return null;
  }

  return path.dirname(editor.getPath());
}

function getWebpackConfig(fromDir) {
  if (!fs.existsSync(fromDir)) {
    return {};
  }

  var current = fromDir.split(path.sep).filter(Boolean);
  var pathname;

  while (current.length) {
    pathname = path.sep + current.join(path.sep);

    if (fs.readdirSync(pathname).indexOf('webpack.config.js') >= 0) {
      return require(path.join(pathname, 'webpack.config.js'));
    }

    current.pop();
  }

  return {};
}

function testModulePath(value, context, node) {
  if (BUNDLED_MODULES.indexOf(value) >= 0) {
    return;
  }

  var fileDir = getCurrentFilePath(context);
  if (!fileDir) {
    return;
  }

  var modulesDir = getModulesDir(fileDir) || '';
  var webpackConfig = getWebpackConfig(fileDir);
  var alias = {};
  var extensions = Object.keys(require.extensions);

  if (extensions.indexOf('') === -1) {
    extensions.push('');
  }

  if (typeof webpackConfig.resolve === 'object') {
    if (typeof webpackConfig.resolve.alias === 'object') {
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

  value = alias[value] ? alias[value] : value;
  value = resolveModule(value, fileDir, modulesDir);

  if (checkPath(value, extensions)) {
    return;
  }

  value = value.replace(fileDir + (/\/$/.test(fileDir) ? '' : path.sep), './');
  value = value.replace(modulesDir + (/\/$/.test(modulesDir) ? '' : path.sep), '');

  context.report(node, "Cannot find module '" + value + "'", {});
}

module.exports = function (context) {
  return {
    ImportDeclaration: function (node) {
      console.log(node.source.value);

      testModulePath(node.source.value, context, node);
    },
    CallExpression: function (node) {
      if (node.callee.name !== 'require' || !node.arguments.length || typeof node.arguments[0].value !== 'string' || !node.arguments[0].value) {
        return;
      }

      node.arguments[0].value.split('!').forEach(function (value) {
        testModulePath(value, context, node);
      });
    }
  };
};
