/* global window */

var fs = require('fs-plus');
var path = require('path');
var url = require('url');
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

function resolveModule(fromDir, modulesDir) {
  return function (value) {
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

    return value;
  };
}

function checkPath(extensions) {
  return function (pathname) {
    pathname = fs.resolveExtension(pathname, extensions);

    if (!pathname) {
      return true;
    }

    if (fs.isDirectorySync(pathname)) {
      pathname = fs.resolveExtension(path.join(pathname, 'index'), extensions);
      if (!pathname) {
        return true;
      }
    }

    return false;
  };
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

  var file = editor.buffer.file;
  if (!file) {
    return null;
  }

  if (file.cachedContents !== context.getSource()) {
    return null;
  }

  return path.dirname(file.path);
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

module.exports = function (context) {
  return {
    CallExpression: function (node) {
      if (node.callee.name !== 'require' || !node.arguments.length || typeof node.arguments[0].value !== 'string' || !node.arguments[0].value) {
        return;
      }

      var fileDir = getCurrentFilePath(context);
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
              extensions.push(ext);
            }
          });
        }
      }

      node.arguments[0].value.split('!')
        .filter(function (value) {
          return BUNDLED_MODULES.indexOf(value) === -1;
        })
        .map(function (item) { return alias[item] ? alias[item] : item; })
        .map(resolveModule(fileDir, modulesDir))
        .filter(checkPath(extensions))
        .forEach(function (pathname) {
          pathname = pathname.replace(fileDir + (/\/$/.test(fileDir) ? '' : path.sep), './');
          pathname = pathname.replace(modulesDir + (/\/$/.test(modulesDir) ? '' : path.sep), '');

          context.report(node, "Cannot find module '" + pathname + "'", {});
        });
    }
  };
};
