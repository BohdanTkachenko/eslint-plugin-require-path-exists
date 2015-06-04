var fs = require('fs');
var path = require('path');
var url = require('url');
var EXTENSIONS = [ 'js', 'jsx', 'es6' ];

function getModulesDir(fromDir) {
  var current = fromDir.split(path.sep);
  var list;

  while (current.length) {
    list = fs.readdirSync(current.join(path.sep));

    if (list.indexOf('package.json') >= 0) {
      return path.join(current.join(path.sep), 'node_modules');
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
    } else { // node_modules
      var moduleDir = path.join(modulesDir, value);
      var packageFilename = path.join(moduleDir, 'package.json');

      if (fs.existsSync(packageFilename)) {
        var pkg;

        try {
          pkg = JSON.parse(fs.readFileSync(packageFilename));
        } catch (e) {
          pkg = false;
        }

        if (pkg && pkg.main !== 'index.js') {
          return path.join(moduleDir, pkg.main);
        }
      }

      return moduleDir;
    }
  };
}

function checkPath(pathname, checkingPath) {
  if (fs.existsSync(pathname)) {
    if (fs.statSync(pathname).isDirectory()) {
      pathname = path.join(pathname, 'index.js');

      if (fs.existsSync(pathname)) {
        return false;
      }
    } else {
      return false;
    }
  }

  if (!checkingPath) {
    for (var i = 0; i < EXTENSIONS.length; i++) {
      if (!checkPath(pathname + '.' + EXTENSIONS[i], true)) {
        return false;
      }
    }
  }

  return true;
}

module.exports = function (context) {
  return {
    CallExpression: function (node) {
      if (node.callee.name !== 'require' || !node.arguments.length || typeof node.arguments[0].value !== 'string' || !node.arguments[0].value) {
        return;
      }

      var fileDir = path.dirname(path.join(process.cwd(), context.getFilename()));
      var modulesDir = getModulesDir(fileDir);
      var paths = node.arguments[0].value.split('!').map(resolveModule(fileDir, modulesDir));

      paths = paths.filter(checkPath);
      paths.forEach(function (pathname) {
        pathname = pathname.replace(fileDir + (/\/$/.test(fileDir) ? '' : path.sep), './');
        pathname = pathname.replace(modulesDir + (/\/$/.test(modulesDir) ? '' : path.sep), '');

        context.report(node, "Cannot find module '" + pathname + "'", {});
      });
    }
  };
};
