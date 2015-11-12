import fs from 'fs-plus';
import path from 'path';
import url from 'url';
import { execSync } from 'child_process';

// TODO: any more correct way to do this?
const BUNDLED_MODULES = [
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'dns', 'domain', 'events',
  'freelist', 'fs', 'http', 'https', 'module', 'net', 'os', 'path', 'punycode', 'querystring', 'readline', 'repl',
  'smalloc', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 'url', 'util', 'vm', 'zlib'
];

const WEBPACK_CONFIG_NAMES = [
  'webpack.config.js',
  'webpack.config.babel.js'
];

const PACKAGE_JSON_NAME = 'package.json';
const NODE_MODULES_DIR_NAME = 'node_modules';
const MAIN_FILE_NAME = 'index';
const MAIN_FILE_NAME_JS = 'index.js';

function findInParents(absolutePath, targetFile) {
  let current = absolutePath.split(path.sep).filter(Boolean);
  while (current.length) {
    let pathname = current.join(path.sep);

    if (absolutePath.charAt(0) === path.sep) {
      pathname = path.sep + pathname;
    }

    if (fs.readdirSync(pathname).indexOf(targetFile) >= 0) {
      return pathname;
    }

    current.pop();
  }

  return null;
}

function getModulesDir(fromDir) {
  if (!fs.existsSync(fromDir)) {
    return null;
  }

  let pathname = findInParents(fromDir, PACKAGE_JSON_NAME);
  if (pathname !== null) {
    return path.join(pathname, NODE_MODULES_DIR_NAME);
  }

  return null;
}


function resolveModule(value, fromDir, modulesDir) {
  let pathname = url.parse(value).pathname;

  if (pathname[0] === '.') { // relative
    return path.join(fromDir, pathname);
  } else if (pathname[0] === '/') { // absolute
    return value;
  } else if (modulesDir) { // node_modules
    let moduleDir = path.join(modulesDir, value);
    let packageFilename = path.join(moduleDir, PACKAGE_JSON_NAME);

    if (fs.existsSync(packageFilename)) {
      let pkg;
      try {
        pkg = JSON.parse(fs.readFileSync(packageFilename));
      } catch (e) {
        pkg = false;
      }

      if (pkg && pkg.main && !Array.isArray(pkg.main) && pkg.main !== MAIN_FILE_NAME_JS) {
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
    pathname = fs.resolveExtension(path.join(pathname, MAIN_FILE_NAME), extensions);
    if (!pathname) {
      return false;
    }
  }

  return true;
}

function getCurrentFilePath(context) {
  const filename = context.getFilename();

  if (fs.isAbsolute(filename)) {
    return path.dirname(filename);
  } else {
    return path.dirname(path.join(process.cwd(), context.getFilename()));
  }
}

function findWebpackConfig(fromDir) {
  for (let fileName of WEBPACK_CONFIG_NAMES) {
    const pathname = findInParents(fromDir, fileName);

    if (pathname) {
      return path.join(pathname, fileName);
    }
  }

  return null;
}

function getWebpackConfig(fromDir) {
  const pathname = findWebpackConfig(fromDir);
  if (pathname !== null) {
    return require(pathname);
  }

  return {};
}

function testModulePath(value, context, node) {
  if (BUNDLED_MODULES.indexOf(value) >= 0) {
    return;
  }

  const fileDir = getCurrentFilePath(context);
  if (!fileDir) {
    return;
  }

  const modulesDir = getModulesDir(fileDir) || '';
  const webpackConfig = getWebpackConfig(fileDir);

  let extensions = Object.keys(require.extensions);
  if (extensions.indexOf('') === -1) {
    extensions.push('');
  }

  let alias = {};
  if (typeof webpackConfig.resolve === 'object') {
    if (typeof webpackConfig.resolve.alias === 'object') {
      alias = webpackConfig.resolve.alias;
    }

    if (Array.isArray(webpackConfig.resolve.extensions)) {
      webpackConfig.resolve.extensions.forEach(ext => {
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

export const exists = context => ({
  ImportDeclaration(node) {
    testModulePath(node.source.value, context, node);
  },

  CallExpression(node) {
    if (node.callee.name !== 'require' || !node.arguments.length || typeof node.arguments[0].value !== 'string' || !node.arguments[0].value) {
      return;
    }

    node.arguments[0].value.split('!').forEach(value => testModulePath(value, context, node));
  }
});
